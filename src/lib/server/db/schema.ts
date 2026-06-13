import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// One row per song. `owner` is the user whose collection it belongs to
// (the curator "the_pervy_s4ge" or any contributor). This single table
// replaces the old music_channel.json + per-user CSV split.
export const songs = sqliteTable(
  'songs',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    day: text('day').notNull().default('N/A'),
    link: text('link').notNull(),
    videoId: text('video_id').notNull().default(''),
    rawTitle: text('raw_title').notNull().default(''),
    cleanedSong: text('cleaned_song').notNull().default(''),
    cleanedArtist: text('cleaned_artist').notNull().default(''),
    originalMessage: text('original_message').notNull().default(''),
    authorName: text('author_name').notNull().default(''),
    timestamp: text('timestamp').notNull().default(''),
    // Preserves the original ingest order within a user's collection.
    sortOrder: integer('sort_order').notNull().default(0)
  },
  (t) => [index('idx_songs_owner').on(t.owner)]
);

export type SongRow = typeof songs.$inferSelect;
export type NewSongRow = typeof songs.$inferInsert;
