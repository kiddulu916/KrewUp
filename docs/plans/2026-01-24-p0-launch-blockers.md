# P0: Launch Blockers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical issues that would cause broken functionality, security concerns, or embarrassment if launched.

**Architecture:** Direct fixes to existing files, one new feature module for support page, one database migration.

**Tech Stack:** Next.js 16, TypeScript, Resend (email), Supabase, Sentry logger

---

## Task 1: Remove Console Statements from Messaging Hooks

**Files:**
- Modify: `features/messaging/hooks/use-send-message.ts:18-30`
- Modify: `features/messaging/hooks/use-messages.ts:41`
- Modify: `features/messaging/hooks/use-conversations.ts:53`
- Modify: `features/messaging/hooks/use-infinite-conversations.ts:69`

**Step 1: Remove console statements from use-send-message.ts**

Delete lines 18, 22, 26, 30 containing:
```typescript
// DELETE these lines:
console.log('[useSendMessage] Sending message:', { conversationId, contentLength: content.length });
console.error('[useSendMessage] Failed to send:', result.error);
console.log('[useSendMessage] Message sent successfully');
console.log('[useSendMessage] Invalidating queries...');
```

**Step 2: Remove console statements from use-messages.ts**

Delete line 41:
```typescript
// DELETE this line:
console.error('[useMessages] Error fetching messages:', error);
```

**Step 3: Remove console statements from use-conversations.ts**

Delete line 53:
```typescript
// DELETE this line:
console.error('[useConversations] Error fetching conversations:', error);
```

**Step 4: Remove console statement from use-infinite-conversations.ts**

Delete line 69:
```typescript
// DELETE this line:
console.error('[useInfiniteConversations] Error fetching conversations:', error);
```

**Step 5: Run type check**

```bash
npm run type-check
```
Expected: No errors

**Step 6: Commit**

```bash
git add features/messaging/hooks/
git commit -m "fix: remove console statements from messaging hooks"
```

---

## Task 2: Remove Console Statements from Application Wizard

**Files:**
- Modify: `features/applications/components/application-wizard/wizard-container.tsx:83-88,134-142,179`

**Step 1: Remove debug logging block at lines 82-88**

Delete:
```typescript
// DELETE this block:
  // Debug logging
  console.log('Wizard state:', {
    hasScreeningQuestions,
    totalSteps,
    customQuestionsCount: customQuestions.length,
    currentStep
  });
```

**Step 2: Remove console.log statements at lines 134-142**

Delete:
```typescript
// DELETE these lines:
      console.log('Job custom_questions:', job?.custom_questions);
      console.log('Custom questions length:', job?.custom_questions?.length);

      if (job?.custom_questions && job.custom_questions.length > 0) {
        console.log('Setting custom questions:', job.custom_questions);
        // ... keep the actual logic
      } else {
        console.log('No custom questions found for this job');
      }
```

Keep the actual logic, just remove the console.log lines.

**Step 3: Remove console.error at line 179**

Delete:
```typescript
// DELETE this line:
      console.error('Submission error:', error);
```

**Step 4: Run type check**

```bash
npm run type-check
```
Expected: No errors

**Step 5: Commit**

```bash
git add features/applications/components/application-wizard/wizard-container.tsx
git commit -m "fix: remove console statements from application wizard"
```

---

## Task 3: Remove Console Statements from Dashboard and Onboarding

**Files:**
- Modify: `features/dashboard/components/initial-location-capture.tsx:45-55`
- Modify: `features/onboarding/components/onboarding-form.tsx` (multiple lines)

**Step 1: Remove console statements from initial-location-capture.tsx**

Delete lines 45, 47, 50, 55:
```typescript
// DELETE these lines:
console.log('Initial location saved successfully');
console.error('Failed to save initial location:', result.error);
console.error('Failed to save initial location:', error);
console.log('Location permission denied or error:', error);
```

**Step 2: Remove console statements from onboarding-form.tsx**

