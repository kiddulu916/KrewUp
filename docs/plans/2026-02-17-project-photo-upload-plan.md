# Project Photo Upload Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a photo staging component to the "Add Projects" form so contractors/developers can select photos during creation, which upload after the project saves.

**Architecture:** New `ExperiencePhotoStager` client component stages compressed files locally. On form submit, `ExperienceForm` first saves the experience via `addExperience`, then uploads each staged photo via the existing `uploadExperiencePhoto` server action using the returned experience ID.

**Tech Stack:** React, browser-image-compression, Next.js server actions, Supabase Storage

---

### Task 1: Create ExperiencePhotoStager Component

**Files:**

- Create: `features/profiles/components/experience-photo-stager.tsx`

**Step 1: Create the component file**

```tsx
"use client";

import { useState, useRef, useCallback } from "react";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useToast } from "@/components/providers/toast-provider";

type StagedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  isCompressing: boolean;
};

type ExperiencePhotoStagerProps = {
  onPhotosChange: (files: File[]) => void;
  isPro: boolean;
  disabled?: boolean;
};

const MAX_FREE_PHOTOS = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ExperiencePhotoStager({
  onPhotosChange,
  isPro,
  disabled,
}: ExperiencePhotoStagerProps) {
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const maxPhotos = isPro ? Infinity : MAX_FREE_PHOTOS;
  const canAddMore = stagedPhotos.length < maxPhotos && !disabled;
  const remaining = isPro ? null : MAX_FREE_PHOTOS - stagedPhotos.length;

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Please upload JPEG, PNG, or WebP images only");
        return;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size must be under 5MB");
        return;
      }

      // Check limit
      if (!isPro && stagedPhotos.length >= MAX_FREE_PHOTOS) {
        toast.warning(
          "Free users can upload maximum 5 photos per project. Upgrade to Pro for unlimited.",
        );
        return;
      }

      const tempId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      // Add with compressing state
      const newPhoto: StagedPhoto = {
        id: tempId,
        file,
        previewUrl,
        isCompressing: true,
      };
      setStagedPhotos((prev) => {
        const updated = [...prev, newPhoto];
        return updated;
      });

      try {
        // Compress image
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });

        // Update with compressed file
        setStagedPhotos((prev) => {
          const updated = prev.map((p) =>
            p.id === tempId
              ? { ...p, file: compressedFile, isCompressing: false }
              : p,
          );
          onPhotosChange(
            updated.filter((p) => !p.isCompressing).map((p) => p.file),
          );
          return updated;
        });
      } catch {
        // Remove failed photo
        setStagedPhotos((prev) => {
          const updated = prev.filter((p) => p.id !== tempId);
          onPhotosChange(
            updated.filter((p) => !p.isCompressing).map((p) => p.file),
          );
          return updated;
        });
        URL.revokeObjectURL(previewUrl);
        toast.error("Failed to compress image");
      }
    },
    [isPro, stagedPhotos.length, onPhotosChange, toast],
  );

  const handleRemove = useCallback(
    (photoId: string) => {
      setStagedPhotos((prev) => {
        const photo = prev.find((p) => p.id === photoId);
        if (photo) URL.revokeObjectURL(photo.previewUrl);
        const updated = prev.filter((p) => p.id !== photoId);
        onPhotosChange(
          updated.filter((p) => !p.isCompressing).map((p) => p.file),
        );
        return updated;
      });
    },
    [onPhotosChange],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Photos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          {isPro
            ? "Add photos to showcase this project"
            : `Add photos of your work (max ${MAX_FREE_PHOTOS} for free)`}
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {stagedPhotos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt="Staged project photo"
                className="w-full h-full object-cover"
              />

              {photo.isCompressing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="h-6 w-6 motion-safe:animate-spin motion-reduce:animate-none rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}

              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(photo.id)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700 transition-colors shadow-md"
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Add Photo tile */}
          {canAddMore && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-krewup-blue hover:text-krewup-blue transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              <span className="text-xs font-medium">Add Photo</span>
            </button>
          )}

          {!canAddMore && !isPro && stagedPhotos.length >= MAX_FREE_PHOTOS && (
            <div className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-2 text-center">
              <a
                href="/pricing"
                className="text-xs text-krewup-blue hover:underline font-medium"
              >
                Upgrade to Pro for unlimited photos
              </a>
            </div>
          )}
        </div>

        {remaining !== null && remaining > 0 && stagedPhotos.length > 0 && (
          <p className="text-xs text-gray-500">
            {remaining} photo{remaining !== 1 ? "s" : ""} remaining
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Select project photo"
        />
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep experience-photo-stager || echo "No errors"`
Expected: No errors for this file

