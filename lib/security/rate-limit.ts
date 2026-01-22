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
  // Number of requests made in the current window
  count: number;
  // Timestamp (ms) when the current rate limit window started
  windowStart: number;
};

// * Map of rate limit entries keyed by `actionKey:identifier`
const rateLimitStore = new Map<string, RateLimitEntry>();

// * Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start periodic cleanup of old rate limit entries from in-memory store
 *
 * * Runs every 5 minutes to remove stale entries
 * * Prevents memory leaks by removing entries older than 10 minutes
 * ! Only runs once - subsequent calls are ignored
 *
 * @remarks
 * This is only used for the in-memory fallback store. Redis handles its own
 * expiration, so this cleanup is not needed when using Upstash.
 */
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
 *
 * * Checks multiple headers in priority order to find the real client IP
 * * Supports Vercel, Cloudflare, and standard reverse proxy headers
 *
 * @returns The client's IP address, or 'unknown' if no IP headers are present
 *
 * @remarks
 * Header priority (most reliable first):
 * 1. x-forwarded-for (standard proxy header, uses first IP in chain)
 * 2. x-real-ip (direct client IP from proxy)
 * 3. x-vercel-forwarded-for (Vercel-specific header)
 * 4. cf-connecting-ip (Cloudflare-specific header)
 *
 * The fallback to 'unknown' should never happen in production when deployed
 * behind a proper reverse proxy or edge network.
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

/**
 * Result of a rate limit check
 */
export type RateLimitResult = {
  // Whether the request is within rate limits (true) or exceeded (false)
  success: boolean;
  // Maximum number of requests allowed in the time window
  limit: number;
  // Number of requests remaining in the current window
  remaining: number;
  // Unix timestamp (seconds) when the current rate limit window resets
  reset: number;
  // Seconds until retry is allowed (only set when success is false)
  retryAfter?: number;
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

// * Initialize Redis client from environment if configured
// Will be null in local development without Redis environment variables
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

// * Cache of Upstash rate limiter instances per configuration
// Reusing limiters avoids creating multiple instances for the same config
const upstashLimiters = new Map<string, Ratelimit>();

/**
 * Get or create an Upstash rate limiter for the given configuration
 *
 * * Caches limiter instances to avoid recreating them for the same config
 * * Uses fixed window algorithm for consistent rate limiting
 * * Returns null if Upstash Redis is not configured
 *
 * @param config - Rate limit configuration (limit and window duration)
 * @returns Upstash Ratelimit instance, or null if Redis is not configured
 *
 * @remarks
 * Limiter instances are keyed by `limit:windowSeconds` to ensure different
 * rate limit configurations get separate limiter instances. This allows using
 * multiple rate limits (e.g., 5/min for auth, 30/min for messages) efficiently.
 */
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
  // * Get identifier - either custom function or default to client IP
  const identifier = config.identifier
    ? await config.identifier()
    : await getClientIdentifier();

  // * Construct unique key combining action and identifier
  // Format: "actionKey:identifier" (e.g., "auth:login:192.168.1.1")
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
      // This can happen due to network issues, invalid credentials, or Redis downtime
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          action: actionKey,
          rateLimiter: 'upstash',
        },
      });
      // Continue to fallback limiter below
    }
  }

  // * Fallback: in-memory rate limiting (non-distributed, for local/dev use)
  // ! This fallback is per-instance only - not shared across serverless functions
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
 *
 * * Convenient wrapper around checkRateLimit for Server Actions
 * * Returns a standard error response when rate limited
 * * Returns null when within rate limits (allow action to proceed)
 *
 * @param actionKey - Unique key for the action (e.g., 'auth:signIn')
 * @param config - Rate limit configuration (limit, window, optional identifier)
 * @returns Error object with user-friendly message if rate limited, null otherwise
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
 *
 * * Use for authenticated actions where you want per-user limits
 * * Rate limits are applied per user instead of per IP address
 * * Useful when you need to limit actions on a per-account basis
 *
 * @param userId - The user's unique identifier
 * @returns A rate limiter function that uses the user ID as identifier
 *
 * @example
 * ```ts
 * const userRateLimit = createUserRateLimiter(user.id);
 * const result = await userRateLimit('message:send', RATE_LIMITS.message);
 * if (!result.success) {
 *   return { success: false, error: 'Too many messages sent' };
 * }
 * ```
 *
 * @remarks
 * This is preferable to IP-based limiting for authenticated actions because:
 * - Users behind the same IP (e.g., office network) won't affect each other
 * - More accurate tracking of individual user behavior
 * - Prevents users from bypassing limits by changing IPs
 */
export function createUserRateLimiter(userId: string) {
  return async (actionKey: string, config: RateLimitConfig) => {
    return checkRateLimit(actionKey, {
      ...config,
      identifier: async () => userId,
    });
  };
}