Delete lines 54, 59, 64, 81, 91, 104, 107, 122, 127, 132, 137, 162:
```typescript
// DELETE all console.log, console.warn, console.error in this file
// Keep the actual error handling logic, just remove the console statements
```

**Step 3: Run type check**

```bash
npm run type-check
```
Expected: No errors

**Step 4: Commit**

```bash
git add features/dashboard/components/initial-location-capture.tsx features/onboarding/components/onboarding-form.tsx
git commit -m "fix: remove console statements from dashboard and onboarding"
```

---

## Task 4: Replace Console Statements with Logger in Server Actions

**Files:**
- Modify: `features/applications/actions/application-actions.ts`
- Modify: `features/applications/actions/save-to-profile-actions.ts`
- Modify: `features/applications/actions/file-upload-actions.ts`
- Modify: `features/applications/actions/draft-actions.ts`
- Modify: `features/jobs/actions/job-actions.ts`
- Modify: `features/endorsements/actions/endorsement-actions.ts`

**Step 1: Update application-actions.ts**

Add import at top:
```typescript
import { logger } from '@/lib/utils/logger';
```

Replace all `console.error` with `logger.error`:
```typescript
// Replace:
console.error('Error creating application:', error);
// With:
logger.error('Error creating application', { error: error instanceof Error ? error.message : String(error) });
```

Apply this pattern to lines: 70, 79, 131, 139, 219, 243, 311, 376

**Step 2: Update save-to-profile-actions.ts**

Add import and replace console.error at lines: 47, 68, 104, 138, 173, 182

**Step 3: Update file-upload-actions.ts**

Add import and replace console.error at lines: 58, 72, 82, 130, 141, 169, 180, 196

**Step 4: Update draft-actions.ts**

Add import and replace console.error at lines: 56, 62, 93, 104, 129, 135

**Step 5: Update job-actions.ts**

Add import and replace console.error at lines: 226, 317, 373

**Step 6: Update endorsement-actions.ts**

Add import and replace console.error at lines: 143, 178, 183, 264, 278, 283, 312, 318

**Step 7: Run type check**

```bash
npm run type-check
```
Expected: No errors

**Step 8: Commit**

```bash
git add features/applications/actions/ features/jobs/actions/ features/endorsements/actions/
git commit -m "fix: replace console statements with structured logger in server actions"
```

---

## Task 5: Remove Remaining Console Statements

**Files:**
- Modify: `features/profile/components/profile-edit-form.tsx:76`
- Modify: `features/portfolio/components/portfolio-manager.tsx:207,244,288`
- Modify: `features/messaging/components/conversation-list.tsx:28`
- Modify: `features/subscriptions/hooks/use-track-profile-view.ts:24`
- Modify: `features/subscriptions/hooks/use-checkout.ts:20,38`
- Modify: `features/applications/components/applications-list-with-filter.tsx:52`
- Modify: `features/jobs/hooks/use-track-job-view.ts:48`
- Modify: `features/applications/hooks/use-employer-applications.ts:50`
- Modify: `features/notifications/hooks/use-push-notifications.ts:48,120,149`
- Modify: `features/profiles/components/profile-avatar-upload.tsx:77`
- Modify: `features/profiles/components/experience-filter.tsx:90,94`

**Step 1: Remove all console statements from the listed files**

For each file, delete the console.log/error/warn statements. These are client-side hooks/components where we don't need logging.

**Step 2: Run type check**

```bash
npm run type-check
```
Expected: No errors

**Step 3: Run tests**

```bash
npm test
```
Expected: All tests pass

**Step 4: Commit**

```bash
git add features/
git commit -m "fix: remove remaining console statements from features"
```

---

## Task 6: Add VAPID Key Validation

**Files:**
- Modify: `features/notifications/actions/push-subscription-actions.ts:9-17`

**Step 1: Replace silent defaults with validation**

