# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- AUTO-MANAGED: project-description -->

## Overview

**KrewUp** - A job marketplace platform connecting skilled trade workers with employers. Built with Next.js 16, TypeScript, Supabase (PostgreSQL + Auth + Storage), and Stripe for subscriptions.

**Key Features:**

- Worker profiles with certifications, experience, and portfolio
- Employer job postings with custom screening questions
- Real-time messaging between workers and employers
- Pro subscriptions with profile boosts and proximity alerts
- Admin dashboard for user management and content moderation
- PostGIS-powered location-based job search

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: build-commands -->

## Build & Development Commands

```bash
# Development
npm run dev                 # Start Next.js dev server (port 3000)
npm run build               # Production build
npm start                   # Start production server

# Type Checking & Linting
npm run type-check          # TypeScript compiler check
npm run lint                # Run ESLint

# Testing
npm test                    # Run Vitest component tests
npm run test:watch          # Watch mode
npm run test:e2e            # Playwright E2E tests
npm run test:e2e:ui         # Playwright with UI
npm run test:e2e:mobile     # Mobile E2E tests
npm run test:all            # Component + E2E tests

# Performance
npm run lighthouse          # Lighthouse audit
npm run lighthouse:mobile   # Mobile audit

# Database
npm run seed                # Seed database
npm run seed:clean          # Clean seed

# Mobile (Capacitor)
npx cap sync android        # Sync to Android
npx cap open android        # Open in Android Studio
```

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: architecture -->

## Architecture

```
krewup/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth layout group
│   ├── (dashboard)/        # Dashboard layout group
│   ├── (marketing)/        # Marketing layout group
│   ├── admin/              # Admin dashboard (11 pages)
│   ├── api/                # API routes (webhooks, cron)
│   ├── dashboard/          # User dashboard pages
│   └── layout.tsx          # Root layout
├── features/               # Feature modules (16 modules)
│   ├── [feature]/
│   │   ├── actions/        # Server Actions ('use server')
│   │   ├── components/     # Feature-specific components
│   │   ├── hooks/          # React Query hooks
│   │   ├── services/       # Pure business logic (testable)
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Feature utilities
├── components/             # Shared UI components
│   ├── admin/              # Admin-specific components
│   ├── ads/                # AdSense components
│   ├── common/             # Shared utilities
│   ├── layout/             # Layout components
│   ├── providers/          # Context providers
│   └── ui/                 # Base UI components
├── lib/                    # Shared utilities
│   ├── supabase/           # Supabase clients (server, client, service)
│   ├── stripe/             # Stripe client
│   ├── security/           # CSRF, rate limiting
│   ├── utils/              # General utilities
│   └── validation/         # Zod schemas
├── hooks/                  # Global React hooks
├── stores/                 # Zustand stores
├── providers/              # App-level providers
├── supabase/               # Database migrations
│   └── migrations/         # SQL migrations (19 files)
│       ├── 20260105000000_users_roles.sql       # Core users/roles schema
│       ├── 20260105010000_certs_licenses.sql    # Certifications & licenses
│       ├── 20260105020000_core_features.sql     # Jobs, applications, portfolio
│       ├── 20260105030000_social_messaging.sql  # Messaging & social
│       ├── 20260105040000_functions.sql         # Database functions
│       ├── 20260105050000_triggers.sql          # Auto-update triggers
│       ├── 20260105060000_policies.sql          # RLS policies
│       ├── 20260105090000_missing_functions_and_tables.sql  # Proximity search, notification prefs
│       └── 20260201020000_add_geography_columns.sql  # PostGIS geography columns and GIST indexes
├── e2e/                    # Playwright E2E tests
└── __tests__/              # Vitest component tests
    ├── components/         # UI component tests (mirrors components/)
    │   └── ui/             # UI primitive tests (badge, loading-spinner, etc.)
    ├── features/           # Feature component tests (mirrors features/)
    ├── lib/                # Utility tests
    └── app/                # Page tests
```

**Feature Modules** (16 total):
admin, analytics, applications, auth, dashboard, endorsements, jobs, messaging, notifications, onboarding, portfolio, profile, profiles, proximity-alerts, subscriptions, support

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: conventions -->

## Code Conventions

### Server Actions Pattern

All mutations use Next.js Server Actions with consistent structure:

