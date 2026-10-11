import fs from 'fs';
import path from 'path';
import { ROOT } from './config';
import { YOUTUBE_REGEX, cleanURL, extractVideoID, cleanSongTitle, parseCSV } from './parsers';
import { fetchOembed } from './enrich';
import { insertSongs, songCount, CURATOR } from './db/queries';
import type { NewSongRow } from './db/schema';
import type { TitleCacheEntry } from '$lib/types';

const DAY_OVERRIDES: Record<string, string> = {
  WglSfZJOPds: 'Day 1',
  c0fHs7THj4k: 'Day 2',
  lj4848922tk: 'Day 6',
  sOS9aOIXPEk: 'Day 8',
  '70cIvDKDSmY': 'Day 12 Special',
  '2w8KUgIkAu8': 'Day 14',
  CuQbYY2ZzYw: 'Day 32 Special'
};
const DAY_RE = /\bday[\s:-]*(\d+)\b/i;

const EXCLUDED_IDS = new Set(['856119960018485248', '1211781489931452447']);
const EXCLUDED_NAMES = ['the_pervy_s4ge', 'thepervysage', 'aaditya6789'];
const isExcluded = (authorId: string, author: string): boolean => {
  if (EXCLUDED_IDS.has(authorId)) return true;
  const lo = (author ?? '').toLowerCase();
  return EXCLUDED_NAMES.includes(lo) || lo.includes('wordle') || lo.includes('yagpdb');
};

const readJSON = (file: string): any => {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
};

// Ensure every row gets a unique primary key even when a Discord message
// yields multiple links or lacks an id.
function uniqueId(base: string, used: Set<string>): string {
  let id = base || `row_${used.size + 1}`;
  let n = 2;
  while (used.has(id)) id = `${base}__${n++}`;
  used.add(id);
  return id;
}

// ---- Build curator songs from music_channel.json -------------------------

function buildCuratorSongs(usedIds: Set<string>): NewSongRow[] {
  const data = readJSON('music_channel.json');
  if (!data?.messages) return [];

  const out: NewSongRow[] = [];
  let order = 0;

  for (const msg of data.messages) {
    const author = msg.author ?? {};
    const content: string = msg.content ?? '';

    const rows: Array<{ link: string; videoId: string; title: string; embedAuthor?: string }> = [];
    const seen = new Set<string>();

    for (const u of content.match(YOUTUBE_REGEX) ?? []) {
      const clean = cleanURL(u);
      const vid = extractVideoID(clean);
      const key = vid || clean;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({ link: clean, videoId: vid, title: '' });
      }
    }

    for (const embed of msg.embeds ?? []) {
      if (!embed.url || (!embed.url.includes('youtube.com') && !embed.url.includes('youtu.be'))) continue;
      const clean = cleanURL(embed.url);
      const vid = extractVideoID(clean);
      const key = vid || clean;
      const embedAuthor: string = embed.author?.name ?? '';
      if (seen.has(key)) {
        if (embed.title) {
          for (const row of rows) {
            if ((row.videoId || row.link) === key) {
              row.title = embed.title;
              row.embedAuthor = embedAuthor;
            }
          }
        }
      } else {
        seen.add(key);
        rows.push({ link: clean, videoId: vid, title: embed.title ?? '', embedAuthor });
      }
    }

    if (rows.length === 0) {
      if (msg.customLink) {
        const clean = cleanURL(msg.customLink);
        rows.push({ link: clean, videoId: extractVideoID(clean), title: msg.customTitle ?? '' });
      } else continue;
    }

    // Only the curator's own posts / edits belong to the curator collection.
    const isSageEntry =
      (author.name ?? '').toLowerCase() === 'the_pervy_s4ge' ||
      (author.nickname ?? '').toLowerCase() === 'thepervysage' ||
      author.id === '856119960018485248' ||
      Boolean(msg.id?.startsWith('user_added_')) ||
      msg.isEditedByUser === true;
    if (!isSageEntry) continue;

    for (const row of rows) {
      const link = msg.customLink ?? row.link;
      const videoId = msg.customLink ? extractVideoID(msg.customLink) : row.videoId ?? '';
      const { song, artist } = cleanSongTitle(row.title);
      const fallback = (row.embedAuthor ?? '').replace(/\s*-\s*Topic$/i, '').trim();

      let day = 'N/A';
      const dayMatch = content.match(DAY_RE);
      if (dayMatch) day = `Day ${dayMatch[1]}`;
      if (DAY_OVERRIDES[videoId]) day = DAY_OVERRIDES[videoId];
      if (msg.customDay) day = msg.customDay;

      out.push({
        id: uniqueId(msg.id ?? '', usedIds),
        owner: CURATOR,
        day,
        link,
        videoId,
        rawTitle: msg.customTitle ?? row.title ?? '',
        cleanedSong: msg.customSong ?? song,
        cleanedArtist: msg.customArtist ?? artist ?? fallback,
        originalMessage: msg.customMessage ?? content,
        authorName: msg.customAuthorName ?? author.nickname ?? author.name ?? CURATOR,
        timestamp: msg.timestamp ?? '',
        sortOrder: order++
      });
    }
  }

  return out;
}

