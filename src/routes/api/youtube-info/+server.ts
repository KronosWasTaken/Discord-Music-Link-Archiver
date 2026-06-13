import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const target = url.searchParams.get('url');
  if (!target) return text('url query param is required', { status: 400 });

  const normalized = target.includes('music.youtube.com')
    ? target.replace('music.youtube.com', 'www.youtube.com')
    : target;

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(normalized)}&format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return text(`YouTube returned ${res.status}`, { status: 502 });
    return json(await res.json());
  } catch (err) {
    return text(`Error fetching YouTube info: ${(err as Error).message}`, { status: 502 });
  }
};
