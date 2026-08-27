import { redirect, type Handle } from '@sveltejs/kit';
import { AUTH_ENABLED } from '$lib/server/auth';
import { isValidSession } from '$lib/server/valkey';

const SESSION_COOKIE = 'session';
const PUBLIC_PREFIXES = ['/login', '/_app/', '/favicon.svg', '/icons.svg'];

export const handle: Handle = async ({ event, resolve }) => {
  if (!AUTH_ENABLED) return resolve(event);
  if (PUBLIC_PREFIXES.some((p) => event.url.pathname.startsWith(p))) return resolve(event);

  const token = event.cookies.get(SESSION_COOKIE);
  if (token && (await isValidSession(token))) return resolve(event);

  if (event.url.pathname.startsWith('/api')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const redirectTo = event.url.pathname + event.url.search;
  throw redirect(303, `/login?redirect=${encodeURIComponent(redirectTo)}`);
};
