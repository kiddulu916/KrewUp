import * as Sentry from '@sentry/nextjs';

/**
 * Deterministic hash for log sanitization.
 * Uses djb2 algorithm - Edge/browser compatible (no Node crypto).
 * Sufficient for PII anonymization in logs; not cryptographically secure.
 */
function hashString(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).substring(0, 12);
}

/**
 * Sanitizes a user ID by hashing it
 * This prevents PII from being logged to production systems
 *
 * @example
 * ```ts
 * logger.info('User action', { userId: sanitizeUserId(user.id) });
 * // Logs: { userId: 'hash:a3f5b...' }
 * ```
 */
export function sanitizeUserId(userId: string | undefined | null): string {
  if (!userId) {
    return 'hash:none';
  }

  return `hash:${hashString(userId)}`;
}

/**
 * Sanitizes an email address by hashing it
 * Preserves domain for debugging purposes
 *
 * @example
 * ```ts
 * logger.info('Email sent', { email: sanitizeEmail('user@example.com') });
 * // Logs: { email: 'hash:a3f5b...@example.com' }
 * ```
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email) {
    return 'hash:none';
  }

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return `hash:${hashString(email)}`;
  }

  return `hash:${hashString(localPart)}@${domain}`;
}

/**
 * Sanitizes metadata object by detecting and hashing common PII fields
 * Recursively processes nested objects and arrays
 *
 * @example
 * ```ts
 * const metadata = {
 *   userId: 'uuid-123',
 *   email: 'user@example.com',
 *   action: 'login',
 * };
 * logger.info('User action', sanitizeMetadata(metadata));
 * // Logs: { userId: 'hash:a3f5b...', email: 'hash:b4c6d...@example.com', action: 'login' }
 * ```
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  // List of field names that should be sanitized
  const sensitiveFields = [
    'userId',
    'user_id',
    'id',
    'email',
    'phone',
    'phoneNumber',
    'phone_number',
    'customerId',
    'customer_id',
    'stripeCustomerId',
    'stripe_customer_id',
  ];

  for (const [key, value] of Object.entries(metadata)) {
    // Handle nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
      continue;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => {
        if (item && typeof item === 'object') {
          return sanitizeMetadata(item as Record<string, unknown>);
        }
        return item;
      });
      continue;
    }

    // Sanitize sensitive fields
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
      if (typeof value === 'string') {
        // If it looks like an email, use sanitizeEmail
        if (value.includes('@')) {
          sanitized[key] = sanitizeEmail(value);
        } else {
          // Otherwise, treat as user ID
          sanitized[key] = sanitizeUserId(value);
        }
      } else {
        sanitized[key] = value;
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Structured logger wrapper around Sentry.logger
 * Automatically sanitizes PII in metadata
 * Use this instead of console.log/error for production logging
 */
export const logger = {
  /**
   * Log trace-level message (verbose debugging)
   */
  trace: (message: string, metadata?: Record<string, unknown>) => {
    const sanitized = metadata ? sanitizeMetadata(metadata) : undefined;
    console.debug(message, sanitized); Sentry.addBreadcrumb({ message, level: 'debug', data: sanitized });
  },

  /**
   * Log debug-level message (debugging information)
   */
  debug: (message: string, metadata?: Record<string, unknown>) => {
    const sanitized = metadata ? sanitizeMetadata(metadata) : undefined;
    console.debug(message, sanitized); Sentry.addBreadcrumb({ message, level: 'debug', data: sanitized });
  },

  /**
   * Log info-level message (general information)
   *
   * @example
   * ```ts
   * logger.info('User logged in', { userId: sanitizeUserId(user.id) });
   * logger.info('Job created', { jobId: job.id, title: job.title });
   * ```
   */
  info: (message: string, metadata?: Record<string, unknown>) => {
    const sanitized = metadata ? sanitizeMetadata(metadata) : undefined;
    console.info(message, sanitized); Sentry.addBreadcrumb({ message, level: 'info', data: sanitized });
  },

  /**
   * Log warning-level message (potential issues)
   *
   * @example
   * ```ts
   * logger.warn('Rate limit approaching', { userId: sanitizeUserId(user.id), count: 95 });
   * ```
   */
  warn: (message: string, metadata?: Record<string, unknown>) => {
    const sanitized = metadata ? sanitizeMetadata(metadata) : undefined;
    console.warn(message, sanitized); Sentry.addBreadcrumb({ message, level: 'warning', data: sanitized });
  },

  /**
   * Log error-level message (errors that need attention)
   *
   * @example
   * ```ts
   * logger.error('Failed to send email', {
   *   userId: sanitizeUserId(user.id),
   *   error: err.message,
   * });
   * ```
   */
  error: (message: string, metadata?: Record<string, unknown>) => {
    const sanitized = metadata ? sanitizeMetadata(metadata) : undefined;
    console.error(message, sanitized); Sentry.captureMessage(message, { level: 'error', extra: sanitized });
  },

  /**
   * Log fatal-level message (critical errors)
   *
   * @example
   * ```ts
   * logger.fatal('Database connection failed', { database: 'users', error: err.message });
   * ```
   */
  fatal: (message: string, metadata?: Record<string, unknown>) => {
    const sanitized = metadata ? sanitizeMetadata(metadata) : undefined;
    console.error(message, sanitized); Sentry.captureMessage(message, { level: 'fatal', extra: sanitized });
  },

  /**
   * Template literal function for inline variable sanitization
   * Use this when you need to include variables in the message
   *
   * @example
   * ```ts
   * logger.info(logger.fmt`User ${sanitizeUserId(userId)} performed action`);
   * ```
   */
  fmt: (strings: TemplateStringsArray, ...values: unknown[]): string => {
    return strings.reduce((result, str, i) => {
      return result + str + (values[i] !== undefined ? String(values[i]) : '');
    }, '');
  },
};
