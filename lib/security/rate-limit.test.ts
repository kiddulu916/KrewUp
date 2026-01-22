import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  rateLimit,
  createUserRateLimiter,
  RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limit';

// ============================================================================
// Test Setup and Mocks
// ============================================================================

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock Upstash Redis and Ratelimit
const mockRedisLimit = vi.fn();
const mockRedisFromEnv = vi.fn();

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: mockRedisLimit,
  })),
}));

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: mockRedisFromEnv,
  },
}));

// ============================================================================
// Helper Functions
// ============================================================================

function createMockHeaders(headers: Record<string, string>) {
  const { headers: nextHeaders } = require('next/headers');
  nextHeaders.mockResolvedValue({
    get: (key: string) => headers[key.toLowerCase()] || null,
  });
}

function clearEnvironmentVars() {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.NODE_ENV;
  delete process.env.VERCEL_ENV;
}

function setDevelopmentEnv() {
  process.env.NODE_ENV = 'development';
  clearRedisEnv();
}

function setProductionEnv() {
  process.env.NODE_ENV = 'production';
}

function setRedisEnv() {
  process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
}

function clearRedisEnv() {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
}

// ============================================================================
// Rate Limit Configuration Tests
// ============================================================================

describe('RATE_LIMITS configuration', () => {
  it('should have strict auth limits', () => {
    expect(RATE_LIMITS.auth).toEqual({
      limit: 5,
      windowSeconds: 60,
    });
  });

  it('should have strict signup limits', () => {
    expect(RATE_LIMITS.authSignup).toEqual({
      limit: 3,
      windowSeconds: 60,
    });
  });

  it('should have standard message limits', () => {
    expect(RATE_LIMITS.message).toEqual({
      limit: 30,
      windowSeconds: 60,
    });
  });

  it('should have standard upload limits', () => {
    expect(RATE_LIMITS.upload).toEqual({
      limit: 10,
      windowSeconds: 60,
    });
  });

  it('should have relaxed search limits', () => {
    expect(RATE_LIMITS.search).toEqual({
      limit: 60,
      windowSeconds: 60,
    });
  });

  it('should have admin action limits', () => {
    expect(RATE_LIMITS.adminAction).toEqual({
      limit: 20,
      windowSeconds: 60,
    });
  });
});

// ============================================================================
// In-Memory Rate Limiting Tests
// ============================================================================

describe('checkRateLimit - In-Memory Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDevelopmentEnv();
    createMockHeaders({ 'x-forwarded-for': '192.168.1.1' });
  });

  afterEach(() => {
    clearEnvironmentVars();
  });

  it('should allow requests within limit', async () => {
    const config: RateLimitConfig = { limit: 5, windowSeconds: 60 };

    const result = await checkRateLimit('test:action', config);

    expect(result.success).toBe(true);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(4);
    expect(result.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should block requests exceeding limit', async () => {
    const config: RateLimitConfig = { limit: 2, windowSeconds: 60 };

    // Make 3 requests (should exceed limit of 2)
    await checkRateLimit('test:exceed', config);
    await checkRateLimit('test:exceed', config);
    const result = await checkRateLimit('test:exceed', config);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should reset count after window expires', async () => {
    const config: RateLimitConfig = { limit: 2, windowSeconds: 1 };

    // First request
    const result1 = await checkRateLimit('test:reset', config);
    expect(result1.success).toBe(true);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Should allow request again
    const result2 = await checkRateLimit('test:reset', config);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);
  });

  it('should track remaining count correctly', async () => {
    const config: RateLimitConfig = { limit: 3, windowSeconds: 60 };

    const result1 = await checkRateLimit('test:remaining', config);
    expect(result1.remaining).toBe(2);

    const result2 = await checkRateLimit('test:remaining', config);
    expect(result2.remaining).toBe(1);

    const result3 = await checkRateLimit('test:remaining', config);
    expect(result3.remaining).toBe(0);
  });

  it('should isolate limits by action key', async () => {
    const config: RateLimitConfig = { limit: 2, windowSeconds: 60 };

    await checkRateLimit('test:action1', config);
    await checkRateLimit('test:action1', config);
    const result1 = await checkRateLimit('test:action1', config);
    expect(result1.success).toBe(false);

    // Different action key should have separate limit
    const result2 = await checkRateLimit('test:action2', config);
    expect(result2.success).toBe(true);
  });

  it('should isolate limits by identifier', async () => {
    const config: RateLimitConfig = { limit: 2, windowSeconds: 60 };

    createMockHeaders({ 'x-forwarded-for': '192.168.1.1' });
    await checkRateLimit('test:isolation', config);
    await checkRateLimit('test:isolation', config);
    const result1 = await checkRateLimit('test:isolation', config);
    expect(result1.success).toBe(false);

    // Different IP should have separate limit
    createMockHeaders({ 'x-forwarded-for': '192.168.1.2' });
    const result2 = await checkRateLimit('test:isolation', config);
    expect(result2.success).toBe(true);
  });

  it('should use custom identifier function', async () => {
    const config: RateLimitConfig = {
      limit: 2,
      windowSeconds: 60,
      identifier: async () => 'custom-user-123',
    };

    await checkRateLimit('test:custom', config);
    await checkRateLimit('test:custom', config);
    const result = await checkRateLimit('test:custom', config);

    expect(result.success).toBe(false);
  });

  it('should calculate retryAfter correctly', async () => {
    const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };

    await checkRateLimit('test:retry', config);
    const result = await checkRateLimit('test:retry', config);

    expect(result.success).toBe(false);
    expect(result.retryAfter).toBeLessThanOrEqual(60);
    expect(result.retryAfter).toBeGreaterThan(0);
  });
});

