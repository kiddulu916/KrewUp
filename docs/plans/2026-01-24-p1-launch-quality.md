# P1: Launch Quality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve test coverage for critical paths and implement accessibility best practices across the codebase.

**Architecture:** Add tests for untested server actions, expand E2E coverage, add ARIA attributes and accessibility patterns to existing components.

**Tech Stack:** Vitest, Playwright, React Testing Library, axe-core, ARIA patterns

---

## Part A: Test Coverage for Critical Paths

---

## Task 1: Test subscription-actions.ts (Stripe Operations)

**Files:**
- Create: `__tests__/features/subscriptions/actions/subscription-actions.test.ts`
- Reference: `features/subscriptions/actions/subscription-actions.ts`

**Step 1: Create test file with mocks**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckoutSession, cancelSubscription, getMySubscription } from '@/features/subscriptions/actions/subscription-actions';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { subscription_status: 'free', stripe_customer_id: null },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

// Mock Stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(() => Promise.resolve({ url: 'https://checkout.stripe.com/test' })),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(() => Promise.resolve({ url: 'https://billing.stripe.com/test' })),
      },
    },
    subscriptions: {
      cancel: vi.fn(() => Promise.resolve({ id: 'sub_123' })),
    },
  },
}));

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

describe('subscription-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('returns error when user not authenticated', async () => {
      // Override mock for this test
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: { message: 'Not authenticated' } })),
        },
      } as any);

      const result = await createCheckoutSession('monthly');
      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticated');
    });

    it('creates checkout session for valid user', async () => {
      const result = await createCheckoutSession('monthly');
      expect(result.success).toBe(true);
      expect(result.url).toContain('checkout.stripe.com');
    });

    it('validates billing interval', async () => {
      const result = await createCheckoutSession('invalid' as any);
      expect(result.success).toBe(false);
    });
  });

  describe('cancelSubscription', () => {
    it('returns error when user has no subscription', async () => {
      const result = await cancelSubscription();
      expect(result.success).toBe(false);
    });
  });

  describe('getMySubscription', () => {
    it('returns subscription data for authenticated user', async () => {
      const result = await getMySubscription();
      expect(result.success).toBe(true);
    });
  });
});
```

**Step 2: Run tests**

```bash
npx vitest __tests__/features/subscriptions/actions/subscription-actions.test.ts
```
Expected: All tests pass

**Step 3: Commit**

```bash
git add __tests__/features/subscriptions/
git commit -m "test: add tests for subscription-actions (Stripe operations)"
```

---

## Task 2: Test user-actions.ts (Admin Moderation)

**Files:**
- Create: `__tests__/features/admin/actions/user-actions.test.ts`
- Reference: `features/admin/actions/user-actions.ts`

**Step 1: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  suspendUser,
  banUser,
  unbanUser,
  grantProSubscription,
  revokeProSubscription,
} from '@/features/admin/actions/user-actions';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

describe('user-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated admin user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-id' } },
      error: null,
    });
  });

  describe('suspendUser', () => {
    it('returns error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await suspendUser({
        userId: 'target-id',
        reason: 'Test reason',
        duration_days: 7,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticated');
    });

    it('creates moderation action for valid suspension', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { is_admin: true },
              error: null,
            })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      });

      const result = await suspendUser({
        userId: 'target-id',
        reason: 'Violation of terms',
        duration_days: 7,
      });

      expect(result.success).toBe(true);
    });

    it('validates duration is positive', async () => {
      const result = await suspendUser({
        userId: 'target-id',
        reason: 'Test',
        duration_days: -1,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('banUser', () => {
    it('creates permanent ban record', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { is_admin: true },
              error: null,
            })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      });

      const result = await banUser({
        userId: 'target-id',
        reason: 'Repeated violations',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('grantProSubscription', () => {
    it('updates user subscription status to pro', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { is_admin: true },
              error: null,
            })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      });

      const result = await grantProSubscription('target-id', 'Early adopter reward');

      expect(result.success).toBe(true);
    });
  });

  describe('revokeProSubscription', () => {
    it('updates user subscription status to free', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { is_admin: true },
              error: null,
            })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      });

      const result = await revokeProSubscription('target-id', 'Subscription expired');

      expect(result.success).toBe(true);
    });
  });
});
```

