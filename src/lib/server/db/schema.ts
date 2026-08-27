export interface NewSongRow {
  id: string;
  owner: string;
  day: string;
  link: string;
  videoId: string;
  rawTitle: string;
  cleanedSong: string;
  cleanedArtist: string;
  originalMessage: string;
  authorName: string;
  timestamp: string;
  sortOrder: number;
}

export const KEYSPACE = 'music_link';

export const DDL = [
  `CREATE KEYSPACE IF NOT EXISTS ${KEYSPACE}
     WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`,
  `CREATE TABLE IF NOT EXISTS ${KEYSPACE}.songs_by_owner (
     owner text,
     sort_order int,
     id text,
     day text,
     link text,
     video_id text,
     raw_title text,
     cleaned_song text,
     cleaned_artist text,
     original_message text,
     author_name text,
     timestamp text,
     PRIMARY KEY (owner, sort_order)
   )`,
  `CREATE TABLE IF NOT EXISTS ${KEYSPACE}.songs_by_id (
     id text PRIMARY KEY,
     owner text,
     sort_order int,
     day text,
     link text,
     video_id text,
     raw_title text,
     cleaned_song text,
     cleaned_artist text,
     original_message text,
     author_name text,
     timestamp text
   )`
];
