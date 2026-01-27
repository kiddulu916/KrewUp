# KrewUp Codebase Improvements Plan

**Date:** January 23, 2026
**Approach:** Launch-First Prioritization
**Timeline:** Ongoing prioritized backlog
**Status:** Pre-launch (no real users yet)

---

## Overview

Comprehensive improvement plan covering code quality, performance, feature completion, UI/UX, and test suite. Structured around launch readiness with clear priority tiers.

---

## P0 - Launch Blockers (Must Fix)

Critical issues that would cause embarrassment, broken functionality, or security concerns if launched.

### 0.1 Console Statements in Production

**Issue:** 39 debug logging statements in production code
**Impact:** Clutters browser console, leaks internal state
**Files:**

- `features/dashboard/components/initial-location-capture.tsx`
- `features/messaging/hooks/use-send-message.ts`
- `features/messaging/hooks/use-messages.ts`
- `features/messaging/hooks/use-conversations.ts`
- `features/applications/components/application-wizard/wizard-container.tsx`
- `features/notifications/hooks/use-push-notifications.ts`

**Action:** Remove all `console.log`, `console.error`, `console.warn` statements and use the logger function from @/lib/utils/logger.tsx

### 0.2 Missing Database Field

**Issue:** `jobs.years_experience_required` doesn't exist
**Impact:** Compatibility scoring hardcodes 20 points for experience - Pro feature broken
**Reference:** `features/jobs/components/JOB_CARD_USAGE.md` line 228

**Action:** Add database migration for `years_experience_required` column

### 0.3 Silent Feature Failures

**Issue:** VAPID keys default to empty string instead of throwing
**Impact:** Push notifications silently fail in production
**File:** `features/notifications/actions/push-subscription-actions.ts` lines 10-12

**Action:** Add validation that throws or gracefully disables feature with warning

### 0.4 Type Safety Holes in Critical Path

**Issue:** `any` type casts in application wizard
**Impact:** Could cause runtime errors in job application flow
**File:** `features/applications/components/application-wizard/wizard-container.tsx` lines 112, 165

**Action:** Replace `any` casts with proper TypeScript types

### 0.5 Incomplete Auto-Save Error Handling

**Issue:** Application wizard auto-save has no error state
**Impact:** Users won't know if saves fail - data loss risk
**File:** `features/applications/components/application-wizard/auto-save-indicator.tsx`

**Action:** Add error state display and retry mechanism

### 0.6 Support/Feedback Page

**Issue:** No way for beta users to report issues or give feedback
**Impact:** Can't gather feedback during beta testing

**Action:** Create `/support` page with:

- Feedback form (name, email, message) → sends to `cor.hilsen@gmail.com` via Resend
- Display support email: `support@krewup.net`
- Set up Resend domain for `krewup.net` to receive inbound emails
- Forward inbound emails to `cor.hilsen@gmail.com`

**Implementation:**

```
app/support/page.tsx          # Support page UI
features/support/             # New feature module
  actions/feedback-actions.ts # Server action for Resend API
  components/feedback-form.tsx
lib/resend.ts                 # Resend client configuration
```

---

## P1 - Launch Quality (Should Fix)

Issues that affect perceived quality and user confidence.

### 1.1 Test Coverage for Critical Paths

**Current:** 45% → **Target:** 70% for launch-critical paths

**Untested payment/auth code (highest risk):**

- `subscription-actions.ts` - Stripe checkout/cancel
- `user-actions.ts` - ban/suspend/Pro grant operations
- `moderation-check.ts` - middleware auth checks
- `save-to-profile-actions.ts` - multi-table updates

**Untested Pro features:**

- `profile-views-actions.ts`
- `profile-analytics-actions.ts`
- `certification-filter-actions.ts`

### 1.2 E2E Test Gaps

**Stub tests needing expansion:**

- `messaging.spec.ts` - only 10 lines
- `subscriptions.spec.ts` - only 9 lines, no checkout flow
- `profile.spec.ts` - only 9 lines