// ============================================================================
// Client Identifier Tests
// ============================================================================

describe('Client Identifier Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDevelopmentEnv();
  });

  afterEach(() => {
    clearEnvironmentVars();
  });

  it('should extract IP from x-forwarded-for header', async () => {
    createMockHeaders({ 'x-forwarded-for': '203.0.113.1' });

    const result = await checkRateLimit('test:xff', {
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.success).toBe(true);
  });

  it('should use first IP from x-forwarded-for chain', async () => {
    createMockHeaders({ 'x-forwarded-for': '203.0.113.1, 198.51.100.1' });

    const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };
    await checkRateLimit('test:chain', config);
    const result = await checkRateLimit('test:chain', config);

    expect(result.success).toBe(false);
  });

  it('should fallback to x-real-ip header', async () => {
    createMockHeaders({ 'x-real-ip': '203.0.113.2' });

    const result = await checkRateLimit('test:real-ip', {
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.success).toBe(true);
  });

  it('should fallback to x-vercel-forwarded-for header', async () => {
    createMockHeaders({ 'x-vercel-forwarded-for': '203.0.113.3' });

    const result = await checkRateLimit('test:vercel', {
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.success).toBe(true);
  });

  it('should fallback to cf-connecting-ip header', async () => {
    createMockHeaders({ 'cf-connecting-ip': '203.0.113.4' });

    const result = await checkRateLimit('test:cloudflare', {
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.success).toBe(true);
  });

  it('should use unknown when no IP headers present', async () => {
    createMockHeaders({});

    const result = await checkRateLimit('test:unknown', {
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.success).toBe(true);
  });

  it('should prioritize x-forwarded-for over other headers', async () => {
    createMockHeaders({
      'x-forwarded-for': '203.0.113.1',
      'x-real-ip': '203.0.113.2',
      'x-vercel-forwarded-for': '203.0.113.3',
      'cf-connecting-ip': '203.0.113.4',
    });

    const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };
    await checkRateLimit('test:priority', config);
    const result = await checkRateLimit('test:priority', config);

    // Should be rate limited as same IP
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Redis Rate Limiting Tests (Mocked)
// ============================================================================

describe('checkRateLimit - Redis Store (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDevelopmentEnv();
    setRedisEnv();
    createMockHeaders({ 'x-forwarded-for': '192.168.1.1' });

    // Mock Redis client creation
    mockRedisFromEnv.mockReturnValue({});
  });

  afterEach(() => {
    clearEnvironmentVars();
    mockRedisFromEnv.mockReset();
    mockRedisLimit.mockReset();
  });

  it('should use Redis when configured', async () => {
    mockRedisLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Math.floor(Date.now() / 1000) + 60,
    });

    const result = await checkRateLimit('test:redis', {
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.success).toBe(true);
    expect(mockRedisLimit).toHaveBeenCalled();
  });

  it('should return Redis rate limit response', async () => {
    const resetTime = Math.floor(Date.now() / 1000) + 60;
    mockRedisLimit.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: resetTime,
    });

    const result = await checkRateLimit('test:redis-blocked', {
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should fallback to memory on Redis error', async () => {
    mockRedisLimit.mockRejectedValue(new Error('Redis connection failed'));

    const result = await checkRateLimit('test:redis-fallback', {
      limit: 5,
      windowSeconds: 60,
    });

    // Should still succeed using in-memory fallback
    expect(result.success).toBe(true);
  });

  it('should capture Sentry exception on Redis error', async () => {
    const Sentry = require('@sentry/nextjs');
    mockRedisLimit.mockRejectedValue(new Error('Redis timeout'));

    await checkRateLimit('test:sentry', { limit: 5, windowSeconds: 60 });

    expect(Sentry.captureException).toHaveBeenCalled();
  });
});

// ============================================================================
// Production Environment Tests
// ============================================================================

describe('Production Environment Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMockHeaders({ 'x-forwarded-for': '192.168.1.1' });
  });

  afterEach(() => {
    clearEnvironmentVars();
  });

  it('should throw error in production without Redis', async () => {
    setProductionEnv();
    clearRedisEnv();

    await expect(
      checkRateLimit('test:prod-fail', { limit: 5, windowSeconds: 60 })
    ).rejects.toThrow('Redis rate limiting is not configured in production');
  });

  it('should capture fatal Sentry error in production without Redis', async () => {
    const Sentry = require('@sentry/nextjs');
    setProductionEnv();
    clearRedisEnv();

    try {
      await checkRateLimit('test:prod-sentry', { limit: 5, windowSeconds: 60 });
    } catch (error) {
      // Expected to throw
    }

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        level: 'fatal',
        tags: expect.objectContaining({
          component: 'rate-limiter',
        }),
      })
    );
  });

  it('should allow in-memory fallback in development', async () => {
    setDevelopmentEnv();
    clearRedisEnv();

    const result = await checkRateLimit('test:dev-memory', {
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.success).toBe(true);
  });

  it('should work in production with Redis configured', async () => {
    setProductionEnv();
    setRedisEnv();
    mockRedisFromEnv.mockReturnValue({});
    mockRedisLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Math.floor(Date.now() / 1000) + 60,
    });

    const result = await checkRateLimit('test:prod-redis', {
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.success).toBe(true);
  });
});

