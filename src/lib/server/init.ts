import path from 'path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db/index';
import { ROOT } from './config';
import { importIfEmpty } from './import';

// Memoize so migrations + the one-time import run exactly once per process,
// no matter how many requests race to call it first.
let ready: Promise<void> | null = null;

async function boot(): Promise<void> {
  migrate(db, { migrationsFolder: path.join(ROOT, 'drizzle') });
  await importIfEmpty();
  console.log('Ready.');
}

export function ensureReady(): Promise<void> {
  if (!ready) ready = boot();
  return ready;
}