// ---- Build contributor songs from songs_of_the_day.csv -------------------

function buildContributorSongs(usedIds: Set<string>): NewSongRow[] {
  const csvFile = fs.existsSync(path.join(ROOT, 'songs_of_the_day.csv'))
    ? 'songs_of_the_day.csv'
    : fs.existsSync(path.join(ROOT, 'song_of_the_day.csv'))
      ? 'song_of_the_day.csv'
      : null;
  if (!csvFile) return [];

  const records = parseCSV(fs.readFileSync(path.join(ROOT, csvFile), 'utf-8'));
  if (records.length < 2) return [];

  const [headers, ...rows] = records;
  const iCol = headers.indexOf('AuthorID');
  const aCol = headers.indexOf('Author');
  const dCol = headers.indexOf('Date');
  const cCol = headers.indexOf('Content');
  if ([iCol, aCol, dCol, cCol].includes(-1)) {
    console.error('Unexpected CSV headers:', headers);
    return [];
  }

  const out: NewSongRow[] = [];
  const dates: Record<string, string[]> = {};
  const order: Record<string, number> = {};

  for (const row of rows) {
    if (row.length < 4) continue;
    const authorId = row[iCol];
    const author = row[aCol];
    const dateStr = row[dCol];
    const content = row[cCol] ?? '';
    if (isExcluded(authorId, author)) continue;

    const urls = content.match(YOUTUBE_REGEX) ?? [];
    if (urls.length === 0) continue;

    dates[author] ??= [];
    order[author] ??= 0;

    const seenUrls = new Set<string>();
    for (const u of urls) {
      const clean = cleanURL(u);
      const vid = extractVideoID(clean);
      const key = vid || clean;
      if (seenUrls.has(key)) continue;
      seenUrls.add(key);

      const songDate = dateStr?.substring(0, 10) ?? '';
      let di = dates[author].indexOf(songDate);
      if (di === -1 && songDate) {
        dates[author].push(songDate);
        di = dates[author].length - 1;
      }

      out.push({
        id: uniqueId(`${author}_${order[author] + 1}`, usedIds),
        owner: author,
        day: di !== -1 ? `Day ${di + 1}` : 'N/A',
        link: clean,
        videoId: vid,
        rawTitle: '',
        cleanedSong: '',
        cleanedArtist: '',
        originalMessage: content,
        authorName: author,
        timestamp: dateStr ?? '',
        sortOrder: order[author]++
      });
    }
  }

  return out;
}

// ---- oEmbed enrichment ----------------------------------------------------

function warmCache(): Record<string, TitleCacheEntry> {
  return readJSON('title_cache.json') ?? {};
}

const keyOf = (r: NewSongRow) => r.videoId || r.link;

/** Fill in any missing song title / artist using the warm cache, then oEmbed. */
async function enrich(rows: NewSongRow[]): Promise<void> {
  const cache = warmCache();
  const needing = rows.filter((r) => !r.cleanedSong || !r.cleanedArtist);

  // Resolve the warm cache first; only fetch what's still unknown.
  const toFetch: NewSongRow[] = [];
  for (const r of needing) {
    const hit = cache[keyOf(r)];
    if (hit) applyInfo(r, { title: hit.rawTitle || hit.title, artistHint: hit.artist });
    if (!r.cleanedSong || !r.cleanedArtist) toFetch.push(r);
  }

  if (toFetch.length) {
    console.log(`Enriching ${toFetch.length} songs via YouTube oEmbed...`);
    const BATCH = 5;
    for (let i = 0; i < toFetch.length; i += BATCH) {
      await Promise.all(
        toFetch.slice(i, i + BATCH).map(async (r) => {
          const data = await fetchOembed(r.link);
          if (!data) return;
          const artistHint = (data.author_name ?? '').replace(/\s*-\s*Topic$/i, '').trim();
          applyInfo(r, { title: data.title ?? '', artistHint });
        })
      );
    }
  }
}

function applyInfo(r: NewSongRow, info: { title: string; artistHint: string }): void {
  if (!r.rawTitle && info.title) r.rawTitle = info.title;
  const parsed = cleanSongTitle(info.title || r.rawTitle || '');
  if (!r.cleanedSong) r.cleanedSong = parsed.song;
  if (!r.cleanedArtist) r.cleanedArtist = parsed.artist || info.artistHint;
}

// ---- Entry point ----------------------------------------------------------

/** Populate the DB from the legacy JSON/CSV files. No-op once data exists. */
export async function importIfEmpty(): Promise<void> {
  if ((await songCount()) > 0) return;

  console.log('Importing songs into the database...');
  const usedIds = new Set<string>();
  const rows = [...buildCuratorSongs(usedIds), ...buildContributorSongs(usedIds)];
  await enrich(rows);
  await insertSongs(rows);

  const owners = new Set(rows.map((r) => r.owner));
  console.log(`Imported ${rows.length} songs across ${owners.size} users.`);
}