// ============================================================================
// rateLimit Wrapper Tests
// ============================================================================

describe('rateLimit wrapper function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDevelopmentEnv();
    createMockHeaders({ 'x-forwarded-for': '192.168.1.1' });
  });

  afterEach(() => {
    clearEnvironmentVars();
  });

  it('should return null when within limits', async () => {
    const result = await rateLimit('test:wrapper-allow', {
      limit: 5,
      windowSeconds: 60,
    });

    expect(result).toBeNull();
  });

  it('should return error object when rate limited', async () => {
    const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };

    await rateLimit('test:wrapper-block', config);
    const result = await rateLimit('test:wrapper-block', config);

    expect(result).not.toBeNull();
    expect(result?.success).toBe(false);
    expect(result?.error).toContain('Too many attempts');
    expect(result?.error).toContain('seconds');
  });

  it('should include retry time in error message', async () => {
    const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };

    await rateLimit('test:wrapper-retry', config);
    const result = await rateLimit('test:wrapper-retry', config);

    expect(result?.error).toMatch(/\d+ seconds/);
  });
});

// ============================================================================
// User Rate Limiter Tests
// ============================================================================

describe('createUserRateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDevelopmentEnv();
    createMockHeaders({ 'x-forwarded-for': '192.168.1.1' });
  });

  afterEach(() => {
    clearEnvironmentVars();
  });

  it('should create rate limiter with user ID', async () => {
    const userRateLimit = createUserRateLimiter('user-123');

    const result = await userRateLimit('test:user', {
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.success).toBe(true);
  });

  it('should isolate limits by user ID', async () => {
    const config: RateLimitConfig = { limit: 2, windowSeconds: 60 };

    const user1RateLimit = createUserRateLimiter('user-1');
    await user1RateLimit('test:user-isolation', config);
    await user1RateLimit('test:user-isolation', config);
    const result1 = await user1RateLimit('test:user-isolation', config);
    expect(result1.success).toBe(false);

    // Different user should have separate limit
    const user2RateLimit = createUserRateLimiter('user-2');
    const result2 = await user2RateLimit('test:user-isolation', config);
    expect(result2.success).toBe(true);
  });

  it('should enforce limits per user regardless of IP', async () => {
    const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };
    const userRateLimit = createUserRateLimiter('user-456');

    createMockHeaders({ 'x-forwarded-for': '192.168.1.1' });
    await userRateLimit('test:user-ip', config);

    // Same user from different IP should still be rate limited
    createMockHeaders({ 'x-forwarded-for': '192.168.1.2' });
    const result = await userRateLimit('test:user-ip', config);
    expect(result.success).toBe(false);
  });

  it('should work with different action keys per user', async () => {
    const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };
    const userRateLimit = createUserRateLimiter('user-789');

    await userRateLimit('test:action-a', config);
    const result1 = await userRateLimit('test:action-a', config);
    expect(result1.success).toBe(false);

    // Different action should have separate limit
    const result2 = await userRateLimit('test:action-b', config);
    expect(result2.success).toBe(true);
  });
});