```typescript
"use server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { logger, sanitizeUserId } from "@/lib/utils/logger";
import { getUserFriendlyError } from "@/lib/utils/action-response";

export async function myAction(
  data,
): Promise<{ success: boolean; error?: string; data?: T }> {
  try {
    const supabase = await createClient(await cookies());
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // ... operation
    if (error) {
      logger.error("Operation failed", {
        userId: sanitizeUserId(user.id),
        error: error.message,
      });
      return {
        success: false,
        error: getUserFriendlyError(error, "Operation failed"),
      };
    }

    revalidatePath("/affected/path");
    return { success: true };
  } catch (error: any) {
    logger.error("Error in myAction", {
      error: error?.message || String(error),
    });
    return {
      success: false,
      error: getUserFriendlyError(error, "Operation failed"),
    };
  }
}
```

**Optional patterns** (used selectively):

- CSRF validation: `assertValidCsrfToken(data.csrfToken)` for user-facing forms
- Sentry tags: `Sentry.setTag('feature', 'name')` for critical operations

### Supabase Clients

- **Server**: `createClient(await cookies())` - User-scoped, respects RLS
- **Service**: `createServiceClient()` - Admin only, bypasses RLS
- **Browser**: `createClient()` - Client components, real-time

### React Query Hooks

Feature hooks use React Query for data fetching:

```typescript
"use client";
export function useFeature() {
  return useQuery({
    queryKey: ["feature"],
    queryFn: async () => {
      /* ... */
    },
    staleTime: 30000,
  });
}
```

### Import Aliases

- `@/*` - Root
- `@/components/*` - Shared components
- `@/features/*` - Feature modules
- `@/lib/*` - Utilities
- `@/hooks/*` - Global hooks
- `@/stores/*` - Zustand stores

### Naming Conventions

- **Files**: kebab-case (`job-actions.ts`)
- **Components**: PascalCase (`JobCard.tsx` or `job-card.tsx`)
- **Hooks**: camelCase with `use` prefix (`useJobs`)
- **Actions**: camelCase (`createJob`, `updateProfile`)
- **Types**: PascalCase (`JobData`, `UserProfile`)
- **Test Files**: Same as source with `.test.ts` suffix (`rate-limit.test.ts`)

### Testing Conventions

**Test Location**:

- Component tests: `__tests__/components/` or `__tests__/features/[feature]/components/`
- Action tests: `__tests__/features/[feature]/actions/*.test.ts` (admin action tests)
- Hook tests: `features/[feature]/hooks/*.test.ts` (co-located with hooks)
- Service tests: `features/[feature]/services/*.test.ts` (co-located with services)
- UI component tests: `__tests__/components/ui/*.test.tsx` (badge, loading-spinner, etc.)
- Feature tests mirror feature structure: `__tests__/features/auth/components/login-form.test.tsx`
- Legacy: Some tests remain in `features/[feature]/components/*.test.tsx` (being migrated)

**Test Structure** (Vitest):