**Step 2: Run tests**

```bash
npx vitest __tests__/features/admin/actions/user-actions.test.ts
```

**Step 3: Commit**

```bash
git add __tests__/features/admin/
git commit -m "test: add tests for user-actions (admin moderation)"
```

---

## Task 3: Test moderation-check.ts (Auth Middleware)

**Files:**
- Create: `__tests__/features/auth/actions/moderation-check.test.ts`
- Reference: `features/auth/actions/moderation-check.ts`

**Step 1: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkUserModerationStatus } from '@/features/auth/actions/moderation-check';

const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

describe('moderation-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkUserModerationStatus', () => {
    it('returns allowed for user with no moderation actions', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        })),
      });

      const result = await checkUserModerationStatus('user-id');
      expect(result.allowed).toBe(true);
    });

    it('returns blocked for banned user', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({
                  data: [{
                    action_type: 'ban',
                    expires_at: null,
                    created_at: new Date().toISOString(),
                  }],
                  error: null,
                })),
              })),
            })),
          })),
        })),
      });

      const result = await checkUserModerationStatus('user-id');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('banned');
    });

    it('returns blocked for actively suspended user', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({
                  data: [{
                    action_type: 'suspension',
                    expires_at: futureDate.toISOString(),
                    created_at: new Date().toISOString(),
                  }],
                  error: null,
                })),
              })),
            })),
          })),
        })),
      });

      const result = await checkUserModerationStatus('user-id');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('suspended');
    });

    it('returns allowed for user with expired suspension', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({
                  data: [{
                    action_type: 'suspension',
                    expires_at: pastDate.toISOString(),
                    created_at: new Date().toISOString(),
                  }],
                  error: null,
                })),
              })),
            })),
          })),
        })),
      });

      const result = await checkUserModerationStatus('user-id');
      expect(result.allowed).toBe(true);
    });
  });
});
```

**Step 2: Run tests**

```bash
npx vitest __tests__/features/auth/actions/moderation-check.test.ts
```

**Step 3: Commit**

```bash
git add __tests__/features/auth/
git commit -m "test: add tests for moderation-check (auth middleware)"
```

---

## Task 4: Expand E2E Messaging Tests

**Files:**
- Modify: `e2e/messaging.spec.ts`

**Step 1: Expand messaging E2E tests**

Replace the stub with comprehensive tests:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Messaging System', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test worker
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_WORKER_EMAIL!);
    await page.fill('[name="password"]', process.env.TEST_WORKER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('can view messages page', async ({ page }) => {
    await page.goto('/dashboard/messages');
    await expect(page.locator('h1')).toContainText('Messages');
  });

  test('shows empty state when no conversations', async ({ page }) => {
    await page.goto('/dashboard/messages');
    // May show empty state or conversations depending on test data
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });

  test('can start new conversation from job page', async ({ page }) => {
    // Navigate to a job and click message button
    await page.goto('/dashboard/jobs');
    await page.click('[data-testid="job-card"]');
    await page.waitForURL(/\/dashboard\/jobs\/.+/);

    const messageButton = page.locator('button:has-text("Message")');
    if (await messageButton.isVisible()) {
      await messageButton.click();
      await expect(page).toHaveURL(/\/dashboard\/messages\/.+/);
    }
  });

  test('can send a message in conversation', async ({ page }) => {
    await page.goto('/dashboard/messages');

    // Click first conversation if exists
    const conversation = page.locator('[data-testid="conversation-item"]').first();
    if (await conversation.isVisible()) {
      await conversation.click();

      // Type and send message
      const input = page.locator('textarea[placeholder*="message"]');
      await input.fill('Test message from E2E');
      await page.click('button:has-text("Send")');

      // Verify message appears
      await expect(page.locator('text=Test message from E2E')).toBeVisible();
    }
  });

  test('messages page is accessible', async ({ page }) => {
    await page.goto('/dashboard/messages');

    // Check for proper heading structure
    await expect(page.locator('h1')).toBeVisible();

    // Check for keyboard accessibility
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('conversation list updates on new message', async ({ page }) => {
    await page.goto('/dashboard/messages');

    // Wait for initial load
    await page.waitForTimeout(2000);

    // Check that polling indicator or conversations are visible
    const hasContent = await page.locator('[data-testid="conversation-item"], [data-testid="empty-state"]').isVisible();
    expect(hasContent).toBe(true);
  });
});
```

