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
│   └── migrations/         # SQL migrations (001-044)
├── e2e/                    # Playwright E2E tests
└── __tests__/              # Vitest component tests
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
- `types/` - TypeScript definitions

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

- Jobs and profiles store coordinates as PostGIS geometry
- RPC functions: `update_user_coords`, `create_job_with_coords`, proximity queries
- Always use RPC functions for coordinate updates (handles PostGIS conversion)
- Google Maps API for location autocomplete

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

- Error handling improvements (getUserFriendlyError utility)
- Onboarding flow enhancements (employer type expansion, table mapping)
- Structured logging migration (console → logger with sanitizeUserId)
- Type safety enhancements (AllowedJobPostingEmployerType)
- Job posting employer type restrictions
- Analytics and search params handling

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

Migrations in `supabase/migrations/` (001-044). Always test locally first.

### Deployment

Push to main branch triggers Vercel auto-deploy. Ensure env vars are set in Vercel dashboard.

For full reference, see `CLAUDE.md.backup` which contains the complete original documentation.

<!-- END MANUAL -->
