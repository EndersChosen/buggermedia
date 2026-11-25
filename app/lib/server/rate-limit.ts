import 'server-only';

/**
 * Best-effort, in-memory rate limiter keyed by client IP.
 *
 * Serverless instances don't share memory, so this only slows down a single
 * abusive client hitting a warm instance; it is not a hard quota. A shared
 * store (e.g. Upstash/Vercel KV) would be needed for strict limits.
 */

const buckets = new Map<string, number[]>();

export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded?.split(',')[0] ?? request.headers.get('x-real-ip') ?? 'local').trim();
}

/** Returns seconds to wait if over the limit, or 0 if the request may proceed. */
export function checkRateLimit(key: string, limit: number, windowMs: number): number {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return Math.ceil((windowMs - (now - recent[0])) / 1000);
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
