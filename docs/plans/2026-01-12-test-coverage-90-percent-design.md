# Test Coverage Expansion to 90% - Design Document

**Date**: 2026-01-12
**Goal**: Expand test coverage from 45% to 90%
**Estimated New Tests**: ~2,100 tests across ~120 files

## Current State

- **Coverage**: 45.03% statements, 43.17% branches, 40.29% functions
- **Existing Tests**: 512 test suites, 1,700 tests
- **Well-Covered**: lib/stripe, lib/validation, lib/analytics, lib/email, many UI components

## Priority Order

| Priority | Category | Files | Est. Tests |
|----------|----------|-------|------------|
| P1 | Server Action Services | 31 | ~600 |
| P2 | Critical Components (>300 lines) | 15 | ~400 |
| P3 | Application Wizard Steps | 9 | ~400 |
| P4 | Lib Utilities | 18 | ~150 |
| P5 | Remaining Components | 50+ | ~400 |
| P6 | Untested Hooks | 18 | ~150 |

## Testing Patterns

### Server Actions

```typescript
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
  createServiceClient: vi.fn(() => mockServiceClient),
}));

// Test categories:
// 1. Authentication checks
// 2. Authorization checks
// 3. Validation
// 4. Success paths
// 5. Error handling
```

### Components

```typescript
vi.mock('@/features/*/hooks/use-*', () => ({
  useFeatureHook: vi.fn(() => mockHookReturn),
}));

// Test categories:
// 1. Initial render
// 2. User interactions
// 3. Loading/error/empty states
// 4. Conditional rendering
```

### Utilities

Pure function tests with edge cases, error scenarios, and boundary conditions.

## P1 - Server Actions (31 files)

### Admin Feature (7 files)
- [ ] `analytics-actions.ts` - Dashboard metrics
- [ ] `certification-actions.ts` - Cert approval/rejection
- [ ] `moderation-actions.ts` - Content moderation (13KB, complex)
- [ ] `sentry-actions.ts` - Error monitoring
- [ ] `settings-actions.ts` - Platform settings
- [ ] `user-actions.ts` - User management (12KB, complex)
- [ ] `lifetime-pro-actions.ts` - Lifetime subscriptions

### Applications Feature (6 files)
- [ ] `application-actions.ts` - Application CRUD (10KB)
- [ ] `certification-filter-actions.ts` - Cert filtering
- [ ] `draft-actions.ts` - Draft management
- [ ] `file-upload-actions.ts` - File uploads
- [ ] `profile-data-actions.ts` - Profile data fetch
- [ ] `save-to-profile-actions.ts` - Save app data to profile

### Analytics Feature (1 file)
- [ ] `candidate-pipeline-actions.ts` - Pipeline metrics

### Auth Feature (2 files)
- [ ] `auth-actions.ts` - Login/logout/signup
- [ ] `moderation-check.ts` - User moderation status

### Endorsements Feature (1 file)
- [ ] `endorsement-actions.ts` - Endorsement CRUD

### Jobs Feature (3 files)
- [ ] `application-actions.ts` - Job applications
- [ ] `job-analytics-actions.ts` - Job metrics
- [ ] `job-actions.ts` - Job CRUD

### Messaging Feature (2 files)
- [ ] `conversation-actions.ts` - Conversation CRUD
- [ ] `message-actions.ts` - Message send/read

### Notifications Feature (3 files)
- [ ] `notification-actions.ts` - Notification CRUD
- [ ] `notification-preferences-actions.ts` - Preferences
- [ ] `push-subscription-actions.ts` - Push subscriptions

### Portfolio Feature (1 file)
- [ ] `portfolio-actions.ts` - Portfolio CRUD

### Profiles Feature (6 files)
- [ ] `certification-actions.ts` - Profile certs
- [ ] `education-actions.ts` - Education CRUD
- [ ] `experience-actions.ts` - Experience CRUD
- [ ] `experience-search-actions.ts` - Experience search
- [ ] `profile-actions.ts` - Profile CRUD
- [ ] `profile-picture-actions.ts` - Avatar upload

### Proximity Alerts Feature (1 file)
- [ ] `proximity-alert-actions.ts` - Alert configuration

### Subscriptions Feature (4 files)
- [ ] `boost-actions.ts` - Profile boost
- [ ] `profile-analytics-actions.ts` - View analytics
- [ ] `profile-views-actions.ts` - View tracking
- [ ] `subscription-actions.ts` - Stripe integration

### Onboarding Feature (1 file)
- [ ] `onboarding-actions.ts` - Onboarding flow

## P2 - Critical Components (15 files)

- [ ] `onboarding-form.tsx` (745 lines)
- [ ] `moderation-review-panel.tsx` (705 lines)
- [ ] `profile-form.tsx` (583 lines)
- [ ] `edit-job-form.tsx` (496 lines)
- [ ] `certification-review-panel.tsx` (477 lines)
- [ ] `portfolio-manager.tsx` (444 lines)
- [ ] `notification-preferences-form.tsx` (282 lines)
- [ ] `profile-views-chart.tsx` (273 lines)
- [ ] `job-analytics-dashboard.tsx` (249 lines)
- [ ] `moderation-queue.tsx` (237 lines)
- [ ] `conversation-list.tsx`
- [ ] `notification-list.tsx`
- [ ] `certification-queue.tsx`
- [ ] `boost-manager.tsx`
- [ ] `job-card.tsx`

## P3 - Application Wizard (9 files)

- [ ] `step-1-documents.tsx` (570 lines)
- [ ] `step-2-personal-info.tsx` (238 lines)
- [ ] `step-3-contact-info.tsx`
- [ ] `step-4-trade-info.tsx`
- [ ] `step-5-work-history.tsx` (363 lines)
- [ ] `step-6-education.tsx` (350 lines)
- [ ] `step-7-skills.tsx` (432 lines)
- [ ] `step-8-references.tsx` (587 lines)
- [ ] `step-9-confirmation.tsx`

## P4 - Lib Utilities (10 key files)

- [ ] `lib/resume-parser/pdf-parser.ts`
- [ ] `lib/resume-parser/docx-parser.ts`
- [ ] `lib/resume-parser/text-extractor.ts`
- [ ] `lib/ads/consent.ts`
- [ ] `lib/ads/hooks.ts`
- [ ] `lib/supabase/middleware.ts`
- [ ] `lib/email/templates/endorsement-request.ts`
- [ ] `lib/utils/image-compression.ts`

## Success Criteria

- [ ] Overall statement coverage >= 90%
- [ ] Overall branch coverage >= 85%
- [ ] Overall function coverage >= 90%
- [ ] All tests pass in CI
- [ ] No flaky tests
