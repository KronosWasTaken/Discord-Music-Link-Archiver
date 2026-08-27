import Redis from 'ioredis';
import { randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';

const redis = env.VALKEY_URL ? new Redis(env.VALKEY_URL, { maxRetriesPerRequest: 1, connectTimeout: 2000 }) : null;

redis?.on('error', (err) => console.error('Valkey error:', err.message));

const VERSION_KEY = 'songs:version';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function bumpVersion(): Promise<void> {
  if (!redis) return;
  try {
    await redis.incr(VERSION_KEY);
  } catch (err) {
    console.error('Valkey version bump failed:', (err as Error).message);
  }
}

export async function cached<T>(key: string, ttlSeconds: number, compute: () => T | Promise<T>): Promise<T> {
  if (!redis) return compute();
  try {
    const version = (await redis.get(VERSION_KEY)) ?? '0';
    const fullKey = `${key}:v${version}`;
    const hit = await redis.get(fullKey);
    if (hit !== null) return JSON.parse(hit) as T;
    const value = await compute();
    await redis.set(fullKey, JSON.stringify(value), 'EX', ttlSeconds);
    return value;
  } catch (err) {
    console.error('Valkey cache read failed:', (err as Error).message);
    return compute();
  }
}

export async function createSession(): Promise<string | null> {
  if (!redis) return null;
  const token = randomBytes(32).toString('hex');
  try {
    await redis.set(`session:${token}`, '1', 'EX', SESSION_TTL_SECONDS);
    return token;
  } catch (err) {
    console.error('Valkey session create failed:', (err as Error).message);
    return null;
  }
}

export async function isValidSession(token: string): Promise<boolean> {
  if (!redis || !token) return false;
  try {
    return (await redis.exists(`session:${token}`)) === 1;
  } catch (err) {
    console.error('Valkey session check failed:', (err as Error).message);
    return false;
  }
}

export async function destroySession(token: string): Promise<void> {
  if (!redis || !token) return;
  try {
    await redis.del(`session:${token}`);
  } catch (err) {
    console.error('Valkey session delete failed:', (err as Error).message);
  }
}

export async function isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (!redis) return false;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count > limit;
  } catch (err) {
    console.error('Valkey rate limit check failed:', (err as Error).message);
    return false;
  }
}
