// Shared domain types — used by both the SSR server code and the UI components.

export interface Song {
  id: string;
  day: string;
  link: string;
  videoId: string;
  rawTitle: string;
  cleanedSong: string;
  cleanedArtist: string;
  originalMessage: string;
  authorName: string;
  timestamp: string;
}

export interface InternalSong extends Song {
  msgAuthorName: string;
  msgAuthorNickname: string;
  msgAuthorId: string;
  isUserAdded: boolean;
  isEditedByUser: boolean;
  content: string;
  dayMatch: RegExpMatchArray | null;
  dayOverridesDay: string | null;
  customDay: string | null;
  customLink: string | null;
  customSong: string | null;
  customArtist: string | null;
  customTitle: string | null;
  customMessage: string | null;
  customAuthorName: string | null;
}

export interface TitleCacheEntry {
  title: string;
  artist: string;
  rawTitle: string;
}

export interface EmbedEntry {
  url?: string;
  title?: string;
  author?: { name?: string };
}

export interface AuthorEntry {
  id?: string;
  name?: string;
  nickname?: string;
  discriminator?: string;
  isBot?: boolean;
}

export interface MessageEntry {
  id?: string;
  type?: string;
  timestamp?: string;
  content?: string;
  author?: AuthorEntry;
  embeds?: EmbedEntry[];
  customDay?: string;
  customLink?: string;
  customSong?: string;
  customArtist?: string;
  customTitle?: string;
  customMessage?: string;
  customAuthorName?: string;
  isEditedByUser?: boolean;
}

export interface ExportData {
  messages: MessageEntry[];
}

export interface SongRequest {
  id?: string;
  targetUser?: string;
  day: string;
  link: string;
  cleanedSong?: string;
  cleanedArtist?: string;
  rawTitle?: string;
  originalMessage?: string;
  authorName?: string;
}
