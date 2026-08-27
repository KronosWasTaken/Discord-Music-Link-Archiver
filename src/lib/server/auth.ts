import { timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

export const AUTH_ENABLED = Boolean(env.BASIC_AUTH_USER && env.BASIC_AUTH_PASS);

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function checkCredentials(username: string, password: string): boolean {
  return safeEqual(username, env.BASIC_AUTH_USER ?? '') && safeEqual(password, env.BASIC_AUTH_PASS ?? '');
}
