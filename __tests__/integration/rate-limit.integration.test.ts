/**
 * Integration tests for the rate-limit module
 *
 * Tests the rate-limit module with the real in-memory store.
 * Only mocks external dependencies (next/headers, Sentry, Upstash).
 *
 * @see lib/security/rate-limit.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock external dependencies ONLY

// Mock next/headers - return mock headers with x-forwarded-for
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

// Mock Sentry - mock captureMessage and captureException
vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

// Mock Upstash to force in-memory fallback
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => null),
  },
}));

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';

describe('Rate Limit Integration Tests', () => {
  const mockHeaders = headers as unknown as ReturnType<typeof vi.fn>;
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    // Reset modules to clear the in-memory store between tests
    vi.resetModules();

    // Store original Date.now for restoration
    originalDateNow = Date.now;

    // Default mock for headers - return x-forwarded-for
    mockHeaders.mockResolvedValue({
      get: vi.fn((header: string) => {
        if (header === 'x-forwarded-for') return '192.168.1.100';
        return null;
      }),
    });

    // Clear all mock call history
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore Date.now
    Date.now = originalDateNow;
    vi.clearAllMocks();
  });

  describe('RATE_LIMITS configuration', () => {
    it('should export correct rate limit configurations for all action types', async () => {
      const { RATE_LIMITS } = await import('@/lib/security/rate-limit');

      // Auth limits - strict for brute force protection
      expect(RATE_LIMITS.auth).toEqual({
        limit: 5,
        windowSeconds: 60,
      });

      expect(RATE_LIMITS.authSignup).toEqual({
        limit: 3,
        windowSeconds: 60,
      });

      // Standard limits for general actions
      expect(RATE_LIMITS.message).toEqual({
        limit: 30,
        windowSeconds: 60,
      });

      expect(RATE_LIMITS.upload).toEqual({
        limit: 10,
        windowSeconds: 60,
      });

      // Relaxed limits for read operations
      expect(RATE_LIMITS.search).toEqual({
        limit: 60,
        windowSeconds: 60,
      });

      // Admin actions
      expect(RATE_LIMITS.adminAction).toEqual({
        limit: 20,
        windowSeconds: 60,
      });
    });

    it('should have all rate limits configured with 60-second windows', async () => {
      const { RATE_LIMITS } = await import('@/lib/security/rate-limit');

      Object.values(RATE_LIMITS).forEach((config) => {
        expect(config.windowSeconds).toBe(60);
      });
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within the limit', async () => {
      const { checkRateLimit } = await import('@/lib/security/rate-limit');

      const result = await checkRateLimit('integration:test:allow', {
        limit: 5,
        windowSeconds: 60,
      });

      expect(result.success).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
      expect(result.reset).toBeGreaterThan(0);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should block requests exceeding the limit', async () => {
      const { checkRateLimit } = await import('@/lib/security/rate-limit');
      const config = { limit: 3, windowSeconds: 60 };

      // Make requests up to the limit
      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit('integration:test:block', config);
        expect(result.success).toBe(true);
      }

      // Next request should be blocked
      const blockedResult = await checkRateLimit('integration:test:block', config);

      expect(blockedResult.success).toBe(false);
      expect(blockedResult.remaining).toBe(0);
      expect(blockedResult.retryAfter).toBeDefined();
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });

    it('should track remaining requests correctly', async () => {
      const { checkRateLimit } = await import('@/lib/security/rate-limit');
      const config = { limit: 5, windowSeconds: 60 };

      const result1 = await checkRateLimit('integration:test:remaining', config);
      expect(result1.remaining).toBe(4);

      const result2 = await checkRateLimit('integration:test:remaining', config);
      expect(result2.remaining).toBe(3);

      const result3 = await checkRateLimit('integration:test:remaining', config);
      expect(result3.remaining).toBe(2);

      const result4 = await checkRateLimit('integration:test:remaining', config);
      expect(result4.remaining).toBe(1);

      const result5 = await checkRateLimit('integration:test:remaining', config);
      expect(result5.remaining).toBe(0);
      expect(result5.success).toBe(true); // Last allowed request

      const result6 = await checkRateLimit('integration:test:remaining', config);
      expect(result6.remaining).toBe(0);
      expect(result6.success).toBe(false); // Now blocked
    });

    it('should track rate limits independently across different action types', async () => {
      const { checkRateLimit } = await import('@/lib/security/rate-limit');

      // Exhaust limit for action1
      for (let i = 0; i < 3; i++) {
        await checkRateLimit('action:type:one', { limit: 3, windowSeconds: 60 });
      }
      const action1Blocked = await checkRateLimit('action:type:one', {
        limit: 3,
        windowSeconds: 60,
      });
      expect(action1Blocked.success).toBe(false);

      // action2 should still be allowed (independent tracking)
      const action2Result = await checkRateLimit('action:type:two', {
        limit: 3,
        windowSeconds: 60,
      });
      expect(action2Result.success).toBe(true);
      expect(action2Result.remaining).toBe(2);

      // action3 with different limit should also work independently
      const action3Result = await checkRateLimit('action:type:three', {
        limit: 10,
        windowSeconds: 60,
      });
      expect(action3Result.success).toBe(true);
      expect(action3Result.remaining).toBe(9);
    });

    it('should track rate limits independently across different IP addresses', async () => {
      const { checkRateLimit } = await import('@/lib/security/rate-limit');
      const config = { limit: 2, windowSeconds: 60 };

      // First IP exhausts limit
      mockHeaders.mockResolvedValue({
        get: vi.fn((header: string) => {
          if (header === 'x-forwarded-for') return '10.0.0.1';
          return null;
        }),
      });

      await checkRateLimit('integration:test:ip', config);
      await checkRateLimit('integration:test:ip', config);
      const ip1Blocked = await checkRateLimit('integration:test:ip', config);
      expect(ip1Blocked.success).toBe(false);

      // Second IP should still have its full limit
      mockHeaders.mockResolvedValue({
        get: vi.fn((header: string) => {
          if (header === 'x-forwarded-for') return '10.0.0.2';
          return null;
        }),
      });

      const ip2Result = await checkRateLimit('integration:test:ip', config);
      expect(ip2Result.success).toBe(true);
      expect(ip2Result.remaining).toBe(1);
    });

    it('should reset rate limit after window expires', async () => {
      const baseTime = 1700000000000; // Fixed timestamp for testing
      let currentTime = baseTime;
      Date.now = vi.fn(() => currentTime);

      const { checkRateLimit } = await import('@/lib/security/rate-limit');
      const config = { limit: 2, windowSeconds: 60 };

      // Exhaust the limit
      await checkRateLimit('integration:test:reset', config);
      await checkRateLimit('integration:test:reset', config);
      const blockedResult = await checkRateLimit('integration:test:reset', config);
      expect(blockedResult.success).toBe(false);

      // Advance time past the window (61 seconds)
      currentTime = baseTime + 61 * 1000;

      // Should be allowed again with full limit
      const resetResult = await checkRateLimit('integration:test:reset', config);
      expect(resetResult.success).toBe(true);
      expect(resetResult.remaining).toBe(1); // New window started
    });

    it('should return correct reset timestamp', async () => {
      const baseTime = 1700000000000; // Fixed timestamp
      Date.now = vi.fn(() => baseTime);

      const { checkRateLimit } = await import('@/lib/security/rate-limit');
      const config = { limit: 5, windowSeconds: 60 };

      const result = await checkRateLimit('integration:test:timestamp', config);

      // Reset should be windowStart + windowSeconds (in seconds)
      const expectedReset = Math.ceil((baseTime + 60 * 1000) / 1000);
      expect(result.reset).toBe(expectedReset);
    });

    it('should calculate retryAfter correctly when rate limited', async () => {
      const baseTime = 1700000000000;
      let currentTime = baseTime;
      Date.now = vi.fn(() => currentTime);

      const { checkRateLimit } = await import('@/lib/security/rate-limit');
      const config = { limit: 2, windowSeconds: 60 };

      // Exhaust limit at baseTime
      await checkRateLimit('integration:test:retry', config);
      await checkRateLimit('integration:test:retry', config);

      // Advance 30 seconds into the window
      currentTime = baseTime + 30 * 1000;

      const blockedResult = await checkRateLimit('integration:test:retry', config);

      expect(blockedResult.success).toBe(false);
      // retryAfter should be ~30 seconds (remaining time in window)
      expect(blockedResult.retryAfter).toBe(30);
    });

    it('should log rate limit exceeded to Sentry', async () => {
      const { checkRateLimit } = await import('@/lib/security/rate-limit');
      const config = { limit: 2, windowSeconds: 60 };

      // Exhaust limit
      await checkRateLimit('integration:test:sentry', config);
      await checkRateLimit('integration:test:sentry', config);

      // This should trigger Sentry logging
      await checkRateLimit('integration:test:sentry', config);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Rate limit exceeded: integration:test:sentry',
        expect.objectContaining({
          level: 'warning',
          tags: expect.objectContaining({
            action: 'integration:test:sentry',
            rateLimiter: 'memory',
          }),
        })
      );
    });

    it('should use custom identifier function when provided', async () => {
      const { checkRateLimit } = await import('@/lib/security/rate-limit');

      const customId = 'custom-identifier-12345';
      const config = {
        limit: 2,
        windowSeconds: 60,
        identifier: vi.fn().mockResolvedValue(customId),
      };

      // Exhaust limit for custom identifier
      await checkRateLimit('integration:test:custom', config);
      await checkRateLimit('integration:test:custom', config);
      const blocked = await checkRateLimit('integration:test:custom', config);

      expect(config.identifier).toHaveBeenCalledTimes(3);
      expect(blocked.success).toBe(false);

      // Different custom identifier should have separate limit
      const config2 = {
        limit: 2,
        windowSeconds: 60,
        identifier: vi.fn().mockResolvedValue('different-id'),
      };

      const result = await checkRateLimit('integration:test:custom', config2);
      expect(result.success).toBe(true);
    });
  });

  describe('rateLimit wrapper', () => {
    it('should return null when within rate limits', async () => {
      const { rateLimit } = await import('@/lib/security/rate-limit');

      const result = await rateLimit('integration:wrapper:allow', {
        limit: 5,
        windowSeconds: 60,
      });

      expect(result).toBeNull();
    });

    it('should return error object when rate limited', async () => {
      const { rateLimit } = await import('@/lib/security/rate-limit');
      const config = { limit: 2, windowSeconds: 60 };

      // Exhaust limit
      await rateLimit('integration:wrapper:block', config);
      await rateLimit('integration:wrapper:block', config);

      // Should return error object
      const result = await rateLimit('integration:wrapper:block', config);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect(result?.error).toMatch(/Too many attempts/);
      expect(result?.error).toMatch(/Please try again in \d+ seconds/);
    });

    it('should include retry time in error message', async () => {
      const baseTime = 1700000000000;
      let currentTime = baseTime;
      Date.now = vi.fn(() => currentTime);

      const { rateLimit } = await import('@/lib/security/rate-limit');
      const config = { limit: 1, windowSeconds: 60 };

      await rateLimit('integration:wrapper:time', config);

      // Advance 20 seconds
      currentTime = baseTime + 20 * 1000;

      const result = await rateLimit('integration:wrapper:time', config);

      expect(result?.error).toContain('40 seconds'); // 60 - 20 = 40
    });
  });

  describe('createUserRateLimiter', () => {
    it('should use user ID as identifier instead of IP', async () => {
      const { createUserRateLimiter } = await import('@/lib/security/rate-limit');

      const userId = 'user-uuid-12345';
      const userLimiter = createUserRateLimiter(userId);

      const result = await userLimiter('integration:user:action', {
        limit: 5,
        windowSeconds: 60,
      });

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track limits per user independently', async () => {
      const { createUserRateLimiter } = await import('@/lib/security/rate-limit');
      const config = { limit: 2, windowSeconds: 60 };

      const user1Limiter = createUserRateLimiter('user-1');
      const user2Limiter = createUserRateLimiter('user-2');

      // Exhaust user1's limit
      await user1Limiter('integration:user:track', config);
      await user1Limiter('integration:user:track', config);
      const user1Blocked = await user1Limiter('integration:user:track', config);

      expect(user1Blocked.success).toBe(false);

      // user2 should still have their full limit
      const user2Result = await user2Limiter('integration:user:track', config);
      expect(user2Result.success).toBe(true);
      expect(user2Result.remaining).toBe(1);
    });

    it('should track different actions independently for same user', async () => {
      const { createUserRateLimiter } = await import('@/lib/security/rate-limit');

      const userLimiter = createUserRateLimiter('user-123');

      // Exhaust limit for action1
      for (let i = 0; i < 3; i++) {
        await userLimiter('action:one', { limit: 3, windowSeconds: 60 });
      }
      const action1Blocked = await userLimiter('action:one', { limit: 3, windowSeconds: 60 });
      expect(action1Blocked.success).toBe(false);

      // action2 should still be allowed for same user
      const action2Result = await userLimiter('action:two', { limit: 3, windowSeconds: 60 });
      expect(action2Result.success).toBe(true);
    });

    it('should respect different rate limit configurations per action', async () => {
      const { createUserRateLimiter, RATE_LIMITS } = await import('@/lib/security/rate-limit');

      const userLimiter = createUserRateLimiter('user-456');

      // Use auth limit (5 per minute)
      const authResult = await userLimiter('auth:login', RATE_LIMITS.auth);
      expect(authResult.success).toBe(true);
      expect(authResult.limit).toBe(5);
      expect(authResult.remaining).toBe(4);

      // Use message limit (30 per minute)
      const messageResult = await userLimiter('message:send', RATE_LIMITS.message);
      expect(messageResult.success).toBe(true);
      expect(messageResult.limit).toBe(30);
      expect(messageResult.remaining).toBe(29);
    });
  });

  describe('Header parsing integration', () => {
    it('should extract first IP from comma-separated x-forwarded-for', async () => {
      const { checkRateLimit } = await import('@/lib/security/rate-limit');

      mockHeaders.mockResolvedValue({
        get: vi.fn((header: string) => {
          if (header === 'x-forwarded-for') return '203.0.113.1, 198.51.100.1, 192.0.2.1';
          return null;
        }),
      });

      const result = await checkRateLimit('integration:header:chain', {
        limit: 5,
        windowSeconds: 60,
      });

      expect(result.success).toBe(true);

      // Verify it uses first IP by exhausting limit and checking with different chain
      for (let i = 0; i < 5; i++) {
        await checkRateLimit('integration:header:chain', { limit: 5, windowSeconds: 60 });
      }

      // Same first IP, different chain - should be blocked
      mockHeaders.mockResolvedValue({
        get: vi.fn((header: string) => {
          if (header === 'x-forwarded-for') return '203.0.113.1, 10.0.0.1';
          return null;
        }),
      });

      const blockedResult = await checkRateLimit('integration:header:chain', {
        limit: 5,
        windowSeconds: 60,
      });
      expect(blockedResult.success).toBe(false);
    });

    it('should fallback to x-real-ip when x-forwarded-for is not present', async () => {
      vi.resetModules();

      mockHeaders.mockResolvedValue({
        get: vi.fn((header: string) => {
          if (header === 'x-real-ip') return '192.168.50.1';
          return null;
        }),
      });

      const { checkRateLimit } = await import('@/lib/security/rate-limit');

      const result = await checkRateLimit('integration:header:realip', {
        limit: 5,
        windowSeconds: 60,
      });

      expect(result.success).toBe(true);
    });

    it('should fallback to x-vercel-forwarded-for when other headers are not present', async () => {
      vi.resetModules();

      mockHeaders.mockResolvedValue({
        get: vi.fn((header: string) => {
          if (header === 'x-vercel-forwarded-for') return '192.168.60.1';
          return null;
        }),
      });

      const { checkRateLimit } = await import('@/lib/security/rate-limit');

      const result = await checkRateLimit('integration:header:vercel', {
        limit: 5,
        windowSeconds: 60,
      });

      expect(result.success).toBe(true);
    });

    it('should fallback to cf-connecting-ip for Cloudflare', async () => {
      vi.resetModules();

      mockHeaders.mockResolvedValue({
        get: vi.fn((header: string) => {
          if (header === 'cf-connecting-ip') return '192.168.70.1';
          return null;
        }),
      });

      const { checkRateLimit } = await import('@/lib/security/rate-limit');

      const result = await checkRateLimit('integration:header:cloudflare', {
        limit: 5,
        windowSeconds: 60,
      });

      expect(result.success).toBe(true);
    });

    it('should use "unknown" when no IP headers are present', async () => {
      vi.resetModules();

      mockHeaders.mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      });

      const { checkRateLimit } = await import('@/lib/security/rate-limit');

      const result = await checkRateLimit('integration:header:unknown', {
        limit: 5,
        windowSeconds: 60,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Real-world scenario tests', () => {
    it('should properly handle auth flow rate limiting', async () => {
      const { checkRateLimit, RATE_LIMITS } = await import('@/lib/security/rate-limit');

      // Simulate failed login attempts
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit('auth:login', RATE_LIMITS.auth);
        expect(result.success).toBe(true);
      }

      // 6th attempt should be blocked (brute force protection)
      const blocked = await checkRateLimit('auth:login', RATE_LIMITS.auth);
      expect(blocked.success).toBe(false);
      expect(blocked.retryAfter).toBeGreaterThan(0);
    });

    it('should properly handle signup rate limiting', async () => {
      const { checkRateLimit, RATE_LIMITS } = await import('@/lib/security/rate-limit');

      // Allow 3 signups per minute
      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit('auth:signup', RATE_LIMITS.authSignup);
        expect(result.success).toBe(true);
      }

      // 4th signup should be blocked
      const blocked = await checkRateLimit('auth:signup', RATE_LIMITS.authSignup);
      expect(blocked.success).toBe(false);
    });

    it('should allow message rate limit of 30 per minute', async () => {
      const { checkRateLimit, RATE_LIMITS } = await import('@/lib/security/rate-limit');

      // Verify 30 messages allowed
      for (let i = 0; i < 30; i++) {
        const result = await checkRateLimit('message:send', RATE_LIMITS.message);
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(29 - i);
      }

      // 31st message should be blocked
      const blocked = await checkRateLimit('message:send', RATE_LIMITS.message);
      expect(blocked.success).toBe(false);
    });

    it('should enforce file upload limit of 10 per minute', async () => {
      const { checkRateLimit, RATE_LIMITS } = await import('@/lib/security/rate-limit');

      for (let i = 0; i < 10; i++) {
        const result = await checkRateLimit('file:upload', RATE_LIMITS.upload);
        expect(result.success).toBe(true);
      }

      const blocked = await checkRateLimit('file:upload', RATE_LIMITS.upload);
      expect(blocked.success).toBe(false);
    });

    it('should handle concurrent actions from same IP correctly', async () => {
      const { checkRateLimit } = await import('@/lib/security/rate-limit');
      const config = { limit: 5, windowSeconds: 60 };

      // Simulate concurrent requests
      const results = await Promise.all([
        checkRateLimit('concurrent:test', config),
        checkRateLimit('concurrent:test', config),
        checkRateLimit('concurrent:test', config),
        checkRateLimit('concurrent:test', config),
        checkRateLimit('concurrent:test', config),
      ]);

      // All 5 should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // 6th should fail
      const blocked = await checkRateLimit('concurrent:test', config);
      expect(blocked.success).toBe(false);
    });
  });
});
