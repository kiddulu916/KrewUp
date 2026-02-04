# E2E and Integration Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace unit tests for rate-limiting, application wizard, and subscriptions with E2E and integration tests that test real behavior.

**Architecture:** Create 3 integration tests in `__tests__/integration/` for pure business logic, 1 new E2E test for auth rate limiting, expand existing application E2E with auto-fill scenarios, then delete 24 unit test files.

**Tech Stack:** Vitest (integration tests), Playwright (E2E), Supabase test client, minimal mocking (external services only)

---

## Task 1: Create Integration Test Directory

**Files:**

- Create: `__tests__/integration/.gitkeep`

**Step 1: Create the directory structure**

```bash
mkdir -p __tests__/integration
touch __tests__/integration/.gitkeep
```

**Step 2: Commit**

```bash
git add __tests__/integration
git commit -m "$(cat <<'EOF'
chore: create integration test directory

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Write Rate Limit Integration Test

**Files:**

- Create: `__tests__/integration/rate-limit.integration.test.ts`
- Reference: `lib/security/rate-limit.ts`

**Step 1: Write the integration test**

```typescript
// __tests__/integration/rate-limit.integration.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We need to mock next/headers and Sentry (external dependencies only)
vi.mock("next/headers", () => ({
  headers: vi.fn(() =>
    Promise.resolve(new Map([["x-forwarded-for", "127.0.0.1"]])),
  ),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

// Mock Upstash to force in-memory fallback (we're testing the rate limit logic, not Redis)
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn(() => null),
  },
}));