// ============================================================================
// Sentry Integration Tests
// ============================================================================

describe('Sentry Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDevelopmentEnv();
    createMockHeaders({ 'x-forwarded-for': '192.168.1.1' });
  });

  afterEach(() => {
    clearEnvironmentVars();
  });

  it('should log rate limit exceeded to Sentry', async () => {
    const Sentry = require('@sentry/nextjs');
    const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };

    await checkRateLimit('test:sentry-log', config);
    await checkRateLimit('test:sentry-log', config);

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Rate limit exceeded: test:sentry-log',
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({
          action: 'test:sentry-log',
          rateLimiter: 'memory',
        }),
      })
    );
  });

  it('should include rate limit details in Sentry log', async () => {
    const Sentry = require('@sentry/nextjs');
    const config: RateLimitConfig = { limit: 5, windowSeconds: 60 };

    // Exceed limit
    for (let i = 0; i < 6; i++) {
      await checkRateLimit('test:sentry-details', config);
    }

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        extra: expect.objectContaining({
          limit: 5,
          windowSeconds: 60,
        }),
      })
    );
  });

  it('should truncate identifier in Sentry logs', async () => {
    const Sentry = require('@sentry/nextjs');
    const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };

    createMockHeaders({ 'x-forwarded-for': '192.168.1.123' });
    await checkRateLimit('test:sentry-truncate', config);
    await checkRateLimit('test:sentry-truncate', config);

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        tags: expect.objectContaining({
          identifier: expect.stringMatching(/^\d{1,10}\.\.\./),
        }),
      })
    );
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDevelopmentEnv();
    createMockHeaders({ 'x-forwarded-for': '192.168.1.1' });
  });

  afterEach(() => {
    clearEnvironmentVars();
  });

  it('should handle very short time windows', async () => {
    const config: RateLimitConfig = { limit: 2, windowSeconds: 1 };

    const result1 = await checkRateLimit('test:short-window', config);
    expect(result1.success).toBe(true);

    const result2 = await checkRateLimit('test:short-window', config);
    expect(result2.success).toBe(true);

    const result3 = await checkRateLimit('test:short-window', config);
    expect(result3.success).toBe(false);
  });

  it('should handle zero remaining correctly', async () => {
    const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };

    const result = await checkRateLimit('test:zero-remaining', config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('should handle concurrent requests to same key', async () => {
    const config: RateLimitConfig = { limit: 3, windowSeconds: 60 };

    const promises = Array.from({ length: 5 }, () =>
      checkRateLimit('test:concurrent', config)
    );

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r.success).length;

    // Should allow at most 3 successful requests
    expect(successCount).toBeLessThanOrEqual(3);
  });

  it('should handle empty action key', async () => {
    const result = await checkRateLimit('', { limit: 5, windowSeconds: 60 });
    expect(result).toBeDefined();
    expect(result.limit).toBe(5);
  });

  it('should handle special characters in action key', async () => {
    const result = await checkRateLimit('test:action:with:colons', {
      limit: 5,
      windowSeconds: 60,
    });
    expect(result.success).toBe(true);
  });
});
