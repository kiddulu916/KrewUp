# Profile Edit Page Expansion Design

## Overview

Expand the profile edit page (`/dashboard/profile/edit`) with:

1. Full-featured Basic Info tab with all profile fields
2. Experience section available to all user types (except homeowners)

---

## Basic Info Tab Layout

### Top Section (2-column layout)

**Left column:** Clickable avatar (120×120px)

- Click triggers file upload
- Hover shows camera icon overlay

**Right column:** Stacked form fields (varies by user type)

| Field         | Worker | Homeowner | Contractor/Developer/Recruiter |
| ------------- | ------ | --------- | ------------------------------ |
| Full Name     | ✅     | ✅        | ✅                             |
| Company Name  | ❌     | ❌        | ✅                             |
| Employer Type | ❌     | ❌        | ✅                             |
| Phone Number  | ✅     | ✅        | ✅                             |

### Middle Section (3-column grid, full width)

- Primary Trade (dropdown)
- Sub-Trade (conditional dropdown, enabled when trade selected)
- Location (Google Places autocomplete, displays human-readable address)

### Bottom Section (full width)

- Bio (textarea, max 500 chars)
- Tools Owned (checkbox grid) — **Workers only**

### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────┐   Full Name: [_______________]                │
│  │          │   Company Name: [___________] (contractor/    │
│  │  Avatar  │                               developer/      │
│  │  (click  │                               recruiter only) │
│  │   to     │   Employer Type: [dropdown___]                │
│  │  upload) │   Phone Number: [___________]                 │
│  └──────────┘                                               │
├─────────────────────────────────────────────────────────────┤
│  Primary Trade    │  Sub-Trade       │  Location            │
│  [dropdown____]   │  [dropdown____]  │  [autocomplete____]  │
├─────────────────────────────────────────────────────────────┤
│  Bio                                                        │
│  [________________________________________________]        │
│  [________________________________________________]        │
├─────────────────────────────────────────────────────────────┤
│  Tools Owned (workers only)                                 │
│  ☑ Hammer  ☑ Drill  ☐ Saw  ☐ Level  ...                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Experience Tab

### Tab Visibility

- **Homeowners:** Tab hidden entirely
- **All other user types:** Tab visible

### View Mode (profile view page)

```
┌─────────────────────────────────────────────────────────────┐
│  Experience                                         [Edit]  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Senior Electrician at ABC Electric                   │   │
│  │ Jan 2020 - Present                                   │   │
│  │ Led residential wiring projects...                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- "Edit" button navigates to `/dashboard/profile/edit` (Experience tab)

### Edit Mode (profile edit page)

```
┌─────────────────────────────────────────────────────────────┐
│  Experience                              [+ Add Experience] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Senior Electrician at ABC Electric    [Edit] [Delete]│   │
│  │ Jan 2020 - Present                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- "+ Add Experience" navigates to `/dashboard/profile/experience`
- Edit/Delete buttons visible only in edit mode

### Empty State

```
┌─────────────────────────────────────────────────────────────┐
│  Experience                              [+ Add Experience] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                   No experiences added yet                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Delete Flow

1. Click "Delete" → Confirmation modal ("Delete this experience?")
2. Confirm → Entry visually marked as "pending delete" (grayed out, strikethrough)
3. "Undo" button appears on that entry
4. Click "Undo" → Entry restored to normal
5. Click "Save Changes" on profile → Pending deletes become permanent

---

## Dynamic Experience Field Labels

### Field Mapping by User Type

| User Type  | Label 1      | → DB Column | Label 2 | → DB Column |
| ---------- | ------------ | ----------- | ------- | ----------- |
| Worker     | Job Title    | `job_title` | Company | `company`   |
| Contractor | Project Name | `job_title` | Client  | `company`   |
| Developer  | Project Name | `job_title` | Company | `company`   |
| Recruiter  | Role         | `job_title` | Agency  | `company`   |

### Full Label Configuration

```typescript
const EXPERIENCE_FIELD_LABELS = {
  worker: {
    jobTitle: "Job Title",
    company: "Company",
    description: "Description",
    isCurrent: "I currently work here",
  },
  contractor: {
    jobTitle: "Project Name",
    company: "Client",
    description: "Project Details",
    isCurrent: "Ongoing project",
  },
  developer: {
    jobTitle: "Project Name",
    company: "Company",
    description: "Project Details",
    isCurrent: "Ongoing project",
  },
  recruiter: {
    jobTitle: "Role",
    company: "Agency",
    description: "Specialization",
    isCurrent: "I currently work here",
  },
};
```

**No database schema changes required** — all user types reuse existing `job_title` and `company` columns.

---

## Implementation Files

### Files to Modify

| File                                                | Changes                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `features/profile/components/profile-edit-tabs.tsx` | Update Basic Info tab layout, add conditional field visibility                           |
| `features/profile/components/profile-edit-form.tsx` | Add new fields (name, phone, bio, trade, location, employer fields) with grid layout     |
| `features/profiles/components/experience-form.tsx`  | Accept `userType` prop, use dynamic labels                                               |
| `features/profiles/components/experience-item.tsx`  | Add edit/delete buttons (visible in edit mode), pending delete state, undo functionality |
| `app/dashboard/profile/experience/page.tsx`         | Remove worker-only restriction, pass user type to form                                   |
| `features/profiles/actions/experience-actions.ts`   | Remove role check from `addExperience`, allow all non-homeowner types                    |

### New Files

| File                                               | Purpose                                  |
| -------------------------------------------------- | ---------------------------------------- |
| `features/profiles/constants/experience-labels.ts` | Dynamic label configuration by user type |
| `app/dashboard/profile/experience/[id]/page.tsx`   | Edit experience page (new route)         |

### Components to Reuse

- `ProfileAvatarUpload` — clickable avatar with upload
- `LocationAutocomplete` — Google Places autocomplete
- `ToolsSelector` — tool checkbox grid (workers only)

### State Management

- Pending deletes tracked in local component state
- On "Save Changes", batch delete API call for pending items
- "Undo" restores item from pending delete list
