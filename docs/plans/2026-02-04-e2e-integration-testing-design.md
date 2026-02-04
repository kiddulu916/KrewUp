# E2E and Integration Testing Design

## Overview

Replace unit tests for rate-limiting, application wizard, and subscription features with E2E and integration tests that better reflect real user behavior.

**Philosophy:** Test behavior, not implementation. Mock only external services.

## Test Structure

```
__tests__/
├── integration/                    # NEW: Integration tests
│   ├── rate-limit.integration.test.ts
│   ├── application-service.integration.test.ts
│   └── stripe-service.integration.test.ts
├── components/                     # KEEP: UI component tests (unchanged)
├── lib/                            # KEEP: Utility tests (unchanged)
└── features/                       # MODIFY: Remove tests for 3 features

e2e/
├── auth-rate-limiting.spec.ts      # NEW: Auth rate limit E2E
├── applications.spec.ts            # EXPAND: Add auto-fill scenarios
├── subscriptions.spec.ts           # KEEP: Already covers UI flows
└── pro-features.spec.ts            # KEEP: Already covers feature gating
```

## Mocking Philosophy

| What             | Mock?                | Why                                      |
| ---------------- | -------------------- | ---------------------------------------- |
| Stripe API       | Yes                  | Costs money, rate limits, flaky network  |
| Upstash Redis    | Yes (in integration) | External service, use in-memory fallback |
| Time/Date        | Yes                  | Rate limiting needs time control         |
| Internal modules | **No**               | This broke unit tests                    |
| Supabase         | No                   | Use real test database                   |

**Rule:** Mock external services only. Never mock internal code.

---

## Rate-Limiting Tests

### E2E: `e2e/auth-rate-limiting.spec.ts`

Tests real rate limiting behavior in the browser:

```typescript
test.describe("Auth Rate Limiting", () => {
  test("blocks login after 5 failed attempts", async ({ page }) => {
    // Attempt login 5 times with wrong password
    // 6th attempt shows "Too many attempts, try again in X seconds"
    // Wait for window to reset, verify login works again
  });

  test("blocks signup after 3 attempts", async ({ page }) => {
    // Similar pattern for signup rate limit
  });

  test("shows appropriate error message with retry time", async ({ page }) => {
    // Verify UI displays remaining seconds until retry
  });
});
```

### Integration: `__tests__/integration/rate-limit.integration.test.ts`

Tests rate-limit module with real in-memory store:

```typescript
describe("Rate Limit Module", () => {
  beforeEach(() => {
    // Reset in-memory store between tests
    // Mock Date.now() for time control
  });

  test("tracks requests across action types independently", () => {
    // 'auth' and 'message' limits don't interfere
  });

  test("resets count after window expires", () => {
    // Advance time past window, verify reset
  });

  test("returns correct remaining/reset values", () => {
    // Verify response shape matches expected format
  });
});
```

**Mocking:** Only `Date.now()` for time advancement.

---

## Application Wizard Tests

### E2E Expansion: `e2e/applications.spec.ts`

Add new scenarios to existing file:

```typescript
test.describe("Application Wizard - Auto-fill", () => {
  test("pre-fills form with existing profile data", async ({ page }) => {
    // Create worker with complete profile (work history, education, etc.)
    // Start new application
    // Verify steps 5-8 show profile data pre-populated
  });

  test("draft data takes precedence over profile data", async ({ page }) => {
    // Worker has profile with "Company A" in work history
    // Start application, change to "Company B", navigate away
    // Return to application
    // Verify "Company B" is shown (draft wins)
  });

  test("edited fields persist after browser refresh", async ({ page }) => {
    // Fill partial application, refresh browser
    // Verify all entered data restored from draft
  });
});
```

### Integration: `__tests__/integration/application-service.integration.test.ts`

Tests pure business logic with **zero mocks**:

```typescript
describe("Application Service", () => {
  describe("validateApplicationInput", () => {
    test("accepts valid application data", () => {
      const result = validateApplicationInput(validData);
      expect(result.success).toBe(true);
    });

    test("rejects missing required fields", () => {
      const result = validateApplicationInput({ ...validData, email: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("validateCoverLetter", () => {
    test("accepts letter within bounds (10-5000 chars)", () => {});
    test("rejects letter under 10 characters", () => {});
    test("rejects letter over 5000 characters", () => {});
  });

  describe("Status Transitions", () => {
    test("pending can transition to viewed", () => {});
    test("pending cannot transition directly to hired", () => {});
  });
});
```