Replace lines 9-17:
```typescript
// Web Push VAPID keys - these should be in environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@krewup.net';

// Configure web-push with VAPID keys
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
```

With:
```typescript
// Web Push VAPID keys configuration
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@krewup.net';

// Track if push notifications are properly configured
const isPushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

// Configure web-push with VAPID keys if available
if (isPushConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
} else {
  logger.warn('Push notifications disabled: VAPID keys not configured', {
    hasPublicKey: Boolean(VAPID_PUBLIC_KEY),
    hasPrivateKey: Boolean(VAPID_PRIVATE_KEY),
  });
}
```

**Step 2: Update sendPushNotification to use isPushConfigured**

Replace line 178:
```typescript
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
```

With:
```typescript
if (!isPushConfigured) {
```

**Step 3: Add function to check push configuration status**

Add after getVapidPublicKey:
```typescript
/**
 * Check if push notifications are properly configured
 */
export async function isPushNotificationsEnabled(): Promise<boolean> {
  return isPushConfigured;
}
```

**Step 4: Run type check**

```bash
npm run type-check
```
Expected: No errors

**Step 5: Commit**

```bash
git add features/notifications/actions/push-subscription-actions.ts
git commit -m "fix: add VAPID key validation with graceful degradation"
```

---

## Task 7: Fix Type Safety in Wizard Container

**Files:**
- Modify: `features/applications/components/application-wizard/wizard-container.tsx:112,165`

**Step 1: Fix trade_selections type at line 112**

Replace:
```typescript
extractedTrades = job.trade_selections
  .map((ts: any) => ts.trade)
  .filter((t: string) => t && t.trim() !== '');
```

With:
```typescript
interface TradeSelection {
  trade: string;
  subtrades?: string[];
}

extractedTrades = (job.trade_selections as TradeSelection[])
  .map((ts) => ts.trade)
  .filter((t): t is string => Boolean(t && t.trim() !== ''));
```

Move the interface to the top of the file, after imports.

**Step 2: Fix formData type at line 165**

Replace:
```typescript
const result = await submitApplication(
  jobId,
  formData as any, // Type assertion for complex nested form data
  resumeUrl,
  coverLetterUrl,
  extractedText
);
```

With:
```typescript
const result = await submitApplication(
  jobId,
  formData,
  resumeUrl,
  coverLetterUrl,
  extractedText
);
```

This requires updating the `submitApplication` function signature to accept the proper form type. Check what type `form.getValues()` returns and use that.

**Step 3: Run type check**

```bash
npm run type-check
```
Expected: No errors

**Step 4: Commit**

```bash
git add features/applications/
git commit -m "fix: improve type safety in application wizard"
```

---

## Task 8: Add Auto-Save Error State

**Files:**
- Modify: `features/applications/components/application-wizard/auto-save-indicator.tsx`
- Modify: `features/applications/hooks/use-application-wizard.ts` (add error state)

**Step 1: Update AutoSaveIndicator props**

Replace the entire file:
```typescript
'use client';

import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';

/**
 * Auto-Save Indicator Component
 *
 * Displays the current save status and last saved time.
 * Shows different states: saving, saved, error with retry.
 */

type Props = {
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  onRetry?: () => void;
};

export function AutoSaveIndicator({ isSaving, lastSaved, saveError, onRetry }: Props) {
  // Error state
  if (saveError) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-red-600 mt-2"
        role="alert"
        aria-live="assertive"
      >
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <span>Save failed: {saveError}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-red-700 hover:text-red-800 underline"
            aria-label="Retry saving"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Retry
          </button>
        )}
      </div>
    );
  }

  // Saving state
  if (isSaving) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-gray-600 mt-2"
        role="status"
        aria-live="polite"
      >
        <Loader2
          className="h-4 w-4 motion-safe:animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span>Saving...</span>
      </div>
    );
  }

  // Saved state
  if (lastSaved) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-gray-500 mt-2"
        role="status"
        aria-live="polite"
      >
        <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
        <span>
          Saved{' '}
          {formatDistanceToNow(lastSaved, {
            addSuffix: true,
          })}
        </span>
      </div>
    );
  }

  return null;
}
```

