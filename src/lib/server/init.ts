import { client } from './db/index';
import { DDL } from './db/schema';
import { importIfEmpty } from './import';
import { getAllSongs } from './db/queries';
import { ensureCollection, reindexAll } from './search/typesense';

let ready: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  const attempts = 8;
  for (let i = 0; i < attempts; i++) {
    try {
      for (const stmt of DDL) await client.execute(stmt);
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** Math.min(i, 5)));
    }
  }
}

async function boot(): Promise<void> {
  await ensureSchema();
  await importIfEmpty();
  try {
    await ensureCollection();
    await reindexAll(await getAllSongs());
  } catch (err) {
    console.error('Typesense init failed, search will fall back to substring match:', (err as Error).message);
  }
  console.log('Ready.');
}

export function ensureReady(): Promise<void> {
  if (!ready) ready = boot();
  return ready;
}
