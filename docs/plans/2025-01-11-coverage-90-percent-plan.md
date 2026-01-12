# Coverage Improvement Plan: 35% → 90%

## Executive Summary

**Current State**: 35% line coverage across 68 tracked files
**Target State**: 90% line coverage
**Estimated New Tests**: 150-200 test cases across 35+ new test files

This plan is organized into 5 phases, prioritized by effort-to-impact ratio.

---

## Phase 1: Validation & Utilities (35% → 45%)

**Goal**: Test pure functions with no external dependencies
**Effort**: Low
**New Tests**: ~25 test cases

### 1.1 Validation Schemas (`lib/validation/schemas.ts`)

Create: `__tests__/lib/validation/schemas.test.ts`

```typescript
// Test cases needed:
- Job form schema validation (valid/invalid cases)
- Profile form schema validation
- Application form schema validation
- Edge cases: empty strings, special characters, max lengths
```

**Tests**: 12 cases

### 1.2 Environment Configuration (`lib/env.ts`)

Create: `__tests__/lib/env.test.ts`

```typescript
// Test cases needed:
- Required env vars throw when missing
- Optional env vars return defaults
- Type coercion (string to boolean, number)
- Validation of URL formats
```

**Tests**: 8 cases

### 1.3 Rate Limiting (`lib/security/rate-limit.ts`)

Create: `__tests__/lib/security/rate-limit.test.ts`

```typescript
// Test cases needed:
- Allow requests under limit
- Block requests over limit
- Window expiration resets count
- Different limits per action type
- IP extraction from headers
```

**Tests**: 10 cases

### 1.4 Image Compression (`lib/utils/image-compression.ts`)

Expand: `__tests__/lib/utils/image-compression.test.ts`

```typescript
// Test cases needed:
- Compress large images
- Skip small images
- Handle invalid file types
- Return correct dimensions
```

**Tests**: 6 cases

---

## Phase 2: Hooks (45% → 60%)

**Goal**: Test React Query hooks with proper mocking
**Effort**: Medium
**New Tests**: ~40 test cases

### 2.1 Subscription Hooks

#### `features/subscriptions/hooks/use-boost.ts`

Create: `features/subscriptions/hooks/use-boost.test.ts`

```typescript
// Test cases needed:
- Returns boost status for pro user
- Returns null for free user
- Handles loading state
- Handles error state
- Refetches on interval
```

**Tests**: 8 cases

#### `features/subscriptions/hooks/use-checkout.ts`

Create: `features/subscriptions/hooks/use-checkout.test.ts`

```typescript
// Test cases needed:
- Creates checkout session successfully
- Handles Stripe errors
- Validates plan type parameter
- Returns redirect URL
- Loading state during creation
```

**Tests**: 8 cases

#### `features/subscriptions/hooks/use-profile-view.ts`

Create: `features/subscriptions/hooks/use-profile-view.test.ts`

```typescript
// Test cases needed:
- Tracks profile view for pro users
- Skips tracking for free users
- Handles tracking errors gracefully
- Debounces rapid view events
```

**Tests**: 6 cases

### 2.2 Profile Hooks

#### `features/profiles/hooks/use-certifications.ts`

Create: `features/profiles/hooks/use-certifications.test.ts`

```typescript
// Test cases needed:
- Fetches user certifications
- Returns empty array when none
- Handles loading/error states
- Filters by verification status
```

**Tests**: 6 cases

#### `features/profiles/hooks/use-education.ts`

Create: `features/profiles/hooks/use-education.test.ts`

```typescript
// Test cases needed:
- Fetches education records
- Sorts by date
- Handles empty state
- Loading/error states
```

**Tests**: 5 cases

#### `features/profiles/hooks/use-work-experience.ts`

Create: `features/profiles/hooks/use-work-experience.test.ts`

```typescript
// Test cases needed:
- Fetches work history
- Calculates total experience
- Sorts by date (recent first)
- Handles current job flag
```

**Tests**: 6 cases

### 2.3 Prefetching Hooks

#### `lib/hooks/use-prefetch.ts`

Create: `__tests__/lib/hooks/use-prefetch.test.ts`

```typescript
// Test cases needed:
- Prefetches on hover
- Debounces rapid hovers
- Cancels on unmount
- Respects cache settings
- Handles prefetch errors
```

**Tests**: 8 cases

---

## Phase 3: Components (60% → 75%)

**Goal**: Test UI components with React Testing Library
**Effort**: Medium
**New Tests**: ~50 test cases

### 3.1 Auth Components

#### `features/auth/components/login-form.tsx`

Create: `features/auth/components/login-form.test.tsx`

