import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureReady } from '$lib/server/init';
import { CURATOR, getSongsByUser, getCanonicalUser } from '$lib/server/db/queries';
import type { Song } from '$lib/types';

const HEADERS = [
  'Detected Day',
  'YouTube Link',
  'Cleaned Song Name',
  'Cleaned Artist',
  'Original Video Title',
  'Original Message Content'
];

const escape = (s: string): string => `"${(s ?? '').replace(/\n/g, ' ').replace(/"/g, '""')}"`;

const toRow = (s: Song): string =>
  [s.day, s.link, s.cleanedSong, s.cleanedArtist, s.rawTitle, s.originalMessage].map(escape).join(',');

export const GET: RequestHandler = async ({ params }) => {
  await ensureReady();

  // Canonicalize owner name (including curator and hikachu aliases)
  const owner = getCanonicalUser(params.name);
  const songs = getSongsByUser(owner);
  if (songs.length === 0) throw error(404, 'No songs for that user');

  const body = [HEADERS.join(','), ...songs.map(toRow)].join('\n');
  const safe = params.name.replace(/[^a-zA-Z0-9_-]/g, '');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${safe}.csv"`
    }
  });
};