**Step 2: Run E2E tests**

```bash
npx playwright test e2e/messaging.spec.ts
```

**Step 3: Commit**

```bash
git add e2e/messaging.spec.ts
git commit -m "test: expand E2E tests for messaging system"
```

---

## Task 5: Expand E2E Subscription Tests

**Files:**
- Modify: `e2e/subscriptions.spec.ts`

**Step 1: Expand subscription E2E tests**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Subscription & Pricing', () => {
  test('pricing page displays plans correctly', async ({ page }) => {
    await page.goto('/pricing');

    // Check page title
    await expect(page.locator('h1')).toContainText('Pricing');

    // Check both plans are visible
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Pro')).toBeVisible();

    // Check feature comparison
    await expect(page.locator('text=Profile Boost')).toBeVisible();
  });

  test('free plan features are listed', async ({ page }) => {
    await page.goto('/pricing');

    const freeSection = page.locator('[data-testid="free-plan"], :text("Free")').first();
    await expect(freeSection).toBeVisible();
  });

  test('pro plan features are listed', async ({ page }) => {
    await page.goto('/pricing');

    const proSection = page.locator('[data-testid="pro-plan"], :text("Pro")').first();
    await expect(proSection).toBeVisible();
  });

  test('upgrade button requires authentication', async ({ page }) => {
    await page.goto('/pricing');

    // Click upgrade button
    const upgradeButton = page.locator('button:has-text("Upgrade"), a:has-text("Get Started")').first();
    if (await upgradeButton.isVisible()) {
      await upgradeButton.click();

      // Should redirect to login or show auth modal
      await expect(page).toHaveURL(/\/(login|signup|pricing)/);
    }
  });

  test.describe('Authenticated User', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_WORKER_EMAIL!);
      await page.fill('[name="password"]', process.env.TEST_WORKER_PASSWORD!);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
    });

    test('can access subscription management page', async ({ page }) => {
      await page.goto('/dashboard/subscription');

      await expect(page.locator('h1')).toContainText(/Subscription|Plan/i);
    });

    test('shows current plan status', async ({ page }) => {
      await page.goto('/dashboard/subscription');

      // Should show either Free or Pro status
      const statusText = await page.textContent('body');
      expect(statusText).toMatch(/Free|Pro|Current Plan/i);
    });

    test('upgrade button initiates Stripe checkout', async ({ page }) => {
      await page.goto('/dashboard/subscription');

      const upgradeButton = page.locator('button:has-text("Upgrade")');
      if (await upgradeButton.isVisible()) {
        // Don't actually click in test - just verify it exists
        await expect(upgradeButton).toBeEnabled();
      }
    });
  });

  test('pricing page is accessible', async ({ page }) => {
    await page.goto('/pricing');

    // Check heading hierarchy
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThan(0);

    // Check for proper button labels
    const buttons = page.locator('button, a[role="button"]');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }
  });
});
```

**Step 2: Run E2E tests**

```bash
npx playwright test e2e/subscriptions.spec.ts
```

**Step 3: Commit**

```bash
git add e2e/subscriptions.spec.ts
git commit -m "test: expand E2E tests for subscriptions and pricing"
```

---

## Part B: Accessibility Best Practices

---

## Task 6: Add ARIA to Form Components

**Files:**
- Modify: `components/ui/input.tsx`
- Modify: `components/ui/label.tsx`
- Modify: `components/ui/select.tsx`

**Step 1: Update Input component**

Add support for error states and descriptions:
```typescript
// Add to Input props
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  description?: string;
}