**Mocking:** None. Pure function testing.

---

## Subscription Tests

### E2E: Keep existing files

`e2e/subscriptions.spec.ts` and `e2e/pro-features.spec.ts` already cover:

- Checkout flow initiation (redirects to Stripe)
- Pro badge display after subscription
- Feature gating (non-Pro users blocked from Pro features)
- Billing portal access

No expansion needed.

### Integration: `__tests__/integration/stripe-service.integration.test.ts`

Tests webhook processing logic:

```typescript
describe('Stripe Service - Webhook Processing', () => {
  // Mock only: Stripe SDK (external service)
  // Real: Supabase test client, all internal logic

  describe('checkout.session.completed', () => {
    test('activates subscription for user', async () => {
      const event = createStripeEvent('checkout.session.completed', { ... });
      await processWebhookEvent(event, supabaseClient);

      // Verify user's subscription_status updated in real test DB
      const user = await supabaseClient.from('users').select().eq('id', userId);
      expect(user.subscription_status).toBe('active');
    });
  });

  describe('customer.subscription.deleted', () => {
    test('deactivates subscription and removes boost', async () => {
      // Set up user with active subscription
      await processWebhookEvent(cancellationEvent, supabaseClient);

      // Verify subscription deactivated, boost removed
    });
  });

  describe('invoice.payment_failed', () => {
    test('marks subscription as past_due', async () => { });
  });
});
```

**Mocking:** Only Stripe SDK for event construction. Uses real Supabase test client.

---

## Unit Tests to Remove

### Rate-Limiting (1 file)

- `__tests__/lib/security/rate-limit.test.ts`

### Application Wizard (11 files)

- `features/applications/hooks/use-application-wizard.test.ts`
- `features/applications/services/application-service.test.ts`
- `features/applications/components/application-wizard/progress-indicator.test.tsx`
- `features/applications/components/application-wizard/wizard-container.test.tsx`
- `features/applications/components/application-wizard/auto-save-indicator.test.tsx`
- `__tests__/features/applications/actions/application-actions.test.ts`
- `__tests__/features/applications/actions/draft-actions.test.ts`
- `__tests__/features/applications/actions/file-upload-actions.test.ts`
- `__tests__/features/applications/actions/profile-data-actions.test.ts`
- `__tests__/components/applications/wizard-steps.test.tsx`

### Subscriptions (12 files)

- `features/subscriptions/services/stripe-service.test.ts`
- `features/subscriptions/hooks/use-subscription.test.ts`
- `features/subscriptions/hooks/use-checkout.test.ts`
- `features/subscriptions/hooks/use-boost.test.ts`
- `features/subscriptions/hooks/use-track-profile-view.test.ts`
- `features/subscriptions/components/feature-gate.test.tsx`
- `features/subscriptions/components/boost-badge.test.tsx`
- `features/subscriptions/components/pricing-card.test.tsx`
- `features/subscriptions/components/subscription-manager.test.tsx`
- `features/subscriptions/components/pro-badge.test.tsx`
- `__tests__/features/subscriptions/actions/subscription-actions.test.ts`
- `__tests__/features/subscriptions/actions/boost-actions.test.ts`

**Total: 24 files to remove**

---

## Implementation Order

1. Create `__tests__/integration/` directory
2. Write 3 integration tests (can run immediately, fast feedback)
3. Write new E2E test (`auth-rate-limiting.spec.ts`)
4. Expand `applications.spec.ts` with auto-fill scenarios
5. Delete 24 unit test files
6. Verify all tests pass: `npm test && npm run test:e2e`

## Summary

| Feature            | E2E                                | Integration                                     | Unit (removed)         |
| ------------------ | ---------------------------------- | ----------------------------------------------- | ---------------------- |
| Rate-Limiting      | `auth-rate-limiting.spec.ts` (new) | `rate-limit.integration.test.ts` (new)          | ~~rate-limit.test.ts~~ |
| Application Wizard | `applications.spec.ts` (expanded)  | `application-service.integration.test.ts` (new) | ~~11 files~~           |
| Subscriptions      | `subscriptions.spec.ts` (existing) | `stripe-service.integration.test.ts` (new)      | ~~12 files~~           |

**Files Changed:**

- 3 new files (integration tests)
- 1 new file (E2E)
- 1 modified file (applications E2E)
- 24 deleted files (unit tests)