**Step 2: Update use-application-wizard.ts to include saveError state**

Add to the hook's return value:
```typescript
const [saveError, setSaveError] = useState<string | null>(null);

// In the save function, catch errors:
try {
  // ... existing save logic
  setSaveError(null);
} catch (error) {
  setSaveError(error instanceof Error ? error.message : 'Failed to save');
}

// Add retry function:
const retrySave = useCallback(() => {
  setSaveError(null);
  // Trigger save again
}, []);

return {
  // ... existing returns
  saveError,
  retrySave,
};
```

**Step 3: Update wizard-container.tsx to pass new props**

```typescript
<AutoSaveIndicator
  isSaving={isSaving}
  lastSaved={lastSaved}
  saveError={saveError}
  onRetry={retrySave}
/>
```

**Step 4: Run type check**

```bash
npm run type-check
```
Expected: No errors

**Step 5: Commit**

```bash
git add features/applications/
git commit -m "feat: add error state and retry to auto-save indicator"
```

---

## Task 9: Create Support Page Feature Module

**Files:**
- Create: `features/support/actions/feedback-actions.ts`
- Create: `features/support/components/feedback-form.tsx`
- Create: `features/support/types/index.ts`
- Create: `app/support/page.tsx`

**Step 1: Create types**

Create `features/support/types/index.ts`:
```typescript
export interface FeedbackFormData {
  name: string;
  email: string;
  category: 'bug' | 'feature' | 'question' | 'other';
  message: string;
}

export interface FeedbackSubmitResult {
  success: boolean;
  error?: string;
}
```

**Step 2: Create feedback action**

Create `features/support/actions/feedback-actions.ts`:
```typescript
'use server';

import { sendEmail } from '@/lib/email/client';
import { z } from 'zod';
import type { FeedbackFormData, FeedbackSubmitResult } from '../types';

const feedbackSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  category: z.enum(['bug', 'feature', 'question', 'other']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});

export async function submitFeedback(data: FeedbackFormData): Promise<FeedbackSubmitResult> {
  // Validate input
  const parsed = feedbackSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || 'Invalid input'
    };
  }

  const { name, email, category, message } = parsed.data;

  const categoryLabels = {
    bug: 'Bug Report',
    feature: 'Feature Request',
    question: 'Question',
    other: 'Other',
  };

  const htmlContent = `
    <h2>New Feedback from KrewUp</h2>
    <p><strong>From:</strong> ${name} (${email})</p>
    <p><strong>Category:</strong> ${categoryLabels[category]}</p>
    <hr />
    <h3>Message:</h3>
    <p>${message.replace(/\n/g, '<br />')}</p>
    <hr />
    <p><em>Sent from KrewUp Support Page</em></p>
  `;

  const result = await sendEmail({
    to: 'cor.hilsen@gmail.com',
    subject: `[KrewUp ${categoryLabels[category]}] from ${name}`,
    html: htmlContent,
  });

  if (!result.success) {
    return { success: false, error: 'Failed to send feedback. Please try again.' };
  }

  return { success: true };
}
```

**Step 3: Create feedback form component**

