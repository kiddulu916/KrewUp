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
│   ├── (auth)/             # Auth layout group (login, signup, forgot-password, reset-password)
│   ├── (dashboard)/        # Dashboard layout group
│   ├── (marketing)/        # Marketing layout group
│   ├── admin/              # Admin dashboard (11 pages)
│   ├── workers/            # Public worker directory
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
│   └── migrations/         # SQL migrations (23 files)
│       ├── 20260105000000_users_roles.sql       # Core users/roles schema
│       ├── 20260105010000_certs_licenses.sql    # Certifications & licenses
│       ├── 20260105020000_core_features.sql     # Jobs, applications, portfolio
│       ├── 20260105030000_social_messaging.sql  # Messaging & social
│       ├── 20260105040000_functions.sql         # Database functions
│       ├── 20260105050000_triggers.sql          # Auto-update triggers
│       ├── 20260105060000_policies.sql          # RLS policies
│       ├── 20260105090000_missing_functions_and_tables.sql  # Proximity search, notification prefs
│       ├── 20260201020000_add_geography_columns.sql  # PostGIS geography columns and GIST indexes
│       ├── 20260210000000_experience_photos.sql  # Experience photo URLs
│       ├── 20260210000002_profile_views.sql  # Profile view tracking
│       └── 20260210100000_credentials_table.sql  # Worker credentials
├── e2e/                    # Playwright E2E tests
├── tests/                  # Test utilities and helpers
│   └── hooks-setup.tsx     # React Query wrappers (renderHookWithQuery, createTestQueryClient)
└── __tests__/              # Vitest component tests
    ├── components/         # UI component tests (mirrors components/)
    │   ├── admin/          # Admin component tests (user-management/)
    │   ├── applications/   # Application component tests (wizard-steps.test.tsx)
    │   ├── features/       # Cross-feature component tests (profile-form.test.tsx)
    │   └── ui/             # UI primitive tests (badge, loading-spinner, etc.)
    ├── features/           # Feature component tests (mirrors features/)
    │   ├── admin/          # Admin tests (actions: certification-actions.test.ts)
    │   ├── applications/   # Application tests (actions: application-actions.test.ts, draft-actions.test.ts, file-upload-actions.test.ts)
    │   ├── auth/           # Auth tests (components: signup-form.test.tsx)
    │   ├── endorsements/   # Endorsement tests (actions: endorsement-actions.test.ts)
    │   ├── jobs/           # Job tests (actions: job-actions.test.ts)
    │   ├── notifications/  # Notification tests (actions: notification-actions.test.ts, push-subscription-actions.test.ts)
    │   ├── onboarding/     # Onboarding tests (actions: onboarding-actions.test.ts)
    │   └── profiles/       # Profile tests (actions: certification-actions.test.ts, education-actions.test.ts, experience-actions.test.ts)
    ├── lib/                # Utility tests
    │   ├── ads/            # Ad system tests (config.test.ts, hooks.test.ts)
    │   └── resume-parser/  # Resume parsing tests (text-extractor.test.ts)
    └── app/                # Page tests
```

**Feature Modules** (16 total):
admin, analytics, applications, auth, dashboard, endorsements, jobs, messaging, notifications, onboarding, portfolio, profile, profiles, proximity-alerts, subscriptions, support

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

Migrations in `supabase/migrations/` (23 files). Always test locally first.

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

<!-- END MANUAL -->