**Missing flows:**

- Stripe webhook → Pro activation
- Payment failure scenarios
- Subscription cancellation

### 1.3 Accessibility Best Practices (Codebase-Wide)

**Forms & Inputs:**

- [ ] Add `aria-describedby` linking errors to inputs
- [ ] Add `aria-required` to required fields
- [ ] Add `aria-invalid` on validation errors
- [ ] Ensure all inputs have visible labels (not just placeholders)

**Interactive Elements:**

- [ ] Add `aria-live` regions for dynamic content (auto-save, notifications, messages)
- [ ] Add `aria-expanded`/`aria-controls` for collapsibles and dropdowns
- [ ] Ensure all buttons have accessible names
- [ ] Add skip links for keyboard navigation

**Progress & Status:**

- [ ] Add `aria-valuenow/min/max` to progress indicators
- [ ] Add `role="status"` or `role="alert"` for status messages
- [ ] Announce loading/success/error states to screen readers

**Focus Management:**

- [ ] Trap focus in modals
- [ ] Return focus after modal close
- [ ] Visible focus indicators on all interactive elements
- [ ] Logical tab order

**Media & Images:**

- [ ] Audit all images for meaningful alt text
- [ ] Add `aria-label` to icon-only buttons
- [ ] Ensure decorative images have `alt=""`

**Color & Contrast:**

- [ ] Audit color contrast ratios (WCAG AA minimum)
- [ ] Don't rely on color alone for information

### 1.4 Form Validation UX

- [ ] Field-specific errors in job form (not just generic top-level)
- [ ] Application wizard validates per-step, not just at final submission
- [ ] Clear indication which fields have errors
- [ ] Error summaries with links to fields

### 1.5 Loading State Gaps

- [ ] Job filter operations need visual feedback
- [ ] Profile tabs need skeleton loaders to prevent layout shift
- [ ] Certification tab loading state

---

## P2 - Feature Completion (Fill Gaps)

Features that exist but are incomplete or untested.

### 2.1 Incomplete Pro Features

**Proximity Alerts (Workers):**

- UI exists but marked untested
- Cron job at `/api/cron/check-proximity-alerts`
- Verify: alert creation, notification delivery, radius filtering

**Push Notifications:**

- Infrastructure built (service worker, VAPID, actions)
- Never tested - requires VAPID key configuration
- Docs: `docs/push-notifications-setup.md`

**Profile Analytics:**

- Actions exist but untested in production
- Verify date range filtering, aggregation logic

### 2.2 Application Wizard Incomplete UI

TODOs in code:

- [ ] Progress indicator: clickable steps to jump between sections
- [ ] Progress indicator: step labels and completion status
- [ ] Auto-save: animated save icon
- [ ] Auto-save: manual save button

### 2.3 Admin Analytics Gap

- Churn rate hardcoded to `0` in `analytics-actions.ts` line 475
- Need `subscription_history` table to calculate actual churn

### 2.4 Marketing Pages

From progress checklist (Phase 4):

- [ ] Landing page
- [ ] About page
- [ ] How-it-works page

_Note: These block public launch but not beta_

### 2.5 Stripe Integration Testing

Untested per checklist:

- [ ] Monthly subscription checkout flow
- [ ] Annual subscription checkout flow
- [ ] Subscription cancellation
- [ ] Failed payment scenarios
- [ ] Webhook with Stripe CLI locally

### 2.6 Mobile Responsiveness

From checklist - never fully tested:

- [ ] Mobile filter access (sidebar hidden on mobile)
- [ ] Tablet breakpoints (missing `md:` in many places)
- [ ] Messages page vertical space on mobile
- [ ] Large headings responsive sizing

---

## P3 - Technical Debt (Clean Up)

Issues affecting maintainability and developer experience.

### 3.1 Type Safety Improvements

**Remove `@ts-ignore` comments (5 instances):**

- `push-subscription-actions.ts` - web-push types
- `sentry-actions.ts` (3x) - Next.js fetch types
- `application-actions.ts` - Supabase nested select

