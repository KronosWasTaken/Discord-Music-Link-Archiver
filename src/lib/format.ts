// Pure formatting / parsing helpers — no Svelte, no side effects.

/** Extract core day string, e.g. "Day 12 Special" -> "Day 12". */
export function getCoreDay(dayStr: string): string {
  if (!dayStr) return 'N/A';
  const match = dayStr.match(/Day\s+\d+/i);
  return match ? match[0] : dayStr;
}

/** Extract day number for sorting, e.g. "Day 12 Special" -> 12. */
export function getDayNumber(dayStr: string): number {
  if (!dayStr) return 99999;
  const match = dayStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 99999;
}

/** Human-readable timestamp for the Discord bubble. */
export function formatTimestamp(ts: string): string {
  if (!ts) return '';
  try {
    const date = new Date(ts);
    return (
      date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' +
      date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return ts;
  }
}

/** True if the string looks like a YouTube / YouTube Music URL. */
export function isYouTubeLink(urlStr: string): boolean {
  return /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:youtube\.com|youtu\.be)\/[^\s<>"]+/.test(urlStr);
}

const NOISE_REGEXES = [
  /(?:\((?:official|full|lyric|music|hd|4k|8k|hq|video|audio|screen|clean|live|studio|karaoke|tribute|cover|original|lyrics)?\s*(?:video|audio|song|music|recording|ghazal|gazal|track|remix|clip|version|special|hits|remix|official)?\))/gi,
  /(?:\[(?:official|full|lyric|music|hd|4k|8k|hq|video|audio|screen|clean|live|studio|karaoke|tribute|cover|original|lyrics)?\s*(?:video|audio|song|music|recording|ghazal|gazal|track|remix|clip|version|special|hits|remix|official)?\])/gi,
  /【[^】]*】/g
];
const PROMO_PATTERN =
  /\b(?:official\s+video|official\s+music\s+video|official\s+audio|full\s+video\s+song|full\s+song|video\s+song|audio\s+song|lyrical\s+video|lyric\s+video|4k\s+video|hd\s+video|90's\s+hits|valentine\s+day\s+special|full\s+hd|official\s+4k\s+music\s+video|video|audio|full\s+song|hq\s+audio)\b/gi;
const PREFIX_REGEX = /^\s*(?:lyrical|lyric|official|video|audio|full|hd)\s*[:|-]\s*/i;
const TRIM_REGEX = /^['"\s.,;:!?)\]}-]+|['"\s.,;:!?)\]}-]+$/g;
const PROMO_WORDS = ['superhit', 'gazal', 'ghazal', 'status', 'whatsapp', 'original', 'credits', 'tribute', 'lyrics', 'song', 'video', 'audio', '4k', 'hd', "90's"];

const isPromoWord = (word: string): boolean => {
  const w = word.toLowerCase();
  return PROMO_WORDS.some((promo) => w.includes(promo));
};

/** Split a raw YouTube title into { song, artist } for immediate UI responsiveness. */
export function cleanSongTitle(rawTitle: string): { song: string; artist: string } {
  let title = rawTitle.replace(/["']/g, '').trim();
  NOISE_REGEXES.forEach((re) => (title = title.replace(re, '')));
  title = title.replace(PROMO_PATTERN, '').replace(PREFIX_REGEX, '');

  let song = '';
  let artist = '';

  if (title.includes('|')) {
    const validParts = title
      .split('|')
      .map((p) => p.trim())
      .filter((p) => p !== '' && !isPromoWord(p));
    if (validParts.length >= 2) {
      song = validParts[0];
      artist = validParts[1];
    } else if (validParts.length === 1) {
      song = validParts[0];
    }
  } else if (title.includes('-')) {
    const [p0 = '', p1 = ''] = title.split('-').map((p) => p.trim());
    if (isPromoWord(p0)) song = p1;
    else if (isPromoWord(p1)) song = p0;
    else {
      artist = p0;
      song = p1;
    }
  } else {
    song = title;
  }

  song = song.replace(TRIM_REGEX, '').trim();
  artist = artist.replace(TRIM_REGEX, '').trim();
  if (!song) song = rawTitle.replace(/["']/g, '').trim();

  return { song, artist };
}
