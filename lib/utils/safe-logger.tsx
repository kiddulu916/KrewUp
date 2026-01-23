/**
 * Safe logging utility that sanitizes PII (Personally Identifiable Information)
 * from log messages before sending to Sentry or console.
 * 
 * ! IMPORTANT: Never log raw user IDs, emails, or other PII in production logs
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Hash a user ID to create a non-reversible identifier for logging
 * Uses first 8 characters of a hash for consistent identification
 */
function hashUserId(userId: string): string {
  // * Simple hash function - not cryptographically secure, just for obfuscation
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8).padStart(8, '0');
}

/**
 * Sanitize an object by removing or hashing PII fields
 */
function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // * Handle arrays separately
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // * List of known PII field names
  const piiFields = ['user_id', 'userId', 'user.id', 'id', 'email', 'phone', 'password', 'token', 'session'];
  
  // * Type as Record to allow string indexing
  const sanitized: Record<string, unknown> = { ...data as Record<string, unknown> };
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    
    // * Hash user IDs
    if (lowerKey.includes('user') && lowerKey.includes('id')) {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = `[user:${hashUserId(sanitized[key] as string)}]`;
      }
    }
    
    // * Remove or mask other PII
    if (piiFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      if (lowerKey.includes('id') && typeof sanitized[key] === 'string') {
        sanitized[key] = `[id:${hashUserId(sanitized[key] as string)}]`;
      } else if (lowerKey.includes('email')) {
        sanitized[key] = '[email:redacted]';
      } else if (lowerKey.includes('phone')) {
        sanitized[key] = '[phone:redacted]';
      } else if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('session')) {
        sanitized[key] = '[redacted]';
      }
    }
    
    // * Recursively sanitize nested objects
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Safe logger that sanitizes PII before logging
 * Replaces console.log/error/warn in production code
 */
export const safeLogger = {
  /**
   * Log debug information (only in development)
   * Removed in production to prevent PII exposure
   */
  debug: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      const sanitized = args.map(arg => 
        typeof arg === 'object' ? sanitizeData(arg) : arg
      );
      console.log(...sanitized);
    }
  },

  /**
   * Log informational messages
   * Sanitizes PII before logging to Sentry
   */
  info: (message: string, extra?: Record<string, any>): void => {
    const sanitizedExtra = extra ? sanitizeData(extra) : undefined;
    
    // * Use Sentry logger if available, otherwise console
    if (typeof (Sentry as any).logger?.info === 'function') {
      (Sentry as any).logger.info(message, sanitizedExtra);
    } else {
      console.log(message, sanitizedExtra || '');
    }
  },

  /**
   * Log warning messages
   * Sanitizes PII before logging to Sentry
   */
  warn: (message: string, extra?: Record<string, any>): void => {
    const sanitizedExtra = extra ? sanitizeData(extra) : undefined;
    
    Sentry.captureMessage(message, {
      level: 'warning',
      extra: sanitizedExtra,
    });
    
    // * Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(message, sanitizedExtra || '');
    }
  },

  /**
   * Log error messages
   * Sanitizes PII before logging to Sentry
   */
  error: (error: Error | unknown, context?: Record<string, any>): void => {
    const sanitizedContext = context ? sanitizeData(context) : undefined;
    
    Sentry.captureException(error, {
      extra: sanitizedContext,
    });
    
    // * Also log to console in development (sanitized)
    if (process.env.NODE_ENV === 'development') {
      const sanitizedError = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(sanitizedError, sanitizedContext || '');
    }
  },
};
