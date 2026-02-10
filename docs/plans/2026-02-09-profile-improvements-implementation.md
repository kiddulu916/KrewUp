# Profile Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement role-based profile views, email editing with verification, and photo upload visibility rules.

**Architecture:** Database views for consistent role-based reads, service layer for writes, unsaved changes hook for form protection, conditional photo rendering based on user type and context.

**Tech Stack:** PostgreSQL views, Supabase Auth, React Hook Form, AlertDialog (shadcn/ui), TypeScript

---

## Task 1: Database Profile Views Migration

**Files:**

- Create: `supabase/migrations/20260210000001_profile_views.sql`

**Step 1: Create the migration file**

```sql
-- Profile Views for Role-Based Data Access
-- These views automatically join users with their role-specific tables

-- 1. Worker Profile View
CREATE OR REPLACE VIEW worker_profiles AS
SELECT
  u.id, u.first_name, u.last_name, u.email, u.phone,
  u.role, u.employer_type, u.location, u.geo_coords,
  u.bio, u.profile_image_url, u.subscription_status,
  u.is_admin, u.is_lifetime_pro, u.created_at, u.updated_at,
  w.trade, w.sub_trade, w.years_of_experience, w.hourly_rate,
  w.union_status, w.trade_skills, w.has_tools, w.tools_owned,
  w.has_certifications, w.has_portfolio,
  w.has_dl, w.dl_class, w.reliable_transportation, w.authorized_to_work,
  w.emergency_contact_name, w.emergency_contact_phone, w.emergency_contact_relationship
FROM users u
JOIN workers w ON w.user_id = u.id
WHERE u.role = 'worker';

-- 2. Contractor Profile View
CREATE OR REPLACE VIEW contractor_profiles AS
SELECT
  u.id, u.first_name, u.last_name, u.email, u.phone,
  u.role, u.employer_type, u.location, u.geo_coords,
  u.bio, u.profile_image_url, u.subscription_status,
  u.is_admin, u.is_lifetime_pro, u.created_at, u.updated_at,
  c.company_name, c.website, c.has_cl
FROM users u
JOIN contractors c ON c.user_id = u.id
WHERE u.role = 'employer' AND u.employer_type = 'contractor';

-- 3. Developer Profile View
CREATE OR REPLACE VIEW developer_profiles AS
SELECT
  u.id, u.first_name, u.last_name, u.email, u.phone,
  u.role, u.employer_type, u.location, u.geo_coords,
  u.bio, u.profile_image_url, u.subscription_status,
  u.is_admin, u.is_lifetime_pro, u.created_at, u.updated_at,
  d.company_name, d.website
FROM users u
JOIN developers d ON d.user_id = u.id
WHERE u.role = 'employer' AND u.employer_type = 'developer';

-- 4. Recruiter Profile View
CREATE OR REPLACE VIEW recruiter_profiles AS
SELECT
  u.id, u.first_name, u.last_name, u.email, u.phone,
  u.role, u.employer_type, u.location, u.geo_coords,
  u.bio, u.profile_image_url, u.subscription_status,
  u.is_admin, u.is_lifetime_pro, u.created_at, u.updated_at,
  r.company_name, r.agency_website
FROM users u
JOIN recruiters r ON r.user_id = u.id
WHERE u.role = 'employer' AND u.employer_type = 'recruiter';

-- 5. Homeowner Profile View
CREATE OR REPLACE VIEW homeowner_profiles AS
SELECT
  u.id, u.first_name, u.last_name, u.email, u.phone,
  u.role, u.employer_type, u.location, u.geo_coords,
  u.bio, u.profile_image_url, u.subscription_status,
  u.is_admin, u.is_lifetime_pro, u.created_at, u.updated_at,
  h.project_description
FROM users u
JOIN homeowners h ON h.user_id = u.id
WHERE u.role = 'employer' AND u.employer_type = 'homeowner';

-- Grant access to authenticated users (views inherit RLS from base tables)
GRANT SELECT ON worker_profiles TO authenticated;
GRANT SELECT ON contractor_profiles TO authenticated;
GRANT SELECT ON developer_profiles TO authenticated;
GRANT SELECT ON recruiter_profiles TO authenticated;
GRANT SELECT ON homeowner_profiles TO authenticated;
```

**Step 2: Verify migration syntax locally**

Run: `npx supabase db diff` (if local Supabase is running)
Expected: No syntax errors

