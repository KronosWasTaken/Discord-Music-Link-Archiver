export const YOUTUBE_REGEX = /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:youtube\.com|youtu\.be)\/[^\s<>`'()]+/g;

export function extractVideoID(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    if (u.hostname.endsWith('youtu.be')) return u.pathname.substring(1).split('?')[0];
    if (u.pathname.includes('/shorts/')) return u.pathname.split('/shorts/')[1].split('/')[0];
    if (u.pathname.includes('/embed/')) return u.pathname.split('/embed/')[1].split('/')[0];
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v') ?? '';
  } catch {
    /* not a parseable URL */
  }
  return '';
}

export function cleanURL(u: string): string {
  return u.replace(/[.,;:!?)\s\]}]+$/, '');
}

export function cleanSongTitle(rawTitle: string): { song: string; artist: string } {
  let title = (rawTitle ?? '').replace(/["']/g, '').trim();
  if (!title) return { song: '', artist: '' };

  const noiseRegexes = [
    /(?:\((?:official|full|lyric|music|hd|4k|8k|hq|video|audio|screen|clean|live|studio|karaoke|tribute|cover|original|lyrics)?\s*(?:video|audio|song|music|recording|ghazal|gazal|track|remix|clip|version|special|hits|official)?\))/gi,
    /(?:\[(?:official|full|lyric|music|hd|4k|8k|hq|video|audio|screen|clean|live|studio|karaoke|tribute|cover|original|lyrics)?\s*(?:video|audio|song|music|recording|ghazal|gazal|track|remix|clip|version|special|hits|official)?\])/gi,
    /【[^】]*】/g
  ];
  noiseRegexes.forEach((re) => {
    title = title.replace(re, '');
  });

  title = title.replace(
    /\b(?:official\s+video|official\s+music\s+video|official\s+audio|full\s+video\s+song|full\s+song|video\s+song|audio\s+song|lyrical\s+video|lyric\s+video|4k\s+video|hd\s+video|full\s+hd|official\s+4k\s+music\s+video|video|audio|hq\s+audio)\b/gi,
    ''
  );
  title = title.replace(/^\s*(?:lyrical|lyric|official|video|audio|full|hd)\s*[:|-]\s*/i, '');

  const isPromo = (w: string): boolean => {
    const s = w.toLowerCase();
    return ['superhit', 'gazal', 'ghazal', 'status', 'whatsapp', 'original', 'credits', 'tribute', 'lyrics', 'song', 'video', 'audio', '4k', 'hd'].some((p) => s.includes(p));
  };

  let song = '';
  let artist = '';

  if (title.includes('|')) {
    const valid = title.split('|').map((p) => p.trim()).filter((p) => p && !isPromo(p));
    if (valid.length >= 2) {
      song = valid[0];
      artist = valid[1];
    } else if (valid.length === 1) {
      song = valid[0];
    }
  } else if (title.includes('-')) {
    const dashIdx = title.indexOf('-');
    const p0 = title.slice(0, dashIdx).trim();
    const p1 = title.slice(dashIdx + 1).trim();
    if (isPromo(p0)) song = p1;
    else if (isPromo(p1)) song = p0;
    else {
      artist = p0;
      song = p1;
    }
  } else {
    song = title;
  }

  const trim = (s: string) => s.replace(/^['"\s.,;:!?)\]}-]+|['"\s.,;:!?)\]}-]+$/g, '').trim();
  song = trim(song);
  artist = trim(artist);
  if (!song) song = (rawTitle ?? '').replace(/["']/g, '').trim();

  return { song, artist };
}

export function parseCSV(content: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const c = content[i];
    if (c === '"') {
      if (inQuotes && content[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }
    if (c === ',' && !inQuotes) {
      record.push(field);
      field = '';
      i++;
      continue;
    }
    if ((c === '\n' || c === '\r') && !inQuotes) {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      if (c === '\r' && content[i + 1] === '\n') i += 2;
      else i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}
