import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession } from '$lib/server/valkey';

export const POST: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('session');
  if (token) await destroySession(token);
  cookies.delete('session', { path: '/' });
  throw redirect(303, '/login');
};