**Step 3: Commit**

```bash
git add supabase/migrations/20260210000001_profile_views.sql
git commit -m "feat(db): add profile views for role-based data access"
```

---

## Task 2: Profile Service Layer

**Files:**

- Create: `features/profiles/services/profile-service.ts`
- Modify: `features/profiles/types/index.ts`

**Step 1: Add profile view types**

In `features/profiles/types/index.ts`, add at the end:

```typescript
// Profile view types
export type ProfileViewName =
  | "worker_profiles"
  | "contractor_profiles"
  | "developer_profiles"
  | "recruiter_profiles"
  | "homeowner_profiles";

export type WorkerProfile = User & {
  trade: string | null;
  sub_trade: string | null;
  years_of_experience: number | null;
  hourly_rate: number | null;
  union_status: string | null;
  trade_skills: string[] | null;
  has_tools: boolean;
  tools_owned: string[] | null;
  has_certifications: boolean;
  has_portfolio: boolean;
  has_dl: boolean;
  dl_class: string | null;
  reliable_transportation: boolean;
  authorized_to_work: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
};

export type ContractorProfile = User & {
  company_name: string | null;
  website: string | null;
  has_cl: boolean;
};

export type DeveloperProfile = User & {
  company_name: string | null;
  website: string | null;
};

export type RecruiterProfile = User & {
  company_name: string | null;
  agency_website: string | null;
};

export type HomeownerProfile = User & {
  project_description: string | null;
};

export type FullProfile =
  | WorkerProfile
  | ContractorProfile
  | DeveloperProfile
  | RecruiterProfile
  | HomeownerProfile;
```

**Step 2: Create profile service**

Create `features/profiles/services/profile-service.ts`:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProfileViewName, FullProfile } from "../types";

function getProfileViewName(
  role: string,
  employerType?: string | null,
): ProfileViewName {
  if (role === "worker") return "worker_profiles";

  switch (employerType) {
    case "contractor":
      return "contractor_profiles";
    case "developer":
      return "developer_profiles";
    case "recruiter":
      return "recruiter_profiles";
    case "homeowner":
      return "homeowner_profiles";
    default:
      throw new Error(`Unknown employer type: ${employerType}`);
  }
}

export async function getFullProfile(
  userId: string,
): Promise<{ data: FullProfile | null; error: Error | null }> {
  const supabase = await createClient();

  // First get basic user to determine role
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("role, employer_type")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return { data: null, error: userError };
  }

  const viewName = getProfileViewName(user.role, user.employer_type);

  const { data, error } = await supabase
    .from(viewName)
    .select("*")
    .eq("id", userId)
    .single();

  return { data: data as FullProfile | null, error };
}

export async function getProfileByRole(
  userId: string,
  role: string,
  employerType?: string | null,
): Promise<{ data: FullProfile | null; error: Error | null }> {
  const supabase = await createClient();
  const viewName = getProfileViewName(role, employerType);

  const { data, error } = await supabase
    .from(viewName)
    .select("*")
    .eq("id", userId)
    .single();

  return { data: data as FullProfile | null, error };
}
```

**Step 3: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add features/profiles/types/index.ts features/profiles/services/profile-service.ts
git commit -m "feat(profiles): add profile service layer for role-based data access"
```

---

## Task 3: Unsaved Changes Hook

**Files:**

- Create: `hooks/use-unsaved-changes.ts`

**Step 1: Create the hook**

```typescript
"use client";

import { useState, useEffect, useCallback, type RefObject } from "react";

type FormValue = FormDataEntryValue | null;

export function useUnsavedChanges(formRef: RefObject<HTMLFormElement | null>) {
  const [isDirty, setIsDirty] = useState(false);
  const [originalValues, setOriginalValues] = useState<
    Record<string, FormValue>
  >({});

  // Capture initial form values
  const captureOriginalValues = useCallback(() => {
    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    const values: Record<string, FormValue> = {};
    formData.forEach((value, key) => {
      values[key] = value;
    });
    setOriginalValues(values);
    setIsDirty(false);
  }, [formRef]);

  // Capture on mount
  useEffect(() => {
    captureOriginalValues();
  }, [captureOriginalValues]);

  // Check if form is dirty
  const checkDirty = useCallback(() => {
    const form = formRef.current;
    if (!form) return false;

    const formData = new FormData(form);
    let dirty = false;

    formData.forEach((value, key) => {
      if (String(value) !== String(originalValues[key] ?? "")) {
        dirty = true;
      }
    });

    setIsDirty(dirty);
    return dirty;
  }, [formRef, originalValues]);

  // Reset dirty state (call after successful save)
  const resetDirty = useCallback(() => {
    captureOriginalValues();
  }, [captureOriginalValues]);

  // Mark as dirty manually (for non-form changes like photo uploads)
  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  return {
    isDirty,
    checkDirty,
    resetDirty,
    markDirty,
    captureOriginalValues,
  };
}
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add hooks/use-unsaved-changes.ts
git commit -m "feat(hooks): add useUnsavedChanges hook for form dirty state tracking"
```

