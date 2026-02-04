/**
 * Stripe Service Integration Tests
 *
 * Tests pure business logic for Stripe webhook processing with ZERO MOCKS.
 * All functions are pure and can be tested directly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  // Validation Functions
  validateCheckoutMetadata,
  validatePriceId,
  validateCustomerId,
  validateSubscriptionId,
  isSupportedWebhookEvent,
  // Plan & Status Functions
  determinePlanType,
  mapSubscriptionStatus,
  isSubscriptionActive,
  isSubscriptionInactive,
  getSubscriptionTier,
  // Timestamp Functions
  unixToISOString,
  getDefaultPeriodEnd,
  calculatePeriodEnd,
  // Record Building Functions
  buildSubscriptionRecord,
  buildSubscriptionHistoryRecord,
  // Boost Logic Functions
  shouldActivateProfileBoost,
  shouldRemoveProfileBoost,
  shouldSkipSubscriptionUpdate,
  // Amount Conversion Functions
  centsToDollars,
  dollarsToCents,
  formatAmount,
  // Webhook Event Helpers
  extractUserIdFromMetadata,
  extractPriceIdFromItems,
  mapWebhookToHistoryEventType,
  // Constants
  SUPPORTED_WEBHOOK_EVENTS,
  ACTIVE_SUBSCRIPTION_STATUSES,
  INACTIVE_SUBSCRIPTION_STATUSES,
  // Types
  type PlanType,
  type SubscriptionStatus,
  type WebhookEventType,
  type PriceIdConfig,
} from '@/features/subscriptions/services/stripe-service';

// Test configuration for price IDs
const testPriceConfig: PriceIdConfig = {
  monthlyPriceId: 'price_monthly_123',
  annualPriceId: 'price_annual_456',
};

// ============================================================================
// validateCheckoutMetadata
// ============================================================================

describe('validateCheckoutMetadata', () => {
  describe('valid metadata', () => {
    it('should accept metadata with valid user_id', () => {
      const result = validateCheckoutMetadata({ user_id: 'user-123' });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept metadata with additional fields', () => {
      const result = validateCheckoutMetadata({
        user_id: 'user-123',
        plan: 'monthly',
        source: 'web',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid metadata', () => {
    it('should reject null metadata', () => {
      const result = validateCheckoutMetadata(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing session metadata');
    });

    it('should reject undefined metadata', () => {
      const result = validateCheckoutMetadata(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing session metadata');
    });

    it('should reject metadata without user_id', () => {
      const result = validateCheckoutMetadata({});
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing user_id in session metadata');
    });

    it('should reject metadata with empty user_id', () => {
      const result = validateCheckoutMetadata({ user_id: '' });
      expect(result.valid).toBe(false);
      // Empty string is falsy, so it triggers "Missing" before trim check
      expect(result.error).toBe('Missing user_id in session metadata');
    });

    it('should reject metadata with whitespace-only user_id', () => {
      const result = validateCheckoutMetadata({ user_id: '   ' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid user_id in session metadata');
    });
  });
});

// ============================================================================
// validatePriceId
// ============================================================================

describe('validatePriceId', () => {
  describe('valid price IDs', () => {
    it('should accept monthly price ID and return plan type', () => {
      const result = validatePriceId(testPriceConfig.monthlyPriceId, testPriceConfig);
      expect(result.valid).toBe(true);
      expect(result.planType).toBe('monthly');
    });

    it('should accept annual price ID and return plan type', () => {
      const result = validatePriceId(testPriceConfig.annualPriceId, testPriceConfig);
      expect(result.valid).toBe(true);
      expect(result.planType).toBe('annual');
    });
  });

  describe('invalid price IDs', () => {
    it('should reject undefined price ID', () => {
      const result = validatePriceId(undefined, testPriceConfig);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing price ID');
    });

    it('should reject unknown price ID', () => {
      const result = validatePriceId('price_unknown_789', testPriceConfig);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown price ID: price_unknown_789');
    });
  });
});

// ============================================================================
// validateCustomerId
// ============================================================================

describe('validateCustomerId', () => {
  describe('valid customer IDs', () => {
    it('should accept valid customer ID starting with cus_', () => {
      const result = validateCustomerId('cus_abc123');
      expect(result.valid).toBe(true);
    });

    it('should accept customer ID with various suffixes', () => {
      const result = validateCustomerId('cus_1234567890ABCDEF');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid customer IDs', () => {
    it('should reject null customer ID', () => {
      const result = validateCustomerId(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing customer ID');
    });

    it('should reject undefined customer ID', () => {
      const result = validateCustomerId(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing customer ID');
    });

    it('should reject customer ID without cus_ prefix', () => {
      const result = validateCustomerId('customer_123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid customer ID format');
    });

    it('should reject empty customer ID', () => {
      const result = validateCustomerId('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing customer ID');
    });
  });
});

// ============================================================================
// validateSubscriptionId
// ============================================================================

describe('validateSubscriptionId', () => {
  describe('valid subscription IDs', () => {
    it('should accept valid subscription ID starting with sub_', () => {
      const result = validateSubscriptionId('sub_abc123');
      expect(result.valid).toBe(true);
    });

    it('should accept subscription ID with various suffixes', () => {
      const result = validateSubscriptionId('sub_1234567890ABCDEF');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid subscription IDs', () => {
    it('should reject null subscription ID', () => {
      const result = validateSubscriptionId(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing subscription ID');
    });

    it('should reject undefined subscription ID', () => {
      const result = validateSubscriptionId(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing subscription ID');
    });

    it('should reject subscription ID without sub_ prefix', () => {
      const result = validateSubscriptionId('subscription_123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid subscription ID format');
    });

    it('should reject empty subscription ID', () => {
      const result = validateSubscriptionId('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing subscription ID');
    });
  });
});

// ============================================================================
// isSupportedWebhookEvent
// ============================================================================

describe('isSupportedWebhookEvent', () => {
  it.each(SUPPORTED_WEBHOOK_EVENTS)('should return true for supported event: %s', (event) => {
    expect(isSupportedWebhookEvent(event)).toBe(true);
  });

  it('should return false for unsupported event', () => {
    expect(isSupportedWebhookEvent('customer.created')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isSupportedWebhookEvent('')).toBe(false);
  });

  it('should return false for random string', () => {
    expect(isSupportedWebhookEvent('random.event.type')).toBe(false);
  });
});

// ============================================================================
// determinePlanType
// ============================================================================

describe('determinePlanType', () => {
  it('should return monthly for monthly price ID', () => {
    const result = determinePlanType(testPriceConfig.monthlyPriceId, testPriceConfig);
    expect(result).toBe('monthly');
  });

  it('should return annual for annual price ID', () => {
    const result = determinePlanType(testPriceConfig.annualPriceId, testPriceConfig);
    expect(result).toBe('annual');
  });

  it('should return null for unknown price ID', () => {
    const result = determinePlanType('price_unknown', testPriceConfig);
    expect(result).toBeNull();
  });

  it('should return null for undefined price ID', () => {
    const result = determinePlanType(undefined, testPriceConfig);
    expect(result).toBeNull();
  });

  it('should return null for empty string price ID', () => {
    const result = determinePlanType('', testPriceConfig);
    expect(result).toBeNull();
  });
});

// ============================================================================
// mapSubscriptionStatus
// ============================================================================

describe('mapSubscriptionStatus', () => {
  describe('valid Stripe statuses', () => {
    it.each([
      'active',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'trialing',
      'unpaid',
    ] as const)('should map valid status: %s', (status) => {
      expect(mapSubscriptionStatus(status)).toBe(status);
    });
  });

  describe('unknown statuses', () => {
    it('should default to incomplete for unknown status', () => {
      expect(mapSubscriptionStatus('unknown_status')).toBe('incomplete');
    });

    it('should default to incomplete for empty string', () => {
      expect(mapSubscriptionStatus('')).toBe('incomplete');
    });
  });
});

// ============================================================================
// isSubscriptionActive
// ============================================================================

describe('isSubscriptionActive', () => {
  it.each(ACTIVE_SUBSCRIPTION_STATUSES)('should return true for active status: %s', (status) => {
    expect(isSubscriptionActive(status)).toBe(true);
  });

  it.each(['canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid'] as const)(
    'should return false for non-active status: %s',
    (status) => {
      expect(isSubscriptionActive(status)).toBe(false);
    }
  );
});

// ============================================================================
// isSubscriptionInactive
// ============================================================================

describe('isSubscriptionInactive', () => {
  it.each(INACTIVE_SUBSCRIPTION_STATUSES)(
    'should return true for inactive status: %s',
    (status) => {
      expect(isSubscriptionInactive(status)).toBe(true);
    }
  );

  it.each(['active', 'incomplete', 'past_due', 'trialing'] as const)(
    'should return false for non-inactive status: %s',
    (status) => {
      expect(isSubscriptionInactive(status)).toBe(false);
    }
  );
});

// ============================================================================
// getSubscriptionTier
// ============================================================================

describe('getSubscriptionTier', () => {
  it.each(ACTIVE_SUBSCRIPTION_STATUSES)(
    'should return pro for active status: %s',
    (status) => {
      expect(getSubscriptionTier(status)).toBe('pro');
    }
  );

  it.each(['canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid'] as const)(
    'should return free for non-active status: %s',
    (status) => {
      expect(getSubscriptionTier(status)).toBe('free');
    }
  );
});

// ============================================================================
// unixToISOString
// ============================================================================

describe('unixToISOString', () => {
  it('should convert Unix timestamp to ISO string', () => {
    // January 1, 2024 00:00:00 UTC
    const timestamp = 1704067200;
    const result = unixToISOString(timestamp);
    expect(result).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should handle timestamp with milliseconds precision', () => {
    // Arbitrary timestamp
    const timestamp = 1704067200;
    const result = unixToISOString(timestamp);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should return current time for undefined timestamp', () => {
    const before = Date.now();
    const result = unixToISOString(undefined);
    const after = Date.now();

    const resultTime = new Date(result).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });

  it('should return current time for null timestamp', () => {
    const before = Date.now();
    const result = unixToISOString(null);
    const after = Date.now();

    const resultTime = new Date(result).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// getDefaultPeriodEnd
// ============================================================================

describe('getDefaultPeriodEnd', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return date 30 days from now', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    vi.setSystemTime(now);

    const result = getDefaultPeriodEnd();
    const expected = new Date('2024-01-31T00:00:00.000Z').toISOString();

    expect(result).toBe(expected);
  });

  it('should handle month boundaries', () => {
    const now = new Date('2024-02-15T12:00:00.000Z');
    vi.setSystemTime(now);

    const result = getDefaultPeriodEnd();
    const resultDate = new Date(result);

    // 30 days from Feb 15 is March 16
    expect(resultDate.getUTCMonth()).toBe(2); // March (0-indexed)
    expect(resultDate.getUTCDate()).toBe(16);
  });
});

// ============================================================================
// calculatePeriodEnd
// ============================================================================

describe('calculatePeriodEnd', () => {
  describe('monthly plan', () => {
    it('should add 1 month to start date', () => {
      const startDate = new Date('2024-01-15T00:00:00.000Z');
      const result = calculatePeriodEnd('monthly', startDate);
      const endDate = new Date(result);

      expect(endDate.getUTCFullYear()).toBe(2024);
      expect(endDate.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(endDate.getUTCDate()).toBe(15);
    });

    it('should handle month overflow', () => {
      const startDate = new Date('2024-01-31T00:00:00.000Z');
      const result = calculatePeriodEnd('monthly', startDate);
      const endDate = new Date(result);

      // Jan 31 + 1 month = Feb 29 (2024 is leap year) or March 2
      // JavaScript Date handles this by going to next month
      expect(endDate.getUTCMonth()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('annual plan', () => {
    it('should add 1 year to start date', () => {
      const startDate = new Date('2024-01-15T00:00:00.000Z');
      const result = calculatePeriodEnd('annual', startDate);
      const endDate = new Date(result);

      expect(endDate.getUTCFullYear()).toBe(2025);
      expect(endDate.getUTCMonth()).toBe(0); // January
      expect(endDate.getUTCDate()).toBe(15);
    });

    it('should handle leap year', () => {
      // Feb 29, 2024 (leap year) + 1 year = Mar 1, 2025 (no Feb 29 in 2025)
      const startDate = new Date('2024-02-29T00:00:00.000Z');
      const result = calculatePeriodEnd('annual', startDate);
      const endDate = new Date(result);

      expect(endDate.getUTCFullYear()).toBe(2025);
      // JavaScript Date rolls over to March 1 since Feb 29, 2025 doesn't exist
      expect(endDate.getUTCMonth()).toBe(2); // March (0-indexed)
      expect(endDate.getUTCDate()).toBe(1);
    });
  });

  describe('default start date', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should use current date when start date not provided', () => {
      const now = new Date('2024-06-15T00:00:00.000Z');
      vi.setSystemTime(now);

      const result = calculatePeriodEnd('monthly');
      const endDate = new Date(result);

      expect(endDate.getUTCMonth()).toBe(6); // July
      expect(endDate.getUTCDate()).toBe(15);
    });
  });
});

// ============================================================================
// buildSubscriptionRecord
// ============================================================================

describe('buildSubscriptionRecord', () => {
  it('should build complete subscription record', () => {
    const result = buildSubscriptionRecord({
      userId: 'user-123',
      customerId: 'cus_abc',
      subscriptionId: 'sub_xyz',
      priceId: 'price_monthly',
      planType: 'monthly',
      status: 'active',
      periodStart: 1704067200, // Jan 1, 2024
      periodEnd: 1706745600, // Feb 1, 2024
      cancelAtPeriodEnd: false,
    });

    expect(result).toEqual({
      user_id: 'user-123',
      stripe_customer_id: 'cus_abc',
      stripe_subscription_id: 'sub_xyz',
      stripe_price_id: 'price_monthly',
      status: 'active',
      plan_type: 'monthly',
      current_period_start: '2024-01-01T00:00:00.000Z',
      current_period_end: '2024-02-01T00:00:00.000Z',
      cancel_at_period_end: false,
    });
  });

  it('should use default period end when not provided', () => {
    const result = buildSubscriptionRecord({
      userId: 'user-123',
      customerId: 'cus_abc',
      subscriptionId: 'sub_xyz',
      priceId: 'price_annual',
      planType: 'annual',
      status: 'trialing',
      periodStart: 1704067200,
      periodEnd: undefined,
      cancelAtPeriodEnd: false,
    });

    // Should have a valid ISO date string for period end
    expect(result.current_period_end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should handle cancelAtPeriodEnd true', () => {
    const result = buildSubscriptionRecord({
      userId: 'user-123',
      customerId: 'cus_abc',
      subscriptionId: 'sub_xyz',
      priceId: 'price_monthly',
      planType: 'monthly',
      status: 'active',
      periodStart: 1704067200,
      periodEnd: 1706745600,
      cancelAtPeriodEnd: true,
    });

    expect(result.cancel_at_period_end).toBe(true);
  });
});

// ============================================================================
// buildSubscriptionHistoryRecord
// ============================================================================

describe('buildSubscriptionHistoryRecord', () => {
  it('should build minimal history record', () => {
    const result = buildSubscriptionHistoryRecord({
      userId: 'user-123',
      subscriptionId: 'sub_xyz',
      eventType: 'subscription_created',
      status: 'active',
    });

    expect(result).toEqual({
      user_id: 'user-123',
      stripe_subscription_id: 'sub_xyz',
      event_type: 'subscription_created',
      status: 'active',
    });
  });

  it('should include optional fields when provided', () => {
    const result = buildSubscriptionHistoryRecord({
      userId: 'user-123',
      subscriptionId: 'sub_xyz',
      eventType: 'payment_succeeded',
      status: 'active',
      planType: 'monthly',
      amount: 1999,
      currency: 'usd',
      metadata: { source: 'checkout' },
    });

    expect(result).toEqual({
      user_id: 'user-123',
      stripe_subscription_id: 'sub_xyz',
      event_type: 'payment_succeeded',
      status: 'active',
      plan_type: 'monthly',
      amount: 1999,
      currency: 'usd',
      metadata: { source: 'checkout' },
    });
  });

  it('should exclude undefined optional fields', () => {
    const result = buildSubscriptionHistoryRecord({
      userId: 'user-123',
      subscriptionId: 'sub_xyz',
      eventType: 'subscription_canceled',
      status: 'canceled',
      planType: undefined,
      amount: undefined,
    });

    expect(result).not.toHaveProperty('plan_type');
    expect(result).not.toHaveProperty('amount');
    expect(result).not.toHaveProperty('currency');
    expect(result).not.toHaveProperty('metadata');
  });

  it('should include amount when 0', () => {
    const result = buildSubscriptionHistoryRecord({
      userId: 'user-123',
      subscriptionId: 'sub_xyz',
      eventType: 'payment_succeeded',
      status: 'active',
      amount: 0,
    });

    expect(result.amount).toBe(0);
  });
});

// ============================================================================
// shouldActivateProfileBoost
// ============================================================================

describe('shouldActivateProfileBoost', () => {
  describe('should activate', () => {
    it('should return true for worker with active subscription', () => {
      expect(shouldActivateProfileBoost('worker', false, 'active')).toBe(true);
    });

    it('should return true for worker with trialing subscription', () => {
      expect(shouldActivateProfileBoost('worker', false, 'trialing')).toBe(true);
    });

    it('should return true for worker with null isLifetimePro', () => {
      expect(shouldActivateProfileBoost('worker', null, 'active')).toBe(true);
    });
  });

  describe('should not activate', () => {
    it('should return false for lifetime Pro users', () => {
      expect(shouldActivateProfileBoost('worker', true, 'active')).toBe(false);
    });

    it('should return false for employers', () => {
      expect(shouldActivateProfileBoost('employer', false, 'active')).toBe(false);
    });

    it('should return false for non-active subscription', () => {
      expect(shouldActivateProfileBoost('worker', false, 'canceled')).toBe(false);
    });

    it('should return false for past_due subscription', () => {
      expect(shouldActivateProfileBoost('worker', false, 'past_due')).toBe(false);
    });

    it('should return false for null role', () => {
      expect(shouldActivateProfileBoost(null, false, 'active')).toBe(false);
    });
  });
});

// ============================================================================
// shouldRemoveProfileBoost
// ============================================================================

describe('shouldRemoveProfileBoost', () => {
  describe('should remove', () => {
    it('should return true for worker without lifetime Pro', () => {
      expect(shouldRemoveProfileBoost('worker', false)).toBe(true);
    });

    it('should return true for worker with null isLifetimePro', () => {
      expect(shouldRemoveProfileBoost('worker', null)).toBe(true);
    });
  });

  describe('should not remove', () => {
    it('should return false for lifetime Pro users', () => {
      expect(shouldRemoveProfileBoost('worker', true)).toBe(false);
    });

    it('should return false for employers', () => {
      expect(shouldRemoveProfileBoost('employer', false)).toBe(false);
    });

    it('should return false for null role', () => {
      expect(shouldRemoveProfileBoost(null, false)).toBe(false);
    });
  });
});

// ============================================================================
// shouldSkipSubscriptionUpdate
// ============================================================================

describe('shouldSkipSubscriptionUpdate', () => {
  it('should return true for lifetime Pro users', () => {
    expect(shouldSkipSubscriptionUpdate(true)).toBe(true);
  });

  it('should return false for non-lifetime Pro users', () => {
    expect(shouldSkipSubscriptionUpdate(false)).toBe(false);
  });

  it('should return false for null', () => {
    expect(shouldSkipSubscriptionUpdate(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(shouldSkipSubscriptionUpdate(undefined)).toBe(false);
  });
});

// ============================================================================
// centsToDollars
// ============================================================================

describe('centsToDollars', () => {
  it('should convert cents to dollars', () => {
    expect(centsToDollars(1999)).toBe(19.99);
  });

  it('should handle zero', () => {
    expect(centsToDollars(0)).toBe(0);
  });

  it('should handle large amounts', () => {
    expect(centsToDollars(100000)).toBe(1000);
  });

  it('should handle single cent', () => {
    expect(centsToDollars(1)).toBe(0.01);
  });
});

// ============================================================================
// dollarsToCents
// ============================================================================

describe('dollarsToCents', () => {
  it('should convert dollars to cents', () => {
    expect(dollarsToCents(19.99)).toBe(1999);
  });

  it('should handle zero', () => {
    expect(dollarsToCents(0)).toBe(0);
  });

  it('should handle large amounts', () => {
    expect(dollarsToCents(1000)).toBe(100000);
  });

  it('should round to nearest cent', () => {
    expect(dollarsToCents(19.999)).toBe(2000);
  });

  it('should handle floating point precision', () => {
    // $10.10 should be 1010 cents, not 1009.9999...
    expect(dollarsToCents(10.10)).toBe(1010);
  });
});

// ============================================================================
// formatAmount
// ============================================================================

describe('formatAmount', () => {
  it('should format USD amount', () => {
    const result = formatAmount(1999, 'usd');
    expect(result).toBe('$19.99');
  });

  it('should default to USD', () => {
    const result = formatAmount(1999);
    expect(result).toBe('$19.99');
  });

  it('should handle zero', () => {
    const result = formatAmount(0);
    expect(result).toBe('$0.00');
  });

  it('should handle large amounts with comma separator', () => {
    const result = formatAmount(100000);
    expect(result).toBe('$1,000.00');
  });

  it('should handle lowercase currency code', () => {
    const result = formatAmount(1999, 'usd');
    expect(result).toBe('$19.99');
  });
});

// ============================================================================
// extractUserIdFromMetadata
// ============================================================================

describe('extractUserIdFromMetadata', () => {
  it('should extract user_id from metadata', () => {
    const result = extractUserIdFromMetadata({ user_id: 'user-123' });
    expect(result).toBe('user-123');
  });

  it('should trim whitespace from user_id', () => {
    const result = extractUserIdFromMetadata({ user_id: '  user-123  ' });
    expect(result).toBe('user-123');
  });

  it('should return null for null metadata', () => {
    const result = extractUserIdFromMetadata(null);
    expect(result).toBeNull();
  });

  it('should return null for undefined metadata', () => {
    const result = extractUserIdFromMetadata(undefined);
    expect(result).toBeNull();
  });

  it('should return null for missing user_id', () => {
    const result = extractUserIdFromMetadata({});
    expect(result).toBeNull();
  });

  it('should return null for empty user_id', () => {
    const result = extractUserIdFromMetadata({ user_id: '' });
    expect(result).toBeNull();
  });

  it('should return null for whitespace-only user_id', () => {
    const result = extractUserIdFromMetadata({ user_id: '   ' });
    expect(result).toBeNull();
  });
});

// ============================================================================
// extractPriceIdFromItems
// ============================================================================

describe('extractPriceIdFromItems', () => {
  it('should extract price ID from first item', () => {
    const items = [{ price: { id: 'price_123' } }];
    const result = extractPriceIdFromItems(items);
    expect(result).toBe('price_123');
  });

  it('should return first price ID when multiple items', () => {
    const items = [
      { price: { id: 'price_first' } },
      { price: { id: 'price_second' } },
    ];
    const result = extractPriceIdFromItems(items);
    expect(result).toBe('price_first');
  });

  it('should return null for undefined items', () => {
    const result = extractPriceIdFromItems(undefined);
    expect(result).toBeNull();
  });

  it('should return null for empty array', () => {
    const result = extractPriceIdFromItems([]);
    expect(result).toBeNull();
  });

  it('should return null for item without price', () => {
    const items = [{}];
    const result = extractPriceIdFromItems(items);
    expect(result).toBeNull();
  });

  it('should return null for item with price without id', () => {
    const items = [{ price: {} }];
    const result = extractPriceIdFromItems(items);
    expect(result).toBeNull();
  });
});

// ============================================================================
// mapWebhookToHistoryEventType
// ============================================================================

describe('mapWebhookToHistoryEventType', () => {
  it('should map checkout.session.completed', () => {
    expect(mapWebhookToHistoryEventType('checkout.session.completed')).toBe('subscription_created');
  });

  it('should map customer.subscription.updated', () => {
    expect(mapWebhookToHistoryEventType('customer.subscription.updated')).toBe('subscription_updated');
  });

  it('should map customer.subscription.deleted', () => {
    expect(mapWebhookToHistoryEventType('customer.subscription.deleted')).toBe('subscription_canceled');
  });

  it('should map invoice.payment_failed', () => {
    expect(mapWebhookToHistoryEventType('invoice.payment_failed')).toBe('payment_failed');
  });

  it('should map invoice.payment_succeeded', () => {
    expect(mapWebhookToHistoryEventType('invoice.payment_succeeded')).toBe('payment_succeeded');
  });
});

// ============================================================================
// Constants Verification
// ============================================================================

describe('Constants', () => {
  it('should have correct SUPPORTED_WEBHOOK_EVENTS', () => {
    expect(SUPPORTED_WEBHOOK_EVENTS).toEqual([
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
      'invoice.payment_succeeded',
    ]);
  });

  it('should have correct ACTIVE_SUBSCRIPTION_STATUSES', () => {
    expect(ACTIVE_SUBSCRIPTION_STATUSES).toEqual(['active', 'trialing']);
  });

  it('should have correct INACTIVE_SUBSCRIPTION_STATUSES', () => {
    expect(INACTIVE_SUBSCRIPTION_STATUSES).toEqual(['canceled', 'incomplete_expired', 'unpaid']);
  });
});
