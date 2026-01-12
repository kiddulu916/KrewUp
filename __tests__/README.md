# Test Suite Architecture

## Overview

KrewUp uses a three-tier testing strategy:

1. **Service Tests** - Pure business logic (highest coverage)
2. **Component Tests** - UI components with interactions
3. **E2E Tests** - Full user flows in real browser

**Total Tests**: 1240+ unit/component tests + 150+ E2E tests

## Test Organization

### Co-located Service Tests (`features/**/services/*.test.ts`)

**Technology**: Vitest
**Purpose**: Test pure business logic extracted from server actions
**Target Coverage**: 80%+

Services contain validation, formatting, and business rules without any Next.js dependencies (no `cookies()`, `headers()`, etc.).

| Service | Tests | Coverage |
|---------|-------|----------|
| `job-service.ts` | 95 | 94% |
| `application-service.ts` | 45 | 98% |
| `profile-service.ts` | 60 | 86% |
| `auth-service.ts` | 48 | 99% |
| `message-service.ts` | 41 | 98% |
| `notification-service.ts` | 61 | 97% |
| `stripe-service.ts` | 105 | 100% |

### Co-located Hook Tests (`features/**/hooks/*.test.ts`)

**Technology**: Vitest + React Query Testing
**Purpose**: Test data fetching hooks
**Target Coverage**: 60%+

| Hook | Tests | Purpose |
|------|-------|---------|
| `use-jobs.test.ts` | 15 | Job listing with filters |
| `use-job.test.ts` | 10 | Single job fetch |
| `use-subscription.test.ts` | 9 | Subscription status |
| `use-messages.test.ts` | 8 | Message polling |
| `use-conversations.test.ts` | 8 | Conversation list |
| `use-public-profile.test.ts` | 9 | Profile viewing |
| `use-application-wizard.test.ts` | 23 | Multi-step form |

### Component Tests (`features/**/components/*.test.tsx`)

**Technology**: Vitest + React Testing Library
**Purpose**: Test component rendering and user interactions
**Target Coverage**: 50%+

Tests cover:
- Form validation and submission
- User interactions (clicks, input)
- Conditional rendering
- Loading/error states

### Centralized Tests (`__tests__/`)

Legacy location for:
- UI component tests (`__tests__/components/ui/`)
- Utility tests (`__tests__/lib/`, `__tests__/utils/`)
- Admin component tests (`__tests__/components/admin/`)

### E2E Tests (`e2e/`)

**Technology**: Playwright
**Purpose**: Test complete user flows in real browser
**Device Coverage**: Desktop, iPhone 13 Pro, iPad Pro

| Spec File | Tests | Purpose |
|-----------|-------|---------|
| `auth.spec.ts` | 15+ | Login, signup, logout |
| `profile.spec.ts` | 20+ | Profile management |
| `jobs.spec.ts` | 25+ | Job posting, browsing |
| `applications.spec.ts` | 20+ | Job applications |
| `messaging.spec.ts` | 15+ | Real-time messaging |
| `subscriptions.spec.ts` | 15+ | Stripe checkout |
| `pro-features.spec.ts` | 30+ | Profile boost, alerts |
| `notifications.spec.ts` | 20+ | Notification system |
| `certification-flow.spec.ts` | 25+ | Certification workflow |
| `concurrent-users.spec.ts` | 15+ | Multi-user scenarios |
| `error-states.spec.ts` | 30+ | Error recovery |
| `mobile-responsiveness.spec.ts` | 20+ | Mobile layouts |

## Running Tests

### Unit & Component Tests

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run coverage with threshold check (CI)
npm run test:coverage:check

# Run specific test file
npx vitest features/jobs/services/job-service.test.ts

# Run tests matching pattern
npx vitest --grep "validateJobInput"
```

### E2E Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with Playwright UI
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Run mobile tests only
npm run test:e2e:mobile

# Run tablet tests only
npm run test:e2e:tablet

# Run specific spec
npx playwright test e2e/auth.spec.ts

# Run tests matching name
npx playwright test -g "should allow user to login"
```

### All Tests

```bash
# Run unit + E2E tests
npm run test:all
```

## Coverage Thresholds

Current thresholds (enforced in CI):

| Metric | Global | Services |
|--------|--------|----------|
| Statements | 25% | 80% |
| Branches | 25% | 75% |
| Functions | 18% | 80% |
| Lines | 25% | 80% |

Thresholds are "ratcheted up" - they only increase as coverage improves.

## Writing New Tests

### Service Test Template

```typescript
// features/[feature]/services/[feature]-service.test.ts
import { describe, it, expect } from 'vitest';
import { validateInput, formatOutput } from './[feature]-service';

describe('[Feature] Service', () => {
  describe('validateInput', () => {
    it('should accept valid input', () => {
      const result = validateInput({ field: 'value' });
      expect(result.valid).toBe(true);
    });

    it('should reject missing required field', () => {
      const result = validateInput({});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });
  });
});
```

### Hook Test Template

```typescript
// features/[feature]/hooks/use-[feature].test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryWrapper, mockSupabaseQuery } from '@/tests/hooks-setup';
import { use[Feature] } from './use-[feature]';

describe('use[Feature]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    mockSupabaseQuery([]);
    const { result } = renderHook(() => use[Feature](), {
      wrapper: createTestQueryWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });
});
```

### Component Test Template

```typescript
// features/[feature]/components/[component].test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { [Component] } from './[component]';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('[Component]', () => {
  it('should render correctly', () => {
    render(<[Component] />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const onSubmit = vi.fn();
    render(<[Component] onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

### E2E Test Template

```typescript
// e2e/[feature].spec.ts
import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, TestUser } from './utils/test-db';
import { loginAsUser } from './utils/test-helpers';

test.describe('[Feature]', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    testUser = await createTestUser({ role: 'worker' });
  });

  test.afterAll(async () => {
    if (testUser) await deleteTestUser(testUser.id);
  });

  test('should complete user flow', async ({ page }) => {
    await loginAsUser(page, testUser);
    await page.goto('/dashboard/[feature]');

    await expect(page.locator('text=Expected')).toBeVisible();
  });
});
```

## Test Utilities

### Unit Test Helpers (`tests/`)

- `tests/setup.ts` - Global test setup
- `tests/hooks-setup.tsx` - React Query wrapper and Supabase mocks

### E2E Test Helpers (`e2e/utils/`)

- `test-db.ts` - Database utilities for test data
- `test-helpers.ts` - Page interaction helpers

Key functions:
```typescript
// Create test users
const user = await createTestUser({ role: 'worker', trade: 'Electrical' });

// Create test data
const job = await createTestJob(employerId, { title: 'Test Job' });
const notification = await createTestNotification(userId, { type: 'new_message' });

// Login helper
await loginAsUser(page, user);

// Wait for toast
await waitForToast(page, /success/i);
```

## CI Integration

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main`

Workflow: `.github/workflows/test.yml`

Jobs:
1. **Unit Tests** - Vitest with coverage check
2. **E2E Tests** - Playwright desktop
3. **E2E Mobile** - Playwright mobile viewport
4. **Summary** - Aggregate results

## Troubleshooting

### "cookies() was called outside a request scope"

Server actions cannot be tested directly with Vitest. Extract pure logic to services and test there. Server actions are tested via E2E.

### Tests timing out

- Increase timeout: `test('...', async () => {}, { timeout: 10000 })`
- Check for unresolved promises
- Ensure mocks are properly set up

### Flaky E2E tests

- Use `waitFor` instead of `waitForTimeout`
- Ensure test data is isolated
- Clean up test data in `afterAll`
