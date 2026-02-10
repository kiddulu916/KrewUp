# Credentials Upload Feature Design

**Date:** 2026-02-10
**Status:** Approved

## Overview

Implement credential upload functionality for workers (certifications) and contractors (licenses). Photo upload is required for verification; other fields are optional metadata.

## User Roles & Tab Visibility

| Role       | Tab Name       | Can Add Credentials |
| ---------- | -------------- | ------------------- |
| Worker     | Certifications | Yes                 |
| Contractor | Licenses       | Yes                 |
| Developer  | (hidden)       | No                  |
| Recruiter  | (hidden)       | No                  |
| Homeowner  | (hidden)       | No                  |

## Database Schema

**New `credentials` table** (replaces separate `certifications` and `licenses` tables):

```sql
CREATE TABLE credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_type text NOT NULL CHECK (credential_type IN ('certification', 'license')),

  -- Required field
  image_url text NOT NULL,

  -- Common optional fields
  holder_name text,
  issue_date date,
  expiration_date date,

  -- Certification-specific (null for licenses)
  certification_name text,
  issuing_organization text,
  credential_id text,

  -- License-specific (null for certifications)
  license_number text,
  classification text,
  issuing_state text,
  licensee_name text,

  -- Verification
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  rejection_reason text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_credentials_user_id ON credentials(user_id);
CREATE INDEX idx_credentials_type ON credentials(credential_type);
```

**Storage bucket:** `credentials` (path: `{user_id}/{credential_id}.{ext}`)

## Form Fields

### Certification Form (Workers)

| Field                   | Required | Type                                 |
| ----------------------- | -------- | ------------------------------------ |
| Photo upload            | **Yes**  | File (JPEG, PNG, WebP, PDF)          |
| Certificate holder name | No       | Text                                 |
| Certification name      | No       | Text                                 |
| Issuing organization    | No       | Text                                 |
| Credential ID           | No       | Text                                 |
| Issue date              | No       | Date                                 |
| Expiration date         | No       | Date (with "No expiration" checkbox) |

### License Form (Contractors)

| Field               | Required | Type                        |
| ------------------- | -------- | --------------------------- |
| Photo upload        | **Yes**  | File (JPEG, PNG, WebP, PDF) |
| Licensee name       | No       | Text                        |
| License number      | No       | Text                        |
| Classification/type | No       | Text                        |
| Issuing state       | No       | Dropdown (US states)        |
| Issue date          | No       | Date                        |
| Expiration date     | No       | Date                        |

## Component Architecture

```
features/profiles/components/
├── certification-form.tsx      # Form for workers
├── license-form.tsx            # Form for contractors
├── credential-item.tsx         # List item display for both types
├── credential-photo-upload.tsx # Shared photo upload component
└── tabs/
    ├── certifications-tab.tsx  # View tab for workers
    └── licenses-tab.tsx        # View tab for contractors
```

### Photo Upload Component

- Drag-and-drop upload area
- Preview with remove button
- 5MB max size
- Accepts: JPEG, PNG, WebP, PDF
- Shows upload progress

## Verification Workflow

### Status States

| Status     | Badge                  | Color             | UI Elements                                              |
| ---------- | ---------------------- | ----------------- | -------------------------------------------------------- |
| `pending`  | "Pending Verification" | Yellow/amber      | None                                                     |
| `verified` | "Verified"             | Green + checkmark | None                                                     |
| `rejected` | "Rejected"             | Red               | Rejection reason + "Submit Corrected Photo" (owner only) |
| Expired    | "Expired"              | Gray              | "Update Credential" prompt (owner only)                  |

### Workflow

1. User uploads credential → status = `pending`
2. Admin reviews in admin dashboard → approves or rejects
3. If rejected: user sees rejection reason and can upload corrected photo
4. Any edit to a verified credential → status resets to `pending`
5. Corrected photo submission → status resets to `pending`

### Expiration Handling

- Credentials with `expiration_date < today` show "Expired" badge
- In profile edit: show prompt "This credential has expired. Upload an updated version."
- Expired credentials remain visible in public profile view (with expired badge)

## Visibility Rules

### Public Profile View

- All credentials visible (pending, verified, rejected, expired)
- Status badges shown for all states
- Rejection reason **hidden** from public view

### Own Profile (Edit Mode)

- All credentials visible with full details
- Rejection reason shown
- "Submit Corrected Photo" button for rejected credentials
- "Update Credential" prompt for expired credentials
- Edit and delete actions available

## Server Actions

```typescript
// features/profiles/actions/credential-actions.ts

// Upload credential photo to storage
uploadCredentialPhoto(file: File): Promise<{ url: string; path: string }>

// Create new credential (certification or license)
createCredential(data: CredentialFormData): Promise<{ success: boolean; data?: Credential }>

// Update existing credential (resets verification to pending)
updateCredential(id: string, data: Partial<CredentialFormData>): Promise<{ success: boolean }>

// Delete credential and its photo from storage
deleteCredential(id: string): Promise<{ success: boolean }>

// Get all credentials for a user
getCredentials(userId: string): Promise<Credential[]>

// Submit corrected photo for rejected credential
submitCorrectedPhoto(credentialId: string, file: File): Promise<{ success: boolean }>
```

### Role Validation

- Workers can only create `credential_type: 'certification'`
- Contractors can only create `credential_type: 'license'`
- Other roles receive error: "Your account type cannot add credentials"

## RLS Policies

```sql
-- Users can CRUD their own credentials
CREATE POLICY "Users can manage own credentials"
  ON credentials FOR ALL
  USING (user_id = auth.uid());

-- All users can read credentials (public profiles)
-- rejection_reason excluded from public queries in application layer
CREATE POLICY "Credentials are publicly readable"
  ON credentials FOR SELECT
  USING (true);
```

## Files to Create/Modify

### New Files

- `supabase/migrations/XXXXXX_credentials_table.sql`
- `features/profiles/components/license-form.tsx`
- `features/profiles/components/credential-item.tsx`
- `features/profiles/components/credential-photo-upload.tsx`
- `features/profiles/components/tabs/licenses-tab.tsx`
- `features/profiles/types/credential.ts`

### Modified Files

- `features/profiles/actions/credential-actions.ts` (rename/update from certification-actions.ts)
- `features/profiles/components/certification-form.tsx` (update to use new schema)
- `features/profiles/components/tabs/certifications-tab.tsx` (update to use new schema)
- `features/profile/components/profile-view-tabs.tsx` (add licenses tab for contractors)
- `features/profile/components/profile-edit-tabs.tsx` (add licenses tab for contractors)
