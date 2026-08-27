import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureReady } from '$lib/server/init';
import { extractVideoID, cleanURL } from '$lib/server/parsers';
import {
  CURATOR,
  getSongsByUser,
  getAllSongs,
  getSongById,
  insertSong,
  updateSong,
  deleteSongById,
  nextDayFor,
  maxSortOrder,
  getCanonicalUser
} from '$lib/server/db/queries';
import { fetchSongMeta } from '$lib/server/enrich';
import type { SongRequest } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
  await ensureReady();
  try {
    if (url.searchParams.get('all') === '1') return json(await getAllSongs());
    const user = url.searchParams.get('user') ?? CURATOR;
    return json(await getSongsByUser(getCanonicalUser(user)));
  } catch (err) {
    console.error('GET /api/songs:', (err as Error).message);
    return json([], { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  await ensureReady();
  try {
    const data = (await request.json()) as SongRequest;
    if (!data.link) return text('link is required', { status: 400 });

    const targetUser = data.targetUser ?? CURATOR;
    const owner = getCanonicalUser(targetUser);
    const link = cleanURL(data.link);
    const id = `user_added_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (!data.day) return text('day is required', { status: 400 });
    await insertSong({
      id,
      owner,
      day: data.day,
      link,
      videoId: extractVideoID(link),
      rawTitle: data.rawTitle ?? '',
      cleanedSong: data.cleanedSong ?? '',
      cleanedArtist: data.cleanedArtist ?? '',
      originalMessage: data.originalMessage ?? '',
      authorName: data.authorName ?? owner,
      timestamp: new Date().toISOString(),
      sortOrder: (await maxSortOrder(owner)) + 1
    });

    return json(await getSongsByUser(owner));
  } catch (err) {
    console.error('POST /api/songs:', (err as Error).message);
    return text('Error saving song', { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  await ensureReady();
  try {
    const data = (await request.json()) as SongRequest;
    if (!data.id) return text('id is required', { status: 400 });

    const existing = await getSongById(data.id);
    if (!existing) return text(`Song ${data.id} not found`, { status: 404 });

    const link = data.link ? cleanURL(data.link) : existing.link;
    const ok = await updateSong(data.id, {
      day: data.day ?? existing.day,
      link,
      videoId: extractVideoID(link),
      rawTitle: data.rawTitle ?? existing.rawTitle,
      cleanedSong: data.cleanedSong ?? existing.cleanedSong,
      cleanedArtist: data.cleanedArtist ?? existing.cleanedArtist,
      originalMessage: data.originalMessage ?? existing.originalMessage,
      authorName: data.authorName ?? existing.authorName
    });
    if (!ok) return text('Update failed', { status: 500 });

    return json(await getSongsByUser(existing.owner));
  } catch (err) {
    console.error('PUT /api/songs:', (err as Error).message);
    return text('Error updating song', { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url }) => {
  await ensureReady();
  const id = url.searchParams.get('id');
  if (!id) return text('id is required', { status: 400 });
  try {
    const existing = await getSongById(id);
    if (!existing) return text(`Song ${id} not found`, { status: 404 });
    await deleteSongById(id);
    return json(await getSongsByUser(existing.owner));
  } catch (err) {
    console.error('DELETE /api/songs:', (err as Error).message);
    return text('Error deleting song', { status: 500 });
  }
};
