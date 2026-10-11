import type { types as CassandraTypes } from 'cassandra-driver';
import { client, KEYSPACE } from './index';
import type { NewSongRow } from './schema';
import type { Song } from '$lib/types';
import { cached, bumpVersion } from '../valkey';
import { indexSong, removeFromIndex, reindexAll } from '../search/typesense';

export const CURATOR = 'the_pervy_s4ge';

const BY_OWNER = `${KEYSPACE}.songs_by_owner`;
const BY_ID = `${KEYSPACE}.songs_by_id`;

const COLUMNS = 'id, owner, day, link, video_id, raw_title, cleaned_song, cleaned_artist, original_message, author_name, timestamp, sort_order';
const PLACEHOLDERS = COLUMNS.split(', ')
  .map(() => '?')
  .join(', ');

function toParams(row: NewSongRow): unknown[] {
  return [
    row.id,
    row.owner,
    row.day,
    row.link,
    row.videoId,
    row.rawTitle,
    row.cleanedSong,
    row.cleanedArtist,
    row.originalMessage,
    row.authorName,
    row.timestamp,
    row.sortOrder
  ];
}

function toRow(r: CassandraTypes.Row): NewSongRow {
  return {
    id: r.get('id'),
    owner: r.get('owner'),
    day: r.get('day'),
    link: r.get('link'),
    videoId: r.get('video_id'),
    rawTitle: r.get('raw_title'),
    cleanedSong: r.get('cleaned_song'),
    cleanedArtist: r.get('cleaned_artist'),
    originalMessage: r.get('original_message'),
    authorName: r.get('author_name'),
    timestamp: r.get('timestamp'),
    sortOrder: r.get('sort_order')
  };
}

const toSong = (r: NewSongRow): Song => ({
  id: r.id,
  owner: r.owner,
  day: r.day,
  link: r.link,
  videoId: r.videoId,
  rawTitle: r.rawTitle,
  cleanedSong: r.cleanedSong,
  cleanedArtist: r.cleanedArtist,
  originalMessage: r.originalMessage,
  authorName: r.authorName,
  timestamp: r.timestamp
});

async function safeIndex(row: NewSongRow): Promise<void> {
  try {
    await indexSong(toSong(row));
  } catch (err) {
    console.error('Typesense index failed:', (err as Error).message);
  }
}

async function safeRemove(id: string): Promise<void> {
  try {
    await removeFromIndex(id);
  } catch (err) {
    console.error('Typesense remove failed:', (err as Error).message);
  }
}

export async function safeReindexAll(): Promise<void> {
  try {
    await reindexAll(await getAllSongs());
  } catch (err) {
    console.error('Typesense bulk reindex failed:', (err as Error).message);
  }
}

export async function songCount(): Promise<number> {
  const result = await client.execute(`SELECT COUNT(*) AS c FROM ${BY_ID}`);
  return Number(result.first().get('c'));
}

export const getCanonicalUser = (user: string): string => {
  const lower = (user ?? '').toLowerCase();
  if (lower === 'thepervysage' || lower === 'the_pervy_s4ge') return CURATOR;
  if (lower === 'hikachu') return 'hikachu__';
  return user;
};

/** Users that always get a tab, even before they have any songs. */
const ALWAYS_LISTED = ['hikachu__', 'anuj_bajracharya'];

/** Distinct owners, curator pinned first, the rest alphabetical. */
export function getUsers(): Promise<string[]> {
  return cached('songs:users', 60, async () => {
    const result = await client.execute(`SELECT owner FROM ${BY_ID}`);
    const owners = Array.from(new Set(result.rows.map((r) => getCanonicalUser(r.get('owner')))));
    for (const user of ALWAYS_LISTED) {
      if (!owners.some((o) => o.toLowerCase() === user)) owners.push(user);
    }
    const others = owners.filter((o) => o.toLowerCase() !== CURATOR).sort();
    return [CURATOR, ...others];
  });
}

/** Cassandra returns rows pre-sorted by the clustering key (sort_order). */
export function getSongsByUser(owner: string): Promise<Song[]> {
  const canonical = getCanonicalUser(owner);
  return cached(`songs:user:${canonical}`, 30, async () => {
    const result = await client.execute(`SELECT ${COLUMNS} FROM ${BY_OWNER} WHERE owner = ?`, [canonical], {
      prepare: true
    });
    return result.rows.map(toRow).map(toSong);
  });
}

/** Every song across every owner, for cross-user search. */
export function getAllSongs(): Promise<Song[]> {
  return cached('songs:all', 30, async () => {
    const result = await client.execute(`SELECT ${COLUMNS} FROM ${BY_ID}`);
    return result.rows
      .map(toRow)
      .sort((a, b) => a.owner.localeCompare(b.owner) || a.sortOrder - b.sortOrder)
      .map(toSong);
  });
}

