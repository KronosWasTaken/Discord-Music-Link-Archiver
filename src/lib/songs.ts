// Derived-data helpers over the songs list. Pure functions of their inputs.
import { getCoreDay, getDayNumber } from './format';
import type { Song } from './types';

export type SortKey = 'day-asc' | 'day-desc' | 'song-asc' | 'song-desc' | 'artist-asc' | 'artist-desc';

export interface SongFilter {
  searchTerm?: string;
  selectedDay?: string;
  sort?: SortKey;
}

/** Sorted unique "Day N" labels present in the list. */
export function getUniqueDays(songs: Song[]): string[] {
  const set = new Set<string>();
  for (const s of songs) {
    if (s.day && s.day !== 'N/A') set.add(getCoreDay(s.day));
  }
  return Array.from(set).sort((a, b) => getDayNumber(a) - getDayNumber(b));
}

/** Suggest the next chronological day number, e.g. "Day 34". */
export function suggestNextDay(songs: Song[]): string {
  let maxDay = 0;
  for (const s of songs) {
    const num = getDayNumber(s.day);
    if (num !== 99999 && num > maxDay) maxDay = num;
  }
  return `Day ${maxDay + 1}`;
}

const COMPARATORS: Record<SortKey, (a: Song, b: Song) => number> = {
  'day-asc': (a, b) => getDayNumber(a.day) - getDayNumber(b.day) || (a.day || '').localeCompare(b.day || ''),
  'day-desc': (a, b) => getDayNumber(b.day) - getDayNumber(a.day) || (b.day || '').localeCompare(a.day || ''),
  'song-asc': (a, b) => (a.cleanedSong || '').localeCompare(b.cleanedSong || ''),
  'song-desc': (a, b) => (b.cleanedSong || '').localeCompare(a.cleanedSong || ''),
  'artist-asc': (a, b) => (a.cleanedArtist || '').localeCompare(b.cleanedArtist || ''),
  'artist-desc': (a, b) => (b.cleanedArtist || '').localeCompare(a.cleanedArtist || '')
};

/** `q` must already be trimmed + lowercased. */
export function matchesSearch(song: Song, q: string): boolean {
  if (q === '') return true;
  return (
    (song.cleanedSong || '').toLowerCase().includes(q) ||
    (song.cleanedArtist || '').toLowerCase().includes(q) ||
    (song.rawTitle || '').toLowerCase().includes(q) ||
    (song.originalMessage || '').toLowerCase().includes(q) ||
    (song.day || '').toLowerCase().includes(q) ||
    (song.owner || '').toLowerCase().includes(q) ||
    (song.authorName || '').toLowerCase().includes(q)
  );
}

/** Filter by day + search term, then sort. Returns a new array. */
export function filterAndSortSongs(songs: Song[], { searchTerm = '', selectedDay = 'All', sort = 'day-asc' }: SongFilter = {}): Song[] {
  const q = searchTerm.trim().toLowerCase();
  const filtered = songs.filter(
    (song) => (selectedDay === 'All' || getCoreDay(song.day) === selectedDay) && matchesSearch(song, q)
  );
  return filtered.sort(COMPARATORS[sort] ?? COMPARATORS['day-asc']);
}
