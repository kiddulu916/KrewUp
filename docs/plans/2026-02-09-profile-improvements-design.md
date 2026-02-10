# Profile Improvements Design

**Date:** 2026-02-09
**Status:** Ready for implementation

## Overview

Three related improvements to the profile system:

1. **Role-based data layer** - Consistent handling of role-specific table joins
2. **Email editing with verification** - Editable email field with Supabase Auth verification flow
3. **Photo upload visibility** - Strict rules for when upload components and photos are displayed

---

## Issue 1: Role-Based Data Layer

### Problem

Inconsistent handling of role-specific table joins across the codebase. The `users` table has `role` (worker/employer) and `employer_type` (contractor/developer/recruiter/homeowner), with separate tables for each type.

### Solution

**Database views for reads** + **Service layer for writes**

### Database Migration

Create `supabase/migrations/20260210000001_profile_views.sql`:

```sql
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
```

**RLS:** Views rely on underlying table policies (no additional RLS needed).

### Service Layer

Create `features/profiles/services/profile-service.ts`:

```typescript
type ProfileViewName =
  | "worker_profiles"
  | "contractor_profiles"
  | "developer_profiles"
  | "recruiter_profiles"
  | "homeowner_profiles";

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

export async function getFullProfile(userId: string) {
  const supabase = await createClient();

  // First get basic user to determine role
  const { data: user } = await supabase
    .from("users")
    .select("role, employer_type")
    .eq("id", userId)
    .single();

  if (!user) return null;

  const viewName = getProfileViewName(user.role, user.employer_type);

  return supabase.from(viewName).select("*").eq("id", userId).single();
}

export async function updateProfile(userId: string, data: ProfileUpdateData) {
  // Updates users table + role-specific table in transaction
  // Implementation depends on what fields are being updated
}
```

---

## Issue 2: Email Editing with Verification

### Problem

Email field is visible in profile view but not editable in profile edit. Need to add email editing with Supabase Auth verification flow.

### Solution

#### 2a. Email Field in ProfileEditForm

Add email field to the form. On save:

- If email unchanged → update other fields normally
- If email changed → call `supabase.auth.updateUser({ email })` + update other fields

The email in `auth.users` only changes after user clicks verification link.

```typescript
// In profile form submit handler
const emailChanged = formData.get("email") !== originalEmail;

if (emailChanged) {
  const { error } = await supabase.auth.updateUser({
    email: formData.get("email") as string,
  });

  if (error) {
    toast.error("Failed to update email");
    return;
  }

  toast.info("Verification email sent. Check your inbox.");
}

// Always update other profile fields (email stays unchanged until verified)
await updateProfile(userId, { ...otherFields });
```

#### 2b. Unsaved Changes Guard

Track form dirty state and show confirmation dialog on tab switch.

**Hook: `hooks/use-unsaved-changes.ts`**

```typescript
export function useUnsavedChanges(formRef: RefObject<HTMLFormElement>) {
  const [isDirty, setIsDirty] = useState(false);
  const [originalValues, setOriginalValues] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    setOriginalValues(Object.fromEntries(new FormData(form)));
  }, []);

  const checkDirty = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const current = Object.fromEntries(new FormData(form));
    const dirty = Object.keys(current).some(
      (key) => current[key] !== originalValues[key],
    );
    setIsDirty(dirty);
  }, [originalValues]);

  const resetDirty = () => {
    setOriginalValues(Object.fromEntries(new FormData(formRef.current!)));
    setIsDirty(false);
  };

  return { isDirty, checkDirty, resetDirty };
}
```

**Dialog behavior:**

- User makes changes → tries to switch tabs → dialog appears
- "Stay" → dismiss dialog, keep form state
- "Switch Tabs" → discard changes, navigate, form resets to DB values

---

## Issue 3: Photo Upload Visibility

### Problem

Upload component appearing in wrong contexts. Need strict rules for when upload and display happens.

### Upload Component Visibility

| User Type  | Context                     | Shows Upload? |
| ---------- | --------------------------- | ------------- |
| Worker     | Portfolio tab (edit mode)   | ✅ Yes        |
| Worker     | Experience tab (edit mode)  | ❌ No         |
| Worker     | Profile view (any tab)      | ❌ No         |
| Recruiter  | Any context                 | ❌ No         |
| Contractor | Projects tab listing (edit) | ❌ No         |
| Contractor | Add/Edit Project form       | ✅ Yes        |
| Developer  | Projects tab listing (edit) | ❌ No         |
| Developer  | Add/Edit Project form       | ✅ Yes        |
| Homeowner  | Any context                 | ❌ No         |

### Photo Display Visibility (Profile View)

| User Type  | Tab        | Shows Photos?        | Source              |
| ---------- | ---------- | -------------------- | ------------------- |
| Worker     | Portfolio  | ✅ Yes               | `portfolio_images`  |
| Worker     | Experience | ❌ No                | N/A                 |
| Recruiter  | Experience | ❌ No                | N/A                 |
| Contractor | Projects   | ✅ Yes (per project) | `experience_photos` |
| Developer  | Projects   | ✅ Yes (per project) | `experience_photos` |

### Implementation

**1. Remove ExperiencePhotoManager from Experience tab**

Currently `ExperienceItem` may render photo upload. Remove it for experience contexts.

**2. ExperienceItem - Add `showPhotos` prop**

```typescript
interface ExperienceItemProps {
  experience: WorkExperience;
  photos?: ExperiencePhoto[];
  showPhotos?: boolean;
}

export function ExperienceItem({ experience, photos, showPhotos = false }: Props) {
  return (
    <div>
      <h3>{experience.job_title}</h3>
      <p>{experience.company}</p>

      {showPhotos && photos && photos.length > 0 && (
        <ExperiencePhotoGallery photos={photos} />
      )}
    </div>
  );
}
```

**3. ProfileViewTabs - Conditional photo display**

```typescript
// Experience tab (workers, recruiters) - NO photos
{activeTab === 'experience' && (
  <ExperienceList experiences={workExperience} showPhotos={false} />
)}

// Projects tab (contractors, developers) - YES photos
{activeTab === 'projects' && (
  <ExperienceList
    experiences={workExperience}
    experiencePhotosMap={experiencePhotosMap}
    showPhotos={true}
  />
)}

// Portfolio tab (workers only)
{activeTab === 'portfolio' && (
  <PortfolioGallery images={portfolioImages} />
)}
```

**4. Add/Edit Project form - Upload only here**

For contractors/developers, the photo upload component only appears inside the project creation/editing form, not in the projects tab listing.

---

## Files to Modify

### New Files

- `supabase/migrations/20260210000001_profile_views.sql`
- `features/profiles/services/profile-service.ts`
- `hooks/use-unsaved-changes.ts`
- `components/ui/unsaved-changes-dialog.tsx`

### Modified Files

- `features/profile/components/profile-edit-form.tsx` - Add email field
- `features/profile/components/profile-edit-tabs.tsx` - Unsaved changes guard
- `features/profiles/components/experience-item.tsx` - Add showPhotos prop
- `features/profiles/components/profile-view-tabs.tsx` - Conditional photo display
- Add/Edit project form component - Add photo upload for contractors/developers

---

## Photo Limits (Existing)

- **Free users:** 5 photos per project, 5 portfolio photos
- **Pro users:** Unlimited

These limits are already enforced in the upload actions.
