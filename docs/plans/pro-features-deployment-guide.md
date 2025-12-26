# Pro Features Deployment Guide

This guide walks you through the final steps to deploy the 8 Pro subscription features to production.

## Table of Contents

1. [Install Dependencies](#1-install-dependencies)
2. [Configure Environment Variables](#2-configure-environment-variables)
3. [Verify PostGIS Function](#3-verify-postgis-function)
4. [Integration Tasks](#4-integration-tasks)
5. [Testing Checklist](#5-testing-checklist)
6. [Deployment Steps](#6-deployment-steps)

---

## 1. Install Dependencies

### Required Packages

```bash
npm install resend recharts
```

**What these are for:**
- **resend**: Email service for sending endorsement request emails
- **recharts**: Charting library for job analytics dashboard

### Verify Installation

```bash
# Check package.json to confirm versions
cat package.json | grep -E "resend|recharts"
```

Expected output:
```json
"recharts": "^2.x.x",
"resend": "^3.x.x"
```

---

## 2. Configure Environment Variables

### Local Development (.env.local)

Add these variables to `.env.local`:

```bash
# Cron Job Security
CRON_SECRET=your-secure-random-string-here

# Email Service (Resend)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@krewup.net

# App URL (for endorsement approval links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Generate CRON_SECRET

```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `CRON_SECRET`.

### Get Resend API Key

1. Go to https://resend.com
2. Sign up for an account
3. Verify your domain (krewup.net) or use their testing domain
4. Navigate to API Keys section
5. Create a new API key
6. Copy the key (starts with `re_`)

**Domain Verification Steps:**
1. In Resend dashboard, go to Domains
2. Click "Add Domain"
3. Enter `krewup.net`
4. Add the DNS records they provide to your domain registrar:
   - SPF record
   - DKIM record
   - DMARC record
5. Wait for verification (usually 5-15 minutes)
6. Use `noreply@krewup.net` as your FROM_EMAIL

**For testing only:**
- Use Resend's testing domain: `onboarding@resend.dev`
- Emails will only deliver to your verified email address

### Vercel Production Environment Variables

1. Go to https://vercel.com/your-team/krewup
2. Navigate to Settings → Environment Variables
3. Add each variable:

| Name | Value | Environment |
|------|-------|-------------|
| `CRON_SECRET` | (generated string) | Production |
| `RESEND_API_KEY` | re_... | Production |
| `RESEND_FROM_EMAIL` | noreply@krewup.net | Production |
| `NEXT_PUBLIC_APP_URL` | https://krewup.net | Production |

4. Click "Save"

**Important:** After adding environment variables, you must redeploy for them to take effect.

---

## 3. Verify PostGIS Function

The proximity alerts feature uses a PostGIS function `st_distance` to calculate distances. We need to verify it exists or create it.

### Check if Function Exists

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'st_distance';
```

### If Function Doesn't Exist

If the query returns no rows, create the function:

```sql
-- Create st_distance function for proximity calculations
CREATE OR REPLACE FUNCTION st_distance(
  geog1 jsonb,
  geog2 jsonb
)
RETURNS float8
LANGUAGE plpgsql
AS $$
DECLARE
  point1 geography;
  point2 geography;
BEGIN
  -- Convert JSONB coords to PostGIS geography points
  point1 := ST_SetSRID(
    ST_MakePoint(
      (geog1->>'lng')::float8,
      (geog1->>'lat')::float8
    ),
    4326
  )::geography;

  point2 := ST_SetSRID(
    ST_MakePoint(
      (geog2->>'lng')::float8,
      (geog2->>'lat')::float8
    ),
    4326
  )::geography;

  -- Return distance in meters
  RETURN ST_Distance(point1, point2);
END;
$$;
```

### Test the Function

```sql
-- Test with sample coordinates (should return ~10km in meters)
SELECT st_distance(
  '{"lat": 41.8781, "lng": -87.6298}'::jsonb,  -- Chicago downtown
  '{"lat": 41.9742, "lng": -87.6583}'::jsonb   -- Wrigley Field
);

-- Expected result: approximately 10000-11000 (meters)
```

---

## 4. Integration Tasks

Now we need to add the Pro feature components to the appropriate pages throughout the app.

### 4.1 Profile Boost Integration

#### Add Boost Badge to Worker Profile Cards

**Files to modify:**
- `app/dashboard/profiles/[id]/page.tsx` - Profile detail page
- `features/applications/components/application-card.tsx` - Application list items

**Example integration:**

```typescript
// app/dashboard/profiles/[id]/page.tsx
import { BoostBadge } from '@/features/subscriptions/components/boost-badge';

// Inside the profile header section, add:
<div className="flex items-center gap-2">
  <h1 className="text-2xl font-bold">{profile.name}</h1>
  <BoostBadge
    expiresAt={profile.boost_expires_at}
    size="md"
    showExpiry
  />
</div>
```

**Verification:**
- Visit a Pro worker's profile → Should see "Boosted" badge with star icon
- Check that badge shows days remaining when expiry is within 7 days
- Verify badge disappears for free users or expired boosts

### 4.2 Who Viewed Me Integration

#### Add Profile View Tracking

**File to modify:** `app/dashboard/profiles/[id]/page.tsx`

**Add tracking hook:**

```typescript
import { useTrackProfileView } from '@/features/subscriptions/hooks/use-track-profile-view';

export default function ProfileDetailPage({ params }: { params: { id: string } }) {
  const { id: profileId } = params;

  // Track profile view (creates session ID and tracks view)
  useTrackProfileView(profileId);

  // ... rest of component
}
```

**Create the hook:** `features/subscriptions/hooks/use-track-profile-view.ts`

```typescript
'use client';

import { useEffect } from 'react';
import { trackProfileView } from '../actions/profile-views-actions';

export function useTrackProfileView(profileId: string) {
  useEffect(() => {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('krewup_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('krewup_session_id', sessionId);
    }

    // Track the view
    trackProfileView(profileId);
  }, [profileId]);
}
```

#### Add Profile Views List to Worker Dashboard

**File to modify:** `app/dashboard/profile/page.tsx`

```typescript
import { ProfileViewsList } from '@/features/subscriptions/components/profile-views-list';

// Add a new section to the profile page
<section className="mb-8">
  <h2 className="text-xl font-bold mb-4">Who Viewed My Profile</h2>
  <ProfileViewsList />
</section>
```

**Verification:**
- As employer, view a worker's profile
- As worker (Pro), check "Who Viewed Me" section → Should see the employer
- As worker (Free), should see view count with upgrade prompt

### 4.3 Certification Filtering Integration

**File to modify:** `app/dashboard/jobs/[id]/page.tsx` (employer view of applications)

```typescript
import { CertificationFilter } from '@/features/applications/components/certification-filter';
import { useState } from 'react';

export default function JobApplicationsPage({ params }: { params: { id: string } }) {
  const [filteredApplications, setFilteredApplications] = useState(null);

  return (
    <div>
      {/* Add filter section */}
      <div className="mb-6">
        <CertificationFilter
          jobId={params.id}
          onFilterChange={(filtered) => setFilteredApplications(filtered)}
        />
      </div>

      {/* Application list */}
      <div>
        {(filteredApplications || applications).map(app => (
          <ApplicationCard key={app.id} application={app} />
        ))}
      </div>
    </div>
  );
}
```

**Verification:**
- As Pro employer, filter applications by "OSHA 10"
- Toggle "Verified only" → Should only show workers who uploaded credential
- As free employer → Should see upgrade prompt

### 4.4 Job View Analytics Integration

#### Add Job View Tracking

**Create hook:** `features/jobs/hooks/use-track-job-view.ts`

```typescript
'use client';

import { useEffect } from 'react';
import { trackJobView } from '../actions/job-analytics-actions';

export function useTrackJobView(jobId: string) {
  useEffect(() => {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('krewup_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('krewup_session_id', sessionId);
    }

    // Track the view
    trackJobView(jobId, sessionId);
  }, [jobId]);
}
```

**File to modify:** `app/dashboard/jobs/[id]/page.tsx`

```typescript
import { useTrackJobView } from '@/features/jobs/hooks/use-track-job-view';

export default function JobDetailPage({ params }: { params: { id: string } }) {
  // Track job view
  useTrackJobView(params.id);

  // ... rest of component
}
```

#### Add Analytics Dashboard

**File to modify:** `app/dashboard/jobs/[id]/page.tsx` (employer view only)

```typescript
import { JobAnalyticsDashboard } from '@/features/jobs/components/job-analytics-dashboard';
import { useUser } from '@/features/auth/hooks/use-user';

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { user } = useUser();
  const { data: job } = useQuery({ ... });

  // Show analytics if user is the job poster
  const isMyJob = user?.id === job?.employer_id;

  return (
    <div>
      {/* Job details */}
      <JobCard job={job} />

      {/* Analytics for job poster */}
      {isMyJob && (
        <div className="mt-8">
          <JobAnalyticsDashboard jobId={params.id} />
        </div>
      )}
    </div>
  );
}
```

**Verification:**
- Post a job as employer
- View your own job → Should see analytics dashboard
- Check views, applications, conversion rate
- Test date range filters (7 days, 30 days, all time)

### 4.5 Experience-Based Search Integration

**Create new page:** `app/dashboard/workers/page.tsx`

```typescript
'use client';

import { ExperienceFilter } from '@/features/profiles/components/experience-filter';
import { ExperienceBadge } from '@/features/profiles/components/experience-badge';
import { useState } from 'react';

export default function WorkerSearchPage() {
  const [searchResults, setSearchResults] = useState([]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Find Experienced Workers</h1>

      <ExperienceFilter
        onSearchResults={(results) => setSearchResults(results)}
      />

      <div className="mt-8 space-y-4">
        {searchResults.map((worker) => (
          <div key={worker.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold">{worker.name}</h3>
                <p className="text-sm text-gray-600">{worker.trade}</p>
              </div>
              <ExperienceBadge years={worker.total_years} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Add navigation link:**

In `app/dashboard/layout.tsx`, add link for employers:

```typescript
{profile?.role === 'employer' && (
  <Link href="/dashboard/workers" className="nav-link">
    Find Workers
  </Link>
)}
```

**Verification:**
- As Pro employer, go to "Find Workers"
- Use slider to filter by 5+ years experience
- Filter by specific trade
- Verify color-coded experience badges

### 4.6 Custom Screening Questions Integration

**File to modify:** `features/jobs/components/job-form.tsx`

```typescript
import { CustomQuestionsBuilder } from './custom-questions-builder';
import { useState } from 'react';

export function JobForm() {
  const [customQuestions, setCustomQuestions] = useState([]);

  return (
    <form>
      {/* Existing fields: title, trade, description, etc. */}

      {/* Add custom questions section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Screening Questions</h3>
        <CustomQuestionsBuilder
          questions={customQuestions}
          onChange={setCustomQuestions}
        />
      </div>

      {/* Submit button - include customQuestions in form data */}
    </form>
  );
}
```

**File to modify:** `features/applications/components/application-wizard/wizard-container.tsx`

Add screening questions step:

```typescript
import { ScreeningQuestionsForm } from '../screening-questions-form';

// Add as a new step in the wizard
const steps = [
  // ... existing steps
  {
    title: 'Screening Questions',
    component: <ScreeningQuestionsForm jobId={jobId} onComplete={handleNext} />
  }
];
```

**File to modify:** `app/dashboard/applications/[id]/page.tsx`

```typescript
import { ScreeningAnswersDisplay } from '@/features/applications/components/screening-answers-display';

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const { data: application } = useQuery({ ... });

  return (
    <div>
      {/* Application details */}

      {/* Screening answers */}
      {application?.custom_answers && (
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-4">Screening Questions</h3>
          <ScreeningAnswersDisplay
            questions={application.job.custom_questions}
            answers={application.custom_answers}
          />
        </div>
      )}
    </div>
  );
}
```

**Verification:**
- As Pro employer, post job with 2-3 custom questions
- As worker, apply to job → Should see screening questions step
- Mark one question as required → Verify validation
- As employer, review application → Should see Q&A format

### 4.7 Endorsements Integration

**File to modify:** `features/profiles/components/experience-item.tsx`

```typescript
import { RequestEndorsementButton } from '@/features/endorsements/components/request-endorsement-button';
import { EndorsementBadge } from '@/features/endorsements/components/endorsement-badge';

export function ExperienceItem({ experience, isOwnProfile }: ExperienceItemProps) {
  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-bold">{experience.position}</h4>
      <p className="text-sm text-gray-600">{experience.company_name}</p>

      {/* Show endorsement badge */}
      <EndorsementBadge
        experienceId={experience.id}
        showDetails={isOwnProfile}
      />

      {/* Show request button on own profile */}
      {isOwnProfile && (
        <RequestEndorsementButton
          experienceId={experience.id}
          onSuccess={() => queryClient.invalidateQueries(['endorsements'])}
        />
      )}
    </div>
  );
}
```

**Verification:**
- As Pro worker, go to your experience section
- Click "Request Endorsement" → Enter employer email
- Check email inbox → Should receive endorsement request
- Click approval link → Should land on endorsement form
- Submit endorsement → Badge should appear on experience item

### 4.8 Proximity Alerts Integration

**File to modify:** `app/dashboard/settings/page.tsx`

Create this page if it doesn't exist:

```typescript
'use client';

import { ProximityAlertSettings } from '@/features/proximity-alerts/components/proximity-alert-settings';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Proximity Alerts</h2>
        <ProximityAlertSettings />
      </section>

      {/* Other settings sections */}
    </div>
  );
}
```

**Add settings link to navigation:**

In `app/dashboard/layout.tsx`:

```typescript
{profile?.role === 'worker' && (
  <Link href="/dashboard/settings" className="nav-link">
    Settings
  </Link>
)}
```

**Verification:**
- As Pro worker, go to Settings
- Set alert radius to 25km
- Select 2-3 trades (e.g., Electrician, Plumber)
- Toggle active/inactive
- Post a test job within 25km with matching trade
- Wait 10 minutes → Check notifications table in Supabase

---

## 5. Testing Checklist

### Pre-Deployment Testing

#### Environment Setup
- [ ] All dependencies installed (`resend`, `recharts`)
- [ ] Environment variables configured in `.env.local`
- [ ] Environment variables added to Vercel
- [ ] PostGIS `st_distance` function verified in Supabase

#### Feature Testing - Worker Pro

**Profile Boost:**
- [ ] Subscribe to Pro as worker → Boost badge appears on profile
- [ ] Check `boost_expires_at` is 7 days from now
- [ ] Verify boosted workers appear first in employer search results
- [ ] Wait for boost to expire (or manually set past date) → Badge disappears
- [ ] Cron job resets expired boosts daily

**Who Viewed Me:**
- [ ] As employer, view Pro worker profile
- [ ] As Pro worker, see employer in "Who Viewed Me" list
- [ ] Verify session deduplication (multiple views = 1 count)
- [ ] As free worker, see view count only with upgrade prompt

**Endorsements:**
- [ ] As Pro worker, request endorsement from employer email
- [ ] Employer receives email with approval link
- [ ] Employer clicks link → Arrives at endorsement form
- [ ] Employer submits endorsement with recommendation text
- [ ] Badge appears on worker's experience item
- [ ] Endorsement count updates correctly

**Proximity Alerts:**
- [ ] As Pro worker, set alert radius to 25km
- [ ] Select trades to monitor
- [ ] Post new job within radius with matching trade
- [ ] Within 10 minutes, notification appears
- [ ] Post job outside radius → No notification
- [ ] Post job with non-matching trade → No notification
- [ ] Toggle alert to inactive → No notifications

#### Feature Testing - Employer Pro

**Certification Filtering:**
- [ ] As Pro employer, filter applications by "OSHA 10"
- [ ] Results show only workers with that certification
- [ ] Toggle "Verified only" → Only shows workers with credential_url
- [ ] Clear filters → All applications return

**Job View Analytics:**
- [ ] Post job as Pro employer
- [ ] View your job → Analytics dashboard appears
- [ ] View count increases with each page view
- [ ] Session deduplication works (same session = 1 view)
- [ ] Application count updates when worker applies
- [ ] Conversion rate calculates correctly
- [ ] Date range filters work (7d, 30d, all time)
- [ ] Chart displays view trends over time

**Experience-Based Search:**
- [ ] As Pro employer, go to "Find Workers"
- [ ] Set slider to 5+ years → See only experienced workers
- [ ] Filter by trade → See only that trade
- [ ] Verify experience badges show correct color coding
- [ ] Click worker → Goes to their profile

**Custom Screening Questions:**
- [ ] As Pro employer, create job with 3 custom questions
- [ ] Mark one as required
- [ ] As worker, apply to job → See screening questions step
- [ ] Try to skip required question → Validation error
- [ ] Complete all questions → Application submits
- [ ] As employer, review application → See Q&A format

#### Subscription Flow Testing

**Free → Pro Upgrade:**
- [ ] As free worker, try to use Pro feature → See upgrade prompt
- [ ] Click upgrade → Go to pricing page
- [ ] Click "Subscribe" → Stripe Checkout opens
- [ ] Complete payment with test card: `4242 4242 4242 4242`
- [ ] Redirect back to app → Profile shows Pro status
- [ ] Pro features now accessible

**Pro → Free Downgrade:**
- [ ] In Stripe customer portal, cancel subscription
- [ ] Webhook fires → `subscription_status` set to 'free'
- [ ] Pro features now show upgrade prompts
- [ ] Boosted profile badge removed

**Pro Renewal:**
- [ ] Subscription renews (test with Stripe CLI)
- [ ] Webhook fires → Boost extends by 7 days
- [ ] Stripe CLI command to test:
  ```bash
  stripe trigger customer.subscription.updated
  ```

#### Cron Job Testing

**Reset Expired Boosts:**
- [ ] Manually call endpoint:
  ```bash
  curl -X GET http://localhost:3000/api/cron/reset-expired-boosts \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
- [ ] Check response: `{ success: true, count: X }`
- [ ] Verify profiles with past `boost_expires_at` are reset

**Check Proximity Alerts:**
- [ ] Manually call endpoint:
  ```bash
  curl -X GET http://localhost:3000/api/cron/check-proximity-alerts \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
- [ ] Check response shows jobs processed and notifications created
- [ ] Verify notifications table in Supabase

#### Security Testing

**RLS Policies:**
- [ ] Try to view another user's profile views → Blocked
- [ ] Try to update another user's proximity alert → Blocked
- [ ] Try to read job analytics for job you don't own → Blocked
- [ ] Verify all feature actions check Pro status server-side

**Cron Authorization:**
- [ ] Call cron endpoint without Authorization header → 401 Unauthorized
- [ ] Call with wrong secret → 401 Unauthorized
- [ ] Call with correct secret → 200 OK

---

## 6. Deployment Steps

### 6.1 Pre-Deployment Checklist

- [ ] All integration tasks complete
- [ ] All tests passing
- [ ] Environment variables configured in Vercel
- [ ] Database migration applied in production Supabase
- [ ] Resend domain verified
- [ ] Cron jobs added to `vercel.json`

### 6.2 Deploy to Vercel

```bash
# Commit all changes
git add .
git commit -m "feat: add Pro subscription features

- Profile boost with auto-expiry
- Who viewed me analytics
- Endorsement system with email
- Proximity alerts with cron job
- Certification filtering
- Job view analytics
- Experience-based search
- Custom screening questions"

# Push to main branch
git push origin main
```

Vercel will automatically deploy. Monitor the deployment:

1. Go to https://vercel.com/your-team/krewup
2. Click on latest deployment
3. Check build logs for errors
4. Verify environment variables are loaded

### 6.3 Post-Deployment Verification

**Immediate Checks:**
- [ ] Visit https://krewup.net
- [ ] Sign up as new user
- [ ] Test free user experience (upgrade prompts appear)
- [ ] Subscribe to Pro via Stripe
- [ ] Test Pro features work in production

**Cron Jobs:**
- [ ] Wait 10 minutes → Check Vercel logs for proximity alerts cron
- [ ] Wait 24 hours → Check logs for boost expiry cron
- [ ] Both should show successful execution

**Email Delivery:**
- [ ] Request endorsement from production
- [ ] Check email inbox for endorsement request
- [ ] Verify email formatting and links work

### 6.4 Monitor for Issues

**First 24 Hours:**
- Watch Vercel logs for errors
- Monitor Stripe webhooks for failed events
- Check Supabase logs for RLS policy violations
- Monitor user feedback channels

**Key Metrics to Track:**
- Stripe subscription conversion rate
- Pro feature usage rates
- Email delivery success rate
- Cron job success rate
- Error rate in Sentry/logging

---

## 7. Troubleshooting

### Common Issues

**Issue: Resend emails not sending**
- Check `RESEND_API_KEY` is set correctly
- Verify domain is verified in Resend dashboard
- Check Resend logs for delivery errors
- For testing, use `onboarding@resend.dev` FROM address

**Issue: Cron jobs not running**
- Verify `vercel.json` is committed and deployed
- Check Vercel dashboard → Cron Jobs section
- Ensure `CRON_SECRET` is set in production
- Test manually via curl first

**Issue: PostGIS distance calculations failing**
- Verify `st_distance` function exists in Supabase
- Check that job and profile coords are valid JSONB
- Test function directly in Supabase SQL editor

**Issue: Pro features accessible to free users**
- Check webhook handler is working (Stripe → Supabase)
- Verify `subscription_status` column in profiles table
- Check RLS policies are applied
- Test server action Pro status checks

**Issue: Boost badge not appearing**
- Verify `is_profile_boosted = true` in database
- Check `boost_expires_at` is in the future
- Confirm component is imported and used correctly

---

## 8. Rollback Plan

If critical issues arise post-deployment:

### Quick Rollback (Vercel)

1. Go to Vercel dashboard
2. Click on previous successful deployment
3. Click "Promote to Production"
4. Previous version goes live immediately

### Database Rollback

If migration causes issues:

```sql
-- Rollback migration 022
BEGIN;

-- Drop tables
DROP TABLE IF EXISTS endorsements CASCADE;
DROP TABLE IF EXISTS endorsement_requests CASCADE;
DROP TABLE IF EXISTS proximity_alerts CASCADE;
DROP TABLE IF EXISTS job_views CASCADE;
DROP TABLE IF EXISTS profile_views CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Remove columns
ALTER TABLE profiles
  DROP COLUMN IF EXISTS is_profile_boosted,
  DROP COLUMN IF EXISTS boost_expires_at;

ALTER TABLE certifications
  DROP COLUMN IF EXISTS is_verified;

ALTER TABLE jobs
  DROP COLUMN IF EXISTS custom_questions;

ALTER TABLE job_applications
  DROP COLUMN IF EXISTS custom_answers;

ALTER TABLE experiences
  DROP COLUMN IF EXISTS endorsement_count;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_total_experience(uuid);
DROP FUNCTION IF EXISTS get_workers_by_experience(int, text, int);
DROP FUNCTION IF EXISTS update_endorsement_count();

COMMIT;
```

**WARNING:** This will delete all Pro feature data. Only use as last resort.

---

## Success Criteria

Deployment is successful when:

✅ All 8 Pro features work in production
✅ Free users see upgrade prompts
✅ Pro users can access all features
✅ Stripe payments process correctly
✅ Webhooks update subscription status
✅ Cron jobs run on schedule
✅ Emails deliver successfully
✅ No RLS policy violations in logs
✅ Analytics tracking works
✅ Mobile responsive on all screens

---

## Next Steps After Deployment

1. **Monitor metrics** for first week
2. **Gather user feedback** on Pro features
3. **A/B test pricing** ($15/month vs other tiers)
4. **Add more Pro features** based on usage data
5. **Optimize conversion funnel** to Pro

---

## Support

If you encounter issues:
- Check Vercel logs: `vercel logs`
- Check Supabase logs in dashboard
- Check Stripe webhook logs
- Review this guide's troubleshooting section