Create `features/support/components/feedback-form.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label } from '@/components/ui';
import { submitFeedback } from '../actions/feedback-actions';
import type { FeedbackFormData } from '../types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  category: z.enum(['bug', 'feature', 'question', 'other']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});

export function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'question',
    },
  });

  async function onSubmit(data: FeedbackFormData) {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage(null);

    const result = await submitFeedback(data);

    if (result.success) {
      setSubmitStatus('success');
      reset();
    } else {
      setSubmitStatus('error');
      setErrorMessage(result.error || 'Something went wrong');
    }

    setIsSubmitting(false);
  }

  if (submitStatus === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Thank you!</h3>
        <p className="text-green-700 mb-4">
          Your feedback has been sent. We&apos;ll get back to you soon.
        </p>
        <Button
          variant="outline"
          onClick={() => setSubmitStatus('idle')}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
          {errorMessage}
        </div>
      )}

      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register('name')}
          aria-describedby={errors.name ? 'name-error' : undefined}
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={errors.email ? 'true' : 'false'}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          {...register('category')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          <option value="question">Question</option>
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="other">Other</option>
        </select>
        {errors.category && (
          <p id="category-error" className="mt-1 text-sm text-red-600">
            {errors.category.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="message">Message</Label>
        <textarea
          id="message"
          {...register('message')}
          rows={5}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-describedby={errors.message ? 'message-error' : undefined}
          aria-invalid={errors.message ? 'true' : 'false'}
        />
        {errors.message && (
          <p id="message-error" className="mt-1 text-sm text-red-600">
            {errors.message.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Sending...' : 'Send Feedback'}
      </Button>
    </form>
  );
}
```

**Step 4: Create support page**

Create `app/support/page.tsx`:
```typescript
import { Metadata } from 'next';
import { FeedbackForm } from '@/features/support/components/feedback-form';
import { Mail, MessageSquare } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support & Feedback | KrewUp',
  description: 'Get help or share feedback about KrewUp',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Support & Feedback</h1>
          <p className="text-gray-600">
            Have a question, found a bug, or want to suggest a feature? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Send us a message</h2>
          </div>
          <FeedbackForm />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Email us directly</h2>
          </div>
          <p className="text-gray-600 mb-2">
            Prefer email? Reach out to us at:
          </p>
          <a
            href="mailto:support@krewup.net"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            support@krewup.net
          </a>
          <p className="text-sm text-gray-500 mt-4">
            We typically respond within 24-48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Run type check**

```bash
npm run type-check
```
Expected: No errors

**Step 6: Test locally**

```bash
npm run dev
# Navigate to http://localhost:3000/support
```

**Step 7: Commit**

```bash
git add features/support/ app/support/
git commit -m "feat: add support and feedback page with email integration"
```

---

## Task 10: Add Database Migration for years_experience_required

**Files:**
- Create: `supabase/migrations/14-job-experience-field.sql`

**Step 1: Create migration file**

Create `supabase/migrations/14-job-experience-field.sql`:
```sql
-- Add years_experience_required field to jobs table
-- This enables proper compatibility scoring for job matching

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS years_experience_required integer DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN jobs.years_experience_required IS 'Minimum years of experience required for this job. NULL means no requirement.';

-- Add index for filtering by experience
CREATE INDEX IF NOT EXISTS idx_jobs_years_experience ON jobs(years_experience_required)
WHERE years_experience_required IS NOT NULL;
```

**Step 2: Apply migration locally (if using local Supabase)**

```bash
npx supabase db push
```

Or apply via Supabase Dashboard SQL Editor for remote database.

**Step 3: Update TypeScript types**

Run type generation or manually add to types:
```typescript
// In relevant type file
interface Job {
  // ... existing fields
  years_experience_required?: number | null;
}
```

**Step 4: Commit**

```bash
git add supabase/migrations/14-job-experience-field.sql
git commit -m "feat: add years_experience_required field to jobs table"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Remove console from messaging hooks | 4 files |
| 2 | Remove console from wizard | 1 file |
| 3 | Remove console from dashboard/onboarding | 2 files |
| 4 | Replace console with logger in actions | 6 files |
| 5 | Remove remaining console statements | 11 files |
| 6 | Add VAPID key validation | 1 file |
| 7 | Fix type safety in wizard | 1 file |
| 8 | Add auto-save error state | 3 files |
| 9 | Create support page | 4 files (new) |
| 10 | Add DB migration for experience | 1 file (new) |

**Total: 10 tasks, ~35 file changes**

---

*Generated from P0 Launch Blockers design on 2026-01-24*
