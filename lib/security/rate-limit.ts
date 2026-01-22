/**
 * Rate Limiting Utility
 *
 * * Uses Upstash Redis for distributed rate limiting when configured
 * * Falls back to in-memory store for local development and tests
 * ! In-memory store is NOT suitable for production in multi-instance deployments
 * ! Redis is REQUIRED for production deployments
 *
 * Required environment variables for production:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * @see https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 */

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// * Environment detection
// Production is determined by NODE_ENV or VERCEL_ENV
const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production';

// * Rate limit configuration per action type
export type RateLimitConfig = {
  // Maximum requests allowed in the window
  limit: number;
  // Time window in seconds
  windowSeconds: number;
  // Optional identifier function (defaults to IP)
  identifier?: () => Promise<string>;
};

// * Default configurations for different action types
export const RATE_LIMITS = {
  // ! Strict limits for authentication endpoints (brute force protection)
  auth: { limit: 5, windowSeconds: 60 }, // 5 attempts per minute
  authSignup: { limit: 3, windowSeconds: 60 }, // 3 signups per minute per IP

  // * Standard limits for general actions
  message: { limit: 30, windowSeconds: 60 }, // 30 messages per minute
  upload: { limit: 10, windowSeconds: 60 }, // 10 uploads per minute
  
  // * Relaxed limits for read operations
  search: { limit: 60, windowSeconds: 60 }, // 60 searches per minute
  
  // * Admin actions
  adminAction: { limit: 20, windowSeconds: 60 }, // 20 admin actions per minute
} as const;

// * In-memory storage for rate limits (cleared on server restart)
// ! Only used when Upstash Redis is not configured
type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

// * Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupIntervalId) return;
  
  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      // Remove entries older than 10 minutes
      if (now - entry.windowStart > 10 * 60 * 1000) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Get client identifier (IP address) from request headers
 */
async function getClientIdentifier(): Promise<string> {
  const headersList = await headers();
  
  // * Check various headers for the real IP
  // Order matters - check most reliable sources first
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headersList.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Vercel-specific header
  const vercelForwardedFor = headersList.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor;
  }

  // Cloudflare-specific header
  const cfConnectingIp = headersList.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback - should not happen in production
  return 'unknown';
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the window resets
  retryAfter?: number; // Seconds until retry allowed (only set when limited)
};

/**
 * Upstash Redis-backed rate limiter (distributed across function instances)
 * Uses fixed window algorithm per (limit, windowSeconds) configuration.
 *
 * ! Required in production - without it, rate limiting is not distributed
 * ! across serverless function instances, allowing attackers to bypass limits
 */
const isUpstashConfigured =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const upstashRedis = isUpstashConfigured ? Redis.fromEnv() : null;

/**
 * Validates that Redis is configured in production environments
 *
 * ! Throws an error in production if Redis is not configured
 * * Logs a warning in development when falling back to in-memory
 *
 * @throws Error if in production and Redis is not configured
 */
function validateRedisConfig(): void {
  if (!isUpstashConfigured) {
    if (isProduction) {
      const error = new Error(
        'Redis rate limiting is not configured in production. ' +
        'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
      );

      // ! Capture to Sentry for immediate alerting
      Sentry.captureException(error, {
        level: 'fatal',
        tags: {
          component: 'rate-limiter',
          environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
          rateLimiter: 'validation',
        },
        extra: {
          hasRestUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
          hasRestToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV,
        },
      });

      throw error;
    } else {
      // * Development mode - log warning but allow in-memory fallback
      console.warn(
        '[Rate Limiter] Redis not configured. Falling back to in-memory store. ' +
        'This is NOT suitable for production with multiple serverless instances.'
      );
    }
  }
}

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!upstashRedis) return null;

  const key = `${config.limit}:${config.windowSeconds}`;
  const existing = upstashLimiters.get(key);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis: upstashRedis,
    limiter: Ratelimit.fixedWindow(config.limit, `${config.windowSeconds} s`),
  });

  upstashLimiters.set(key, limiter);
  return limiter;
}