**Remove `as any` casts:**

- `wizard-container.tsx` - form data, trade selection
- Stripe webhook handler
- Admin components

### 3.2 Code Standardization

**Error handling:**

- `lib/utils/action-response.ts` exists but not consistently used
- Standardize all server actions to use `success()`, `error()`, `handleActionError()`

**Validation:**

- `lib/validation/schemas.ts` has Zod schemas but partial adoption
- Apply Zod validation to all server action inputs

### 3.3 Database Improvements

From codebase-review-tasks.md:

- [ ] Review/update RLS policies for completeness
- [ ] Add `stripe_processed_events` table (webhook idempotency)
- [ ] Add `subscription_history` table (churn tracking)
- [ ] Optimize N+1 query patterns
- [ ] Consider materialized views for analytics

### 3.4 Component Test Coverage

Current: 20% (24/120 components)

**Critical gaps (0% coverage):**

- Admin components (moderation-queue, certification-queue)
- Notification components (bell, list, preferences)
- Application wizard steps (8 components)

### 3.5 Documentation

- [ ] JSDoc comments on exported functions
- [ ] README setup instructions update
- [ ] API documentation for server actions
- [ ] Remove stale/outdated comments

### 3.6 Dead Code & Cleanup

- [ ] Audit for unused exports
- [ ] Remove commented-out code
- [ ] Clean up unused dependencies
- [ ] Remove development-only code paths

---

## P4 - Enhancements (Nice to Have)

Improvements that would be valuable but aren't blocking.

### 4.1 Performance Optimization

**Lighthouse targets:**

- Performance > 90
- Accessibility > 90
- Best Practices > 90
- SEO > 90

**Specific:**

- [ ] Run and fix Lighthouse findings
- [ ] Add resource budget enforcement
- [ ] Optimize LCP
- [ ] Reduce CLS

### 4.2 Enhanced Empty States

- [ ] Distinguish "no jobs in region" vs "no jobs matching filters"
- [ ] Show active filters when zero results
- [ ] Add suggested actions in empty states

### 4.3 Advanced Form UX

- [ ] Real-time validation (debounced)
- [ ] Animated auto-save icon
- [ ] Manual save button in wizard
- [ ] Character counters on text fields

### 4.4 Mobile Experience Polish

- [ ] Swipe gestures for navigation
- [ ] Pull-to-refresh on lists
- [ ] Larger touch targets
- [ ] Responsive font scaling

### 4.5 Developer Experience

- [ ] GitHub Actions CI with secrets configured
- [ ] Pre-commit hooks for lint/type-check
- [ ] Component storybook
- [ ] Database seeding scripts

### 4.6 Analytics & Monitoring

- [ ] Vercel Analytics setup
- [ ] Conversion tracking
- [ ] User journey funnels
- [ ] Feature usage by subscription tier

### 4.7 Future-Proofing

- [ ] WebSocket swap (abstraction exists)
- [ ] Service layer extraction
- [ ] API versioning strategy

---

## Summary

| Priority | Category           | Est. Items | Focus                                   |
| -------- | ------------------ | ---------- | --------------------------------------- |
| **P0**   | Launch Blockers    | 6-8        | Broken features, security, support page |
| **P1**   | Launch Quality     | 18-22      | Tests, accessibility, validation UX     |
| **P2**   | Feature Completion | 15-18      | Pro features, Stripe, mobile            |
| **P3**   | Technical Debt     | 12-15      | Type safety, patterns, docs             |
| **P4**   | Enhancements       | 15-20      | Performance, polish, DX                 |
|          | **Total**          | **66-83**  |                                         |

---

## Working Through the Backlog

**Recommended approach:**

1. Complete all P0 items before beta invites
2. Work through P1 in parallel with early beta feedback
3. P2-P4 based on user feedback and available time

**For each item:**

1. Create feature branch
2. Implement fix/feature
3. Add/update tests
4. PR review
5. Merge to main

---

_Generated from brainstorming session on 2026-01-23_