```typescript
// Component Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/providers/toast-provider';

// Helper for components requiring ToastProvider
const renderWithToast = (component: React.ReactElement) => {
  return render(<ToastProvider>{component}</ToastProvider>);
};

describe('Component/Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Organize tests by behavior categories
  describe('Rendering', () => {
    it('should render all form elements', () => {
      renderWithToast(<Component />);
      expect(screen.getByLabelText(/field name/i)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should update field on user input', async () => {
      const user = userEvent.setup();
      renderWithToast(<Component />);

      await user.type(screen.getByLabelText(/field/i), 'value');
      expect(screen.getByLabelText(/field/i)).toHaveValue('value');
    });
  });

  describe('Validation', () => {
    it('should show error for invalid input', async () => {
      const user = userEvent.setup();
      renderWithToast(<Component />);

      await user.click(screen.getByRole('button', { name: /submit/i }));
      await waitFor(() => {
        expect(screen.getByText(/error message/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call action with correct parameters', async () => {
      const user = userEvent.setup();
      mockAction.mockResolvedValueOnce({ success: true });

      renderWithToast(<Component />);
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockAction).toHaveBeenCalledWith(expectedParams);
      });
    });
  });
});

// Admin Action Tests (nested describe pattern)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myAdminAction } from '@/features/admin/actions/admin-actions';

// Mock dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Unified Supabase mock (chainable pattern)
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

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('Admin Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await myAdminAction();
      expect(result).toEqual({ success: false, error: 'Not authenticated' });
    });
  });

  describe('Authorization', () => {
    it('should return error when user is not an admin', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      });
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValueOnce({
        data: { is_admin: false },
        error: null,
      });
      mockSupabaseClient.from.mockReturnValueOnce(mockChain);

      const result = await myAdminAction();
      expect(result).toEqual({ success: false, error: 'Not authorized' });
    });
  });

  describe('Success Path', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id' } },
        error: null,
      });
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValueOnce({
        data: { is_admin: true },
        error: null,
      });
      mockSupabaseClient.from.mockReturnValueOnce(mockChain);
    });

    it('should successfully perform action', async () => {
      const result = await myAdminAction();
      expect(result.success).toBe(true);
    });
  });
});

// Hook Tests (React Query mutations)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAction = vi.fn();
vi.mock('../actions/feature-actions', () => ({
  myAction: (...args: any[]) => mockAction(...args),
}));

// Mock CSRF provider
vi.mock('@/components/providers/csrf-provider', () => ({
  useCsrfToken: vi.fn(() => 'mock-csrf-token'),
}));

// Mock Next.js router
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

import { useMyHook } from './use-my-hook';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMyHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mutation functions', () => {
    const { result } = renderHook(() => useMyHook(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should successfully perform mutation', async () => {
    mockAction.mockResolvedValue({ success: true, data: { id: '123' } });
    const { result } = renderHook(() => useMyHook(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ input: 'data' });
    });

    expect(mockAction).toHaveBeenCalledWith(
      expect.objectContaining({ input: 'data', csrfToken: 'mock-csrf-token' })
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    mockAction.mockResolvedValue({ success: false, error: 'Error message' });
    const { result } = renderHook(() => useMyHook(), { wrapper: createWrapper() });

    await expect(
      result.current.mutateAsync({ input: 'data' })
    ).rejects.toThrow('Error message');
  });
});

// Service Tests (Pure Functions)
import { describe, it, expect } from 'vitest';
import {
  validateInput,
  parseData,
  MAX_LENGTH,
  type ValidationResult,
} from './feature-service';

describe('validateInput', () => {
  it('should return valid for correct input', () => {
    expect(validateInput('valid input').valid).toBe(true);
  });

  it('should reject empty input', () => {
    const result = validateInput('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should reject input exceeding max length', () => {
    const long = 'A'.repeat(MAX_LENGTH + 1);
    const result = validateInput(long);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_LENGTH}`);
  });

  it('should accept input at max length', () => {
    const exact = 'A'.repeat(MAX_LENGTH);
    expect(validateInput(exact).valid).toBe(true);
  });
});

// UI Component Tests
describe('Badge Component', () => {
  it('should render with variant styles', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('from-green-400');
  });

  it('should have accessibility attributes', () => {
    render(<Badge>Text</Badge>);
    expect(screen.getByText('Text')).toBeInTheDocument();
  });
});
```

**Module Mocking**:

```typescript
// Mock Next.js navigation (place BEFORE component import)
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
}));

// Mock feature actions with callable syntax
const mockAction = vi.fn();
vi.mock('@/features/[feature]/actions/[feature]-actions', () => ({
  actionName: (...args: unknown[]) => mockAction(...args),
}));

// Mock UI components for unit testing
vi.mock('@/components/ui', () => ({
  Button: ({ children, type, onClick, isLoading, disabled, ...props }: any) => (
    <button type={type || 'button'} onClick={onClick} disabled={disabled || isLoading} {...props}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ label, value, onChange, required, ...props }: any) => (
    <div>
      <label>{label}{required && <span>*</span>}</label>
      <input value={value} onChange={onChange} aria-label={label} {...props} />
    </div>
  ),
}));

// Mock location autocomplete
vi.mock('@/components/common/location-autocomplete', () => ({
  LocationAutocomplete: ({ label, value, onChange, placeholder }: any) => (
    <div data-testid="location-autocomplete">
      <label>{label}</label>
      <input
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange({ address: e.target.value, coords: null })}
        aria-label={label}
      />
    </div>
  ),
}));