```typescript
// Test cases needed:
- Renders email and password fields
- Shows validation errors for empty fields
- Shows validation error for invalid email
- Calls onSubmit with credentials
- Shows loading state during submission
- Displays error message on failure
- Redirects on success
```

**Tests**: 10 cases

#### `features/auth/components/signup-form.tsx`

Create: `features/auth/components/signup-form.test.tsx`

```typescript
// Test cases needed:
- Renders all required fields
- Validates email format
- Validates password strength
- Validates password confirmation match
- Shows role selection (worker/employer)
- Handles form submission
- Displays success/error states
```

**Tests**: 12 cases

### 3.2 Application Components

#### `features/applications/components/apply-button.tsx`

Create: `features/applications/components/apply-button.test.tsx`

```typescript
// Test cases needed:
- Renders "Apply" for unapplied jobs
- Renders "Applied" for applied jobs
- Disables when user is employer
- Shows login prompt for unauthenticated
- Opens application modal on click
```

**Tests**: 8 cases

### 3.3 Messaging Components

#### `features/messages/components/message-list.tsx`

Create: `features/messages/components/message-list.test.tsx`

```typescript
// Test cases needed:
- Renders list of messages
- Shows empty state
- Scrolls to bottom on new message
- Formats timestamps correctly
- Shows read receipts
- Highlights own messages
```

**Tests**: 10 cases

### 3.4 UI Primitives

#### `components/ui/accordion.tsx`

Create: `__tests__/components/ui/accordion.test.tsx`

```typescript
// Test cases needed:
- Renders collapsed by default
- Expands on click
- Collapses on second click
- Handles multiple items
- Keyboard navigation (Enter, Space)
```

**Tests**: 8 cases

#### `components/ui/toast.tsx`

Create: `__tests__/components/ui/toast.test.tsx`

```typescript
// Test cases needed:
- Renders with message
- Shows correct variant (success, error, warning)
- Auto-dismisses after timeout
- Can be manually dismissed
- Stacks multiple toasts
```

**Tests**: 8 cases

### 3.5 Subscription Components

#### `features/subscriptions/components/feature-gate.tsx`

Create: `features/subscriptions/components/feature-gate.test.tsx`

```typescript
// Test cases needed:
- Shows children for pro users
- Shows upgrade prompt for free users
- Handles loading state
- Respects feature-specific gates
```

**Tests**: 6 cases

---

## Phase 4: Charts & Complex UI (75% → 85%)

**Goal**: Test visualization components
**Effort**: Medium-High
**New Tests**: ~30 test cases

### 4.1 Admin Charts

#### `components/admin/funnel-chart.tsx`

Create: `__tests__/components/admin/funnel-chart.test.tsx`

```typescript
// Test cases needed:
- Renders with data
- Shows empty state
- Calculates conversion rates
- Formats numbers correctly
- Handles responsive sizing
```

**Tests**: 6 cases

#### `components/admin/aggregate-chart.tsx`

Create: `__tests__/components/admin/aggregate-chart.test.tsx`

```typescript
// Test cases needed:
- Renders time series data
- Handles date range changes
- Shows tooltips on hover
- Formats axis labels
```

**Tests**: 6 cases

### 4.2 Profile Tabs

#### `features/profiles/components/profile-tabs/*.tsx`

Create tests for each tab component:

```typescript
// about-tab.tsx - 4 tests
// certifications-tab.tsx - 4 tests
// education-tab.tsx - 4 tests
// experience-tab.tsx - 4 tests
// portfolio-tab.tsx - 4 tests
// references-tab.tsx - 4 tests
```

**Tests**: 24 cases total

---

## Phase 5: Infrastructure (85% → 90%)

**Goal**: Test Supabase clients and integrations
**Effort**: High (requires careful mocking)
**New Tests**: ~25 test cases

### 5.1 Supabase Clients

#### `lib/supabase/client.ts`

Create: `__tests__/lib/supabase/client.test.ts`

```typescript
// Test cases needed:
- Creates singleton instance
- Configures auth options
- Returns same instance on multiple calls
```

**Tests**: 4 cases

#### `lib/supabase/server.ts`

Create: `__tests__/lib/supabase/server.test.ts`

```typescript
// Test cases needed:
- Creates client with cookies
- Creates service client without cookies
- Handles missing env vars
```

**Tests**: 5 cases

#### `lib/supabase/queries.ts`

Create: `__tests__/lib/supabase/queries.test.ts`

```typescript
// Test cases needed:
- Builds correct query for each function
- Handles pagination
- Applies filters correctly
- Handles errors
```

**Tests**: 10 cases

### 5.2 Ad System (Lower Priority)

