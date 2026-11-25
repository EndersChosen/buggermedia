import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Upstash so no test ever talks to a real Redis.
const limitMock = vi.fn();
vi.mock('@upstash/redis', () => ({ Redis: vi.fn() }));
vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow = vi.fn(() => ({}));
    limit = limitMock;
  }
  return { Ratelimit };
});

import {
  checkMemoryRateLimit,
  checkRateLimit,
  clientKey,
  formatWait,
  isSharedRateLimitConfigured,
  resetRateLimitState,
  type RateLimitRule,
} from '../rate-limit';

const REDIS_VARS = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
const rule: RateLimitRule = { name: 'test', limit: 3, windowSeconds: 60 };

beforeEach(() => {
  for (const name of REDIS_VARS) vi.stubEnv(name, '');
  resetRateLimitState();
  limitMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('in-memory fallback (no Redis configured)', () => {
  it('reports the shared limiter as not configured', () => {
    expect(isSharedRateLimitConfigured()).toBe(false);
  });

  it('allows requests up to the limit, then asks the client to wait', async () => {
    expect(await checkRateLimit(rule, '1.2.3.4')).toBe(0);
    expect(await checkRateLimit(rule, '1.2.3.4')).toBe(0);
    expect(await checkRateLimit(rule, '1.2.3.4')).toBe(0);
    const wait = await checkRateLimit(rule, '1.2.3.4');
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(60);
    expect(limitMock).not.toHaveBeenCalled();
  });

  it('keeps separate counters per client and per rule', async () => {
    for (let i = 0; i < 3; i++) await checkRateLimit(rule, 'a');
    expect(await checkRateLimit(rule, 'a')).toBeGreaterThan(0);
    expect(await checkRateLimit(rule, 'b')).toBe(0);
    expect(await checkRateLimit({ ...rule, name: 'other' }, 'a')).toBe(0);
  });

  it('lets requests through again once the window has passed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    for (let i = 0; i < 3; i++) await checkRateLimit(rule, 'a');
    expect(await checkRateLimit(rule, 'a')).toBe(60);
    vi.advanceTimersByTime(30_000);
    expect(await checkRateLimit(rule, 'a')).toBe(30);
    vi.advanceTimersByTime(30_001);
    expect(await checkRateLimit(rule, 'a')).toBe(0);
  });

  it('checkMemoryRateLimit never returns a zero wait when blocked', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    expect(checkMemoryRateLimit('k', 1, 1000)).toBe(0);
    vi.advanceTimersByTime(999);
    expect(checkMemoryRateLimit('k', 1, 1000)).toBe(1);
  });
});

describe('shared limiter (Redis configured)', () => {
  beforeEach(() => {
    vi.stubEnv('KV_REST_API_URL', 'https://example.upstash.io');
    vi.stubEnv('KV_REST_API_TOKEN', 'test-token');
  });

  it('accepts the Vercel KV_* variable names', () => {
    expect(isSharedRateLimitConfigured()).toBe(true);
  });

  it('uses Redis and converts the reset time into seconds to wait', async () => {
    limitMock.mockResolvedValueOnce({ success: true, reset: Date.now() + 60_000 });
    expect(await checkRateLimit(rule, 'a')).toBe(0);
    limitMock.mockResolvedValueOnce({ success: false, reset: Date.now() + 42_000 });
    const wait = await checkRateLimit(rule, 'a');
    expect(wait).toBeGreaterThanOrEqual(41);
    expect(wait).toBeLessThanOrEqual(42);
    expect(limitMock).toHaveBeenCalledWith('a');
  });

  it('falls back to the in-memory limit when Redis throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    limitMock.mockRejectedValue(new Error('connection refused'));
    for (let i = 0; i < 3; i++) expect(await checkRateLimit(rule, 'a')).toBe(0);
    expect(await checkRateLimit(rule, 'a')).toBeGreaterThan(0);
  });

  it('falls back to the in-memory limit when Redis times out', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    limitMock.mockResolvedValue({ success: true, reset: 0, reason: 'timeout' });
    for (let i = 0; i < 3; i++) expect(await checkRateLimit(rule, 'a')).toBe(0);
    expect(await checkRateLimit(rule, 'a')).toBeGreaterThan(0);
  });
});

describe('helpers', () => {
  it('clientKey uses the first forwarded address', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': ' 9.9.9.9 , 10.0.0.1' } });
    expect(clientKey(req)).toBe('9.9.9.9');
    expect(clientKey(new Request('http://x', { headers: { 'x-real-ip': '8.8.8.8' } }))).toBe('8.8.8.8');
    expect(clientKey(new Request('http://x'))).toBe('local');
  });

  it('formatWait picks a readable unit', () => {
    expect(formatWait(45)).toBe('45 seconds');
    expect(formatWait(600)).toBe('10 minutes');
    expect(formatWait(5 * 3600)).toBe('5 hours');
  });
});
