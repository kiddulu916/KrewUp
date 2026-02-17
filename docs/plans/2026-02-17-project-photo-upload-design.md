# Add Photo Upload to Add Projects Form

## Problem

Contractors and developers cannot upload project photos when creating a new project. The existing `ExperiencePhotoManager` only works on the edit page because it requires an `experience_id`. Users must save the project first, then navigate to edit to add photos.

## Decision

Stage photos locally during creation, upload after save.

## Constraints

- Contractors and developers only (same role check as edit page)
- Free users: 5 photos per project. Pro users: unlimited.
- Reuse existing infrastructure: `experience_photos` table, `experience-photos` storage bucket, `uploadExperiencePhoto` server action.

## Design

### New Component: `ExperiencePhotoStager`

**File:** `features/profiles/components/experience-photo-stager.tsx`

**Props:**

- `onPhotosChange(files: File[])` — passes staged (compressed) files to parent form
- `isPro: boolean` — controls photo limit

**Behavior:**

- Renders thumbnail grid with "+ Add Photo" tile
- File picker accepts `.jpg, .png, .webp`
- Client-side validation: type check, 5MB max size
- Compresses on select using `browser-image-compression` (1MB max, 1920px max)
- Shows spinner on thumbnail during compression
- "X" button removes photo from staging
- Shows remaining count for free users
- At limit: replaces "+ Add" with "Upgrade to Pro" text

**Does not include** (available on edit page):

- Drag-and-drop reordering
- Photo descriptions/captions
- Drag-and-drop file upload zone

### Modified: `ExperienceForm`

**File:** `features/profiles/components/experience-form.tsx`

**Changes:**

- New prop: `showPhotoUpload?: boolean`
- When true, renders `ExperiencePhotoStager` below the Project Details textarea
- Holds staged `File[]` in component state
- On submit:
  1. Save experience via existing action, get `experienceId`
  2. Upload staged photos sequentially via `uploadExperiencePhoto(formData, experienceId)`
  3. Navigate on completion

### Modified: Add Projects Page

**File:** `app/dashboard/profile/experience/page.tsx`

**Changes:**

- Pass `showPhotoUpload={true}` when user is contractor or developer (same role check as edit page)

### Save Sequence

```
User fills form + selects photos
         |
    Submit form
         |
    saveExperience(formData) -> { success, experienceId }
         |
    If success && stagedPhotos.length > 0:
        for each photo:
            compress -> FormData -> uploadExperiencePhoto(formData, experienceId)
         |
    Show results toast -> redirect
```

### Error Handling

- **Project save fails:** Show error, keep photos staged, stay on page.
- **Some photos fail:** "Project saved. 2 of 4 photos uploaded. Add the rest from the edit page."
- **All photos fail:** "Project saved but photos failed to upload. Try again from the edit page."

### Loading States

- During save: button shows "Saving project..."
- During uploads: button shows "Uploading photos (2/4)..."
- Form is disabled during the entire save+upload sequence

### UI Layout

```
┌─────────────────────────────────────────────┐
│  Project Photos                             │
│  Add photos of your work (max 5 for free)   │
│                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
│  │  thumb1  │ │  thumb2  │ │   + Add     │   │
│  │    X     │ │    X     │ │   Photo     │   │
│  └─────────┘ └─────────┘ └─────────────┘   │
│                                             │
│  3 photos remaining                         │
└─────────────────────────────────────────────┘
```

## Files Changed

| File                                                       | Action | Description                                              |
| ---------------------------------------------------------- | ------ | -------------------------------------------------------- |
| `features/profiles/components/experience-photo-stager.tsx` | New    | Staging component with thumbnails, picker, compression   |
| `features/profiles/components/experience-form.tsx`         | Modify | Add `showPhotoUpload` prop, render stager, update submit |
| `app/dashboard/profile/experience/page.tsx`                | Modify | Pass `showPhotoUpload` for contractors/developers        |

## Reused Infrastructure (No Changes)

- `experience_photos` database table
- `experience-photos` Supabase storage bucket
- `uploadExperiencePhoto` server action
- `browser-image-compression` library
- `lib/security/file-validation.ts`
- RLS policies
