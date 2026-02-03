# Features Directory

This directory contains the domain-driven feature modules for KrewUp.

<!-- AUTO-MANAGED: module-description -->

## Purpose

Self-contained feature modules that own their full stack: from Server Actions to UI components. Each feature is responsible for a specific domain of the application and can be developed, tested, and maintained independently.

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: architecture -->

## Module Architecture

```
features/
├── admin/              # Admin dashboard functionality
├── analytics/          # Job and candidate analytics
├── applications/       # Job application system
├── auth/               # Authentication & moderation
├── dashboard/          # User dashboard utilities
├── endorsements/       # Worker endorsement system
├── jobs/               # Job posting & management
├── messaging/          # Real-time messaging
├── notifications/      # Push & in-app notifications
├── onboarding/         # User onboarding flow
├── portfolio/          # Worker portfolio images
├── profile/            # Profile editing
├── profiles/           # Public profile viewing
├── proximity-alerts/   # Location-based job alerts
├── subscriptions/      # Stripe subscriptions & boosts
└── support/            # Feedback & support
```

**Standard Feature Structure:**

```
[feature]/
├── actions/         # Server Actions ('use server')
│   └── *-actions.ts # Named exports for each action
├── components/      # Feature-specific React components
│   └── *.tsx        # PascalCase or kebab-case
├── hooks/           # React Query data hooks
│   └── use-*.ts     # useFeatureName pattern
├── services/        # Pure business logic (validation, parsing, formatting)
│   ├── *-service.ts      # Testable functions without infra dependencies
│   └── *-service.test.ts # Co-located unit tests
├── types/           # TypeScript definitions
│   └── index.ts     # Re-exported types
└── utils/           # Feature-specific utilities
```

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: conventions -->

## Module-Specific Conventions

### Server Actions

- One file per domain area: `job-actions.ts`, `application-actions.ts`
- Return type: `Promise<{ success: boolean; error?: string; data?: T }>`
- Always verify auth: `supabase.auth.getUser()`
- Use CSRF tokens for mutations: `assertValidCsrfToken(csrfToken)`
- Error handling: wrap in try/catch, use `getUserFriendlyError(error, fallback)`
- Sentry tracking: set feature/action tags, capture exceptions
- Call `revalidatePath()` after successful mutations

### React Query Hooks

- File naming: `use-[feature].ts` (e.g., `use-jobs.ts`)
- Export named functions: `useJobs`, `useInfiniteJobs`
- Standard staleTime: 30000ms (30 seconds)
- Use `queryKey` arrays for cache management

### Components

- Feature components live in feature's `components/` directory
- Shared components should be in root `components/` directory
- Use `'use client'` directive for interactive components

### Testing

**Test Organization**:

- Component tests (preferred): `__tests__/features/[feature]/components/*.test.tsx` (centralized)
- Component tests (legacy): `features/[feature]/components/*.test.tsx` (co-located, migration in progress)
- Action tests: `__tests__/features/[feature]/actions/*.test.ts` (Server Action tests, especially admin)
- Hook tests: `features/[feature]/hooks/*.test.ts` (co-located with hooks, React Query mutations)
- Service tests: `features/[feature]/services/*.test.ts` (always co-located with services)
- Test structure mirrors feature structure: `__tests__/features/auth/components/signup-form.test.tsx`
- Note: Some component tests exist in both locations during migration (centralized versions are authoritative)

**Common Patterns**:

- Use `renderWithToast()` helper for components requiring ToastProvider
- Organize tests by categories with nested `describe()` blocks: Authentication, Authorization, Validation, Success Path, Error Handling
- Use `userEvent.setup()` for realistic user interactions
- Use `waitFor()` for async assertions (toasts, API calls)

**Action Testing** (Server Actions, especially admin):

```typescript
// Unified Supabase chainable mock pattern
const createMockChain = () => {
  const mock: any = {
    select: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    from: vi.fn(() => mock),
    update: vi.fn(() => mock),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
  };
  return mock;
};

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => createMockChain()),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Test structure: Authentication → Authorization → Validation → Success Path → Error Handling
describe("Admin Action", () => {
  describe("Authentication", () => {
    it("should return error when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      const result = await myAction();
      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });
  });

  describe("Authorization", () => {
    it("should return error when user is not an admin", async () => {
      // Mock non-admin user
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValueOnce({
        data: { is_admin: false },
        error: null,
      });
      expect(result).toEqual({ success: false, error: "Not authorized" });
    });
  });

  describe("Success Path", () => {
    beforeEach(() => {
      // Setup admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-id" } },
        error: null,
      });
    });

    it("should successfully perform action", async () => {
      const result = await myAction();
      expect(result.success).toBe(true);
    });
  });
});
```

**Hook Testing** (React Query mutations):