---

## Task 4: Unsaved Changes Dialog Component

**Files:**

- Create: `components/ui/unsaved-changes-dialog.tsx`

**Step 1: Create the dialog component**

```typescript
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UnsavedChangesDialogProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Save your changes before switching tabs,
            or your changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay}>Stay</AlertDialogCancel>
          <AlertDialogAction onClick={onLeave}>Switch Tabs</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit**

```bash
git add components/ui/unsaved-changes-dialog.tsx
git commit -m "feat(ui): add UnsavedChangesDialog component"
```

---

## Task 5: Add Email Field to Profile Edit Form

**Files:**

- Modify: `features/profile/components/profile-edit-form.tsx`

**Step 1: Read current file structure**

Read: `features/profile/components/profile-edit-form.tsx`
Note the current form fields and schema location.

**Step 2: Add email field to form schema**

In the schema file (likely `features/profile/utils/validation.ts` or inline), add:

```typescript
email: z.string().email('Invalid email address'),
```

**Step 3: Add email field to the form JSX**

After the name fields, add:

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    {...register("email")}
    defaultValue={profile.email}
  />
  {errors.email && (
    <p className="text-sm text-destructive">{errors.email.message}</p>
  )}
</div>
```

**Step 4: Update form submission to handle email change**

In the submit handler, add email change detection:

```typescript
const onSubmit = async (data: FormData) => {
  const emailChanged = data.email !== profile.email;

  if (emailChanged) {
    // Trigger Supabase Auth email verification
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.updateUser({
      email: data.email,
    });

    if (error) {
      toast.error("Failed to update email: " + error.message);
      return;
    }

    toast.info("Verification email sent to " + data.email);
  }

  // Update other profile fields (email stays unchanged until verified)
  const { email, ...profileData } = data;
  await updateProfile(profile.id, profileData);

  toast.success("Profile updated successfully");
};
```

**Step 5: Run type check and lint**

Run: `npm run type-check && npm run lint`
Expected: No errors

**Step 6: Commit**

```bash
git add features/profile/components/profile-edit-form.tsx
git commit -m "feat(profile): add editable email field with verification flow"
```

---

## Task 6: Add Unsaved Changes Guard to Profile Edit Tabs

**Files:**

- Modify: `features/profile/components/profile-edit-tabs.tsx`

**Step 1: Read current file**

Read: `features/profile/components/profile-edit-tabs.tsx`
Note the tab switching mechanism.

**Step 2: Import dependencies**

Add imports at the top:

```typescript
import { useRef, useState } from "react";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
```

**Step 3: Add state and refs**

Inside the component, add:

```typescript
const formRef = useRef<HTMLFormElement>(null);
const { isDirty, checkDirty, resetDirty } = useUnsavedChanges(formRef);
const [pendingTab, setPendingTab] = useState<string | null>(null);
const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
```

**Step 4: Create guarded tab change handler**

Replace or wrap the existing tab change logic:

```typescript
const handleTabChange = (newTab: string) => {
  if (isDirty) {
    setPendingTab(newTab);
    setShowUnsavedDialog(true);
  } else {
    // Original tab change logic
    router.push(`?tab=${newTab}`);
  }
};

const handleStay = () => {
  setShowUnsavedDialog(false);
  setPendingTab(null);
};

const handleLeave = () => {
  setShowUnsavedDialog(false);
  resetDirty();
  if (pendingTab) {
    router.push(`?tab=${pendingTab}`);
  }
  setPendingTab(null);
};
```

**Step 5: Add dialog to JSX**

Add before the closing tag:

```tsx
<UnsavedChangesDialog
  open={showUnsavedDialog}
  onStay={handleStay}
  onLeave={handleLeave}
/>
```

**Step 6: Pass formRef to form component**

