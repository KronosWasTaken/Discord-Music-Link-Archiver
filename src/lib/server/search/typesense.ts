import Typesense from 'typesense';
import { env } from '$env/dynamic/private';
import type { Song } from '$lib/types';

const client = new Typesense.Client({
  nodes: [
    {
      host: env.TYPESENSE_HOST || 'localhost',
      port: Number(env.TYPESENSE_PORT) || 8108,
      protocol: env.TYPESENSE_PROTOCOL || 'http'
    }
  ],
  apiKey: env.TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 4
});

const COLLECTION = 'songs';
const QUERY_BY = 'cleanedSong,cleanedArtist,rawTitle,originalMessage,authorName,owner,day';

const SCHEMA = {
  name: COLLECTION,
  fields: [
    { name: 'owner', type: 'string', facet: true },
    { name: 'day', type: 'string', facet: true },
    { name: '.*', type: 'auto' }
  ]
};

export async function ensureCollection(): Promise<void> {
  const attempts = 5;
  for (let i = 0; i < attempts; i++) {
    try {
      await client.collections(COLLECTION).retrieve();
      return;
    } catch (err) {
      const status = (err as { httpStatus?: number }).httpStatus;
      if (status === 404) {
        await client.collections().create(SCHEMA as never);
        return;
      }
      if (i === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i));
    }
  }
}

function toDoc(song: Song): Song & { id: string } {
  return { ...song, id: song.id };
}

export async function indexSong(song: Song): Promise<void> {
  await client.collections(COLLECTION).documents().upsert(toDoc(song));
}

export async function removeFromIndex(id: string): Promise<void> {
  try {
    await client.collections(COLLECTION).documents(id).delete();
  } catch (err) {
    if ((err as { httpStatus?: number }).httpStatus !== 404) throw err;
  }
}

export async function reindexAll(songList: Song[]): Promise<void> {
  if (songList.length === 0) return;
  await client
    .collections(COLLECTION)
    .documents()
    .import(songList.map(toDoc), { action: 'upsert' });
}

export interface SearchOptions {
  query: string;
  owner?: string;
}

export async function searchIndex({ query, owner }: SearchOptions): Promise<Song[]> {
  const res = await client
    .collections(COLLECTION)
    .documents()
    .search({
      q: query,
      query_by: QUERY_BY,
      filter_by: owner ? `owner:=${owner}` : undefined,
      per_page: 250,
      num_typos: 2
    });
  return (res.hits ?? []).map((h) => h.document as Song);
}
