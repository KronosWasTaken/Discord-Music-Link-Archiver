import { cleanSongTitle } from './parsers';

/** Fetch raw YouTube oEmbed metadata for a URL, or null on failure. */
export async function fetchOembed(url: string): Promise<{ title?: string; author_name?: string } | null> {
  const target = url.includes('music.youtube.com') ? url.replace('music.youtube.com', 'www.youtube.com') : url;
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`, {
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return null;
    return (await res.json()) as { title?: string; author_name?: string };
  } catch {
    return null;
  }
}

/** Fetch a link's metadata and split it into cleaned song / artist fields. */
export async function fetchSongMeta(link: string): Promise<{ rawTitle: string; cleanedSong: string; cleanedArtist: string }> {
  const data = await fetchOembed(link);
  const rawTitle = data?.title ?? '';
  const artistHint = (data?.author_name ?? '').replace(/\s*-\s*Topic$/i, '').trim();
  const { song, artist } = cleanSongTitle(rawTitle);
  return { rawTitle, cleanedSong: song, cleanedArtist: artist || artistHint };
}