```typescript
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock action
const mockAction = vi.fn();
vi.mock("../actions/feature-actions", () => ({
  myAction: (...args: any[]) => mockAction(...args),
}));

// Mock CSRF provider
vi.mock("@/components/providers/csrf-provider", () => ({
  useCsrfToken: vi.fn(() => "mock-csrf-token"),
}));

// Mock router
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useMyHook", () => {
  it("should successfully perform mutation", async () => {
    mockAction.mockResolvedValue({ success: true, data: { id: "123" } });
    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ input: "data" });
    });

    expect(mockAction).toHaveBeenCalledWith(
      expect.objectContaining({ input: "data", csrfToken: "mock-csrf-token" }),
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("should test mutation states: isPending, isSuccess, isError", async () => {
    // Test pending state, success state, error handling
  });
});
```

**Action Mocking** (preferred pattern for component tests):

```typescript
// Create mock function before vi.mock()
const mockAction = vi.fn();

// Mock with callable syntax for better control
vi.mock("@/features/[feature]/actions/[feature]-actions", () => ({
  actionName: (...args: unknown[]) => mockAction(...args),
}));

// In tests: control return values
mockAction.mockResolvedValueOnce({ success: true });
```

**Router Mocking**:

```typescript
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: mockRefresh,
  })),
}));
```

**Component Mocking**:

- Mock UI components for isolated unit tests (Button, Input, Select, Textarea)
- Mock complex dependencies (LocationAutocomplete, CustomQuestionsBuilder)
- Mock feature-specific hooks (use-trade-selections, use-certification-selection, etc.)
- Use `data-testid` for custom component identification
- Preserve essential props (label, value, onChange, required)

### Service Layer

**Purpose**: Extract pure business logic from Server Actions for better testability.

**Pattern**:

- Pure functions with no infrastructure dependencies (no Supabase, cookies, headers)
- Validation, parsing, formatting, calculations
- Export constants, types, and validation results
- Co-located tests: `[feature]-service.test.ts`

**Example Service** (`profile-service.ts`):

```typescript
export type ValidationResult = {
  valid: boolean;
  error?: string;
  field?: string;
};

export const MAX_NAME_LENGTH = 100;
export const MAX_BIO_LENGTH = 500;
export const PHONE_REGEX = /^\(\d{3}\)\d{3}-\d{4}$/;

export function validateName(name: string | undefined): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Name is required", field: "name" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Max ${MAX_NAME_LENGTH} chars`,
      field: "name",
    };
  }
  return { valid: true };
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone) return { valid: true }; // Optional
  if (!PHONE_REGEX.test(phone)) {
    return { valid: false, error: "Format: (XXX)XXX-XXXX", field: "phone" };
  }
  return { valid: true };
}
```

**Usage in Server Actions**:

```typescript
"use server";
import { validateName, validatePhone } from "../services/profile-service";

export async function updateProfile(data) {
  const nameValidation = validateName(data.name);
  if (!nameValidation.valid) {
    return { success: false, error: nameValidation.error };
  }
  // ... proceed with database operations
}
```

**Service Tests** (co-located):

```typescript
// profile-service.test.ts
import { describe, it, expect } from "vitest";
import { validateName, MAX_NAME_LENGTH } from "./profile-service";

describe("validateName", () => {
  it("should return valid for correct name", () => {
    expect(validateName("John Doe").valid).toBe(true);
  });

  it("should reject empty name", () => {
    expect(validateName("").valid).toBe(false);
  });

  it("should reject name exceeding max length", () => {
    const long = "A".repeat(MAX_NAME_LENGTH + 1);
    expect(validateName(long).valid).toBe(false);
  });
});
```

**Existing Services**:

- `profiles/services/profile-service.ts` - Profile validation (name, phone, email, location, trade, employer type)
- `jobs/services/job-service.ts` - Job validation and business rules
- `auth/services/auth-service.ts` - Authentication utilities
- `messaging/services/message-service.ts` - Message formatting
- `applications/services/application-service.ts` - Application validation
- `notifications/services/notification-service.ts` - Notification formatting
- `subscriptions/services/stripe-service.ts` - Stripe utilities

### Types

- Define types close to where they're used
- Export from `types/index.ts` for feature-wide types
- Export from `services/*.ts` for service-specific types
- Use Zod for runtime validation, TypeScript for compile-time

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: dependencies -->

## Key Dependencies

**Shared Libraries:**

- `@/lib/supabase/server` - Server-side Supabase client
- `@/lib/supabase/client` - Browser Supabase client
- `@/lib/security/csrf` - CSRF token validation
- `@/lib/utils/logger` - Structured Sentry logging
- `@/lib/utils/action-response` - User-friendly error messages
- `@/lib/constants` - Shared constants (employer types, etc.)

**External:**

- `@tanstack/react-query` - Data fetching & caching
- `@sentry/nextjs` - Error tracking & performance
- `zod` - Schema validation
- `react-hook-form` - Form state management

<!-- END AUTO-MANAGED -->

<!-- MANUAL -->

## Feature Ownership

| Feature       | Primary Domain           | Key Tables               |
| ------------- | ------------------------ | ------------------------ |
| jobs          | Job postings             | jobs, job_applications   |
| applications  | Application wizard       | job_applications         |
| profiles      | Worker/Employer profiles | profiles, certifications |
| messaging     | Conversations            | messages, conversations  |
| subscriptions | Pro features             | subscriptions            |
| notifications | Alerts                   | notifications            |
| admin         | Platform management      | admin_activity_log       |

<!-- END MANUAL -->