Update the form component to accept and use `formRef`:

```tsx
<ProfileEditForm
  ref={formRef}
  profile={profile}
  onFieldChange={checkDirty}
  onSaveSuccess={resetDirty}
/>
```

**Step 7: Run type check and lint**

Run: `npm run type-check && npm run lint`
Expected: No errors

**Step 8: Commit**

```bash
git add features/profile/components/profile-edit-tabs.tsx
git commit -m "feat(profile): add unsaved changes guard on tab switch"
```

---

## Task 7: Add showPhotos Prop to ExperienceItem

**Files:**

- Modify: `features/profiles/components/experience-item.tsx`

**Step 1: Read current file**

Read: `features/profiles/components/experience-item.tsx`
Note current props interface and photo rendering.

**Step 2: Update props interface**

```typescript
interface ExperienceItemProps {
  experience: WorkExperience;
  photos?: ExperiencePhoto[];
  showPhotos?: boolean; // NEW
  isOwner?: boolean;
  onDelete?: (id: string) => void;
  // ... other existing props
}
```

**Step 3: Update component to use showPhotos**

Change the photo gallery rendering to:

```tsx
{
  showPhotos && photos && photos.length > 0 && (
    <ExperiencePhotoGallery photos={photos} />
  );
}
```

**Step 4: Run type check**

Run: `npm run type-check`
Expected: No errors (but may have errors in files using ExperienceItem - will fix in next task)

**Step 5: Commit**

```bash
git add features/profiles/components/experience-item.tsx
git commit -m "feat(profiles): add showPhotos prop to ExperienceItem"
```

---

## Task 8: Update Profile View Tabs for Conditional Photo Display

**Files:**

- Modify: `features/profiles/components/profile-view-tabs.tsx`

**Step 1: Read current file**

Read: `features/profiles/components/profile-view-tabs.tsx`
Note how ExperienceItem is rendered.

**Step 2: Identify Experience/Projects tab rendering**

Find where experiences are rendered and note the tab type (experience vs projects).

**Step 3: Add conditional showPhotos logic**

When rendering experiences, pass showPhotos based on context:

```tsx
// For Experience tab (workers, recruiters) - NO photos
{
  experiences.map((exp) => (
    <ExperienceItem
      key={exp.id}
      experience={exp}
      photos={experiencePhotosMap[exp.id]}
      showPhotos={false} // Experience tab never shows photos
      isOwner={isOwner}
    />
  ));
}

// For Projects tab (contractors, developers) - YES photos
{
  experiences.map((exp) => (
    <ExperienceItem
      key={exp.id}
      experience={exp}
      photos={experiencePhotosMap[exp.id]}
      showPhotos={true} // Projects tab shows photos
      isOwner={isOwner}
    />
  ));
}
```

**Step 4: Ensure proper tab differentiation**

Use experience labels or employer_type to determine which rendering to use:

```typescript
const isProjectsTab =
  profile.employer_type === "contractor" ||
  profile.employer_type === "developer";
```

**Step 5: Run type check and lint**

Run: `npm run type-check && npm run lint`
Expected: No errors

**Step 6: Commit**

```bash
git add features/profiles/components/profile-view-tabs.tsx
git commit -m "feat(profiles): conditional photo display in view tabs"
```

---

## Task 9: Remove Photo Upload from Experience Tab (Edit Mode)

**Files:**

- Modify: `features/profiles/components/experience-list.tsx` (if photo upload is here)
- Modify: `features/profile/components/profile-edit-tabs.tsx` (if photo upload is here)

**Step 1: Find where ExperiencePhotoManager is rendered in edit context**

Search for `ExperiencePhotoManager` usage in the edit flow.

**Step 2: Remove or conditionally hide photo upload**

For workers in Experience tab (edit mode), ensure ExperiencePhotoManager is NOT rendered:

```tsx
// In experience edit context for workers/recruiters
// DO NOT render ExperiencePhotoManager
```

**Step 3: Keep photo upload ONLY in:**

- Workers: Portfolio tab (edit mode) - via PortfolioManager
- Contractors/Developers: Add/Edit Project form - via ExperiencePhotoManager

**Step 4: Run type check and lint**

Run: `npm run type-check && npm run lint`
Expected: No errors

**Step 5: Commit**

```bash
git add <modified-files>
git commit -m "fix(profiles): remove photo upload from experience edit tab"
```

---