/**
 * Check rate limit for an action
 * 
 * @param actionKey - Unique key for the action (e.g., 'auth:login')
 * @param config - Rate limit configuration
 * @returns Rate limit result
 * 
 * @example
 * ```ts
 * const result = await checkRateLimit('auth:login', RATE_LIMITS.auth);
 * if (!result.success) {
 *   return { success: false, error: `Too many attempts. Try again in ${result.retryAfter} seconds.` };
 * }
 * ```
 */
export async function checkRateLimit(
  actionKey: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const identifier = config.identifier
    ? await config.identifier()
    : await getClientIdentifier();

  const key = `${actionKey}:${identifier}`;
  const now = Date.now();

  // ! Validate Redis configuration before attempting rate limiting
  // This will throw in production if Redis is not configured
  validateRedisConfig();

  // * Prefer distributed rate limiting via Upstash when configured
  const upstashLimiter = getUpstashLimiter(config);
  if (upstashLimiter) {
    try {
      const { success, limit, remaining, reset } = await upstashLimiter.limit(key);

      if (!success) {
        const nowSeconds = Math.floor(now / 1000);
        const retryAfter = Math.max(0, reset - nowSeconds);

        // ! Log rate limit exceeded to Sentry for monitoring
        Sentry.captureMessage(`Rate limit exceeded: ${actionKey}`, {
          level: 'warning',
          tags: {
            action: actionKey,
            identifier: identifier.substring(0, 10) + '...',
            rateLimiter: 'upstash',
          },
          extra: {
            limit,
            remaining,
            reset,
          },
        });

        return {
          success: false,
          limit,
          remaining: 0,
          reset,
          retryAfter,
        };
      }

      return {
        success: true,
        limit,
        remaining,
        reset,
      };
    } catch (error) {
      // ! When Upstash is misconfigured or unavailable, log and fall back to in-memory limiter
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          action: actionKey,
          rateLimiter: 'upstash',
        },
      });
    }
  }

  // * Fallback: in-memory rate limiting (non-distributed, for local/dev use)
  const windowMs = config.windowSeconds * 1000;
  startCleanup();

  let entry = rateLimitStore.get(key);

  // * Reset if window has passed
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 0, windowStart: now };
  }

  // * Increment count
  entry.count += 1;
  rateLimitStore.set(key, entry);

  const windowReset = Math.ceil((entry.windowStart + windowMs) / 1000);
  const remaining = Math.max(0, config.limit - entry.count);

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
 
    // ! Log rate limit exceeded to Sentry for monitoring
    Sentry.captureMessage(`Rate limit exceeded: ${actionKey}`, {
      level: 'warning',
      tags: {
        action: actionKey,
        identifier: identifier.substring(0, 10) + '...',
        rateLimiter: 'memory',
      },
      extra: {
        limit: config.limit,
        count: entry.count,
        windowSeconds: config.windowSeconds,
      },
    });

    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: windowReset,
      retryAfter,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining,
    reset: windowReset,
  };
}

/**
 * Rate limit wrapper for server actions
 * Returns a standard error response when rate limited
 * 
 * @example
 * ```ts
 * export async function signIn(email: string, password: string) {
 *   const rateLimitResult = await rateLimit('auth:signIn', RATE_LIMITS.auth);
 *   if (rateLimitResult) return rateLimitResult;
 *   
 *   // ... rest of action
 * }
 * ```
 */
export async function rateLimit(
  actionKey: string,
  config: RateLimitConfig
): Promise<{ success: false; error: string } | null> {
  const result = await checkRateLimit(actionKey, config);
  
  if (!result.success) {
    return {
      success: false,
      error: `Too many attempts. Please try again in ${result.retryAfter} seconds.`,
    };
  }

  return null;
}

/**
 * Create a rate limiter with user ID as identifier
 * Use for authenticated actions where you want per-user limits
 */
export function createUserRateLimiter(userId: string) {
  return async (actionKey: string, config: RateLimitConfig) => {
    return checkRateLimit(actionKey, {
      ...config,
      identifier: async () => userId,
    });
  };
}