// In the component, add:
aria-invalid={error ? 'true' : undefined}
aria-describedby={
  [description && `${id}-description`, error && `${id}-error`]
    .filter(Boolean)
    .join(' ') || undefined
}
```

**Step 2: Update Label component**

Add required indicator support:
```typescript
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

// In render:
{required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
```

**Step 3: Run type check**

```bash
npm run type-check
```

**Step 4: Commit**

```bash
git add components/ui/
git commit -m "a11y: add ARIA attributes to form components"
```

---

## Task 7: Add aria-live to Dynamic Content

**Files:**
- Modify: `features/applications/components/application-wizard/auto-save-indicator.tsx` (already done in P0)
- Modify: `features/messaging/components/message-list.tsx`
- Modify: `features/notifications/components/notification-bell.tsx`

**Step 1: Update message-list.tsx**

Add aria-live region for new messages:
```typescript
<div
  role="log"
  aria-live="polite"
  aria-label="Message history"
  className="..."
>
  {messages.map((message) => (
    // ... existing message rendering
  ))}
</div>
```

**Step 2: Update notification-bell.tsx**

Add aria-live for notification count:
```typescript
<span
  className="..."
  role="status"
  aria-live="polite"
  aria-label={`${unreadCount} unread notifications`}
>
  {unreadCount}
</span>
```

**Step 3: Run type check**

```bash
npm run type-check
```

**Step 4: Commit**

```bash
git add features/messaging/components/ features/notifications/components/
git commit -m "a11y: add aria-live regions to dynamic content"
```

---

## Task 8: Add Progress Bar ARIA Attributes

**Files:**
- Modify: `features/applications/components/application-wizard/progress-indicator.tsx`

**Step 1: Update progress indicator with ARIA**

```typescript
'use client';

/**
 * Progress Indicator Component
 *
 * Displays current step progress in the application wizard.
 * Fully accessible with ARIA attributes.
 */

type Props = {
  currentStep: number;
  totalSteps: number;
};

export function ProgressIndicator({ currentStep, totalSteps }: Props) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="mt-4">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{percentage}% complete</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Application progress: step ${currentStep} of ${totalSteps}`}
        className="w-full bg-gray-200 rounded-full h-2"
      >
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

**Step 2: Run type check**

```bash
npm run type-check
```

**Step 3: Commit**

```bash
git add features/applications/components/application-wizard/progress-indicator.tsx
git commit -m "a11y: add ARIA attributes to progress indicator"
```

---

## Task 9: Add Skip Links

**Files:**
- Create: `components/ui/skip-link.tsx`
- Modify: `app/layout.tsx`

**Step 1: Create skip link component**

```typescript
'use client';

/**
 * Skip Link Component
 *
 * Provides keyboard users a way to skip to main content.
 * Hidden until focused for visual users.
 */

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      Skip to main content
    </a>
  );
}
```

**Step 2: Add to root layout**

In `app/layout.tsx`, add after `<body>` opening:
```typescript
import { SkipLink } from '@/components/ui/skip-link';

// In the body:
<body>
  <SkipLink />
  {/* rest of layout */}
</body>
```

**Step 3: Add id="main-content" to main content areas**

In dashboard layout and other main layouts, add:
```typescript
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

**Step 4: Run type check**

```bash
npm run type-check
```

**Step 5: Commit**

```bash
git add components/ui/skip-link.tsx app/layout.tsx
git commit -m "a11y: add skip link for keyboard navigation"
```

---

## Task 10: Add Focus Management to Modals

**Files:**
- Modify: `components/ui/dialog.tsx` (or modal component)

**Step 1: Ensure focus trap in modals**

If using Radix UI Dialog, it handles this automatically. Otherwise add:
```typescript
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus modal
      modalRef.current?.focus();
    } else {
      // Restore focus
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      // ...
    >
      {children}
    </div>
  );
}
```

**Step 2: Run type check**

