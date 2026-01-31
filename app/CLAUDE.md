# App Directory

This directory contains Next.js App Router pages and API routes.

<!-- AUTO-MANAGED: module-description -->

## Purpose

Next.js 16 App Router structure with route groups, server components, and API endpoints. Pages primarily compose feature components and handle routing logic.

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: architecture -->

## Module Architecture

```
app/
├── (auth)/             # Auth layout group (login, signup)
├── (dashboard)/        # Dashboard layout group
├── (marketing)/        # Marketing layout group (landing)
├── admin/              # Admin dashboard pages
│   ├── analytics/      # Platform analytics
│   ├── certifications/ # Certification verification
│   ├── moderation/     # Content moderation
│   ├── monitoring/     # Sentry integration
│   ├── settings/       # Platform settings
│   └── users/          # User management
├── api/                # API routes
│   ├── cron/           # Scheduled tasks
│   └── webhooks/       # External webhooks (Stripe)
├── dashboard/          # User dashboard
│   ├── applications/   # Application management
│   ├── jobs/           # Job listings/posting
│   ├── messages/       # Messaging
│   ├── profile/        # Profile editing
│   └── settings/       # User settings
├── legal/              # Legal pages (privacy, terms)
├── login/              # Login page
├── onboarding/         # Onboarding flow
├── pricing/            # Subscription pricing
├── sentry-example-page/  # Sentry testing/debugging page
├── signup/             # Registration page
├── support/            # Support/feedback
├── layout.tsx          # Root layout (providers, fonts)
├── page.tsx            # Landing page
├── globals.css         # Global styles
├── global-error.tsx    # Error boundary
├── robots.ts           # robots.txt generation
└── sitemap.ts          # sitemap.xml generation
```

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: conventions -->

## Module-Specific Conventions

### Route Groups

- `(auth)` - Shared layout for auth pages
- `(dashboard)` - Shared layout for dashboard
- `(marketing)` - Shared layout for marketing pages

### Page Components

- Default export async Server Components
- Use feature components for interactive UI
- Fetch data with Supabase server client

### API Routes

- **Webhooks**: External service callbacks (Stripe)
- **Cron**: Scheduled tasks (boost expiry, proximity alerts)
- Use service role client for admin operations

### Client Components

- Add `'use client'` only when needed
- Prefer Server Components for data fetching
- Client components in `*-client.tsx` or feature `components/`

### Middleware

- `middleware.ts` in root handles auth
- Protects `/dashboard/*` and `/admin/*`
- Refreshes Supabase session on every request

<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: dependencies -->

## Key Dependencies

**Layouts:**

- `layout.tsx` - Root layout with providers
- `(dashboard)/layout.tsx` - Dashboard sidebar/nav
- `(admin)/layout.tsx` - Admin sidebar

**Providers (in layout.tsx):**

- QueryProvider - React Query
- ToastProvider - Toast notifications
- CSRFProvider - CSRF token management
- ModerationGuard - User status checking

<!-- END AUTO-MANAGED -->

<!-- MANUAL -->

## Route Protection

| Route Pattern     | Protection                            |
| ----------------- | ------------------------------------- |
| `/dashboard/*`    | Authenticated users only              |
| `/admin/*`        | Admin users only (404 for non-admins) |
| `/api/webhooks/*` | Signature verification                |
| `/api/cron/*`     | Vercel cron secret                    |

<!-- END MANUAL -->