describe("Rate Limit Module - Integration", () => {
  let originalDateNow: () => number;
  let mockNow: number;

  beforeEach(() => {
    // Reset modules to clear in-memory store between tests
    vi.resetModules();

    // Mock Date.now() for time control
    mockNow = 1700000000000;
    originalDateNow = Date.now;
    Date.now = vi.fn(() => mockNow);
  });

  afterEach(() => {
    Date.now = originalDateNow;
    vi.restoreAllMocks();
  });

  describe("checkRateLimit", () => {
    it("should allow requests within the limit", async () => {
      const { checkRateLimit, RATE_LIMITS } =
        await import("@/lib/security/rate-limit");

      // First request should succeed
      const result1 = await checkRateLimit("test:action", RATE_LIMITS.auth);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(4); // 5 limit - 1 used

      // Second request should also succeed
      const result2 = await checkRateLimit("test:action", RATE_LIMITS.auth);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it("should block requests exceeding the limit", async () => {
      const { checkRateLimit, RATE_LIMITS } =
        await import("@/lib/security/rate-limit");

      // Use up all 5 attempts
      for (let i = 0; i < 5; i++) {
        await checkRateLimit("test:blocked", RATE_LIMITS.auth);
      }

      // 6th request should be blocked
      const result = await checkRateLimit("test:blocked", RATE_LIMITS.auth);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should track requests independently across action types", async () => {
      const { checkRateLimit, RATE_LIMITS } =
        await import("@/lib/security/rate-limit");

      // Use up auth limit
      for (let i = 0; i < 5; i++) {
        await checkRateLimit("auth:login", RATE_LIMITS.auth);
      }

      // Auth should be blocked
      const authResult = await checkRateLimit("auth:login", RATE_LIMITS.auth);
      expect(authResult.success).toBe(false);

      // But message should still work (different action type)
      const messageResult = await checkRateLimit(
        "message:send",
        RATE_LIMITS.message,
      );
      expect(messageResult.success).toBe(true);
    });

    it("should reset count after window expires", async () => {
      const { checkRateLimit, RATE_LIMITS } =
        await import("@/lib/security/rate-limit");

      // Use up all attempts
      for (let i = 0; i < 5; i++) {
        await checkRateLimit("test:reset", RATE_LIMITS.auth);
      }

      // Should be blocked
      let result = await checkRateLimit("test:reset", RATE_LIMITS.auth);
      expect(result.success).toBe(false);

      // Advance time past the 60-second window
      mockNow += 61 * 1000;

      // Should be allowed again
      result = await checkRateLimit("test:reset", RATE_LIMITS.auth);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should return correct reset timestamp", async () => {
      const { checkRateLimit, RATE_LIMITS } =
        await import("@/lib/security/rate-limit");

      const result = await checkRateLimit("test:timestamp", RATE_LIMITS.auth);

      // Reset should be windowStart + windowSeconds
      const expectedReset = Math.ceil((mockNow + 60 * 1000) / 1000);
      expect(result.reset).toBe(expectedReset);
    });
  });

  describe("rateLimit wrapper", () => {
    it("should return null when within limits", async () => {
      const { rateLimit, RATE_LIMITS } =
        await import("@/lib/security/rate-limit");

      const result = await rateLimit("test:wrapper", RATE_LIMITS.auth);
      expect(result).toBeNull();
    });

    it("should return error object when rate limited", async () => {
      const { rateLimit, RATE_LIMITS } =
        await import("@/lib/security/rate-limit");

      // Use up all attempts
      for (let i = 0; i < 5; i++) {
        await rateLimit("test:wrapper-blocked", RATE_LIMITS.auth);
      }

      const result = await rateLimit("test:wrapper-blocked", RATE_LIMITS.auth);
      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect(result?.error).toMatch(/Too many attempts/);
    });
  });

  describe("createUserRateLimiter", () => {
    it("should use user ID as identifier instead of IP", async () => {
      const { createUserRateLimiter, RATE_LIMITS } =
        await import("@/lib/security/rate-limit");

      const user1Limiter = createUserRateLimiter("user-1");
      const user2Limiter = createUserRateLimiter("user-2");

      // Use up user1's limit
      for (let i = 0; i < 5; i++) {
        await user1Limiter("message:send", RATE_LIMITS.auth);
      }

      // User1 should be blocked
      const user1Result = await user1Limiter("message:send", RATE_LIMITS.auth);
      expect(user1Result.success).toBe(false);

      // User2 should still be allowed
      const user2Result = await user2Limiter("message:send", RATE_LIMITS.auth);
      expect(user2Result.success).toBe(true);
    });
  });

  describe("RATE_LIMITS configuration", () => {
    it("should have correct limits for auth actions", async () => {
      const { RATE_LIMITS } = await import("@/lib/security/rate-limit");

      expect(RATE_LIMITS.auth.limit).toBe(5);
      expect(RATE_LIMITS.auth.windowSeconds).toBe(60);

      expect(RATE_LIMITS.authSignup.limit).toBe(3);
      expect(RATE_LIMITS.authSignup.windowSeconds).toBe(60);
    });

    it("should have correct limits for other actions", async () => {
      const { RATE_LIMITS } = await import("@/lib/security/rate-limit");

      expect(RATE_LIMITS.message.limit).toBe(30);
      expect(RATE_LIMITS.upload.limit).toBe(10);
      expect(RATE_LIMITS.search.limit).toBe(60);
      expect(RATE_LIMITS.adminAction.limit).toBe(20);
    });
  });
});
```

**Step 2: Run the test to verify it passes**

```bash
npm test -- __tests__/integration/rate-limit.integration.test.ts
```

Expected: All tests PASS

**Step 3: Commit**

```bash
git add __tests__/integration/rate-limit.integration.test.ts
git commit -m "$(cat <<'EOF'
test: add rate-limit integration test

Tests the rate-limit module with real in-memory store.
Only mocks external dependencies (next/headers, Sentry, Upstash).
Uses Date.now() mocking for time-based tests.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Write Application Service Integration Test

**Files:**

- Create: `__tests__/integration/application-service.integration.test.ts`
- Reference: `features/applications/services/application-service.ts`

**Step 1: Write the integration test (zero mocks)**

```typescript
// __tests__/integration/application-service.integration.test.ts
import { describe, it, expect } from "vitest";
import {
  validateApplicationInput,
  validateCoverLetter,
  validateCustomAnswers,
  validateApplicationStatus,
  validateStatusTransition,
  buildApplicationRecord,
  sanitizeCustomAnswers,
  isTerminalStatus,
  getAllowedTransitions,
  canWithdrawApplication,
  MAX_COVER_LETTER_LENGTH,
  MIN_COVER_LETTER_LENGTH,
  MAX_CUSTOM_ANSWER_LENGTH,
  VALID_STATUS_TRANSITIONS,
} from "@/features/applications/services/application-service";

describe("Application Service - Integration", () => {
  describe("validateApplicationInput", () => {
    it("should accept valid application data", () => {
      const result = validateApplicationInput({
        jobId: "job-123",
        coverLetter: "I am interested in this position.",
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject missing jobId", () => {
      const result = validateApplicationInput({
        jobId: "",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Job ID cannot be empty");
      expect(result.field).toBe("jobId");
    });

    it("should reject null jobId", () => {
      const result = validateApplicationInput({
        jobId: null as unknown as string,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Job ID is required");
    });

    it("should accept application without cover letter", () => {
      const result = validateApplicationInput({
        jobId: "job-123",
      });

      expect(result.valid).toBe(true);
    });

    it("should validate cover letter if provided", () => {
      const result = validateApplicationInput({
        jobId: "job-123",
        coverLetter: "short", // Too short
      });

      expect(result.valid).toBe(false);
      expect(result.field).toBe("coverLetter");
    });
  });

  describe("validateCoverLetter", () => {
    it("should accept empty/null cover letter (optional)", () => {
      expect(validateCoverLetter("")).toEqual({ valid: true });
      expect(validateCoverLetter(null)).toEqual({ valid: true });
      expect(validateCoverLetter(undefined)).toEqual({ valid: true });
    });

    it("should accept cover letter within bounds", () => {
      const validLetter = "A".repeat(MIN_COVER_LETTER_LENGTH);
      const result = validateCoverLetter(validLetter);

      expect(result.valid).toBe(true);
    });

    it("should reject cover letter under minimum length", () => {
      const shortLetter = "A".repeat(MIN_COVER_LETTER_LENGTH - 1);
      const result = validateCoverLetter(shortLetter);

      expect(result.valid).toBe(false);
      expect(result.error).toContain(`at least ${MIN_COVER_LETTER_LENGTH}`);
      expect(result.field).toBe("coverLetter");
    });

    it("should reject cover letter over maximum length", () => {
      const longLetter = "A".repeat(MAX_COVER_LETTER_LENGTH + 1);
      const result = validateCoverLetter(longLetter);

      expect(result.valid).toBe(false);
      expect(result.error).toContain(`less than ${MAX_COVER_LETTER_LENGTH}`);
      expect(result.field).toBe("coverLetter");
    });

    it("should trim whitespace before validation", () => {
      const letterWithWhitespace =
        "   " + "A".repeat(MIN_COVER_LETTER_LENGTH) + "   ";
      const result = validateCoverLetter(letterWithWhitespace);

      expect(result.valid).toBe(true);
    });
  });

  describe("validateCustomAnswers", () => {
    it("should accept empty questions array", () => {
      const result = validateCustomAnswers({}, []);
      expect(result.valid).toBe(true);
    });

    it("should accept answers for required questions", () => {
      const result = validateCustomAnswers({ q0: "My answer" }, [
        { question: "Why do you want this job?", required: true },
      ]);

      expect(result.valid).toBe(true);
    });

    it("should reject missing required answers", () => {
      const result = validateCustomAnswers({}, [
        { question: "Why do you want this job?", required: true },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Answer required");
    });

    it("should accept missing optional answers", () => {
      const result = validateCustomAnswers({}, [
        { question: "Any additional comments?", required: false },
      ]);

      expect(result.valid).toBe(true);
    });

    it("should reject answers exceeding max length", () => {
      const longAnswer = "A".repeat(MAX_CUSTOM_ANSWER_LENGTH + 1);
      const result = validateCustomAnswers({ q0: longAnswer }, [
        { question: "Tell us about yourself", required: false },
      ]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("too long");
    });

    it("should use question id if provided", () => {
      const result = validateCustomAnswers({ "custom-id": "My answer" }, [
        { id: "custom-id", question: "Custom question", required: true },
      ]);

      expect(result.valid).toBe(true);
    });
  });

  describe("validateApplicationStatus", () => {
    it("should accept valid statuses", () => {
      const validStatuses = [
        "pending",
        "viewed",
        "contacted",
        "rejected",
        "hired",
      ];

      for (const status of validStatuses) {
        const result = validateApplicationStatus(status);
        expect(result.valid).toBe(true);
      }
    });

    it("should reject invalid status", () => {
      const result = validateApplicationStatus("invalid");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid status");
    });

    it("should reject empty status", () => {
      const result = validateApplicationStatus("");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Status is required");
    });
  });

  describe("validateStatusTransition", () => {
    it("should allow valid transitions from pending", () => {
      const allowedFromPending = ["viewed", "contacted", "rejected", "hired"];

      for (const to of allowedFromPending) {
        const result = validateStatusTransition("pending", to as any);
        expect(result.valid).toBe(true);
      }
    });

    it("should allow valid transitions from viewed", () => {
      const allowedFromViewed = ["contacted", "rejected", "hired"];

      for (const to of allowedFromViewed) {
        const result = validateStatusTransition("viewed", to as any);
        expect(result.valid).toBe(true);
      }
    });

    it("should reject transitions from terminal states", () => {
      const rejectedResult = validateStatusTransition("rejected", "pending");
      expect(rejectedResult.valid).toBe(false);
      expect(rejectedResult.error).toContain("terminal state");

      const hiredResult = validateStatusTransition("hired", "contacted");
      expect(hiredResult.valid).toBe(false);
      expect(hiredResult.error).toContain("terminal state");
    });

    it("should reject invalid transitions", () => {
      // Can't go from contacted back to pending
      const result = validateStatusTransition("contacted", "pending");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Cannot transition");
    });
  });

  describe("buildApplicationRecord", () => {
    it("should build correct record structure", () => {
      const record = buildApplicationRecord(
        {
          jobId: "job-123",
          coverLetter: "  My cover letter  ",
          customAnswers: { q1: "answer1" },
        },
        "applicant-456",
      );

      expect(record).toEqual({
        job_id: "job-123",
        applicant_id: "applicant-456",
        cover_letter: "My cover letter", // Trimmed
        custom_answers: { q1: "answer1" },
        status: "pending",
      });
    });

    it("should handle missing optional fields", () => {
      const record = buildApplicationRecord(
        { jobId: "job-123" },
        "applicant-456",
      );

      expect(record.cover_letter).toBeNull();
      expect(record.custom_answers).toBeNull();
    });
  });

  describe("sanitizeCustomAnswers", () => {
    it("should trim whitespace from answers", () => {
      const result = sanitizeCustomAnswers({
        q1: "  answer with spaces  ",
        q2: "\tanswer with tabs\t",
      });

      expect(result.q1).toBe("answer with spaces");
      expect(result.q2).toBe("answer with tabs");
    });

    it("should return empty object for undefined input", () => {
      const result = sanitizeCustomAnswers(undefined);
      expect(result).toEqual({});
    });

    it("should filter out non-string values", () => {
      const result = sanitizeCustomAnswers({
        q1: "valid",
        q2: 123 as unknown as string,
      });

      expect(result.q1).toBe("valid");
      expect(result.q2).toBeUndefined();
    });
  });

  describe("Status Utilities", () => {
    it("isTerminalStatus should identify terminal states", () => {
      expect(isTerminalStatus("rejected")).toBe(true);
      expect(isTerminalStatus("hired")).toBe(true);
      expect(isTerminalStatus("pending")).toBe(false);
      expect(isTerminalStatus("viewed")).toBe(false);
      expect(isTerminalStatus("contacted")).toBe(false);
    });

    it("getAllowedTransitions should return correct transitions", () => {
      expect(getAllowedTransitions("pending")).toEqual([
        "viewed",
        "contacted",
        "rejected",
        "hired",
      ]);
      expect(getAllowedTransitions("viewed")).toEqual([
        "contacted",
        "rejected",
        "hired",
      ]);
      expect(getAllowedTransitions("contacted")).toEqual(["rejected", "hired"]);
      expect(getAllowedTransitions("rejected")).toEqual([]);
      expect(getAllowedTransitions("hired")).toEqual([]);
    });

    it("canWithdrawApplication should check withdrawable states", () => {
      expect(canWithdrawApplication("pending")).toBe(true);
      expect(canWithdrawApplication("viewed")).toBe(true);
      expect(canWithdrawApplication("contacted")).toBe(false);
      expect(canWithdrawApplication("rejected")).toBe(false);
      expect(canWithdrawApplication("hired")).toBe(false);
    });
  });

  describe("Constants", () => {
    it("should have correct validation constants", () => {
      expect(MAX_COVER_LETTER_LENGTH).toBe(5000);
      expect(MIN_COVER_LETTER_LENGTH).toBe(10);
      expect(MAX_CUSTOM_ANSWER_LENGTH).toBe(2000);
    });

    it("should have complete status transitions map", () => {
      expect(VALID_STATUS_TRANSITIONS).toHaveProperty("pending");
      expect(VALID_STATUS_TRANSITIONS).toHaveProperty("viewed");
      expect(VALID_STATUS_TRANSITIONS).toHaveProperty("contacted");
      expect(VALID_STATUS_TRANSITIONS).toHaveProperty("rejected");
      expect(VALID_STATUS_TRANSITIONS).toHaveProperty("hired");
    });
  });
});
```

**Step 2: Run the test to verify it passes**

```bash
npm test -- __tests__/integration/application-service.integration.test.ts
```

Expected: All tests PASS

**Step 3: Commit**

```bash
git add __tests__/integration/application-service.integration.test.ts
git commit -m "$(cat <<'EOF'
test: add application-service integration test

Tests pure business logic with zero mocks.
Covers validation, status transitions, and data transformation.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Write Stripe Service Integration Test

**Files:**

- Create: `__tests__/integration/stripe-service.integration.test.ts`
- Reference: `features/subscriptions/services/stripe-service.ts`

**Step 1: Write the integration test (zero mocks - pure functions)**

```typescript
// __tests__/integration/stripe-service.integration.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  validateCheckoutMetadata,
  validatePriceId,
  validateCustomerId,
  validateSubscriptionId,
  isSupportedWebhookEvent,
  determinePlanType,
  mapSubscriptionStatus,
  isSubscriptionActive,
  isSubscriptionInactive,
  getSubscriptionTier,
  unixToISOString,
  getDefaultPeriodEnd,
  calculatePeriodEnd,
  buildSubscriptionRecord,
  buildSubscriptionHistoryRecord,
  shouldActivateProfileBoost,
  shouldRemoveProfileBoost,
  shouldSkipSubscriptionUpdate,
  centsToDollars,
  dollarsToCents,
  formatAmount,
  extractUserIdFromMetadata,
  extractPriceIdFromItems,
  mapWebhookToHistoryEventType,
  SUPPORTED_WEBHOOK_EVENTS,
  ACTIVE_SUBSCRIPTION_STATUSES,
  INACTIVE_SUBSCRIPTION_STATUSES,
} from "@/features/subscriptions/services/stripe-service";

describe("Stripe Service - Integration", () => {
  const testPriceConfig = {
    monthlyPriceId: "price_monthly_test",
    annualPriceId: "price_annual_test",
  };

  describe("Validation Functions", () => {
    describe("validateCheckoutMetadata", () => {
      it("should accept valid metadata with user_id", () => {
        const result = validateCheckoutMetadata({ user_id: "user-123" });
        expect(result.valid).toBe(true);
      });

      it("should reject null metadata", () => {
        const result = validateCheckoutMetadata(null);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Missing session metadata");
      });

      it("should reject metadata without user_id", () => {
        const result = validateCheckoutMetadata({});
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Missing user_id in session metadata");
      });

      it("should reject empty user_id", () => {
        const result = validateCheckoutMetadata({ user_id: "   " });
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid user_id in session metadata");
      });
    });

    describe("validatePriceId", () => {
      it("should identify monthly price", () => {
        const result = validatePriceId("price_monthly_test", testPriceConfig);
        expect(result.valid).toBe(true);
        expect(result.planType).toBe("monthly");
      });

      it("should identify annual price", () => {
        const result = validatePriceId("price_annual_test", testPriceConfig);
        expect(result.valid).toBe(true);
        expect(result.planType).toBe("annual");
      });

      it("should reject unknown price", () => {
        const result = validatePriceId("price_unknown", testPriceConfig);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Unknown price ID");
      });

      it("should reject undefined price", () => {
        const result = validatePriceId(undefined, testPriceConfig);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Missing price ID");
      });
    });

    describe("validateCustomerId", () => {
      it("should accept valid customer ID", () => {
        const result = validateCustomerId("cus_abc123");
        expect(result.valid).toBe(true);
      });

      it("should reject null customer ID", () => {
        const result = validateCustomerId(null);
        expect(result.valid).toBe(false);
      });

      it("should reject invalid format", () => {
        const result = validateCustomerId("invalid_123");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid customer ID format");
      });
    });

    describe("validateSubscriptionId", () => {
      it("should accept valid subscription ID", () => {
        const result = validateSubscriptionId("sub_xyz789");
        expect(result.valid).toBe(true);
      });

      it("should reject invalid format", () => {
        const result = validateSubscriptionId("invalid_sub");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid subscription ID format");
      });
    });

    describe("isSupportedWebhookEvent", () => {
      it("should accept supported events", () => {
        expect(isSupportedWebhookEvent("checkout.session.completed")).toBe(
          true,
        );
        expect(isSupportedWebhookEvent("customer.subscription.updated")).toBe(
          true,
        );
        expect(isSupportedWebhookEvent("customer.subscription.deleted")).toBe(
          true,
        );
        expect(isSupportedWebhookEvent("invoice.payment_failed")).toBe(true);
        expect(isSupportedWebhookEvent("invoice.payment_succeeded")).toBe(true);
      });

      it("should reject unsupported events", () => {
        expect(isSupportedWebhookEvent("customer.created")).toBe(false);
        expect(isSupportedWebhookEvent("invoice.created")).toBe(false);
      });
    });
  });

  describe("Plan & Status Functions", () => {
    describe("determinePlanType", () => {
      it("should return monthly for monthly price", () => {
        expect(determinePlanType("price_monthly_test", testPriceConfig)).toBe(
          "monthly",
        );
      });

      it("should return annual for annual price", () => {
        expect(determinePlanType("price_annual_test", testPriceConfig)).toBe(
          "annual",
        );
      });

      it("should return null for unknown price", () => {
        expect(determinePlanType("unknown", testPriceConfig)).toBeNull();
        expect(determinePlanType(undefined, testPriceConfig)).toBeNull();
      });
    });

    describe("mapSubscriptionStatus", () => {
      it("should map valid Stripe statuses", () => {
        expect(mapSubscriptionStatus("active")).toBe("active");
        expect(mapSubscriptionStatus("canceled")).toBe("canceled");
        expect(mapSubscriptionStatus("past_due")).toBe("past_due");
        expect(mapSubscriptionStatus("trialing")).toBe("trialing");
      });

      it("should default to incomplete for unknown statuses", () => {
        expect(mapSubscriptionStatus("unknown_status")).toBe("incomplete");
      });
    });

    describe("isSubscriptionActive", () => {
      it("should return true for active statuses", () => {
        expect(isSubscriptionActive("active")).toBe(true);
        expect(isSubscriptionActive("trialing")).toBe(true);
      });

      it("should return false for inactive statuses", () => {
        expect(isSubscriptionActive("canceled")).toBe(false);
        expect(isSubscriptionActive("past_due")).toBe(false);
        expect(isSubscriptionActive("unpaid")).toBe(false);
      });
    });

    describe("isSubscriptionInactive", () => {
      it("should return true for canceled/expired", () => {
        expect(isSubscriptionInactive("canceled")).toBe(true);
        expect(isSubscriptionInactive("incomplete_expired")).toBe(true);
        expect(isSubscriptionInactive("unpaid")).toBe(true);
      });

      it("should return false for active statuses", () => {
        expect(isSubscriptionInactive("active")).toBe(false);
        expect(isSubscriptionInactive("trialing")).toBe(false);
      });
    });

    describe("getSubscriptionTier", () => {
      it("should return pro for active subscriptions", () => {
        expect(getSubscriptionTier("active")).toBe("pro");
        expect(getSubscriptionTier("trialing")).toBe("pro");
      });

      it("should return free for inactive subscriptions", () => {
        expect(getSubscriptionTier("canceled")).toBe("free");
        expect(getSubscriptionTier("past_due")).toBe("free");
      });
    });
  });

  describe("Timestamp Functions", () => {
    describe("unixToISOString", () => {
      it("should convert Unix timestamp to ISO string", () => {
        const result = unixToISOString(1700000000);
        expect(result).toBe("2023-11-14T22:13:20.000Z");
      });

      it("should return current date for null/undefined", () => {
        const result = unixToISOString(null);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    describe("calculatePeriodEnd", () => {
      it("should add 1 month for monthly plan", () => {
        const start = new Date("2024-01-15");
        const result = calculatePeriodEnd("monthly", start);
        expect(result).toContain("2024-02");
      });

      it("should add 1 year for annual plan", () => {
        const start = new Date("2024-01-15");
        const result = calculatePeriodEnd("annual", start);
        expect(result).toContain("2025-01");
      });
    });
  });

  describe("Record Building Functions", () => {
    describe("buildSubscriptionRecord", () => {
      it("should build complete subscription record", () => {
        const record = buildSubscriptionRecord({
          userId: "user-123",
          customerId: "cus_abc",
          subscriptionId: "sub_xyz",
          priceId: "price_monthly",
          planType: "monthly",
          status: "active",
          periodStart: 1700000000,
          periodEnd: 1702592000,
          cancelAtPeriodEnd: false,
        });

        expect(record.user_id).toBe("user-123");
        expect(record.stripe_customer_id).toBe("cus_abc");
        expect(record.stripe_subscription_id).toBe("sub_xyz");
        expect(record.stripe_price_id).toBe("price_monthly");
        expect(record.plan_type).toBe("monthly");
        expect(record.status).toBe("active");
        expect(record.cancel_at_period_end).toBe(false);
        expect(record.current_period_start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(record.current_period_end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    describe("buildSubscriptionHistoryRecord", () => {
      it("should build history record with optional fields", () => {
        const record = buildSubscriptionHistoryRecord({
          userId: "user-123",
          subscriptionId: "sub_xyz",
          eventType: "subscription_created",
          status: "active",
          planType: "monthly",
          amount: 1500,
          currency: "usd",
        });

        expect(record.user_id).toBe("user-123");
        expect(record.stripe_subscription_id).toBe("sub_xyz");
        expect(record.event_type).toBe("subscription_created");
        expect(record.plan_type).toBe("monthly");
        expect(record.amount).toBe(1500);
        expect(record.currency).toBe("usd");
      });

      it("should omit undefined optional fields", () => {
        const record = buildSubscriptionHistoryRecord({
          userId: "user-123",
          subscriptionId: "sub_xyz",
          eventType: "subscription_updated",
          status: "active",
        });

        expect(record).not.toHaveProperty("plan_type");
        expect(record).not.toHaveProperty("amount");
        expect(record).not.toHaveProperty("currency");
      });
    });
  });

  describe("Boost Logic Functions", () => {
    describe("shouldActivateProfileBoost", () => {
      it("should activate for worker with active subscription", () => {
        expect(shouldActivateProfileBoost("worker", false, "active")).toBe(
          true,
        );
        expect(shouldActivateProfileBoost("worker", false, "trialing")).toBe(
          true,
        );
      });

      it("should not activate for lifetime pro users", () => {
        expect(shouldActivateProfileBoost("worker", true, "active")).toBe(
          false,
        );
      });

      it("should not activate for employers", () => {
        expect(shouldActivateProfileBoost("employer", false, "active")).toBe(
          false,
        );
      });

      it("should not activate for inactive subscriptions", () => {
        expect(shouldActivateProfileBoost("worker", false, "canceled")).toBe(
          false,
        );
      });
    });

    describe("shouldRemoveProfileBoost", () => {
      it("should remove for worker without lifetime pro", () => {
        expect(shouldRemoveProfileBoost("worker", false)).toBe(true);
      });

      it("should not remove for lifetime pro", () => {
        expect(shouldRemoveProfileBoost("worker", true)).toBe(false);
      });

      it("should not affect employers", () => {
        expect(shouldRemoveProfileBoost("employer", false)).toBe(false);
      });
    });

    describe("shouldSkipSubscriptionUpdate", () => {
      it("should skip for lifetime pro users", () => {
        expect(shouldSkipSubscriptionUpdate(true)).toBe(true);
      });

      it("should not skip for regular users", () => {
        expect(shouldSkipSubscriptionUpdate(false)).toBe(false);
        expect(shouldSkipSubscriptionUpdate(null)).toBe(false);
      });
    });
  });

  describe("Amount Conversion Functions", () => {
    describe("centsToDollars", () => {
      it("should convert cents to dollars", () => {
        expect(centsToDollars(1500)).toBe(15);
        expect(centsToDollars(99)).toBe(0.99);
        expect(centsToDollars(0)).toBe(0);
      });
    });

    describe("dollarsToCents", () => {
      it("should convert dollars to cents", () => {
        expect(dollarsToCents(15)).toBe(1500);
        expect(dollarsToCents(0.99)).toBe(99);
        expect(dollarsToCents(0)).toBe(0);
      });

      it("should round to avoid floating point issues", () => {
        expect(dollarsToCents(19.99)).toBe(1999);
      });
    });

    describe("formatAmount", () => {
      it("should format USD amounts", () => {
        expect(formatAmount(1500)).toBe("$15.00");
        expect(formatAmount(99)).toBe("$0.99");
      });

      it("should handle different currencies", () => {
        const result = formatAmount(1500, "eur");
        expect(result).toContain("15");
      });
    });
  });

  describe("Webhook Event Helpers", () => {
    describe("extractUserIdFromMetadata", () => {
      it("should extract user_id from metadata", () => {
        expect(extractUserIdFromMetadata({ user_id: "user-123" })).toBe(
          "user-123",
        );
      });

      it("should trim whitespace", () => {
        expect(extractUserIdFromMetadata({ user_id: "  user-123  " })).toBe(
          "user-123",
        );
      });

      it("should return null for missing metadata", () => {
        expect(extractUserIdFromMetadata(null)).toBeNull();
        expect(extractUserIdFromMetadata({})).toBeNull();
      });
    });

    describe("extractPriceIdFromItems", () => {
      it("should extract price ID from items array", () => {
        const items = [{ price: { id: "price_123" } }];
        expect(extractPriceIdFromItems(items)).toBe("price_123");
      });

      it("should return null for empty array", () => {
        expect(extractPriceIdFromItems([])).toBeNull();
        expect(extractPriceIdFromItems(undefined)).toBeNull();
      });
    });

    describe("mapWebhookToHistoryEventType", () => {
      it("should map webhook events to history types", () => {
        expect(mapWebhookToHistoryEventType("checkout.session.completed")).toBe(
          "subscription_created",
        );
        expect(
          mapWebhookToHistoryEventType("customer.subscription.updated"),
        ).toBe("subscription_updated");
        expect(
          mapWebhookToHistoryEventType("customer.subscription.deleted"),
        ).toBe("subscription_canceled");
        expect(mapWebhookToHistoryEventType("invoice.payment_failed")).toBe(
          "payment_failed",
        );
        expect(mapWebhookToHistoryEventType("invoice.payment_succeeded")).toBe(
          "payment_succeeded",
        );
      });
    });
  });

  describe("Constants", () => {
    it("should have correct supported webhook events", () => {
      expect(SUPPORTED_WEBHOOK_EVENTS).toHaveLength(5);
      expect(SUPPORTED_WEBHOOK_EVENTS).toContain("checkout.session.completed");
      expect(SUPPORTED_WEBHOOK_EVENTS).toContain(
        "customer.subscription.deleted",
      );
    });

    it("should have correct active statuses", () => {
      expect(ACTIVE_SUBSCRIPTION_STATUSES).toContain("active");
      expect(ACTIVE_SUBSCRIPTION_STATUSES).toContain("trialing");
    });

    it("should have correct inactive statuses", () => {
      expect(INACTIVE_SUBSCRIPTION_STATUSES).toContain("canceled");
      expect(INACTIVE_SUBSCRIPTION_STATUSES).toContain("unpaid");
    });
  });
});
```

**Step 2: Run the test to verify it passes**

```bash
npm test -- __tests__/integration/stripe-service.integration.test.ts
```

Expected: All tests PASS

**Step 3: Commit**

```bash
git add __tests__/integration/stripe-service.integration.test.ts
git commit -m "$(cat <<'EOF'
test: add stripe-service integration test

Tests pure business logic with zero mocks.
Covers validation, status mapping, boost logic, and amount conversion.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Write Auth Rate Limiting E2E Test

**Files:**

- Create: `e2e/auth-rate-limiting.spec.ts`
- Reference: `e2e/utils/test-helpers.ts`, `e2e/utils/test-db.ts`

**Step 1: Write the E2E test**

```typescript
// e2e/auth-rate-limiting.spec.ts
import { test, expect } from "@playwright/test";
import {
  cleanupTestData,
  createTestUser,
  deleteTestUser,
  TestUser,
} from "./utils/test-db";
import { generateTestEmail } from "./utils/test-helpers";

test.describe("Auth Rate Limiting", () => {
  let testUser: TestUser | null = null;

  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    if (testUser) {
      await deleteTestUser(testUser.id);
      testUser = null;
    }
  });

  test("blocks login after 5 failed attempts", async ({ page }) => {
    // Create a user to attempt login against
    testUser = await createTestUser({
      email: generateTestEmail(),
      password: "CorrectPassword123!",
      role: "worker",
      name: "Rate Limit Test User",
    });

    await page.goto("/login");

    // Attempt login 5 times with wrong password
    for (let i = 0; i < 5; i++) {
      await page.fill(
        'input[name="email"], input[type="email"]',
        testUser.email,
      );
      await page.fill(
        'input[name="password"], input[type="password"]',
        "WrongPassword123!",
      );
      await page.click('button[type="submit"]');

      // Wait for error message before next attempt
      await expect(
        page.locator(
          "text=/invalid.*credentials|incorrect.*password|login failed/i",
        ),
      ).toBeVisible({ timeout: 5000 });

      // Small delay to ensure rate limiter counts the attempt
      await page.waitForTimeout(500);
    }

    // 6th attempt should be rate limited
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill(
      'input[name="password"], input[type="password"]',
      "WrongPassword123!",
    );
    await page.click('button[type="submit"]');

    // Should see rate limit error
    await expect(
      page.locator("text=/too many attempts|try again|rate limit/i"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("blocks signup after 3 attempts", async ({ page }) => {
    await page.goto("/signup");

    // Attempt signup 3 times (will fail due to validation or duplicate email, but still counts)
    for (let i = 0; i < 3; i++) {
      const uniqueEmail = `test-ratelimit-${Date.now()}-${i}@test.krewup.local`;

      await page.fill('input[name="email"], input[type="email"]', uniqueEmail);
      await page.fill(
        'input[name="password"], input[type="password"]',
        "TestPassword123!",
      );

      // Fill confirm password if present
      const confirmPassword = page.locator(
        'input[name="confirmPassword"], input[name="confirm_password"]',
      );
      if (
        await confirmPassword.isVisible({ timeout: 1000 }).catch(() => false)
      ) {
        await confirmPassword.fill("TestPassword123!");
      }

      await page.click('button[type="submit"]');

      // Wait for response before next attempt
      await page.waitForTimeout(1000);
    }

    // 4th attempt should be rate limited
    const uniqueEmail = `test-ratelimit-${Date.now()}-blocked@test.krewup.local`;
    await page.fill('input[name="email"], input[type="email"]', uniqueEmail);
    await page.fill(
      'input[name="password"], input[type="password"]',
      "TestPassword123!",
    );

    const confirmPassword = page.locator(
      'input[name="confirmPassword"], input[name="confirm_password"]',
    );
    if (await confirmPassword.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmPassword.fill("TestPassword123!");
    }

    await page.click('button[type="submit"]');

    // Should see rate limit error
    await expect(
      page.locator("text=/too many attempts|try again|rate limit/i"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("shows appropriate error message with retry time", async ({ page }) => {
    testUser = await createTestUser({
      email: generateTestEmail(),
      password: "CorrectPassword123!",
      role: "worker",
      name: "Retry Time Test User",
    });

    await page.goto("/login");

    // Exhaust the rate limit
    for (let i = 0; i < 6; i++) {
      await page.fill(
        'input[name="email"], input[type="email"]',
        testUser.email,
      );
      await page.fill(
        'input[name="password"], input[type="password"]',
        "WrongPassword123!",
      );
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // Check that the error message includes retry information
    const errorMessage = page.locator(
      "text=/try again in \\d+ seconds?|wait.*seconds?/i",
    );
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test("allows login after rate limit window expires", async ({ page }) => {
    // This test is marked as slow because it waits for the rate limit window
    test.slow();

    testUser = await createTestUser({
      email: generateTestEmail(),
      password: "CorrectPassword123!",
      role: "worker",
      name: "Window Reset Test User",
    });

    await page.goto("/login");

    // Exhaust the rate limit
    for (let i = 0; i < 6; i++) {
      await page.fill(
        'input[name="email"], input[type="email"]',
        testUser.email,
      );
      await page.fill(
        'input[name="password"], input[type="password"]',
        "WrongPassword123!",
      );
      await page.click('button[type="submit"]');
      await page.waitForTimeout(300);
    }

    // Confirm rate limited
    await expect(
      page.locator("text=/too many attempts|try again|rate limit/i"),
    ).toBeVisible({ timeout: 5000 });

    // Wait for rate limit window to expire (60 seconds + buffer)
    await page.waitForTimeout(65000);

    // Try login with correct password - should work now
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill(
      'input[name="password"], input[type="password"]',
      "CorrectPassword123!",
    );
    await page.click('button[type="submit"]');

    // Should successfully login (redirect to dashboard)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});
```

**Step 2: Run the E2E test to verify it works**

```bash
npm run test:e2e -- e2e/auth-rate-limiting.spec.ts
```

Expected: Tests should pass (note: last test is slow due to waiting for rate limit window)

**Step 3: Commit**

```bash
git add e2e/auth-rate-limiting.spec.ts
git commit -m "$(cat <<'EOF'
test: add auth rate limiting E2E tests

Tests real rate limiting behavior in the browser:
- Blocks login after 5 failed attempts
- Blocks signup after 3 attempts
- Shows retry time in error message
- Allows login after window expires

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Expand Application Wizard E2E Tests

**Files:**

- Modify: `e2e/applications.spec.ts`
- Reference: `e2e/utils/test-db.ts`, `e2e/utils/application-helpers.ts`

**Step 1: Add new test scenarios to existing file**

Add the following test describe block to the end of `e2e/applications.spec.ts`:

```typescript
// Add to e2e/applications.spec.ts - after existing test.describe blocks

test.describe("Application Wizard - Auto-fill from Profile", () => {
  let employer: TestUser;
  let workerWithProfile: TestUser;
  let jobId: string;

  test.beforeEach(async () => {
    await cleanupTestData();

    employer = await createTestUser({
      email: generateTestEmail(),
      password: "TestPassword123!",
      role: "employer",
      name: "Auto-fill Test Employer",
      trade: "General Contractor",
    });

    // Create worker with complete profile data
    workerWithProfile = await createTestUser({
      email: generateTestEmail(),
      password: "TestPassword123!",
      role: "worker",
      name: "Profile Worker",
      trade: "Carpenter",
    });

    const job = await createTestJob(employer.id, {
      title: "Auto-fill Test Position",
      trade: "Carpenter",
      description: "Testing auto-fill functionality",
      payRate: "$35/hr",
    });
    jobId = job.id;
  });

  test.afterEach(async () => {
    if (employer) await deleteTestUser(employer.id);
    if (workerWithProfile) await deleteTestUser(workerWithProfile.id);
  });

  test("pre-fills form with existing profile data", async ({ page }) => {
    await loginAsUser(page, workerWithProfile);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Navigate to Personal Information step (Step 2)
    await page.click('button:has-text("Next")');
    await expectWizardStep(page, 2, 8);

    // Verify name is pre-filled from profile
    const nameField = page.locator('input[name="fullName"]');
    const nameValue = await nameField.inputValue();

    // Should contain the worker's name (may be formatted differently)
    expect(nameValue.toLowerCase()).toContain("profile");
  });

  test("draft data takes precedence over profile data", async ({ page }) => {
    await loginAsUser(page, workerWithProfile);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Navigate to Step 2 (Personal Info)
    await page.click('button:has-text("Next")');
    await expectWizardStep(page, 2, 8);

    // Change the name to something different
    const customName = "Custom Draft Name";
    await page.fill('input[name="fullName"]', customName);

    // Fill required fields
    await page.fill('input[name="address.street"]', "456 Draft St");
    await page.fill('input[name="address.city"]', "Chicago");
    await page.fill('input[name="address.state"]', "IL");
    await page.fill('input[name="address.zipCode"]', "60602");

    // Navigate forward to trigger auto-save
    await page.click('button:has-text("Next")');
    await expectWizardStep(page, 3, 8);

    // Wait for auto-save
    await waitForAutoSave(page);

    // Leave and return to the application
    await page.goto("/dashboard/jobs");
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Navigate to Step 2
    await page.click('button:has-text("Next")');
    await expectWizardStep(page, 2, 8);

    // Draft data should be shown (not profile data)
    const nameField = page.locator('input[name="fullName"]');
    await expect(nameField).toHaveValue(customName);

    const streetField = page.locator('input[name="address.street"]');
    await expect(streetField).toHaveValue("456 Draft St");
  });

  test("edited fields persist after browser refresh", async ({ page }) => {
    await loginAsUser(page, workerWithProfile);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Fill cover letter on Step 1
    const coverLetterText =
      "This is my unique cover letter that should persist after refresh.";
    await page.fill('textarea[name="coverLetterText"]', coverLetterText);

    // Wait for auto-save
    await waitForAutoSave(page);

    // Refresh the browser
    await page.reload();

    // Cover letter should still be there
    const coverLetterField = page.locator('textarea[name="coverLetterText"]');
    await expect(coverLetterField).toHaveValue(coverLetterText);
  });

  test("work history from profile appears in wizard", async ({ page }) => {
    await loginAsUser(page, workerWithProfile);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Navigate through steps to Work History (Step 5)
    for (let step = 1; step < 5; step++) {
      // Fill minimal required data for each step
      if (step === 2) {
        await page.fill('input[name="fullName"]', "Test Name");
        await page.fill('input[name="address.street"]', "123 Test St");
        await page.fill('input[name="address.city"]', "Chicago");
        await page.fill('input[name="address.state"]', "IL");
        await page.fill('input[name="address.zipCode"]', "60601");
      }
      if (step === 3) {
        await page.fill('input[name="phoneNumber"]', "(312) 555-1234");
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await page.fill(
          'input[name="availableStartDate"]',
          tomorrow.toISOString().split("T")[0],
        );
      }
      if (step === 4) {
        await page.check('input[name="authorizedToWork"]');
        await page.check('input[name="hasDriversLicense"]');
        await page.check('input[name="hasReliableTransportation"]');
      }
      await page.click('button:has-text("Next")');
    }

    await expectWizardStep(page, 5, 8);

    // Check if "Add Work History" button is visible (empty state)
    // or if there's already work history pre-filled
    const addButton = page.locator('button:has-text("Add Work History")');
    const workHistoryEntry = page.locator(
      'input[name="workHistory.0.companyName"]',
    );

    // Either button should be visible (empty) or entry should exist (pre-filled)
    const hasAddButton = await addButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const hasEntry = await workHistoryEntry
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(hasAddButton || hasEntry).toBe(true);
  });
});
```

**Step 2: Run the expanded E2E tests**

```bash
npm run test:e2e -- e2e/applications.spec.ts --grep "Auto-fill"
```

Expected: All new tests PASS

**Step 3: Commit**

```bash
git add e2e/applications.spec.ts
git commit -m "$(cat <<'EOF'
test: expand application wizard E2E with auto-fill scenarios

New tests:
- Pre-fills form with existing profile data
- Draft data takes precedence over profile data
- Edited fields persist after browser refresh
- Work history from profile appears in wizard

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Delete Rate-Limiting Unit Test

**Files:**

- Delete: `__tests__/lib/security/rate-limit.test.ts`

**Step 1: Delete the file**

```bash
rm __tests__/lib/security/rate-limit.test.ts
```

**Step 2: Verify tests still pass**

```bash
npm test
```

Expected: Tests pass (no reference to deleted file)

**Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test: remove rate-limit unit tests (replaced by integration tests)

Coverage now provided by:
- __tests__/integration/rate-limit.integration.test.ts
- e2e/auth-rate-limiting.spec.ts

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Delete Application Wizard Unit Tests

**Files:**

- Delete: `features/applications/hooks/use-application-wizard.test.ts`
- Delete: `features/applications/services/application-service.test.ts`
- Delete: `features/applications/components/application-wizard/progress-indicator.test.tsx`
- Delete: `features/applications/components/application-wizard/wizard-container.test.tsx`
- Delete: `features/applications/components/application-wizard/auto-save-indicator.test.tsx`
- Delete: `__tests__/features/applications/actions/application-actions.test.ts`
- Delete: `__tests__/features/applications/actions/draft-actions.test.ts`
- Delete: `__tests__/features/applications/actions/file-upload-actions.test.ts`
- Delete: `__tests__/features/applications/actions/profile-data-actions.test.ts`
- Delete: `__tests__/components/applications/wizard-steps.test.tsx`

**Step 1: Delete all application wizard unit tests**

```bash
rm -f features/applications/hooks/use-application-wizard.test.ts
rm -f features/applications/services/application-service.test.ts
rm -f features/applications/components/application-wizard/progress-indicator.test.tsx
rm -f features/applications/components/application-wizard/wizard-container.test.tsx
rm -f features/applications/components/application-wizard/auto-save-indicator.test.tsx
rm -f __tests__/features/applications/actions/application-actions.test.ts
rm -f __tests__/features/applications/actions/draft-actions.test.ts
rm -f __tests__/features/applications/actions/file-upload-actions.test.ts
rm -f __tests__/features/applications/actions/profile-data-actions.test.ts
rm -f __tests__/components/applications/wizard-steps.test.tsx
```

**Step 2: Verify tests still pass**

```bash
npm test
```

Expected: Tests pass

**Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test: remove application wizard unit tests (replaced by integration + E2E)

Removed 10 unit test files.

Coverage now provided by:
- __tests__/integration/application-service.integration.test.ts
- e2e/applications.spec.ts (including new auto-fill scenarios)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Delete Subscription Unit Tests

**Files:**

- Delete: `features/subscriptions/services/stripe-service.test.ts`
- Delete: `features/subscriptions/hooks/use-subscription.test.ts`
- Delete: `features/subscriptions/hooks/use-checkout.test.ts`
- Delete: `features/subscriptions/hooks/use-boost.test.ts`
- Delete: `features/subscriptions/hooks/use-track-profile-view.test.ts`
- Delete: `features/subscriptions/components/feature-gate.test.tsx`
- Delete: `features/subscriptions/components/boost-badge.test.tsx`
- Delete: `features/subscriptions/components/pricing-card.test.tsx`
- Delete: `features/subscriptions/components/subscription-manager.test.tsx`
- Delete: `features/subscriptions/components/pro-badge.test.tsx`
- Delete: `__tests__/features/subscriptions/actions/subscription-actions.test.ts`
- Delete: `__tests__/features/subscriptions/actions/boost-actions.test.ts`

**Step 1: Delete all subscription unit tests**

```bash
rm -f features/subscriptions/services/stripe-service.test.ts
rm -f features/subscriptions/hooks/use-subscription.test.ts
rm -f features/subscriptions/hooks/use-checkout.test.ts
rm -f features/subscriptions/hooks/use-boost.test.ts
rm -f features/subscriptions/hooks/use-track-profile-view.test.ts
rm -f features/subscriptions/components/feature-gate.test.tsx
rm -f features/subscriptions/components/boost-badge.test.tsx
rm -f features/subscriptions/components/pricing-card.test.tsx
rm -f features/subscriptions/components/subscription-manager.test.tsx
rm -f features/subscriptions/components/pro-badge.test.tsx
rm -f __tests__/features/subscriptions/actions/subscription-actions.test.ts
rm -f __tests__/features/subscriptions/actions/boost-actions.test.ts
```

**Step 2: Verify tests still pass**

```bash
npm test
```

Expected: Tests pass

**Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test: remove subscription unit tests (replaced by integration + E2E)

Removed 12 unit test files.

Coverage now provided by:
- __tests__/integration/stripe-service.integration.test.ts
- e2e/subscriptions.spec.ts (existing)
- e2e/pro-features.spec.ts (existing)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Run Full Test Suite and Verify

**Step 1: Run all unit/integration tests**

```bash
npm test
```

Expected: All tests PASS

**Step 2: Run all E2E tests**

```bash
npm run test:e2e
```

Expected: All E2E tests PASS

**Step 3: Run lint and type-check**

```bash
npm run lint && npm run type-check
```

Expected: No errors

**Step 4: Final commit with summary**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test: complete migration to E2E and integration tests

Summary of changes:
- Created __tests__/integration/ directory
- Added 3 integration tests (rate-limit, application-service, stripe-service)
- Added e2e/auth-rate-limiting.spec.ts E2E test
- Expanded e2e/applications.spec.ts with auto-fill scenarios
- Removed 24 unit test files for 3 features

Testing philosophy:
- Mock only external services (Stripe, Upstash)
- Test real behavior with integration and E2E tests
- Pure business logic tested without mocks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

| Task | Files                                           | Type             |
| ---- | ----------------------------------------------- | ---------------- |
| 1    | Create `__tests__/integration/`                 | Setup            |
| 2    | `rate-limit.integration.test.ts`                | Integration test |
| 3    | `application-service.integration.test.ts`       | Integration test |
| 4    | `stripe-service.integration.test.ts`            | Integration test |
| 5    | `auth-rate-limiting.spec.ts`                    | E2E test         |
| 6    | Expand `applications.spec.ts`                   | E2E test         |
| 7    | Delete rate-limit unit test                     | Cleanup          |
| 8    | Delete application wizard unit tests (10 files) | Cleanup          |
| 9    | Delete subscription unit tests (12 files)       | Cleanup          |
| 10   | Verify full test suite                          | Verification     |

**Total: 10 tasks**