The ad system (`components/ads/*`, `lib/ads/*`) is browser-dependent and has lower business value for testing. Consider:

1. **Mock testing**: Test the logic without actual ad rendering
2. **Skip coverage**: Exclude from coverage thresholds if not critical
3. **E2E only**: Rely on E2E tests for ad integration

---

## Implementation Order

| Phase | Coverage | New Tests | Priority |
|-------|----------|-----------|----------|
| Phase 1: Validation & Utilities | 35% → 45% | ~25 | High |
| Phase 2: Hooks | 45% → 60% | ~40 | High |
| Phase 3: Components | 60% → 75% | ~50 | Medium |
| Phase 4: Charts & UI | 75% → 85% | ~30 | Medium |
| Phase 5: Infrastructure | 85% → 90% | ~25 | Low |

---

## Test File Checklist

### Phase 1 (Create)
- [ ] `__tests__/lib/validation/schemas.test.ts`
- [ ] `__tests__/lib/env.test.ts`
- [ ] `__tests__/lib/security/rate-limit.test.ts`

### Phase 2 (Create)
- [ ] `features/subscriptions/hooks/use-boost.test.ts`
- [ ] `features/subscriptions/hooks/use-checkout.test.ts`
- [ ] `features/subscriptions/hooks/use-profile-view.test.ts`
- [ ] `features/profiles/hooks/use-certifications.test.ts`
- [ ] `features/profiles/hooks/use-education.test.ts`
- [ ] `features/profiles/hooks/use-work-experience.test.ts`
- [ ] `__tests__/lib/hooks/use-prefetch.test.ts`

### Phase 3 (Create)
- [ ] `features/auth/components/login-form.test.tsx`
- [ ] `features/auth/components/signup-form.test.tsx`
- [ ] `features/applications/components/apply-button.test.tsx`
- [ ] `features/messages/components/message-list.test.tsx`
- [ ] `__tests__/components/ui/accordion.test.tsx`
- [ ] `__tests__/components/ui/toast.test.tsx`
- [ ] `features/subscriptions/components/feature-gate.test.tsx`

### Phase 4 (Create)
- [ ] `__tests__/components/admin/funnel-chart.test.tsx`
- [ ] `__tests__/components/admin/aggregate-chart.test.tsx`
- [ ] `features/profiles/components/profile-tabs/about-tab.test.tsx`
- [ ] `features/profiles/components/profile-tabs/certifications-tab.test.tsx`
- [ ] `features/profiles/components/profile-tabs/education-tab.test.tsx`
- [ ] `features/profiles/components/profile-tabs/experience-tab.test.tsx`
- [ ] `features/profiles/components/profile-tabs/portfolio-tab.test.tsx`
- [ ] `features/profiles/components/profile-tabs/references-tab.test.tsx`

### Phase 5 (Create)
- [ ] `__tests__/lib/supabase/client.test.ts`
- [ ] `__tests__/lib/supabase/server.test.ts`
- [ ] `__tests__/lib/supabase/queries.test.ts`

---

## Coverage Threshold Updates

Update `vitest.config.ts` after each phase:

```typescript
// After Phase 1
thresholds: {
  statements: 40,
  branches: 40,
  functions: 35,
  lines: 40,
}

// After Phase 2
thresholds: {
  statements: 55,
  branches: 55,
  functions: 50,
  lines: 55,
}

// After Phase 3
thresholds: {
  statements: 70,
  branches: 70,
  functions: 65,
  lines: 70,
}

// After Phase 4
thresholds: {
  statements: 80,
  branches: 80,
  functions: 75,
  lines: 80,
}

// After Phase 5 (Final)
thresholds: {
  statements: 90,
  branches: 85,
  functions: 85,
  lines: 90,
}
```

---

## Exclusions to Consider

Some files may be excluded from coverage if testing provides low value:

```typescript
// vitest.config.ts coverage.exclude additions
exclude: [
  // Ad system (browser-dependent, low business value)
  'components/ads/**',
  'lib/ads/**',

  // Generated/config files
  '**/types/**',
  '**/*.d.ts',
]
```

This would reduce the target file count and make 90% more achievable.

---

## Success Criteria

- [ ] All 5 phases completed
- [ ] 170+ new test cases added
- [ ] Overall coverage ≥ 90%
- [ ] All tests passing in CI
- [ ] Coverage thresholds enforced in CI
- [ ] No regressions in existing tests

---

## Notes

1. **TDD Approach**: For each new test file, write failing tests first
2. **Mock Strategy**: Use `tests/hooks-setup.tsx` utilities for consistent mocking
3. **Review Cadence**: Run coverage check after each phase to track progress
4. **CI Integration**: Coverage threshold updates should be committed with each phase