/** Includes sortOrder — needed internally to address the owner-partitioned table. */
export async function getSongById(id: string): Promise<NewSongRow | undefined> {
  const result = await client.execute(`SELECT ${COLUMNS} FROM ${BY_ID} WHERE id = ?`, [id], { prepare: true });
  return result.rowLength ? toRow(result.first()) : undefined;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function insertSongs(rows: NewSongRow[]): Promise<void> {
  if (rows.length === 0) return;
  for (const row of rows) {
    if (row.owner) row.owner = getCanonicalUser(row.owner);
  }

  for (const batch of chunk(rows, 50)) {
    const queries = batch.flatMap((row) => {
      const params = toParams(row);
      return [
        { query: `INSERT INTO ${BY_OWNER} (${COLUMNS}) VALUES (${PLACEHOLDERS})`, params },
        { query: `INSERT INTO ${BY_ID} (${COLUMNS}) VALUES (${PLACEHOLDERS})`, params }
      ];
    });
    await client.batch(queries, { prepare: true, logged: true });
  }

  await bumpVersion();
  void safeReindexAll();
}

export async function insertSong(row: NewSongRow): Promise<void> {
  row.owner = getCanonicalUser(row.owner);
  const params = toParams(row);
  await client.batch(
    [
      { query: `INSERT INTO ${BY_OWNER} (${COLUMNS}) VALUES (${PLACEHOLDERS})`, params },
      { query: `INSERT INTO ${BY_ID} (${COLUMNS}) VALUES (${PLACEHOLDERS})`, params }
    ],
    { prepare: true, logged: true }
  );
  await bumpVersion();
  void safeIndex(row);
}

const PATCH_COLUMNS = 'day, link, video_id, raw_title, cleaned_song, cleaned_artist, original_message, author_name';

function patchParams(row: NewSongRow): unknown[] {
  return [row.day, row.link, row.videoId, row.rawTitle, row.cleanedSong, row.cleanedArtist, row.originalMessage, row.authorName];
}

export async function updateSong(id: string, patch: Partial<NewSongRow>): Promise<boolean> {
  const existing = await getSongById(id);
  if (!existing) return false;
  if (patch.owner) patch.owner = getCanonicalUser(patch.owner);
  const merged: NewSongRow = { ...existing, ...patch };
  const params = patchParams(merged);

  await client.batch(
    [
      {
        query: `UPDATE ${BY_OWNER} SET ${PATCH_COLUMNS.split(', ')
          .map((c) => `${c} = ?`)
          .join(', ')} WHERE owner = ? AND sort_order = ?`,
        params: [...params, existing.owner, existing.sortOrder]
      },
      {
        query: `UPDATE ${BY_ID} SET ${PATCH_COLUMNS.split(', ')
          .map((c) => `${c} = ?`)
          .join(', ')} WHERE id = ?`,
        params: [...params, id]
      }
    ],
    { prepare: true, logged: true }
  );

  await bumpVersion();
  void safeIndex(merged);
  return true;
}

export async function deleteSongById(id: string): Promise<boolean> {
  const existing = await getSongById(id);
  if (!existing) return false;

  await client.batch(
    [
      { query: `DELETE FROM ${BY_OWNER} WHERE owner = ? AND sort_order = ?`, params: [existing.owner, existing.sortOrder] },
      { query: `DELETE FROM ${BY_ID} WHERE id = ?`, params: [id] }
    ],
    { prepare: true, logged: true }
  );

  await bumpVersion();
  void safeRemove(id);
  return true;
}

/** Next "Day N" label for a user, based on the highest day number they have. */
export async function nextDayFor(owner: string): Promise<string> {
  const result = await client.execute(`SELECT day FROM ${BY_OWNER} WHERE owner = ?`, [getCanonicalUser(owner)], {
    prepare: true
  });
  let max = 0;
  for (const row of result.rows) {
    const m = (row.get('day') as string).match(/\d+/);
    if (m) max = Math.max(max, parseInt(m[0], 10));
  }
  return `Day ${max + 1}`;
}

/** Highest sortOrder within a user's collection (so appends land at the end). */
export async function maxSortOrder(owner: string): Promise<number> {
  const result = await client.execute(`SELECT sort_order FROM ${BY_OWNER} WHERE owner = ?`, [getCanonicalUser(owner)], {
    prepare: true
  });
  return result.rows.reduce((m, row) => Math.max(m, row.get('sort_order') as number), 0);
}
