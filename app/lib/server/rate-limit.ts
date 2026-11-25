import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting for the routes that cost money or write to the shared library.
 *
 * With Upstash Redis configured (the Vercel Marketplace integration sets
 * KV_REST_API_URL / KV_REST_API_TOKEN; Upstash's own names
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN also work) the counters
 * live in Redis and are shared by every serverless instance, so the limits are
 * real quotas.
 *
 * Without those variables (local dev, tests, CI) it falls back to an in-memory
 * sliding window. That only remembers requests seen by one warm instance, so in
 * production it is a speed bump, not a quota. Redis errors and timeouts also
 * fall back to the in-memory window rather than letting every request through.
 */

export type RateLimitRule = {
  /** Stable name; used as the Redis key prefix, so changing it resets counters. */
  name: string;
  limit: number;
  windowSeconds: number;
};

export const RATE_LIMITS = {
  /** AI generations and refinements per client IP. */
  generate: { name: 'generate', limit: 20, windowSeconds: 60 * 60 },
  /** AI generations and refinements across all clients, to cap total spend per day. */
  generateGlobal: {
    name: 'generate-global',
    limit: positiveInt(process.env.AI_DAILY_GENERATION_LIMIT, 200),
    windowSeconds: 24 * 60 * 60,
  },
  /** Games published to the shared library per client IP. */
  publish: { name: 'publish', limit: 10, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

/** Identifier for limits that apply to everyone together. */
export const GLOBAL_KEY = 'all';

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded?.split(',')[0] ?? request.headers.get('x-real-ip') ?? 'local').trim() || 'local';
}

// ---------------------------------------------------------------------------
// In-memory fallback

const buckets = new Map<string, number[]>();

/** In-memory sliding window. Returns seconds to wait if over the limit, or 0 if the request may proceed. */
export function checkMemoryRateLimit(key: string, limit: number, windowMs: number): number {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) {
    for (const [k, times] of buckets) {
      if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return 0;
}

/** Test helper: forget all in-memory counters and cached Redis clients. */
export function resetRateLimitState() {
  buckets.clear();
  limiters.clear();
  redis = null;
}

// ---------------------------------------------------------------------------
// Shared (Redis) limiter

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function isSharedRateLimitConfigured(): boolean {
  return redisConfig() !== null;
}

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function sharedLimiter(rule: RateLimitRule): Ratelimit | null {
  const config = redisConfig();
  if (!config) return null;
  const cacheKey = `${rule.name}:${rule.limit}:${rule.windowSeconds}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    redis ??= new Redis(config);
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSeconds} s`),
      prefix: `ratelimit:${rule.name}`,
      analytics: false,
      timeout: 3000,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

let warnedFallback = false;

/**
 * Counts one request for `id` under `rule`.
 * Returns seconds to wait if over the limit, or 0 if the request may proceed.
 */
export async function checkRateLimit(rule: RateLimitRule, id: string): Promise<number> {
  const memory = () => checkMemoryRateLimit(`${rule.name}:${id}`, rule.limit, rule.windowSeconds * 1000);
  const limiter = sharedLimiter(rule);

  if (!limiter) {
    if (!warnedFallback && process.env.VERCEL_ENV === 'production') {
      warnedFallback = true;
      console.warn('[rate-limit] Upstash Redis is not configured; using per-instance in-memory limits.');
    }
    return memory();
  }

  try {
    const result = await limiter.limit(id);
    if (result.reason === 'timeout') {
      console.warn(`[rate-limit] Redis timed out for ${rule.name}; using in-memory limit.`);
      return memory();
    }
    if (result.success) return 0;
    return Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  } catch (e) {
    console.error(`[rate-limit] Redis error for ${rule.name}; using in-memory limit.`, e);
    return memory();
  }
}

/** Human-friendly wait, e.g. "45 seconds", "12 minutes", "3 hours". */
export function formatWait(seconds: number): string {
  if (seconds < 90) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 90) return `${minutes} minutes`;
  return `${Math.ceil(minutes / 60)} hours`;
}
