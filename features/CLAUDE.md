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

### Types

- Define types close to where they're used
- Export from `types/index.ts` for feature-wide types
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