**Step 3: Commit**

```bash
git add features/profiles/components/experience-photo-stager.tsx
git commit -m "feat: add ExperiencePhotoStager component for staging photos during project creation"
```

---

### Task 2: Update ExperienceForm to Support Photo Staging and Upload

**Files:**

- Modify: `features/profiles/components/experience-form.tsx`

**Context:** The form already has `showPhotoUpload` and `profile` props. Currently it only renders `ExperiencePhotoManager` when editing (`existingExperience` exists). We need to also render `ExperiencePhotoStager` when creating (no `existingExperience`), and update the submit handler to upload staged photos after saving.

**Step 1: Add staged photos state and import**

At the top of `experience-form.tsx`, add the import for the new component and `uploadExperiencePhoto`:

```tsx
// Add these imports (alongside existing ones)
import { ExperiencePhotoStager } from "./experience-photo-stager";
import { uploadExperiencePhoto } from "../actions/experience-photo-actions";
import { hasProAccess } from "@/lib/utils/subscription";
```

Add state for staged photos and upload progress inside the component function, after the existing `useState` for `error`:

```tsx
const [stagedPhotos, setStagedPhotos] = useState<File[]>([]);
const [uploadProgress, setUploadProgress] = useState<string | null>(null);
```

**Step 2: Update the `onSubmit` handler**

Replace the current `onSubmit` function body. The key change: after a successful `addExperience`, if there are staged photos, upload them sequentially using the new experience ID.

```tsx
const onSubmit = async (data: ExperienceSchema) => {
  setError(null);
  setUploadProgress(null);

  try {
    const payload = {
      job_title: data.job_title,
      company: data.company_name,
      start_date: data.start_date,
      end_date: data.is_current ? null : data.end_date,
      is_current: data.is_current,
      description: data.description || undefined,
    };

    const result = isEditing
      ? await updateExperience(existingExperience.id, payload)
      : await addExperience(payload);

    if (!result.success) {
      const errorMsg =
        result.error ||
        `Failed to ${isEditing ? "update" : "add"} work experience`;
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Upload staged photos for new experiences
    if (!isEditing && stagedPhotos.length > 0 && result.data) {
      const experienceId = result.data.id;
      let uploaded = 0;
      let failed = 0;

      for (let i = 0; i < stagedPhotos.length; i++) {
        setUploadProgress(
          `Uploading photos (${i + 1}/${stagedPhotos.length})...`,
        );
        const formData = new FormData();
        formData.append("file", stagedPhotos[i]);

        const uploadResult = await uploadExperiencePhoto(
          formData,
          experienceId,
        );
        if (uploadResult.success) {
          uploaded++;
        } else {
          failed++;
        }
      }

      setUploadProgress(null);

      if (failed > 0 && uploaded > 0) {
        toast.warning(
          `${fieldLabels.tabTitle} added. ${uploaded} of ${stagedPhotos.length} photos uploaded. Add the rest from the edit page.`,
        );
      } else if (failed > 0 && uploaded === 0) {
        toast.warning(
          `${fieldLabels.tabTitle} added but photos failed to upload. Try again from the edit page.`,
        );
      } else {
        toast.success(
          `${fieldLabels.tabTitle} added with ${uploaded} photo${uploaded !== 1 ? "s" : ""} successfully!`,
        );
      }
    } else {
      toast.success(
        `${fieldLabels.tabTitle} ${isEditing ? "updated" : "added"} successfully!`,
      );
    }

    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/dashboard/profile?tab=experience");
      router.refresh();
    }
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : `Failed to ${isEditing ? "update" : "add"} work experience`;
    setError(errorMsg);
    toast.error(errorMsg);
    setUploadProgress(null);
  }
};
```

**Step 3: Add ExperiencePhotoStager to the JSX**

In the return JSX, update the photo upload section. The existing block at line 187-200 handles the edit case. Add a new block right after it for the create case:

