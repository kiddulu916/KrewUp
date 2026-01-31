# Brainstorming Follow-Up Implementation Plan

**Date:** January 29, 2026  
**Source:** CLAUDE.md review + brainstorming analysis  
**Status:** Planning  
**Scope:** Four areas—Incomplete Features, Security Risks, Code Simplification, Critical Bugs

---

## Overview

This plan addresses the outcomes of the brainstorming session:

| Area                   | Finding                                           | Action                           |
| ---------------------- | ------------------------------------------------- | -------------------------------- |
| 1. Incomplete Features | 1 TODO (churn calculation)                        | Implement                        |
| 2. Security Risks      | ~35 error exposure issues                         | Verify fixes, complete remaining |
| 3. Code Simplification | No significant opportunities                      | No action                        |
| 4. Errors in Codebase  | 3 critical bugs (dialog handlers + security link) | Verify fixes, remediate any gaps |

---

## Table of Contents

1. [Incomplete Features: Churn Calculation](#1-incomplete-features-churn-calculation)
2. [Security Risks: Error Exposure](#2-security-risks-error-exposure)
3. [Code Simplification](#3-code-simplification)
4. [Critical Bugs: Dialog Handlers + Security Link](#4-critical-bugs-dialog-handlers--security-link)
5. [Implementation Order & Verification](#5-implementation-order--verification)

---

## 1. Incomplete Features: Churn Calculation

### Current State

- **Location:** `features/admin/actions/analytics-actions.ts` lines 473–477
- **TODO:** Churn is hardcoded to `0`; comment references `subscription_history` table.
- **Data:**
  - `subscription_history` exists (`08-subscription_tracking.sql`, `045-rls-policy-updates.sql`).
  - Stripe webhook writes: `subscription_created`, `subscription_updated`, `subscription_canceled`, `payment_failed`, `payment_succeeded`.
  - Admin analytics use service role / RLS allows service role INSERT/UPDATE/DELETE on `subscription_history`; metrics are admin-only.

### Implementation Tasks

#### Task 1.1: Define Churn Formula

**Definition (recommended):**

- **Numerator:** Count of `subscription_history` rows with `event_type = 'subscription_canceled'` and `created_at` within the report `dateRange`.
- **Denominator:** Pro users at **start** of date range (or average of start/end). Use same `buildDateRangeFilter` / `gte` / `lte` pattern as existing metrics.
- **Formula:** `churnRate = (canceledInPeriod / proUsersAtStart) * 100`, or `0` if `proUsersAtStart === 0`.

**Alternative:** Use `subscriptions` table snapshots if available; for now, `subscription_history` cancellations are the source of truth.

#### Task 1.2: Query `subscription_history` for Cancellations

**Steps:**

1. Reuse `buildDateRangeFilter(dateRange)` to get `gte` and `lte` for the period.
2. Query `subscription_history`:
   - `event_type = 'subscription_canceled'`
   - `created_at >= gte` and `created_at <= lte`
   - `count` or `select('id')` with `.limit(1)` and aggregate via RPC if needed; otherwise `select('id')` and count in application code.
3. Use the same Supabase client as existing metrics (admin-authorized).

**Example (pseudocode):**

```ts
const { count, error: churnError } = await supabase
  .from("subscription_history")
  .select("id", { count: "exact", head: true })
  .eq("event_type", "subscription_canceled")
  .gte("created_at", gte)
  .lte("created_at", lte);

if (churnError)
  throw new Error(`Failed to fetch churn data: ${churnError.message}`);
const canceledInPeriod = count ?? 0;
```

#### Task 1.3: Compute Pro Users at Start of Period

- Add a query for users with `subscription_status = 'pro'` and `created_at < gte` (or use a specific “snapshot” logic if we add it later).
- Simpler option: use **total pro users in range** as denominator (same as current `proUsers`), with a clear comment that churn is “canceled in period / pro users in period” until we have proper cohort logic.
- Document the chosen denominator in code and in this plan.

#### Task 1.4: Replace Hardcoded Churn and Update JSDoc

- Remove the TODO and `const churnRate = 0`.
- Compute `churnRate` from `canceledInPeriod` and denominator, guarding against division by zero.
- Update JSDoc for `getSubscriptionMetrics` to describe the actual churn formula.
- If `dateRange.compareEnabled` is used, optionally add `churnRateChange` (mirroring other comparison metrics). **Optional** for v1.

#### Task 1.5: Tests and Manual Verification

- Unit test: mock Supabase responses for `subscription_history` and users; assert `churnRate` is correct for known inputs.
- Manual: run admin analytics for a range that includes test cancellations; confirm churn no longer 0 and matches expectation.

### Acceptance Criteria

- [ ] TODO and hardcoded `churnRate = 0` removed.
- [ ] Churn computed from `subscription_history` cancellations and a defined denominator.
- [ ] JSDoc updated.
- [ ] No new lint/type errors.
- [ ] Unit test added; manual smoke test on admin analytics performed.

### Files to Touch

- `features/admin/actions/analytics-actions.ts`

---

## 2. Security Risks: Error Exposure

### Context

Server actions must not return raw `error.message` or internal strings to the client. Use `getUserFriendlyError(error, fallback)` (and similar) for user-facing `{ success: false, error }` responses. Logger usage (e.g. `logger.error(..., { error: error.message })`) is server-side only and acceptable.

### Current State (from grep / audit)

- Many actions already use `getUserFriendlyError` correctly.
- **Known hotspots:**
  - **`features/auth/actions/auth-actions.ts`:** Returns `error.message` in multiple places (e.g. signIn, signUp, OAuth). These are user-facing and must be sanitized.
  - **`features/support/actions/feedback-actions.ts`:** Returns `parsed.error.issues[0]?.message || 'Invalid input'` for validation failures. Prefer a generic message to avoid leaking validation details.
  - **`features/portfolio/actions/portfolio-actions.ts`:** Returns `parseResult.error.issues[0]?.message` and `validation.error` in some paths. Same concern.
  - **`features/messaging/actions/message-actions.ts`:** One `error.message` in catch (line 187); ensure it’s not returned to client—likely used only in logger; verify.
- **Analytics / admin:** `analytics-actions` and similar `throw new Error(...)` with DB messages. Those propagate to error boundaries / Sentry, not directly to end-users. Lower priority than auth/support/portfolio, but still consider generic messages in thrown errors if they ever surface to UI.

### Implementation Tasks

#### Task 2.1: Audit All User-Facing Error Returns

1. List all server action files under `features/` and `app/` that return `{ success: false, error: ... }` or equivalent.
2. For each, check whether `error` is:
   - `error.message`,
   - `parsed.error.issues[0]?.message`,
   - `validation.error`,
   - or any other raw exception/validation output.
3. Produce a short audit list: file, function, line(s), current pattern, required change.

#### Task 2.2: Fix Auth Actions

- **File:** `features/auth/actions/auth-actions.ts`
- **Change:** Add `import { getUserFriendlyError } from '@/lib/utils/action-response'`. Replace every `return { success: false, error: error.message }` with `return { success: false, error: getUserFriendlyError(error, '<context-specific fallback>') }`.
- **Fallbacks:** e.g. “Invalid email or password” for sign-in, “Could not create account” for sign-up, “Sign-in failed” for OAuth. Keep ban/suspension messages as-is (they are intentional).
- **Logging:** Continue logging full error server-side (e.g. via logger); do not log auth secrets.

#### Task 2.3: Fix Feedback and Portfolio Validation Errors

- **Feedback:** In `feedback-actions.ts`, replace `parsed.error.issues[0]?.message || 'Invalid input'` with a single generic message, e.g. `'Invalid input. Please check your entries and try again.'`
- **Portfolio:** In `portfolio-actions.ts`, replace returns that use `parseResult.error.issues[0]?.message` or `validation.error` with generic, safe messages (e.g. “Invalid image ID”, “Invalid file”) and use `getUserFriendlyError` for unexpected errors.

#### Task 2.4: Sweep Remaining Actions

- Apply the same rule across all audited actions: user-facing `error` must never be raw `error.message` or validation output. Use `getUserFriendlyError` or fixed generic strings.
- Ensure Zod/validation errors are not echoed; use `validateInput` or similar and return only sanitized messages.

#### Task 2.5: Verification and Regression

- Grep for `error\.message` and `\.issues[0]` in return paths; confirm none are user-facing.
- Run existing tests; add or extend tests that assert error responses do not contain internal phrases (e.g. “duplicate key”, “violates foreign key”).

### Acceptance Criteria

- [ ] Audit list completed and checked off.
- [ ] Auth, feedback, and portfolio actions no longer expose raw errors.
- [ ] No user-facing returns use `error.message` or validation `.issues[0]?.message` / `validation.error`.
- [ ] All touched actions tested; regression tests updated as needed.

### Files to Touch (likely)

- `features/auth/actions/auth-actions.ts`
- `features/support/actions/feedback-actions.ts`
- `features/portfolio/actions/portfolio-actions.ts`
- Any additional actions identified in Task 2.1.

---

## 3. Code Simplification

**Finding:** No significant opportunities identified.

**Action:** None. No tasks.

**Note:** If simplification opportunities appear during churn or error-handling work, document them in a follow-up plan or backlog.

---

## 4. Critical Bugs: Dialog Handlers + Security Link

### 4.1 Dialog Handlers (Ban / Suspend)

**Relevant components:**

- `components/admin/user-management/ban-user-dialog.tsx`
- `components/admin/user-management/suspend-user-dialog.tsx`
- `components/admin/user-management/moderation-actions-card.tsx` (parent)

**Expected behavior:**

- Dialogs have focus management (focus trap, focus restore on close).
- Escape closes the dialog; Tab cycles within.
- On confirm success, parent closes the dialog and shows success toast; on failure, parent shows error toast and keeps dialog open.
- No `console.error` in production code; use `logger` instead.

**Implementation Tasks**

#### Task 4.1.1: Verify Dialog Behavior

- [ ] **Focus:** When opened, focus moves to first focusable element (or dialog container); when closed, focus returns to previously focused element.
- [ ] **Escape:** Escape key closes the dialog and runs `onClose`.
- [ ] **Tab:** Tab cycles only within dialog; no focus escape.
- [ ] **Confirm flow:** Parent’s `handleSuspendUser` / `handleBanUser` close dialog on success, show error toast on failure. Dialogs receive `isLoading` and disable actions accordingly.

#### Task 4.1.2: Replace console.error with Logger

- **File:** `components/admin/user-management/moderation-actions-card.tsx`
- **Change:** Add `import { logger } from '@/lib/utils/logger'` if not present. In `handleUnbanUser` catch block, replace `console.error('Error unbanning user:', error)` with `logger.error('Error unbanning user', { error: error instanceof Error ? error.message : String(error) })`. Do not expose raw error to UI.

#### Task 4.1.3: Optional Hardening

- Ensure `handleKeyDown` is not attached when `!isOpen` (or that it no-ops correctly) to avoid stale closures.
- Add a simple E2E or component test: open dialog, confirm, assert close + toast (or error toast when mocking failure).

### Acceptance Criteria

- [ ] Focus, Escape, and Tab behavior verified.
- [ ] Confirm success closes dialog; confirm failure shows error toast and keeps dialog open.
- [ ] No `console.error` in moderation dialogs or parent; use `logger` only.

### 4.2 Security Link (Sentry Example Page)

**Issue:** `app/sentry-example-page/page.tsx` links to a specific Sentry project URL (e.g. `https://corey-tb.sentry.io/issues/...`). This exposes internal tooling and project structure.

**Implementation Tasks**

#### Task 4.2.1: Remove or Genericize Sentry Link

- **Option A:** Remove the “View on Sentry Issues” link entirely.
- **Option B:** Replace with a generic link to Sentry docs (e.g. “Next.js”) or a non–project-specific dashboard, and use generic anchor text like “Sentry dashboard” or “Sentry docs”.

#### Task 4.2.2: Verify No Other Hardcoded Sentry URLs

- Grep for `sentry.io` (and similar) in app and config. Ensure no other project-specific URLs are exposed to users.

### Acceptance Criteria

- [ ] No project-specific Sentry URL on the Sentry example page.
- [ ] No other user-facing Sentry project URLs; docs/config links are generic where appropriate.

### Files to Touch

- `components/admin/user-management/moderation-actions-card.tsx`
- `app/sentry-example-page/page.tsx`
- Optionally: `ban-user-dialog.tsx`, `suspend-user-dialog.tsx` (only if behavior changes).

---

## 5. Implementation Order & Verification

### Recommended Order

1. **Critical bugs (Section 4)**
   - Quick wins: logger swap, Sentry link fix.
   - Verify dialog behavior.

2. **Security: error exposure (Section 2)**
   - Auth first (highest impact), then feedback and portfolio, then sweep.

3. **Churn calculation (Section 1)**
   - Depends only on existing DB and webhook; can follow security work.

4. **Code simplification (Section 3)**
   - No work.

### Verification Checklist

- [ ] `npm run type-check` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] E2E (or critical flows) run if applicable.
- [ ] Manual pass: auth (sign-in, sign-up, OAuth), support feedback, portfolio upload, admin analytics (churn), admin dialogs (ban/suspend/unban), Sentry example page.

### Optional Documentation Updates

- **CLAUDE.md:** Add a short “Error handling” note that user-facing errors must use `getUserFriendlyError` and must not expose `error.message` or validation details.
- **Churn:** Document the chosen churn formula (e.g. in `analytics-actions` JSDoc or `docs/plans`).

---

## Summary

| Section                    | Tasks   | Est. Effort                           |
| -------------------------- | ------- | ------------------------------------- |
| 1. Churn                   | 5 tasks | Small (1–2 dev sessions)              |
| 2. Error exposure          | 5 tasks | Medium (audit + fixes across actions) |
| 3. Simplification          | 0       | —                                     |
| 4. Dialogs + Security link | 4 tasks | Small                                 |

**Total:** Focus on Section 4 first, then Section 2, then Section 1. Revisit CLAUDE.md and related docs after implementation to keep guidance in sync.

---

_Generated from CLAUDE.md review and brainstorming analysis (2026-01-29)._
