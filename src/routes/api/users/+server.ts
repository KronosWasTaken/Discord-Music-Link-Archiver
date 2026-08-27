import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureReady } from '$lib/server/init';
import { getUsers } from '$lib/server/db/queries';

export const GET: RequestHandler = async () => {
  await ensureReady();
  return json(await getUsers());
};