## Task 10: Ensure Photo Upload in Add/Edit Project Form (Contractors/Developers)

**Files:**

- Modify: `app/dashboard/profile/experience/page.tsx` (add experience)
- Modify: `app/dashboard/profile/experience/[id]/page.tsx` (edit experience)

**Step 1: Read the add experience page**

Read: `app/dashboard/profile/experience/page.tsx`

**Step 2: Check the edit experience page**

Read: `app/dashboard/profile/experience/[id]/page.tsx`
Note current `showPhotoUpload` prop logic.

**Step 3: Update showPhotoUpload logic**

Ensure photo upload is shown ONLY for contractors and developers:

```typescript
const showPhotoUpload =
  profile.employer_type === "contractor" ||
  profile.employer_type === "developer";
```

Pass this to the ExperienceForm:

```tsx
<ExperienceForm
  experience={experience}
  profile={profile}
  showPhotoUpload={showPhotoUpload}
/>
```

**Step 4: For ADD flow, photos should NOT be available**

In the add page, `showPhotoUpload` should be false since there's no experience_id yet:

```tsx
<ExperienceForm
  profile={profile}
  showPhotoUpload={false} // Can't upload photos until experience is created
/>
```

OR render ExperiencePhotoManager only after experience is created (redirect to edit page).

**Step 5: Run type check and lint**

Run: `npm run type-check && npm run lint`
Expected: No errors

**Step 6: Commit**

```bash
git add app/dashboard/profile/experience/page.tsx app/dashboard/profile/experience/[id]/page.tsx
git commit -m "feat(projects): ensure photo upload only in contractor/developer project forms"
```

---

## Task 11: Final Integration Test

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Run linter**

Run: `npm run lint`
Expected: No warnings

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 5: Manual testing checklist**

Test each user type in the browser:

| User Type  | Test                                                  | Expected                         |
| ---------- | ----------------------------------------------------- | -------------------------------- |
| Worker     | Edit profile → change email → save                    | Verification email sent          |
| Worker     | Edit profile → change field → switch tab without save | Unsaved changes dialog appears   |
| Worker     | View profile → Experience tab                         | No photos shown                  |
| Worker     | View profile → Portfolio tab                          | Portfolio photos shown           |
| Worker     | Edit profile → Portfolio tab                          | Photo upload available           |
| Worker     | Edit profile → Experience tab                         | NO photo upload                  |
| Contractor | View profile → Projects tab                           | Project photos shown per project |
| Contractor | Edit profile → Add project                            | Photo upload available in form   |
| Developer  | Same as Contractor                                    | Same behavior                    |
| Recruiter  | Edit profile → Experience tab                         | NO photo upload                  |
| Homeowner  | Edit profile                                          | No experience/projects tab       |

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat(profile): complete profile improvements implementation

- Add database views for role-based profile access
- Add profile service layer
- Add email editing with Supabase Auth verification
- Add unsaved changes guard on tab switch
- Implement photo visibility rules by user type and context"
```

---

## Files Summary

### New Files Created

| File                                                   | Purpose                              |
| ------------------------------------------------------ | ------------------------------------ |
| `supabase/migrations/20260210000001_profile_views.sql` | Database views for 5 profile types   |
| `features/profiles/services/profile-service.ts`        | Service layer for profile operations |
| `hooks/use-unsaved-changes.ts`                         | Form dirty state tracking            |
| `components/ui/unsaved-changes-dialog.tsx`             | Confirmation dialog component        |

### Files Modified

| File                                                 | Changes                   |
| ---------------------------------------------------- | ------------------------- |
| `features/profiles/types/index.ts`                   | Add profile view types    |
| `features/profile/components/profile-edit-form.tsx`  | Add email field           |
| `features/profile/components/profile-edit-tabs.tsx`  | Add unsaved changes guard |
| `features/profiles/components/experience-item.tsx`   | Add showPhotos prop       |
| `features/profiles/components/profile-view-tabs.tsx` | Conditional photo display |
| `app/dashboard/profile/experience/page.tsx`          | Photo upload logic        |
| `app/dashboard/profile/experience/[id]/page.tsx`     | Photo upload logic        |

---

## Execution Notes

- Tasks 1-4 are foundational and can be done in sequence
- Tasks 5-6 handle email and unsaved changes (can be parallelized)
- Tasks 7-10 handle photo visibility (sequential, builds on each other)
- Task 11 is final verification

**Estimated commits:** 11 (one per task)
