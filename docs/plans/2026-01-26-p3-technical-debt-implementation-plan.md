# P3 - Technical Debt Implementation Plan

**Date:** January 26, 2026  
**Priority:** P3 - Technical Debt (Clean Up)  
**Status:** Planning  
**Estimated Duration:** 4-6 weeks (can be done incrementally)

---

## Overview

This document provides a detailed implementation plan for addressing technical debt across the KrewUp codebase. P3 items focus on maintainability, developer experience, and code quality improvements that don't block launch but should be addressed to ensure long-term codebase health.

**Approach:** Incremental improvements that can be tackled in parallel with feature work. Each section can be completed independently.

---

## Table of Contents

1. [Type Safety Improvements](#31-type-safety-improvements)
2. [Code Standardization](#32-code-standardization)
3. [Database Improvements](#33-database-improvements)
4. [Component Test Coverage](#34-component-test-coverage)
5. [Documentation](#35-documentation)
6. [Dead Code & Cleanup](#36-dead-code--cleanup)

---

## 3.1 Type Safety Improvements

**Goal:** Remove all `@ts-ignore` comments and `as any` casts to improve type safety and catch errors at compile time.

**Estimated Time:** 1-2 weeks

### 3.1.1 Remove `@ts-ignore` Comments

**Files to Fix:**

1. `features/notifications/actions/push-subscription-actions.ts` (line 5)
2. `features/admin/actions/sentry-actions.ts` (3 instances)
3. `features/jobs/actions/application-actions.ts` (1 instance)

#### Task 3.1.1.1: Fix web-push TypeScript Types

**File:** `features/notifications/actions/push-subscription-actions.ts`

**Current Issue:**

```typescript
// @ts-ignore - web-push doesn't have type declarations
import webpush from "web-push";
```

**Solution Options:**

**Option A: Install Community Types (Recommended)**

```bash
npm install --save-dev @types/web-push
```

**Option B: Create Local Type Declarations**
Create `types/web-push.d.ts`:

```typescript
declare module "web-push" {
  export interface VapidDetails {
    subject: string;
    publicKey: string;
    privateKey: string;
  }

  export interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string,
  ): void;

  export function sendNotification(
    subscription: PushSubscription,
    payload: string | Buffer,
    options?: { TTL?: number; headers?: Record<string, string> },
  ): Promise<{ statusCode: number; body: string }>;

  export function generateVAPIDKeys(): {
    publicKey: string;
    privateKey: string;
  };
}
```

**Implementation Steps:**

1. Check if `@types/web-push` exists on npm (web search)
2. If available, install and use it
3. If not, create local type declarations in `types/web-push.d.ts`
4. Remove `@ts-ignore` comment
5. Verify TypeScript compilation passes
6. Test push notification functionality

**Acceptance Criteria:**

- [ ] No `@ts-ignore` in file
- [ ] TypeScript compiles without errors
- [ ] Push notification functionality still works
- [ ] Types are properly inferred for `webpush` calls

---

#### Task 3.1.1.2: Fix Sentry Actions Type Issues

**File:** `features/admin/actions/sentry-actions.ts`

**Current Issue:** 3 `@ts-ignore` comments related to Next.js fetch types

**Investigation Steps:**

1. Read the file to identify exact lines with `@ts-ignore`
2. Understand what types are missing
3. Check if Next.js provides proper types for fetch in server actions
4. Determine if types need to be extended or if there's a better approach

**Solution Approach:**

- If Next.js fetch types are incomplete, create proper type assertions
- Use `fetch` with explicit Response type handling
- Consider using `@sentry/nextjs` types if available
- May need to create wrapper types for Sentry API responses

**Implementation Steps:**

1. Read `features/admin/actions/sentry-actions.ts` fully
2. Identify each `@ts-ignore` usage and what it's suppressing
3. Research proper types for Next.js server-side fetch
4. Create type definitions or use proper type assertions
5. Remove all `@ts-ignore` comments
6. Verify TypeScript compilation
7. Test Sentry monitoring dashboard functionality

**Acceptance Criteria:**

- [ ] All 3 `@ts-ignore` comments removed
- [ ] TypeScript compiles without errors
- [ ] Sentry dashboard still functions correctly
- [ ] Proper types are used instead of ignoring errors

---

#### Task 3.1.1.3: Fix Application Actions Type Issue

**File:** `features/jobs/actions/application-actions.ts`

**Current Issue:** `@ts-ignore` for Supabase nested select

**Solution Approach:**

- Supabase TypeScript types should support nested selects
- May need to explicitly type the select query
- Consider using Supabase's generated types

**Implementation Steps:**

1. Read the file to find the `@ts-ignore` usage
2. Identify the exact Supabase query causing the issue
3. Check Supabase documentation for proper nested select typing
4. Use explicit type annotations or type assertions
5. Remove `@ts-ignore` comment
6. Verify TypeScript compilation
7. Test application actions functionality

**Acceptance Criteria:**

- [ ] `@ts-ignore` comment removed
- [ ] Proper Supabase types used
- [ ] TypeScript compiles without errors
- [ ] Application actions work correctly

---

### 3.1.2 Remove `as any` Casts

**Files with `as any` casts:** 40 files found (need to prioritize critical paths)

**Priority Order:**

1. **Critical Path (P0):** Application wizard, Stripe webhook
2. **High Priority:** Admin components, server actions
3. **Medium Priority:** Test files, utility functions

#### Task 3.1.2.1: Fix Application Wizard Type Casts

**File:** `features/applications/components/application-wizard/wizard-container.tsx`

**Current Issues:**

- Line 112: `(job.trade_selections as TradeSelection[])`
- Line 165: Form data type casting

**Solution Approach:**

1. Define proper types for `job.trade_selections` from database schema
2. Use Zod schema validation for form data
3. Create proper TypeScript interfaces matching database structure

**Implementation Steps:**

1. Check database schema for `jobs.trade_selections` column type
2. Create proper TypeScript type matching the database structure:
   ```typescript
   type TradeSelection = {
     trade: string;
     subtrades?: string[];
   };
   ```
3. Update Supabase query to properly type the response:

   ```typescript
   const { data: job } = await supabase
     .from("jobs")
     .select("trade_selections")
     .eq("id", jobId)
     .single();

   // Type guard function
   function isTradeSelectionArray(value: unknown): value is TradeSelection[] {
     return (
       Array.isArray(value) &&
       value.every(
         (item) => typeof item === "object" && item !== null && "trade" in item,
       )
     );
   }

   const tradeSelections = isTradeSelectionArray(job?.trade_selections)
     ? job.trade_selections
     : [];
   ```

4. For form data, use Zod schema validation (see 3.2.2)
5. Remove all `as any` casts
6. Test application wizard functionality

**Acceptance Criteria:**

- [ ] No `as any` casts in wizard-container.tsx
- [ ] Proper type guards used
- [ ] TypeScript compiles without errors
- [ ] Application wizard works correctly

---

#### Task 3.1.2.2: Fix Stripe Webhook Type Casts

**File:** `app/api/webhooks/stripe/route.ts`

**Current Issue:** `as any` casts for Stripe event types

**Solution Approach:**

- Use official Stripe TypeScript types
- Install `@stripe/stripe-js` types if not already installed
- Use proper Stripe event type guards

**Implementation Steps:**

1. Check if Stripe types are installed:
   ```bash
   npm list @stripe/stripe-js
   ```
2. Install Stripe types if missing:
   ```bash
   npm install --save-dev @types/stripe
   ```
3. Import proper Stripe types:
   ```typescript
   import Stripe from "stripe";
   ```
4. Use type guards for event types:
   ```typescript
   function isCheckoutSessionCompleted(
     event: Stripe.Event,
   ): event is Stripe.Event & {
     data: { object: Stripe.Checkout.Session };
   } {
     return event.type === "checkout.session.completed";
   }
   ```
5. Replace all `as any` casts with proper type guards
6. Test Stripe webhook functionality locally with Stripe CLI

**Acceptance Criteria:**

- [ ] No `as any` casts in webhook handler
- [ ] Proper Stripe types used throughout
- [ ] TypeScript compiles without errors
- [ ] Webhook handles all event types correctly

---

#### Task 3.1.2.3: Fix Admin Component Type Casts

**Files:** Admin components (moderation-queue, certification-queue, etc.)

**Approach:**

- Audit all admin components for `as any` usage
- Create proper types for admin data structures
- Use Supabase generated types where possible

**Implementation Steps:**

1. List all admin component files with `as any`:
   ```bash
   grep -r "as any" features/admin/ components/admin/
   ```
2. For each file:
   - Identify what data structure is being cast
   - Create proper TypeScript interface
   - Replace `as any` with proper type or type guard
3. Create shared admin types file: `features/admin/types/index.ts`
4. Update all admin components to use shared types
5. Test admin functionality

**Acceptance Criteria:**

- [ ] All admin component `as any` casts removed
- [ ] Shared admin types created
- [ ] TypeScript compiles without errors
- [ ] Admin features work correctly

---

#### Task 3.1.2.4: Audit and Fix Remaining Type Casts

**Approach:** Systematic review of all remaining `as any` casts

**Implementation Steps:**

1. Generate list of all files with `as any`:
   ```bash
   grep -rn "as any" --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test." > as-any-audit.txt
   ```
2. Categorize by priority:
   - **Critical:** Server actions, API routes, core features
   - **High:** Components, hooks, utilities
   - **Low:** Test files (can use `as any` in tests if needed)
3. For each file (excluding tests):
   - Understand why `as any` was used
   - Determine proper type or create type guard
   - Replace with proper typing
4. Document any cases where `as any` is truly necessary (with explanation)

**Acceptance Criteria:**

- [ ] All non-test `as any` casts removed or justified
- [ ] Type safety improved across codebase
- [ ] TypeScript compilation passes
- [ ] No runtime errors introduced

---

## 3.2 Code Standardization

**Goal:** Standardize error handling and validation patterns across all server actions.

**Estimated Time:** 1-2 weeks

### 3.2.1 Standardize Error Handling

**Current State:** `lib/utils/action-response.ts` exists with helper functions but not consistently used.

**Target:** All server actions use `success()`, `error()`, `handleActionError()`, `requireAuth()`, `requireAdmin()`, `requirePro()`.

#### Task 3.2.1.1: Audit Current Server Actions

**Implementation Steps:**

1. Find all server action files:
   ```bash
   find features/ app/ -name "*-actions.ts" -o -name "*actions.ts" | grep -v node_modules
   ```
2. For each server action file:
   - Check if it uses `action-response.ts` helpers
   - Document current error handling pattern
   - Identify inconsistencies
3. Create audit document: `docs/audits/server-actions-error-handling.md`

**Acceptance Criteria:**

- [ ] Complete list of all server action files
- [ ] Current error handling pattern documented for each
- [ ] Inconsistencies identified

---

#### Task 3.2.1.2: Refactor Server Actions to Use Standard Helpers

**Approach:** Refactor incrementally, starting with critical paths.

**Priority Order:**

1. Authentication actions (`features/auth/actions/`)
2. Application actions (`features/applications/actions/`)
3. Job actions (`features/jobs/actions/`)
4. Subscription actions (`features/subscriptions/actions/`)
5. Admin actions (`features/admin/actions/`)
6. Remaining actions

**Standard Pattern:**

```typescript
'use server';

import { success, error, handleActionError, requireAuth } from '@/lib/utils/action-response';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function myAction(data: FormData): Promise<ActionResponse<MyDataType>> {
  return handleActionError(async () => {
    const supabase = await createClient(await cookies());

    // Authentication check
    const authResult = await requireAuth(supabase);
    if (!authResult.success) return authResult;
    const user = authResult.data;

    // Business logic
    const { data: result, error: dbError } = await supabase
      .from('table')
      .insert({ ... });

    if (dbError) {
      return error(getUserFriendlyError(dbError));
    }

    return success({ data: result });
  }, 'Failed to perform action');
}
```

**Implementation Steps:**

1. Start with authentication actions (simplest, most critical)
2. For each action file:
   - Import helpers from `action-response.ts`
   - Replace custom error handling with `handleActionError`
   - Replace auth checks with `requireAuth`/`requireAdmin`/`requirePro`
   - Replace manual error responses with `success()`/`error()`
   - Use `getUserFriendlyError()` for database errors
3. Test each refactored action
4. Update related components if response shape changes

**Acceptance Criteria:**

- [ ] All server actions use `handleActionError` wrapper
- [ ] All auth checks use `requireAuth`/`requireAdmin`/`requirePro`
- [ ] All responses use `success()`/`error()` helpers
- [ ] Database errors use `getUserFriendlyError()`
- [ ] All actions tested and working

---

### 3.2.2 Standardize Validation

**Current State:** `lib/validation/schemas.ts` has Zod schemas but partial adoption.

**Target:** All server action inputs validated with Zod schemas.

#### Task 3.2.2.1: Audit Current Validation Usage

**Implementation Steps:**

1. List all server action files
2. For each action:
   - Check if it uses Zod validation
   - Document what inputs it accepts
   - Identify missing schemas
3. Create audit document: `docs/audits/server-actions-validation.md`

**Acceptance Criteria:**

- [ ] Complete list of server actions and their inputs
- [ ] Current validation state documented
- [ ] Missing schemas identified

---

#### Task 3.2.2.2: Create Missing Zod Schemas

**Implementation Steps:**

1. Review audit document
2. For each missing schema:
   - Create Zod schema in `lib/validation/schemas.ts`
   - Export type using `z.infer<typeof schema>`
   - Add to exports
3. Ensure schemas match database constraints
4. Add helpful error messages

**Example:**

```typescript
// lib/validation/schemas.ts

export const createProximityAlertSchema = z.object({
  userId: uuidSchema,
  radiusMiles: z.number().positive().max(50, "Radius cannot exceed 50 miles"),
  tradeFilters: z.array(z.string()).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type CreateProximityAlertInput = z.infer<
  typeof createProximityAlertSchema
>;
```

**Acceptance Criteria:**

- [ ] All server action inputs have corresponding Zod schemas
- [ ] Schemas match database constraints
- [ ] Types exported for use in actions

---

#### Task 3.2.2.3: Apply Validation to All Server Actions

**Standard Pattern:**

```typescript
import { validateInput } from "@/lib/utils/action-response";
import { createJobSchema, type CreateJobInput } from "@/lib/validation/schemas";

export async function createJob(
  formData: FormData,
): Promise<ActionResponse<Job>> {
  return handleActionError(async () => {
    // Extract and validate input
    const rawData = {
      title: formData.get("title"),
      description: formData.get("description"),
      // ... other fields
    };

    const validation = validateInput(createJobSchema, rawData);
    if (!validation.success) return validation.error;

    const data: CreateJobInput = validation.data;

    // Continue with validated data
    // ...
  }, "Failed to create job");
}
```

**Implementation Steps:**

1. Start with actions that have schemas but don't use them
2. For each action:
   - Import corresponding schema and type
   - Extract input data from FormData/params
   - Use `validateInput()` helper
   - Handle validation errors
   - Use validated data in business logic
3. Test each action with valid and invalid inputs
4. Ensure error messages are user-friendly

**Acceptance Criteria:**

- [ ] All server actions validate inputs with Zod
- [ ] Validation errors return field-level errors
- [ ] All actions tested with invalid inputs
- [ ] Error messages are user-friendly

---

## 3.3 Database Improvements

**Goal:** Improve database security, performance, and maintainability.

**Estimated Time:** 1-2 weeks

### 3.3.1 Review and Update RLS Policies

**Current State:** RLS policies exist but may be incomplete or need review.

**Files:** `supabase/migrations/07-policies.sql`, `supabase/migrations/09-missing_tables.sql`

#### Task 3.3.1.1: Audit Current RLS Policies

**Implementation Steps:**

1. List all tables in database schema
2. For each table:
   - Check if RLS is enabled
   - Document existing policies
   - Identify missing policies (SELECT, INSERT, UPDATE, DELETE)
   - Check for potential security gaps
3. Create audit document: `docs/audits/rls-policies.md`

**Tables to Audit:**

- `users` (profiles)
- `workers`
- `contractors`
- `jobs`
- `job_applications`
- `certifications`
- `licenses`
- `experiences`
- `education`
- `portfolio_images`
- `conversations`
- `messages`
- `notifications`
- `subscriptions`
- `subscription_history`
- `stripe_processed_events`
- `profile_views`
- `job_views`
- `proximity_alerts`
- `endorsements`
- `endorsement_requests`
- `content_reports`
- `user_moderation_actions`
- `admin_activity_log`
- `platform_settings`
- `application_drafts`
- `professional_references`

**Acceptance Criteria:**

- [ ] Complete list of all tables and their RLS status
- [ ] All policies documented
- [ ] Security gaps identified

---

#### Task 3.3.1.2: Create Migration for Missing/Updated Policies

**Implementation Steps:**

1. Based on audit, create new migration: `supabase/migrations/045-rls-policy-updates.sql`
2. For each table needing updates:
   - Add missing policies
   - Update existing policies if needed
   - Ensure all operations (SELECT, INSERT, UPDATE, DELETE) are covered
3. Test policies locally:
   - Create test users with different roles
   - Verify policies work as expected
   - Test edge cases
4. Document policy decisions in migration comments

**Example Migration Structure:**

```sql
-- Migration: 045-rls-policy-updates.sql
-- Date: 2026-01-26
-- Purpose: Review and update RLS policies for completeness

-- Example: Add missing DELETE policy for applications
CREATE POLICY "Workers can delete own draft applications"
ON job_applications
FOR DELETE
USING (
  auth.uid() = applicant_id
  AND status = 'draft'
);

-- Example: Add missing UPDATE policy for profile views
CREATE POLICY "Users can update own profile view preferences"
ON profile_views
FOR UPDATE
USING (auth.uid() = viewed_profile_id);
```

**Acceptance Criteria:**

- [ ] Migration file created with all policy updates
- [ ] All tables have complete RLS coverage
- [ ] Policies tested locally
- [ ] Migration documented

---

### 3.3.2 Add Missing Database Tables

#### Task 3.3.2.1: Add `stripe_processed_events` Table

**Purpose:** Webhook idempotency - prevent processing same Stripe event twice.

**Current State:** Referenced in codebase review but may not exist.

**Implementation Steps:**

1. Check if table exists:
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables
     WHERE table_schema = 'public'
     AND table_name = 'stripe_processed_events'
   );
   ```
2. If missing, create migration: `supabase/migrations/046-stripe-processed-events.sql`
3. Table schema:

   ```sql
   CREATE TABLE stripe_processed_events (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     stripe_event_id TEXT UNIQUE NOT NULL,
     event_type TEXT NOT NULL,
     processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
   );

   CREATE INDEX idx_stripe_processed_events_event_id
   ON stripe_processed_events(stripe_event_id);

   CREATE INDEX idx_stripe_processed_events_processed_at
   ON stripe_processed_events(processed_at);

   -- RLS: Only service role can access (no public policies)
   ALTER TABLE stripe_processed_events ENABLE ROW LEVEL SECURITY;
   ```

4. Update Stripe webhook handler to check/insert this table
5. Test webhook idempotency

**Acceptance Criteria:**

- [ ] Table created with proper schema
- [ ] Indexes added for performance
- [ ] RLS enabled (no public access)
- [ ] Webhook handler updated to use table
- [ ] Idempotency tested

---

#### Task 3.3.2.2: Add `subscription_history` Table

**Purpose:** Track subscription events for churn calculation (currently hardcoded to 0).

**Current State:** Referenced in migration `08-subscription_tracking.sql` - check if exists.

**Implementation Steps:**

1. Check if table exists (see migration file)
2. If missing or incomplete, create/update migration
3. Ensure table tracks:
   - Subscription start
   - Subscription renewal
   - Subscription cancellation
   - Payment failures
   - Plan changes
4. Update Stripe webhook to insert history records
5. Update admin analytics to calculate churn from history

**Table Schema (if missing):**

```sql
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'started', 'renewed', 'cancelled', 'failed', 'plan_changed'
  stripe_subscription_id TEXT,
  stripe_event_id TEXT,
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_event_type ON subscription_history(event_type);
CREATE INDEX idx_subscription_history_created_at ON subscription_history(created_at);

-- RLS: Users can view their own history
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription history"
ON subscription_history
FOR SELECT
USING (auth.uid() = user_id);
```

**Acceptance Criteria:**

- [ ] Table exists with proper schema
- [ ] Indexes added
- [ ] RLS policies configured
- [ ] Webhook inserts history records
- [ ] Churn calculation uses real data

---

### 3.3.3 Optimize Database Queries

#### Task 3.3.3.1: Identify N+1 Query Patterns

**Implementation Steps:**

1. Review server actions and hooks for database queries
2. Look for patterns like:

   ```typescript
   // BAD: N+1 queries
   for (const job of jobs) {
     const { data: employer } = await supabase
       .from("users")
       .select("*")
       .eq("id", job.employer_id)
       .single();
   }

   // GOOD: Single query with join
   const { data: jobs } = await supabase
     .from("jobs")
     .select("*, employer:users!employer_id(*)")
     .eq("status", "active");
   ```

3. Create audit document: `docs/audits/n-plus-one-queries.md`
4. Prioritize by frequency and impact

**Acceptance Criteria:**

- [ ] N+1 patterns identified and documented
- [ ] Prioritized by impact

---

#### Task 3.3.3.2: Fix N+1 Query Patterns

**Implementation Steps:**

1. Start with highest priority N+1 patterns
2. Refactor to use Supabase joins:

   ```typescript
   // Use nested selects
   .select('*, employer:users!employer_id(*)')

   // Or use multiple relations
   .select(`
     *,
     employer:users!employer_id(*),
     applications:job_applications(*)
   `)
   ```

3. Test query performance before/after
4. Verify data structure matches component expectations
5. Update components if response shape changes

**Acceptance Criteria:**

- [ ] All identified N+1 patterns fixed
- [ ] Query performance improved
- [ ] Components updated if needed
- [ ] Functionality verified

---

#### Task 3.3.3.3: Add Composite Indexes

**Implementation Steps:**

1. Review common query patterns:
   - Filter combinations (e.g., `status + employer_id`, `user_id + read_at`)
   - Sort + filter combinations
   - Join conditions
2. Check existing indexes in migrations
3. Create migration for missing composite indexes:

   ```sql
   -- Example: Jobs filtered by status and employer
   CREATE INDEX idx_jobs_status_employer_id
   ON jobs(status, employer_id)
   WHERE status = 'active';

   -- Example: Messages filtered by conversation and read status
   CREATE INDEX idx_messages_conversation_read
   ON messages(conversation_id, read_at);
   ```

4. Test query performance improvements

**Acceptance Criteria:**

- [ ] Composite indexes added for common query patterns
- [ ] Query performance improved
- [ ] Indexes documented

---

#### Task 3.3.3.4: Consider Materialized Views for Analytics

**Purpose:** Pre-compute expensive analytics queries.

**Implementation Steps:**

1. Identify expensive analytics queries:
   - User growth over time
   - Job application conversion rates
   - Subscription churn calculations
   - Profile view aggregations
2. Evaluate if materialized views would help
3. Create materialized views if beneficial:

   ```sql
   CREATE MATERIALIZED VIEW daily_user_stats AS
   SELECT
     DATE(created_at) as date,
     COUNT(*) as new_users,
     COUNT(*) FILTER (WHERE role = 'worker') as new_workers,
     COUNT(*) FILTER (WHERE role = 'employer') as new_employers
   FROM users
   GROUP BY DATE(created_at);

   CREATE INDEX idx_daily_user_stats_date ON daily_user_stats(date);

   -- Refresh strategy: Daily via cron
   ```

4. Create refresh function and schedule
5. Update admin analytics to use materialized views

**Acceptance Criteria:**

- [ ] Materialized views created for expensive queries
- [ ] Refresh strategy implemented
- [ ] Analytics queries use materialized views
- [ ] Performance improved

---

## 3.4 Component Test Coverage

**Goal:** Increase component test coverage from 20% (24/120) to 50%+.

**Current State:** 24/120 components tested (20%)

**Target:** 60+ components tested (50%+)

**Estimated Time:** 2-3 weeks

### 3.4.1 Identify Critical Gaps

**Critical Components (0% coverage):**

- Admin components (moderation-queue, certification-queue)
- Notification components (bell, list, preferences)
- Application wizard steps (8 components)

#### Task 3.4.1.1: Create Component Test Inventory

**Implementation Steps:**

1. List all components in codebase:
   ```bash
   find features/ components/ app/ -name "*.tsx" -type f | grep -v node_modules | sort > component-list.txt
   ```
2. Check which have tests:
   ```bash
   find __tests__/ -name "*.test.tsx" | sort > test-list.txt
   ```
3. Create inventory document: `docs/audits/component-test-coverage.md`
4. Categorize by:
   - **Critical:** User-facing, high-traffic, complex logic
   - **High:** Important features, moderate complexity
   - **Medium:** Simple components, low risk
   - **Low:** Utility components, already well-tested indirectly

**Acceptance Criteria:**

- [ ] Complete list of all components
- [ ] Test coverage status for each
- [ ] Prioritized list for testing

---

### 3.4.2 Write Tests for Critical Components

#### Task 3.4.2.1: Test Admin Moderation Components

**Files:**

- `components/admin/user-management/moderation-queue.tsx` (if exists)
- `components/admin/user-management/moderation-actions-card.tsx`
- `components/admin/user-management/moderation-history-card.tsx`

**Test Approach:**

- Mock Supabase client
- Test rendering with different data states
- Test user interactions (approve, reject, ban, suspend)
- Test error states
- Test loading states

**Implementation Steps:**

1. Create test file: `__tests__/components/admin/moderation-actions-card.test.tsx`
2. Set up mocks for Supabase and server actions
3. Write tests:
   - Renders correctly with data
   - Handles empty state
   - Handles loading state
   - Handles error state
   - User interactions work
4. Follow existing test patterns from `button.test.tsx`

**Acceptance Criteria:**

- [ ] Test file created
- [ ] All critical paths tested
- [ ] Tests pass
- [ ] Coverage > 80%

---

#### Task 3.4.2.2: Test Notification Components

**Files:**

- `features/notifications/components/notification-bell.tsx` (if exists)
- `features/notifications/components/notification-list.tsx` (if exists)
- `features/notifications/components/notification-preferences-form.tsx`

**Test Approach:**

- Mock notification hooks
- Test rendering with different notification counts
- Test mark as read functionality
- Test preferences form submission

**Implementation Steps:**

1. Create test files for each component
2. Mock `useNotifications` hook
3. Write tests for:
   - Rendering with notifications
   - Empty state
   - Mark as read
   - Preferences form validation
   - Error handling
4. Test accessibility (ARIA attributes)

**Acceptance Criteria:**

- [ ] Test files created
- [ ] Core functionality tested
- [ ] Tests pass
- [ ] Coverage > 70%

---

#### Task 3.4.2.3: Test Application Wizard Steps

**Files:**

- `features/applications/components/application-wizard/step-1-documents.tsx`
- `features/applications/components/application-wizard/step-2-personal-info.tsx`
- `features/applications/components/application-wizard/step-3-contact.tsx`
- `features/applications/components/application-wizard/step-4-work-auth.tsx`
- `features/applications/components/application-wizard/step-5-work-history.tsx`
- `features/applications/components/application-wizard/step-6-education.tsx`
- `features/applications/components/application-wizard/step-7-skills.tsx`
- `features/applications/components/application-wizard/step-8-references.tsx`

**Test Approach:**

- Test form rendering
- Test form validation
- Test field interactions
- Test data submission
- Test error states

**Implementation Steps:**

1. Create test file for each step component
2. Mock `useApplicationWizard` hook
3. Test:
   - Form fields render correctly
   - Validation works
   - User can input data
   - Errors display correctly
   - Submit triggers save
4. Use React Hook Form testing utilities

**Acceptance Criteria:**

- [ ] Test files created for all 8 steps
- [ ] Form validation tested
- [ ] User interactions tested
- [ ] Tests pass
- [ ] Coverage > 75%

---

### 3.4.3 Increase Coverage for Existing Tests

#### Task 3.4.3.1: Review Existing Test Files

**Implementation Steps:**

1. List all existing test files
2. For each test file:
   - Check coverage percentage
   - Identify untested code paths
   - Add tests for missing paths
3. Focus on edge cases and error states

**Acceptance Criteria:**

- [ ] All existing tests reviewed
- [ ] Coverage gaps identified
- [ ] Additional tests added

---

## 3.5 Documentation

**Goal:** Improve code documentation for maintainability.

**Estimated Time:** 1 week

### 3.5.1 Add JSDoc Comments

#### Task 3.5.1.1: Document Exported Functions

**Approach:** Add JSDoc comments to all exported functions in:

- Server actions
- Utility functions
- Hooks
- Components (props interfaces)

**Standard Format:**

````typescript
/**
 * Brief description of what the function does.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws ErrorType - When this error is thrown
 *
 * @example
 * ```ts
 * const result = await myFunction(data);
 * ```
 */
export async function myFunction(paramName: string): Promise<Result> {
  // ...
}
````

**Implementation Steps:**

1. List all exported functions:
   ```bash
   grep -r "export (async )?function" features/ lib/ --include="*.ts" --include="*.tsx" | grep -v node_modules
   ```
2. Prioritize:
   - Server actions (most important)
   - Public hooks
   - Utility functions
   - Component props interfaces
3. Add JSDoc comments following TSDoc standard
4. Include examples for complex functions

**Acceptance Criteria:**

- [ ] All exported server actions documented
- [ ] All public hooks documented
- [ ] All utility functions documented
- [ ] Examples included for complex functions

---

### 3.5.2 Update README

#### Task 3.5.2.1: Review and Update Setup Instructions

**File:** `README.md`

**Implementation Steps:**

1. Read current README
2. Verify setup instructions are accurate
3. Add missing steps:
   - Environment variables setup
   - Database migration steps
   - VAPID keys setup (for push notifications)
   - Stripe webhook configuration
   - Resend email setup
4. Add troubleshooting section
5. Add links to relevant documentation

**Acceptance Criteria:**

- [ ] Setup instructions are complete and accurate
- [ ] All required environment variables documented
- [ ] Troubleshooting section added
- [ ] Links to detailed docs included

---

### 3.5.3 Create API Documentation

#### Task 3.5.3.1: Document Server Actions API

**Approach:** Create markdown documentation for server actions.

**File:** `docs/api/server-actions.md`

**Structure:**

```markdown
# Server Actions API

## Authentication Actions

### `signUp(email, password)`

- Description
- Parameters
- Returns
- Errors
- Example

## Job Actions

...
```

**Implementation Steps:**

1. List all server action files
2. For each action file:
   - Document each exported function
   - Include parameter types
   - Include return types
   - Include error cases
   - Include usage examples
3. Organize by feature area
4. Add to main documentation index

**Acceptance Criteria:**

- [ ] All server actions documented
- [ ] Examples provided
- [ ] Error cases documented
- [ ] Documentation is accurate

---

### 3.5.4 Remove Stale Comments

#### Task 3.5.4.1: Audit and Remove Outdated Comments

**Implementation Steps:**

1. Search for common stale comment patterns:
   - `// TODO:` comments that are completed
   - `// FIXME:` comments that are fixed
   - `// NOTE:` comments that are outdated
   - Comments describing old implementations
2. Review each comment:
   - If outdated, remove it
   - If still relevant, update it
   - If action needed, keep but update date
3. Remove commented-out code blocks

**Acceptance Criteria:**

- [ ] All stale comments removed or updated
- [ ] Commented-out code removed
- [ ] Remaining comments are accurate

---

## 3.6 Dead Code & Cleanup

**Goal:** Remove unused code to reduce maintenance burden.

**Estimated Time:** 1 week

### 3.6.1 Audit Unused Exports

#### Task 3.6.1.1: Find Unused Exports

**Tools:** Use TypeScript compiler or ESLint rules.

**Implementation Steps:**

1. Use TypeScript to find unused exports:
   ```bash
   npx ts-prune
   ```
2. Or use ESLint rule:
   ```json
   {
     "rules": {
       "@typescript-eslint/no-unused-vars": [
         "error",
         { "varsIgnorePattern": "^_" }
       ]
     }
   }
   ```
3. Review each unused export:
   - If truly unused, remove it
   - If used internally, make it non-exported
   - If needed for future, document why it's kept
4. Create cleanup PR

**Acceptance Criteria:**

- [ ] Unused exports identified
- [ ] Unused exports removed or justified
- [ ] No breaking changes introduced

---

### 3.6.2 Remove Commented-Out Code

#### Task 3.6.2.1: Find and Remove Commented Code

**Implementation Steps:**

1. Search for large commented blocks:
   ```bash
   grep -rn "^[[:space:]]*//.*[a-zA-Z]" --include="*.ts" --include="*.tsx" | grep -v "node_modules" | head -50
   ```
2. Review each commented block:
   - If old implementation, remove it (git history preserves it)
   - If temporary debugging, remove it
   - If needed reference, move to documentation
3. Remove commented imports
4. Remove commented function calls

**Acceptance Criteria:**

- [ ] Commented-out code removed
- [ ] Git history preserves old code if needed
- [ ] Codebase is cleaner

---

### 3.6.3 Clean Up Unused Dependencies

#### Task 3.6.3.1: Audit package.json Dependencies

**Implementation Steps:**

1. List all dependencies:
   ```bash
   npm list --depth=0
   ```
2. For each dependency:
   - Search codebase for imports
   - If unused, check if it's:
     - Peer dependency (keep)
     - Used in config files (keep)
     - Truly unused (remove)
3. Use tools:
   ```bash
   npx depcheck
   ```
4. Remove unused dependencies:
   ```bash
   npm uninstall package-name
   ```
5. Test that app still works

**Acceptance Criteria:**

- [ ] Unused dependencies identified
- [ ] Unused dependencies removed
- [ ] App still functions correctly
- [ ] No runtime errors

---

### 3.6.4 Remove Development-Only Code Paths

#### Task 3.6.4.1: Find Development-Only Code

**Implementation Steps:**

1. Search for common dev patterns:
   - `if (process.env.NODE_ENV === 'development')`
   - `if (__DEV__)`
   - Console logs (already handled in P0)
   - Debug flags
2. Review each:
   - If needed for debugging, keep but use logger
   - If temporary, remove it
   - If feature flag, convert to proper feature flag system
3. Remove test/debug routes if not needed

**Acceptance Criteria:**

- [ ] Development-only code identified
- [ ] Unnecessary dev code removed
- [ ] Necessary dev code uses proper patterns

---

## Implementation Timeline

**Recommended Approach:** Work incrementally, 1-2 tasks per week.

### Week 1-2: Type Safety

- [ ] Fix `@ts-ignore` comments (3.1.1)
- [ ] Fix critical `as any` casts (3.1.2.1, 3.1.2.2)

### Week 3-4: Code Standardization

- [ ] Standardize error handling (3.2.1)
- [ ] Standardize validation (3.2.2)

### Week 5-6: Database Improvements

- [ ] Review RLS policies (3.3.1)
- [ ] Add missing tables (3.3.2)
- [ ] Optimize queries (3.3.3)

### Week 7-9: Testing & Documentation

- [ ] Write component tests (3.4.2)
- [ ] Add JSDoc comments (3.5.1)
- [ ] Update documentation (3.5.2, 3.5.3)

### Week 10: Cleanup

- [ ] Remove dead code (3.6)
- [ ] Final audit and cleanup

---

## Success Metrics

- [ ] Zero `@ts-ignore` comments in production code
- [ ] Zero `as any` casts in production code (except justified cases)
- [ ] 100% of server actions use standardized error handling
- [ ] 100% of server actions use Zod validation
- [ ] All database tables have complete RLS policies
- [ ] Component test coverage > 50%
- [ ] All exported functions have JSDoc comments
- [ ] No unused dependencies
- [ ] No commented-out code

---

## Notes

- This work can be done incrementally alongside feature development
- Each task can be completed independently
- Prioritize based on impact and risk
- Test thoroughly after each change
- Document decisions and rationale

---

_Generated: 2026-01-26_
