import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureReady } from '$lib/server/init';
import { searchIndex } from '$lib/server/search/typesense';
import { cached } from '$lib/server/valkey';
import { getAllSongs, getSongsByUser, getCanonicalUser, CURATOR } from '$lib/server/db/queries';
import { matchesSearch } from '$lib/songs';

export const GET: RequestHandler = async ({ url }) => {
  await ensureReady();
  const q = (url.searchParams.get('q') ?? '').trim();
  const scope = url.searchParams.get('scope') === 'all' ? 'all' : 'user';
  const user = getCanonicalUser(url.searchParams.get('user') ?? CURATOR);

  if (!q) return json(scope === 'all' ? await getAllSongs() : await getSongsByUser(user));

  const cacheKey = `search:${scope}:${scope === 'user' ? user : 'all'}:${q.toLowerCase()}`;
  const results = await cached(cacheKey, 15, async () => {
    try {
      return await searchIndex({ query: q, owner: scope === 'user' ? user : undefined });
    } catch (err) {
      console.error('Typesense search failed, falling back to substring match:', (err as Error).message);
      const source = scope === 'all' ? await getAllSongs() : await getSongsByUser(user);
      return source.filter((s) => matchesSearch(s, q.toLowerCase()));
    }
  });

  return json(results);
};