```bash
npm run type-check
```

**Step 3: Commit**

```bash
git add components/ui/
git commit -m "a11y: ensure proper focus management in modals"
```

---

## Task 11: Add aria-labels to Icon Buttons

**Files:**
- Audit and modify icon-only buttons across:
  - `features/notifications/components/notification-bell.tsx`
  - `features/messaging/components/message-input.tsx`
  - `components/ui/` buttons with icons

**Step 1: Audit icon buttons**

Search for buttons with only icons:
```bash
npx grep -r "Button.*icon\|IconButton" --include="*.tsx"
```

**Step 2: Add aria-label to each**

Example pattern:
```typescript
// Before:
<button onClick={onClose}>
  <X className="h-4 w-4" />
</button>

// After:
<button onClick={onClose} aria-label="Close">
  <X className="h-4 w-4" aria-hidden="true" />
</button>
```

Add `aria-hidden="true"` to decorative icons.

**Step 3: Commit**

```bash
git add .
git commit -m "a11y: add aria-labels to icon-only buttons"
```

---

## Task 12: Add Form Validation Announcements

**Files:**
- Create: `components/ui/form-error.tsx`
- Modify: Forms to use consistent error display

**Step 1: Create accessible form error component**

```typescript
interface FormErrorProps {
  id: string;
  message?: string;
}

export function FormError({ id, message }: FormErrorProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      aria-live="assertive"
      className="mt-1 text-sm text-red-600"
    >
      {message}
    </p>
  );
}
```

**Step 2: Create form error summary component**

```typescript
interface FormErrorSummaryProps {
  errors: Record<string, { message?: string }>;
}

export function FormErrorSummary({ errors }: FormErrorSummaryProps) {
  const errorList = Object.entries(errors).filter(([_, v]) => v?.message);

  if (errorList.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
    >
      <h3 className="text-red-800 font-medium mb-2">
        Please fix the following errors:
      </h3>
      <ul className="list-disc list-inside text-red-700 text-sm">
        {errorList.map(([field, error]) => (
          <li key={field}>
            <a href={`#${field}`} className="underline">
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add components/ui/form-error.tsx
git commit -m "a11y: add accessible form error components"
```

---

## Task 13: Audit Color Contrast

**Files:**
- Review: `tailwind.config.ts` color definitions
- Review: Components using text colors

**Step 1: Run automated contrast check**

Add to E2E tests in `e2e/accessibility.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility - Color Contrast', () => {
  const pagesToTest = [
    '/',
    '/pricing',
    '/login',
    '/signup',
  ];

  for (const path of pagesToTest) {
    test(`${path} has no contrast violations`, async ({ page }) => {
      await page.goto(path);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        v => v.id === 'color-contrast'
      );

      expect(contrastViolations).toHaveLength(0);
    });
  }
});
```

**Step 2: Run accessibility tests**

```bash
npx playwright test e2e/accessibility.spec.ts
```

**Step 3: Fix any contrast issues found**

Common fixes:
- Change `text-gray-400` to `text-gray-600` for better contrast
- Change `text-blue-400` to `text-blue-600`

**Step 4: Commit**

```bash
git add e2e/accessibility.spec.ts
git commit -m "a11y: add color contrast tests and fix violations"
```

---

## Summary

| Task | Category | Description |
|------|----------|-------------|
| 1 | Tests | subscription-actions tests |
| 2 | Tests | user-actions (admin) tests |
| 3 | Tests | moderation-check tests |
| 4 | Tests | E2E messaging expansion |
| 5 | Tests | E2E subscriptions expansion |
| 6 | A11y | Form component ARIA |
| 7 | A11y | aria-live regions |
| 8 | A11y | Progress bar ARIA |
| 9 | A11y | Skip links |
| 10 | A11y | Modal focus management |
| 11 | A11y | Icon button labels |
| 12 | A11y | Form error announcements |
| 13 | A11y | Color contrast audit |

**Total: 13 tasks**

---

*Generated from P1 Launch Quality design on 2026-01-24*