// Mock classes with class syntax
vi.mock('@upstash/redis', () => {
  return {
    Redis: class {
      static fromEnv = vi.fn();
    },
  };
});
```

**Mock Helpers**:

- Use `createMock*` functions for complex object creation (File, Headers, etc.)
- Make async helpers when mocking async modules: `async function createMockHeaders()`
- Use `vi.mocked()` for type-safe mock access: `vi.mocked(headers).mockResolvedValue(...)`

**File Mocking** (for Node.js environment):

```typescript
function createMockFile(
  content: BlobPart[],
  filename: string,
  options: FilePropertyBag,
): File {
  const file = new File(content, filename, options);
  // Add arrayBuffer method for Node environment
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => {
      const text =
        typeof content[0] === "string" ? content[0] : "dummy content";
      const encoder = new TextEncoder();
      return encoder.encode(text).buffer;
    },
    writable: false,
  });
  return file;
}
```

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: patterns -->

## Detected Patterns

### Authentication Flow

1. Middleware refreshes Supabase session on every request
2. Server Actions verify user via `supabase.auth.getUser()`
3. Role checks: `profile.role === 'worker' | 'employer'`
4. Admin checks: `profile.is_admin === true`
5. Database RLS policies as final layer

### Feature Module Structure

Each feature is self-contained:

- `actions/` - Server Actions for mutations
- `components/` - React components
- `hooks/` - React Query hooks for data
- `services/` - Pure business logic (validation, transformation, calculations)
- `types/` - TypeScript definitions

### Service Layer Pattern

Testable business logic extracted from Server Actions:

- **Purpose**: Separate pure functions from Server Action dependencies (Supabase, cookies, etc.)
- **Exports**: Validation functions, parsing/formatting utilities, constants, types
- **Testing**: Unit tests without mocking infrastructure
- **Examples**:
  - `profile-service.ts` - Profile validation (name, phone, email, location, trade)
  - `job-service.ts` - Job validation and business rules
  - `auth-service.ts` - Authentication utilities
  - `message-service.ts` - Message formatting and validation

**Service Module Pattern**:

```typescript
// features/[feature]/services/[feature]-service.ts
export type ValidationResult = {
  valid: boolean;
  error?: string;
  field?: string;
};

export const MAX_LENGTH = 100;

export function validateInput(input: string): ValidationResult {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: "Required", field: "input" };
  }
  if (input.length > MAX_LENGTH) {
    return { valid: false, error: `Max ${MAX_LENGTH} chars`, field: "input" };
  }
  return { valid: true };
}
```

**Server Actions use Services**:

```typescript
// features/[feature]/actions/[feature]-actions.ts
"use server";
import { validateInput } from "../services/[feature]-service";

export async function myAction(data) {
  const validation = validateInput(data.input);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  // ... proceed with database operations
}
```

### Database Schema Structure

Role-based table architecture with PostGIS geospatial support:

**Core Tables:**

- `users` - Base table for all users (references `auth.users`)
  - Common fields: first_name, last_name, email, role, location
  - Role check: `role IN ('worker', 'employer')`
  - Employer type check: `employer_type IN ('contractor', 'developer', 'homeowner', 'recruiter')`
  - Subscription fields: `subscription_status`, `is_lifetime_pro`, `lifetime_pro_granted_at`
  - PostGIS: `geo_coords extensions.geography(Point, 4326)` with GIST index

**Role-Specific Tables** (all reference `users.id` with CASCADE delete):

- `workers` - Worker-specific data (trade, sub_trade, years_of_experience, hourly_rate, certifications, portfolio flags)
- `contractors` - Contractor data (company_name, website, has_cl flag)
- `developers` - Developer data (company_name, website)
- `recruiters` - Recruiter data (company_name, agency_website)
- `home_owners` - Homeowner data (project_description)

**Feature Tables:**

- `jobs` - Job postings with PostGIS coords (`extensions.geography(Point, 4326)`), trades array, status checks
- `job_applications` - Applications with unique constraint on (job_id, applicant_id)
- `experiences` - Worker experience with endorsement tracking
- `education` - Worker education records
- `portfolio_images` - Worker/contractor portfolio with display_order
- `notification_preferences` - User notification settings with RLS policies

**Auto-Updated Flags** (via triggers):

- `workers.has_certifications` - Set true when certifications exist
- `workers.has_portfolio` - Set true when portfolio images exist
- `contractors.has_cl` - Set true when contractor license exists

### Onboarding Flow

Role-based table structure with dynamic mapping:

```typescript
// Employer types map to specific tables
const employerTableMap = {
  contractor: "contractors",
  recruiter: "recruiters",
  homeowner: "home_owners",
  developer: "developers",
};
```

- Workers → `workers` table (trade, sub_trade)
- Employers → role-specific table (company_name)
- Uses `upsert` with `onConflict: 'user_id'` for role switching support

### Error Handling

- Server Actions return `{ success: false, error: string }`
- Use `getUserFriendlyError(error, fallbackMessage)` to convert technical errors to user-friendly messages
- Structured logging via `logger.error()` with sanitized user IDs
- Try/catch blocks catch unexpected errors and return error responses
- CSRF validation via `assertValidCsrfToken()` for user-facing mutations (profiles, jobs, messaging)

### Employer Type Gating

Job posting restricted to specific employer types:

```typescript
import { ALLOWED_JOB_POSTING_EMPLOYER_TYPES } from "@/lib/constants";

