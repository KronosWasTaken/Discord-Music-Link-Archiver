// All client-side backend calls. Each returns parsed JSON or throws.
import type { Song, SongRequest } from './types';

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const getUsers = (): Promise<string[]> => fetch('/api/users').then(asJson<string[]>);

export const getSongs = (user: string): Promise<Song[]> =>
  fetch(`/api/songs?user=${encodeURIComponent(user)}`).then(asJson<Song[]>);

export interface YoutubeInfo {
  title?: string;
  author_name?: string;
}

export const getYoutubeInfo = (url: string): Promise<YoutubeInfo> =>
  fetch(`/api/youtube-info?url=${encodeURIComponent(url)}`).then(asJson<YoutubeInfo>);

/** Create (POST) or update (PUT) a song; resolves to the refreshed songs list. */
export const saveSong = (payload: SongRequest, isEdit: boolean): Promise<Song[]> =>
  fetch('/api/songs', {
    method: isEdit ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(asJson<Song[]>);

/** Delete a song by id; resolves to the refreshed songs list. */
export const deleteSong = (id: string): Promise<Song[]> =>
  fetch(`/api/songs?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).then(asJson<Song[]>);
