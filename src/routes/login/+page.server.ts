import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';
import { checkCredentials } from '$lib/server/auth';
import { createSession, isValidSession, isRateLimited } from '$lib/server/valkey';

const SESSION_COOKIE = 'session';
const AUTH_FAIL_LIMIT = 30;
const AUTH_FAIL_WINDOW_SECONDS = 300;

function safeRedirectTarget(target: string | null): string {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
}

export const load: PageServerLoad = async ({ cookies, url }) => {
  const token = cookies.get(SESSION_COOKIE);
  if (token && (await isValidSession(token))) {
    throw redirect(303, safeRedirectTarget(url.searchParams.get('redirect')));
  }
};

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress, url }) => {
    const data = await request.formData();
    const username = String(data.get('username') ?? '');
    const password = String(data.get('password') ?? '');
    const redirectTo = safeRedirectTarget(url.searchParams.get('redirect'));

    if (!checkCredentials(username, password)) {
      const ip = getClientAddress();
      if (await isRateLimited(`auth-fail:${ip}`, AUTH_FAIL_LIMIT, AUTH_FAIL_WINDOW_SECONDS)) {
        return fail(429, { error: 'Too many failed attempts. Try again in a few minutes.' });
      }
      return fail(401, { error: 'Incorrect username or password.' });
    }

    const token = await createSession();
    if (!token) return fail(503, { error: 'Login is temporarily unavailable. Try again shortly.' });

    cookies.set(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      secure: !dev,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30
    });

    throw redirect(303, redirectTo);
  }
};