if (!ALLOWED_JOB_POSTING_EMPLOYER_TYPES.includes(profile.employer_type)) {
  return {
    success: false,
    error: "Only contractors and developers can post jobs",
  };
}
```

### Subscription Gating

```typescript
// Check if user has Pro access (subscription or lifetime)
const isPro =
  profile?.subscription_status === "pro" || profile?.is_lifetime_pro === true;
if (!isPro) {
  return { success: false, error: "Pro subscription required" };
}
```

### Location Data (PostGIS)

- Jobs and profiles store coordinates as PostGIS `extensions.geography(Point, 4326)` (WGS84 spatial reference)
- Database columns:
  - `users.geo_coords` - User location coordinates
  - `jobs.coords` - Job location coordinates
  - Both use GIST indexes for spatial queries
- RPC functions for coordinate management:
  - `update_user_coords(p_user_id, p_lat, p_lng, p_location)` - Updates user location with PostGIS geography
  - `update_job_coords(p_job_id, p_lat, p_lng)` - Updates job location coordinates
  - `create_job_with_coords(...)` - Creates jobs with location data using `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`
  - `get_nearby_jobs(user_lng, user_lat, radius_km)` - Returns active jobs within radius using `ST_DWithin` for efficient spatial queries
  - `get_workers_by_experience(p_min_years, p_trade_filter)` - Query workers with geography coords
- Geography type syntax: Use `extensions.geography(Point, 4326)` (not `public.geography`)
- Always use RPC functions for coordinate updates (handles geography type conversion)
- Google Maps API for location autocomplete
- Used by: profile actions, onboarding flow, job creation/updates, proximity alerts

### Admin Analytics

- Time-series RPC functions for admin dashboard trends:
  - `get_pending_certifications_trend(p_days)` - Daily count of pending certifications
  - `get_pending_reports_trend(p_days)` - Daily count of pending content reports
- Returns TABLE with (day: date, pending_count: bigint)
- Used by: features/admin/actions/analytics-actions.ts
- Default 7-day lookback, configurable via p_days parameter

### Push Notifications

- Web Push API with VAPID keys configuration
- Graceful degradation: checks `isPushConfigured` before sending
- Uses `web-push` library for server-side notification delivery
- Subscriptions stored in `push_subscriptions` table with endpoint/keys

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: git-insights -->

## Git Insights

**Commit Style**: Conventional commits with scope

- `feat(scope):` - New features
- `fix(scope):` - Bug fixes
- `refactor(scope):` - Code improvements
- `chore:` - Maintenance tasks

**Recent Focus Areas**:

- Database schema refactoring (PostGIS geography type fixes)
- Migration file organization (timestamp-based naming)
- Error handling improvements (getUserFriendlyError utility)
- Onboarding flow enhancements (employer type expansion, table mapping)
- Structured logging migration (console → logger with sanitizeUserId)
- Type safety enhancements (AllowedJobPostingEmployerType)
- Job posting employer type restrictions
- Analytics and search params handling
- Test suite improvements (Vitest mocking patterns, File.arrayBuffer() polyfills, rate limiting tests)
- Test file reorganization (standardizing to **tests**/ directory structure)
- Comprehensive test coverage expansion (auth, jobs, messaging, notifications, subscriptions features)

<!-- END AUTO-MANAGED -->

<!-- MANUAL -->

## Additional Notes

### Environment Variables

See `.env.example` for required variables:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs
- Google Maps: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- AdSense: `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, slot IDs

### Testing Stripe Locally

1. `stripe login`
2. `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Use test card: `4242 4242 4242 4242`

### Database Migrations

Migrations in `supabase/migrations/` (19 files). Always test locally first.

**Schema Organization:**

- `20260105000000_users_roles.sql` - Core users table with role-based structure, PostGIS extensions
- `20260105020000_core_features.sql` - Jobs, applications, experiences, portfolio
- `20260105040000_functions.sql` - Database RPC functions (handle_new_user, create_job_with_coords, etc.)
- `20260105090000_missing_functions_and_tables.sql` - Proximity search, notification_preferences table
- `20260201020000_add_geography_columns.sql` - Adds geography columns (geo_coords, coords) with GIST indexes
- PostGIS extensions enabled: `uuid-ossp`, `postgis`
- Geography type syntax: `extensions.geography(Point, 4326)` (use extensions schema, not public)

### Deployment

Push to main branch triggers Vercel auto-deploy. Ensure env vars are set in Vercel dashboard.

For full reference, see `CLAUDE.md.backup` which contains the complete original documentation.

<!-- END MANUAL -->