Replace this block (lines 187-200):

```tsx
{
  /* Project Photos - Only shown for employers when editing existing experience */
}
{
  showPhotoUpload && existingExperience && profile && (
    <Card>
      <CardHeader>
        <CardTitle>Project Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <ExperiencePhotoManager
          experienceId={existingExperience.id}
          profile={profile}
        />
      </CardContent>
    </Card>
  );
}
```

With:

```tsx
{
  /* Project Photos - Edit mode: use ExperiencePhotoManager (server upload) */
}
{
  showPhotoUpload && existingExperience && profile && (
    <Card>
      <CardHeader>
        <CardTitle>Project Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <ExperiencePhotoManager
          experienceId={existingExperience.id}
          profile={profile}
        />
      </CardContent>
    </Card>
  );
}

{
  /* Project Photos - Create mode: use ExperiencePhotoStager (local staging) */
}
{
  showPhotoUpload && !existingExperience && profile && (
    <ExperiencePhotoStager
      onPhotosChange={setStagedPhotos}
      isPro={hasProAccess(profile)}
      disabled={isSubmitting}
    />
  );
}
```

**Step 4: Update the submit button text to show upload progress**

Replace the Button text section (lines 222-226):

```tsx
{
  isSubmitting
    ? uploadProgress || (isEditing ? "Updating..." : "Adding...")
    : (isEditing ? "Update" : "Add") + " " + fieldLabels.tabTitle;
}
```

**Step 5: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep experience-form || echo "No errors"`
Expected: No errors for this file

**Step 6: Commit**

```bash
git add features/profiles/components/experience-form.tsx
git commit -m "feat: integrate photo staging into ExperienceForm create flow"
```

---

### Task 3: Update Add Projects Page to Pass Props

**Files:**

- Modify: `app/dashboard/profile/experience/page.tsx`

**Context:** The add page currently doesn't pass `showPhotoUpload` or `profile` to `ExperienceForm`. It only fetches `role` and `employer_type`. We need to expand the query to include subscription fields and pass the full profile.

**Step 1: Expand the Supabase query and add role check**

In `app/dashboard/profile/experience/page.tsx`, replace the profile query (lines 28-33):

```tsx
const { data: profile, error } = await supabase
  .from("users")
  .select(
    "id, first_name, last_name, email, role, employer_type, subscription_status, is_lifetime_pro, is_admin, location, created_at, updated_at",
  )
  .eq("id", user.id)
  .single();
```

**Step 2: Add the role check and pass props to ExperienceForm**

After the labels assignment (line 39), add:

```tsx
const isContractorOrDeveloper =
  profile.role === "employer" &&
  (profile.employer_type === "contractor" ||
    profile.employer_type === "developer");
const showPhotoUpload = isContractorOrDeveloper;
```

Update the `ExperienceForm` render (line 64) to pass the new props:

```tsx
<ExperienceForm
  labels={labels ?? undefined}
  profile={profile}
  showPhotoUpload={showPhotoUpload}
/>
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "experience/page" || echo "No errors"`
Expected: No errors

**Step 4: Commit**

```bash
git add app/dashboard/profile/experience/page.tsx
git commit -m "feat: pass photo upload props to ExperienceForm on add page"
```

---

### Task 4: Manual Verification

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test as a contractor/developer user**

1. Log in as a contractor or developer
2. Navigate to `/dashboard/profile/experience` (Add Projects)
3. Verify the "Project Photos" section appears below "Project Details"
4. Select 1-2 photos, verify thumbnails appear with compression spinner
5. Remove a photo with the X button
6. Fill in the form fields and submit
7. Verify the project saves and photos upload (check toast messages)
8. Navigate to the edit page and verify photos appear in `ExperiencePhotoManager`

**Step 3: Test as a worker**

1. Log in as a worker
2. Navigate to `/dashboard/profile/experience`
3. Verify the "Project Photos" section does NOT appear

**Step 4: Test free user limit**

1. As a free contractor, try adding 6 photos
2. Verify only 5 are accepted, with a warning toast on the 6th attempt

**Step 5: Run build and lint**

Run: `npm run build`
Expected: Build succeeds

Run: `npm run lint`
Expected: No warnings

Run: `npm run type-check`
Expected: No errors

**Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address review feedback for photo upload feature"
```
