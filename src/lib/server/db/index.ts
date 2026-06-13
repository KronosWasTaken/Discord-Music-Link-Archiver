import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import { ROOT } from '../config';
import * as schema from './schema';

// Single shared connection for the process. The DB file lives in the project
// root alongside (now-legacy) data files.
const sqlite = new Database(path.join(ROOT, 'music.db'));
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
export { sqlite, schema };
