import type { PageServerLoad } from './$types';
import { ensureReady } from '$lib/server/init';
import { CURATOR, getUsers, getSongsByUser } from '$lib/server/db/queries';

// Server-render the initial payload so the page paints with the curator's
// songs already in place — no loading spinner on first visit.
export const load: PageServerLoad = async () => {
  await ensureReady();
  return {
    user: CURATOR,
    users: await getUsers(),
    songs: await getSongsByUser(CURATOR)
  };
};
