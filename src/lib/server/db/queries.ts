import { eq } from 'drizzle-orm';
import { db } from './index';
import { songs, type SongRow, type NewSongRow } from './schema';
import type { Song } from '$lib/types';

export const CURATOR = 'the_pervy_s4ge';

const toSong = (r: SongRow): Song => ({
  id: r.id,
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

/** Total rows — used to decide whether the one-time import still needs to run. */
export function songCount(): number {
  return db.select({ id: songs.id }).from(songs).all().length;
}

/** Distinct owners, curator pinned first, the rest alphabetical. */
export function getUsers(): string[] {
  const owners = db.selectDistinct({ owner: songs.owner }).from(songs).all().map((r) => r.owner);
  const others = owners.filter((o) => o.toLowerCase() !== CURATOR).sort();
  return [CURATOR, ...others];
}

export function getSongsByUser(owner: string): Song[] {
  const rows = db
    .select()
    .from(songs)
    .where(eq(songs.owner, owner))
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return rows.map(toSong);
}

export function getSongById(id: string): SongRow | undefined {
  return db.select().from(songs).where(eq(songs.id, id)).get();
}

export function insertSongs(rows: NewSongRow[]): void {
  if (rows.length === 0) return;
  db.insert(songs).values(rows).run();
}

export function insertSong(row: NewSongRow): void {
  db.insert(songs).values(row).run();
}

export function updateSong(id: string, patch: Partial<NewSongRow>): boolean {
  const res = db.update(songs).set(patch).where(eq(songs.id, id)).run();
  return res.changes > 0;
}

export function deleteSongById(id: string): boolean {
  const res = db.delete(songs).where(eq(songs.id, id)).run();
  return res.changes > 0;
}

/** Next "Day N" label for a user, based on the highest day number they have. */
export function nextDayFor(owner: string): string {
  const rows = db.select({ day: songs.day }).from(songs).where(eq(songs.owner, owner)).all();
  let max = 0;
  for (const { day } of rows) {
    const m = day.match(/\d+/);
    if (m) max = Math.max(max, parseInt(m[0], 10));
  }
  return `Day ${max + 1}`;
}

/** Highest sortOrder within a user's collection (so appends land at the end). */
export function maxSortOrder(owner: string): number {
  const rows = db.select({ sortOrder: songs.sortOrder }).from(songs).where(eq(songs.owner, owner)).all();
  return rows.reduce((m, r) => Math.max(m, r.sortOrder), 0);
}
