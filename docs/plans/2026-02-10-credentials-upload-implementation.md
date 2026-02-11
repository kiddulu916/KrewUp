# Credentials Upload Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement certification (workers) and license (contractors) upload with photo-first verification workflow.

**Architecture:** Unified `credentials` table replaces separate `certifications`/`licenses` tables. Photo is the only required field; all other metadata is optional. Role-based tab visibility: workers see "Certifications", contractors see "Licenses", other roles see no credentials tab.

**Tech Stack:** Next.js 16, TypeScript, Supabase (PostgreSQL + Storage), React Query, Zod validation

---

## Task 1: Database Migration

**Files:**

- Create: `supabase/migrations/20260210100000_credentials_table.sql`

**Step 1: Write the migration SQL**

```sql
-- Create unified credentials table
CREATE TABLE "public"."credentials" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "credential_type" text NOT NULL CHECK (credential_type IN ('certification', 'license')),

    -- Required field
    "image_url" text NOT NULL,

    -- Common optional fields
    "holder_name" text,
    "issue_date" date,
    "expiration_date" date,

    -- Certification-specific (null for licenses)
    "certification_name" text,
    "issuing_organization" text,
    "credential_id" text,

    -- License-specific (null for certifications)
    "license_number" text,
    "classification" text,
    "issuing_state" text,
    "licensee_name" text,

    -- Verification
    "verification_status" text NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    "rejection_reason" text,

    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_credentials_user_id ON credentials(user_id);
CREATE INDEX idx_credentials_type ON credentials(credential_type);
CREATE INDEX idx_credentials_status ON credentials(verification_status);

-- RLS Policies
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Users can manage their own credentials
CREATE POLICY "Users can manage own credentials"
    ON credentials FOR ALL
    USING (user_id = auth.uid());

-- All users can read credentials (for public profiles)
CREATE POLICY "Credentials are publicly readable"
    ON credentials FOR SELECT
    USING (true);

-- Updated_at trigger
CREATE TRIGGER update_credentials_updated_at
    BEFORE UPDATE ON credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Create storage bucket for credentials**

Add to migration or run via Supabase dashboard:

```sql
-- Storage bucket 'credentials' should be created via Supabase dashboard
-- with public access for reading
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260210100000_credentials_table.sql
git commit -m "$(cat <<'EOF'
feat(db): add unified credentials table for certifications and licenses

Replaces separate certifications/licenses tables with a unified
credentials table using credential_type discriminator.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: TypeScript Types

**Files:**

- Modify: `features/profiles/types/index.ts`

**Step 1: Add Credential type**

Add after the existing `Certification` type (around line 87):

```typescript
// Unified Credential type (replaces separate Certification/License)
export type Credential = {
  id: string;
  user_id: string;
  credential_type: "certification" | "license";

  // Required field
  image_url: string;

  // Common optional fields
  holder_name?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;

  // Certification-specific
  certification_name?: string | null;
  issuing_organization?: string | null;
  credential_id?: string | null;

  // License-specific
  license_number?: string | null;
  classification?: string | null;
  issuing_state?: string | null;
  licensee_name?: string | null;

  // Verification
  verification_status: "pending" | "verified" | "rejected";
  rejection_reason?: string | null;

  created_at: string;
  updated_at: string;
};

export type CredentialFormData = {
  credential_type: "certification" | "license";
  image_url: string;
  holder_name?: string;
  issue_date?: string;
  expiration_date?: string;
  // Certification fields
  certification_name?: string;
  issuing_organization?: string;
  credential_id?: string;
  // License fields
  license_number?: string;
  classification?: string;
  issuing_state?: string;
  licensee_name?: string;
};
```

**Step 2: Commit**

```bash
git add features/profiles/types/index.ts
git commit -m "$(cat <<'EOF'
feat(types): add Credential and CredentialFormData types

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Server Actions for Credentials

**Files:**

- Create: `features/profiles/actions/credential-actions.ts`
- Test: `__tests__/features/profiles/actions/credential-actions.test.ts`

**Step 1: Write the failing test for uploadCredentialPhoto**

```typescript
// __tests__/features/profiles/actions/credential-actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before imports
const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
    })),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { uploadCredentialPhoto } from "@/features/profiles/actions/credential-actions";

describe("uploadCredentialPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return error when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      const result = await uploadCredentialPhoto(file);

      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });
  });

  describe("Validation", () => {
    it("should reject invalid file types", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const file = new File(["test"], "test.exe", { type: "application/exe" });
      const result = await uploadCredentialPhoto(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Only images");
    });

    it("should reject files over 5MB", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const largeFile = new File(
        [new ArrayBuffer(6 * 1024 * 1024)],
        "large.jpg",
        {
          type: "image/jpeg",
        },
      );
      const result = await uploadCredentialPhoto(largeFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain("5MB");
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/features/profiles/actions/credential-actions.test.ts`
Expected: FAIL - module not found

**Step 3: Write credential-actions.ts**

```typescript
// features/profiles/actions/credential-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { logger } from "@/lib/utils/logger";
import type { Credential, CredentialFormData } from "../types";

export type CredentialResult<
  T = Credential | { url: string; path: string } | Credential[],
> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Upload credential photo to Supabase Storage
 */
export async function uploadCredentialPhoto(
  file: File,
): Promise<CredentialResult<{ url: string; path: string }>> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: "Only images (JPEG, PNG, WebP) and PDF files are allowed",
    };
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, error: "File size must be less than 5MB" };
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("credentials")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    logger.error("Upload credential photo error", {
      fileType: file.type,
      fileSize: file.size,
      errorMessage: error.message,
    });
    return {
      success: false,
      error: `Failed to upload photo: ${error.message}`,
    };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("credentials")
    .getPublicUrl(fileName);

  return { success: true, data: { url: urlData.publicUrl, path: fileName } };
}

/**
 * Create a new credential (certification or license)
 */
export async function createCredential(
  data: CredentialFormData,
): Promise<CredentialResult<Credential>> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get user's profile to determine role and employer_type
  const { data: profile } = await supabase
    .from("users")
    .select("role, employer_type")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  // Validate credential_type matches user role
  if (profile.role === "worker" && data.credential_type !== "certification") {
    return { success: false, error: "Workers can only add certifications" };
  }

  if (
    profile.role === "employer" &&
    profile.employer_type === "contractor" &&
    data.credential_type !== "license"
  ) {
    return { success: false, error: "Contractors can only add licenses" };
  }

  // Block other employer types
  if (profile.role === "employer" && profile.employer_type !== "contractor") {
    return {
      success: false,
      error: "Your account type cannot add credentials",
    };
  }

  // Validate required field
  if (!data.image_url) {
    return { success: false, error: "Photo is required" };
  }

  try {
    const { data: credential, error: insertError } = await supabase
      .from("credentials")
      .insert({
        user_id: user.id,
        credential_type: data.credential_type,
        image_url: data.image_url,
        holder_name: data.holder_name || null,
        issue_date: data.issue_date || null,
        expiration_date: data.expiration_date || null,
        // Certification fields
        certification_name: data.certification_name || null,
        issuing_organization: data.issuing_organization || null,
        credential_id: data.credential_id || null,
        // License fields
        license_number: data.license_number || null,
        classification: data.classification || null,
        issuing_state: data.issuing_state || null,
        licensee_name: data.licensee_name || null,
        verification_status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    revalidatePath("/dashboard/profile");
    return { success: true, data: credential };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    logger.error("Create credential error", {
      credentialType: data.credential_type,
      errorCode: err.code,
      errorMessage: err.message,
    });
    return { success: false, error: "Failed to add credential" };
  }
}

/**
 * Update an existing credential (resets verification to pending)
 */
export async function updateCredential(
  id: string,
  data: Partial<CredentialFormData>,
): Promise<CredentialResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const { error } = await supabase
      .from("credentials")
      .update({
        ...data,
        verification_status: "pending", // Reset on any edit
        rejection_reason: null, // Clear rejection reason
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    logger.error("Update credential error", { id, errorMessage: err.message });
    return { success: false, error: "Failed to update credential" };
  }
}

/**
 * Delete a credential and its photo from storage
 */
export async function deleteCredential(id: string): Promise<CredentialResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Get credential to find the image path
    const { data: credential } = await supabase
      .from("credentials")
      .select("image_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (credential?.image_url) {
      // Extract path from URL and delete from storage
      const urlParts = credential.image_url.split("/credentials/");
      if (urlParts[1]) {
        await supabase.storage.from("credentials").remove([urlParts[1]]);
      }
    }

    const { error } = await supabase
      .from("credentials")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    logger.error("Delete credential error", { id, errorMessage: err.message });
    return { success: false, error: "Failed to delete credential" };
  }
}

/**
 * Get all credentials for a user
 */
export async function getCredentials(
  userId: string,
): Promise<CredentialResult<Credential[]>> {
  const supabase = await createClient(await cookies());

  try {
    const { data, error } = await supabase
      .from("credentials")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, data: data as Credential[] };
  } catch (error: unknown) {
    const err = error as { message?: string };
    logger.error("Get credentials error", {
      userId,
      errorMessage: err.message,
    });
    return { success: false, error: "Failed to get credentials" };
  }
}

/**
 * Submit corrected photo for a rejected credential
 */
export async function submitCorrectedPhoto(
  credentialId: string,
  imageUrl: string,
): Promise<CredentialResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const { error } = await supabase
      .from("credentials")
      .update({
        image_url: imageUrl,
        verification_status: "pending",
        rejection_reason: null,
      })
      .eq("id", credentialId)
      .eq("user_id", user.id);

    if (error) throw error;

    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    logger.error("Submit corrected photo error", {
      credentialId,
      errorMessage: err.message,
    });
    return { success: false, error: "Failed to submit corrected photo" };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/features/profiles/actions/credential-actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add features/profiles/actions/credential-actions.ts __tests__/features/profiles/actions/credential-actions.test.ts
git commit -m "$(cat <<'EOF'
feat(profiles): add credential server actions with tests

- uploadCredentialPhoto: Upload to 'credentials' bucket
- createCredential: Create with role validation
- updateCredential: Update and reset verification
- deleteCredential: Delete credential and storage file
- getCredentials: Fetch all credentials for user
- submitCorrectedPhoto: Resubmit rejected credentials

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: React Query Hook for Credentials

**Files:**

- Create: `features/profiles/hooks/use-credentials.ts`

**Step 1: Write the hook**

```typescript
// features/profiles/hooks/use-credentials.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Credential } from "../types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useCredentials(
  userId: string,
  credentialType?: "certification" | "license",
) {
  return useQuery({
    queryKey: ["credentials", userId, credentialType],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("credentials")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (credentialType) {
        query = query.eq("credential_type", credentialType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Credential[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId && UUID_REGEX.test(userId),
  });
}

export function useCredentialMutations() {
  const queryClient = useQueryClient();

  const invalidateCredentials = () => {
    queryClient.invalidateQueries({ queryKey: ["credentials"] });
  };

  return { invalidateCredentials };
}
```

**Step 2: Commit**

```bash
git add features/profiles/hooks/use-credentials.ts
git commit -m "$(cat <<'EOF'
feat(profiles): add useCredentials hook for React Query

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Credential Photo Upload Component

**Files:**

- Create: `features/profiles/components/credential-photo-upload.tsx`

**Step 1: Write the component**

```typescript
// features/profiles/components/credential-photo-upload.tsx
'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { Upload, X, FileText } from 'lucide-react';

type CredentialPhotoUploadProps = {
  value?: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
  disabled?: boolean;
  error?: string;
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

export function CredentialPhotoUpload({
  value,
  onChange,
  disabled = false,
  error,
}: CredentialPhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setValidationError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setValidationError('Only JPEG, PNG, WebP images and PDF files are allowed');
        return;
      }

      if (file.size > MAX_SIZE) {
        setValidationError('File size must be less than 5MB');
        return;
      }

      setFileType(file.type);
      setFileName(file.name);

      if (file.type === 'application/pdf') {
        setPreview(null);
        onChange(file, null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setPreview(result);
          onChange(file, result);
        };
        reader.readAsDataURL(file);
      }
    },
    [onChange]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    setFileType(null);
    setFileName(null);
    setValidationError(null);
    onChange(null, null);
  }, [onChange]);

  const displayError = validationError || error;

  if (preview || fileType === 'application/pdf') {
    return (
      <div className="space-y-3">
        <div className="relative">
          {fileType === 'application/pdf' ? (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <FileText className="w-10 h-10 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{fileName}</p>
                <p className="text-xs text-gray-500">PDF Document</p>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-64">
              <Image
                src={preview!}
                alt="Credential preview"
                fill
                className="object-contain rounded-lg border border-gray-200"
                unoptimized
              />
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleRemove}
          disabled={disabled}
          className="w-full"
        >
          <X className="w-4 h-4 mr-2" />
          Remove Photo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`
          flex flex-col items-center justify-center w-full h-40
          border-2 border-dashed rounded-lg cursor-pointer
          transition-colors
          ${dragActive ? 'border-krewup-blue bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${displayError ? 'border-red-300 bg-red-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <label
          htmlFor="credential-photo-upload"
          className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
        >
          <Upload className="w-8 h-8 mb-3 text-gray-400" />
          <p className="mb-1 text-sm text-gray-500">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            JPEG, PNG, WebP, or PDF (max 5MB)
          </p>
          <input
            id="credential-photo-upload"
            type="file"
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
            onChange={handleChange}
            disabled={disabled}
          />
        </label>
      </div>
      {displayError && (
        <p className="text-sm text-red-600">{displayError}</p>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add features/profiles/components/credential-photo-upload.tsx
git commit -m "$(cat <<'EOF'
feat(profiles): add CredentialPhotoUpload component

Drag-and-drop photo upload with preview, validation, and PDF support.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Credential Item Display Component

**Files:**

- Create: `features/profiles/components/credential-item.tsx` (new version)

**Step 1: Write the component**

```typescript
// features/profiles/components/credential-item-new.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button, Badge, ConfirmDialog } from '@/components/ui';
import { VerificationBadge } from '@/components/common';
import { deleteCredential } from '../actions/credential-actions';
import { useToast } from '@/components/providers/toast-provider';
import { useRouter } from 'next/navigation';
import { format, isPast, parseISO } from 'date-fns';
import { Award, FileText, AlertCircle } from 'lucide-react';
import type { Credential } from '../types';

type CredentialItemProps = {
  credential: Credential;
  isOwner?: boolean;
  onEdit?: (credential: Credential) => void;
  onCorrectedPhotoClick?: (credential: Credential) => void;
};

export function CredentialItemNew({
  credential,
  isOwner = false,
  onEdit,
  onCorrectedPhotoClick,
}: CredentialItemProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const isExpired = credential.expiration_date && isPast(parseISO(credential.expiration_date));
  const isCertification = credential.credential_type === 'certification';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteCredential(credential.id);
      if (result.success) {
        toast.success('Credential deleted successfully');
        setShowConfirm(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete credential');
        setIsDeleting(false);
      }
    } catch {
      toast.error('An unexpected error occurred');
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getDisplayName = () => {
    if (isCertification) {
      return credential.certification_name || 'Certification';
    }
    return credential.classification || 'License';
  };

  const getDisplayNumber = () => {
    if (isCertification) {
      return credential.credential_id;
    }
    return credential.license_number;
  };

  const isPdf = credential.image_url?.toLowerCase().endsWith('.pdf');

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-krewup-blue transition-colors">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Left side: Info */}
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-light-blue shrink-0">
                <Award className="h-6 w-6 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                {/* Header with name and badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getDisplayName()}
                  </h3>
                  <VerificationBadge status={credential.verification_status} size="sm" />
                  {isExpired && (
                    <Badge variant="secondary" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Expired
                    </Badge>
                  )}
                </div>

                {/* Details */}
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  {credential.holder_name && (
                    <p>
                      <span className="font-medium">Holder:</span> {credential.holder_name}
                    </p>
                  )}
                  {isCertification && credential.issuing_organization && (
                    <p>
                      <span className="font-medium">Issued by:</span> {credential.issuing_organization}
                    </p>
                  )}
                  {!isCertification && credential.licensee_name && (
                    <p>
                      <span className="font-medium">Licensee:</span> {credential.licensee_name}
                    </p>
                  )}
                  {!isCertification && credential.issuing_state && (
                    <p>
                      <span className="font-medium">State:</span> {credential.issuing_state}
                    </p>
                  )}
                  {getDisplayNumber() && (
                    <p>
                      <span className="font-medium">Number:</span> ****{getDisplayNumber()?.slice(-4)}
                    </p>
                  )}
                  {credential.issue_date && (
                    <p>
                      <span className="font-medium">Issued:</span> {formatDate(credential.issue_date)}
                    </p>
                  )}
                  {credential.expiration_date && (
                    <p className={isExpired ? 'text-red-600' : ''}>
                      <span className="font-medium">Expires:</span> {formatDate(credential.expiration_date)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Photo thumbnail */}
          <div className="flex-shrink-0">
            {isPdf ? (
              <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 sm:h-40 sm:w-40">
                <FileText className="h-12 w-12 text-red-500" />
              </div>
            ) : (
              <Image
                src={credential.image_url}
                alt={`${getDisplayName()} document`}
                width={160}
                height={160}
                className="h-32 w-32 rounded-lg border border-gray-200 object-cover sm:h-40 sm:w-40"
              />
            )}
          </div>
        </div>

        {/* Rejection reason - owner only */}
        {isOwner && credential.verification_status === 'rejected' && credential.rejection_reason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
            <p className="text-sm text-red-800 mb-2">{credential.rejection_reason}</p>
            {onCorrectedPhotoClick && (
              <button
                onClick={() => onCorrectedPhotoClick(credential)}
                className="text-sm text-red-700 underline hover:text-red-900 font-medium"
              >
                Submit Corrected Photo
              </button>
            )}
          </div>
        )}

        {/* Expired prompt - owner only */}
        {isOwner && isExpired && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              This credential has expired. Please upload an updated version.
            </p>
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="mt-4 flex gap-2 justify-end">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(credential)}>
                Edit
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Credential"
        message={`Are you sure you want to delete this ${credential.credential_type}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </>
  );
}
```

**Step 2: Commit**

```bash
git add features/profiles/components/credential-item-new.tsx
git commit -m "$(cat <<'EOF'
feat(profiles): add CredentialItemNew display component

List view component for credentials with:
- Status badges (pending/verified/rejected/expired)
- Photo thumbnail (image or PDF icon)
- Rejection reason with correction prompt (owner only)
- Edit/delete actions (owner only)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Certification Form (Updated for New Schema)

**Files:**

- Create: `features/profiles/components/certification-form-new.tsx`

**Step 1: Write the component**

```typescript
// features/profiles/components/certification-form-new.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';
import { CredentialPhotoUpload } from './credential-photo-upload';
import { uploadCredentialPhoto, createCredential } from '../actions/credential-actions';
import { useAsyncAction } from '@/hooks/use-async-action';

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CertificationFormNew({ onSuccess, onCancel }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { execute, isLoading, error } = useAsyncAction({
    showToast: true,
    successMessage:
      'Certification submitted for verification! You\'ll be notified when it\'s reviewed.',
    errorMessagePrefix: 'Failed to add certification',
  });

  const [formData, setFormData] = useState({
    holder_name: '',
    certification_name: '',
    issuing_organization: '',
    credential_id: '',
    issue_date: '',
    expiration_date: '',
    no_expiration: false,
  });

  const handlePhotoChange = (file: File | null, preview: string | null) => {
    setPhotoFile(file);
    setPhotoPreview(preview);
    setFormError(null);
  };

  const handleSubmit = async () => {
    setFormError(null);

    // Validate required field
    if (!photoFile) {
      setFormError('Photo is required for verification');
      return;
    }

    await execute(async () => {
      // Upload photo first
      const uploadResult = await uploadCredentialPhoto(photoFile);

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Failed to upload photo');
      }

      // Create credential
      const result = await createCredential({
        credential_type: 'certification',
        image_url: uploadResult.data.url,
        holder_name: formData.holder_name || undefined,
        certification_name: formData.certification_name || undefined,
        issuing_organization: formData.issuing_organization || undefined,
        credential_id: formData.credential_id || undefined,
        issue_date: formData.issue_date || undefined,
        expiration_date: formData.no_expiration ? undefined : formData.expiration_date || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add certification');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/profile?tab=certifications');
        router.refresh();
      }

      return result;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Certification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo Upload - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certification Photo <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Upload a clear photo of your certification document
            </p>
            <CredentialPhotoUpload
              value={photoPreview}
              onChange={handlePhotoChange}
              disabled={isLoading}
              error={formError && !photoFile ? formError : undefined}
            />
          </div>

          {/* Optional Fields */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-gray-500 mb-4">
              The following fields are optional but help verify your credential faster.
            </p>
          </div>

          <div>
            <label htmlFor="holder_name" className="block text-sm font-medium text-gray-700 mb-1">
              Certificate Holder Name
            </label>
            <Input
              id="holder_name"
              type="text"
              value={formData.holder_name}
              onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
              placeholder="Name as shown on certificate"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="certification_name" className="block text-sm font-medium text-gray-700 mb-1">
              Certification Name
            </label>
            <Input
              id="certification_name"
              type="text"
              value={formData.certification_name}
              onChange={(e) => setFormData({ ...formData, certification_name: e.target.value })}
              placeholder="e.g., OSHA 30-Hour, First Aid/CPR"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="issuing_organization" className="block text-sm font-medium text-gray-700 mb-1">
              Issuing Organization
            </label>
            <Input
              id="issuing_organization"
              type="text"
              value={formData.issuing_organization}
              onChange={(e) => setFormData({ ...formData, issuing_organization: e.target.value })}
              placeholder="e.g., OSHA, American Red Cross"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="credential_id" className="block text-sm font-medium text-gray-700 mb-1">
              Credential ID
            </label>
            <Input
              id="credential_id"
              type="text"
              value={formData.credential_id}
              onChange={(e) => setFormData({ ...formData, credential_id: e.target.value })}
              placeholder="Certificate or credential number"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date
              </label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="expiration_date" className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date
              </label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                min={formData.issue_date || undefined}
                disabled={formData.no_expiration}
              />
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={formData.no_expiration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      no_expiration: e.target.checked,
                      expiration_date: e.target.checked ? '' : formData.expiration_date,
                    })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">No expiration</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {(formError || error) && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{formError || error}</p>
        </div>
      )}

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          <strong>Verification Process:</strong> All certifications are reviewed within 24-48 hours.
          You&apos;ll receive a notification once verified.
        </p>
      </div>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || (() => router.push('/dashboard/profile?tab=certifications'))}
          className="w-full"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          variant="primary"
          isLoading={isLoading}
          className="w-full"
        >
          {isLoading ? 'Uploading...' : 'Add Certification'}
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add features/profiles/components/certification-form-new.tsx
git commit -m "$(cat <<'EOF'
feat(profiles): add CertificationFormNew for workers

Photo-first certification form with optional metadata fields.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: License Form (Contractors)

**Files:**

- Create: `features/profiles/components/license-form.tsx`

**Step 1: Write the component**

```typescript
// features/profiles/components/license-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';
import { CredentialPhotoUpload } from './credential-photo-upload';
import { uploadCredentialPhoto, createCredential } from '../actions/credential-actions';
import { useAsyncAction } from '@/hooks/use-async-action';
import { US_STATES } from '@/lib/constants';

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function LicenseForm({ onSuccess, onCancel }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { execute, isLoading, error } = useAsyncAction({
    showToast: true,
    successMessage:
      'License submitted for verification! You\'ll be notified when it\'s reviewed.',
    errorMessagePrefix: 'Failed to add license',
  });

  const [formData, setFormData] = useState({
    licensee_name: '',
    license_number: '',
    classification: '',
    issuing_state: '',
    issue_date: '',
    expiration_date: '',
  });

  const handlePhotoChange = (file: File | null, preview: string | null) => {
    setPhotoFile(file);
    setPhotoPreview(preview);
    setFormError(null);
  };

  const handleSubmit = async () => {
    setFormError(null);

    // Validate required field
    if (!photoFile) {
      setFormError('Photo is required for verification');
      return;
    }

    await execute(async () => {
      // Upload photo first
      const uploadResult = await uploadCredentialPhoto(photoFile);

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Failed to upload photo');
      }

      // Create credential
      const result = await createCredential({
        credential_type: 'license',
        image_url: uploadResult.data.url,
        licensee_name: formData.licensee_name || undefined,
        license_number: formData.license_number || undefined,
        classification: formData.classification || undefined,
        issuing_state: formData.issuing_state || undefined,
        issue_date: formData.issue_date || undefined,
        expiration_date: formData.expiration_date || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add license');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/profile?tab=licenses');
        router.refresh();
      }

      return result;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Contractor License</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo Upload - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License Photo <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Upload a clear photo of your contractor license
            </p>
            <CredentialPhotoUpload
              value={photoPreview}
              onChange={handlePhotoChange}
              disabled={isLoading}
              error={formError && !photoFile ? formError : undefined}
            />
          </div>

          {/* Optional Fields */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-gray-500 mb-4">
              The following fields are optional but help verify your license faster.
            </p>
          </div>

          <div>
            <label htmlFor="licensee_name" className="block text-sm font-medium text-gray-700 mb-1">
              Licensee Name
            </label>
            <Input
              id="licensee_name"
              type="text"
              value={formData.licensee_name}
              onChange={(e) => setFormData({ ...formData, licensee_name: e.target.value })}
              placeholder="Name as shown on license"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="license_number" className="block text-sm font-medium text-gray-700 mb-1">
              License Number
            </label>
            <Input
              id="license_number"
              type="text"
              value={formData.license_number}
              onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              placeholder="e.g., 1234567"
              maxLength={50}
            />
          </div>

          <div>
            <label htmlFor="classification" className="block text-sm font-medium text-gray-700 mb-1">
              Classification / Type
            </label>
            <Input
              id="classification"
              type="text"
              value={formData.classification}
              onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
              placeholder="e.g., General Building, Electrical, Plumbing"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="issuing_state" className="block text-sm font-medium text-gray-700 mb-1">
              Issuing State
            </label>
            <select
              id="issuing_state"
              value={formData.issuing_state}
              onChange={(e) => setFormData({ ...formData, issuing_state: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent"
            >
              <option value="">Select state</option>
              {US_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date
              </label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="expiration_date" className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date
              </label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                min={formData.issue_date || undefined}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {(formError || error) && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{formError || error}</p>
        </div>
      )}

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          <strong>Verification Process:</strong> All licenses are reviewed within 24-48 hours.
          You&apos;ll receive a notification once verified.
        </p>
      </div>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || (() => router.push('/dashboard/profile?tab=licenses'))}
          className="w-full"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          variant="primary"
          isLoading={isLoading}
          className="w-full"
        >
          {isLoading ? 'Uploading...' : 'Add License'}
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add features/profiles/components/license-form.tsx
git commit -m "$(cat <<'EOF'
feat(profiles): add LicenseForm for contractors

Photo-first license form with state dropdown and optional metadata.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Certifications Tab (View)

**Files:**

- Create: `features/profiles/components/tabs/certifications-tab-new.tsx`

**Step 1: Write the component**

```typescript
// features/profiles/components/tabs/certifications-tab-new.tsx
'use client';

import { useCredentials } from '../../hooks/use-credentials';
import { CredentialItemNew } from '../credential-item-new';
import { Loader2, Award } from 'lucide-react';

type CertificationsTabNewProps = {
  userId: string;
  isOwner?: boolean;
};

export function CertificationsTabNew({ userId, isOwner = false }: CertificationsTabNewProps) {
  const { data: credentials, isLoading, error } = useCredentials(userId, 'certification');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 motion-safe:animate-spin motion-reduce:animate-none text-krewup-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load certifications</p>
      </div>
    );
  }

  if (!credentials || credentials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
        <Award className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-600">No certifications added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {credentials.map((credential) => (
        <CredentialItemNew
          key={credential.id}
          credential={credential}
          isOwner={isOwner}
        />
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add features/profiles/components/tabs/certifications-tab-new.tsx
git commit -m "$(cat <<'EOF'
feat(profiles): add CertificationsTabNew view component

Displays worker certifications using unified credentials table.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Licenses Tab (View)

**Files:**

- Create: `features/profiles/components/tabs/licenses-tab.tsx`

**Step 1: Write the component**

```typescript
// features/profiles/components/tabs/licenses-tab.tsx
'use client';

import { useCredentials } from '../../hooks/use-credentials';
import { CredentialItemNew } from '../credential-item-new';
import { Loader2, Award } from 'lucide-react';

type LicensesTabProps = {
  userId: string;
  isOwner?: boolean;
};

export function LicensesTab({ userId, isOwner = false }: LicensesTabProps) {
  const { data: credentials, isLoading, error } = useCredentials(userId, 'license');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 motion-safe:animate-spin motion-reduce:animate-none text-krewup-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load licenses</p>
      </div>
    );
  }

  if (!credentials || credentials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
        <Award className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-600">No licenses added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {credentials.map((credential) => (
        <CredentialItemNew
          key={credential.id}
          credential={credential}
          isOwner={isOwner}
        />
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add features/profiles/components/tabs/licenses-tab.tsx
git commit -m "$(cat <<'EOF'
feat(profiles): add LicensesTab view component for contractors

Displays contractor licenses using unified credentials table.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Update Profile View Tabs

**Files:**

- Modify: `features/profile/components/profile-view-tabs.tsx`

**Step 1: Update imports and add Licenses tab**

Add import at top:

```typescript
import { LicensesTab } from "@/features/profiles/components/tabs/licenses-tab";
```

Update `TabId` type (line 17):

```typescript
type TabId =
  | "basic"
  | "portfolio"
  | "experience"
  | "certifications"
  | "licenses"
  | "education";
```

Add `showLicensesTab` variable after `showCertificationsTab` (around line 124):

```typescript
// Licenses tab is only for contractors
const showLicensesTab = isContractor;
```

Update tabs array (around line 127-133):

```typescript
const tabs: Tab[] = useMemo(
  () => [
    { id: "basic", label: "Overview", icon: User },
    ...(showPortfolioTab
      ? [{ id: "portfolio" as TabId, label: "Portfolio", icon: ImageIcon }]
      : []),
    ...(showExperienceTab
      ? [
          {
            id: "experience" as TabId,
            label: experienceLabels?.tabTitle || "Experience",
            icon: Briefcase,
          },
        ]
      : []),
    ...(showCertificationsTab
      ? [
          {
            id: "certifications" as TabId,
            label: "Certifications",
            icon: Award,
          },
        ]
      : []),
    ...(showLicensesTab
      ? [{ id: "licenses" as TabId, label: "Licenses", icon: Award }]
      : []),
    ...(showEducationTab
      ? [{ id: "education" as TabId, label: "Education", icon: GraduationCap }]
      : []),
  ],
  [
    showPortfolioTab,
    showExperienceTab,
    showCertificationsTab,
    showLicensesTab,
    showEducationTab,
    experienceLabels?.tabTitle,
  ],
);
```

Add Licenses tab content after Certifications tab (around line 389):

```typescript
{/* Licenses Tab - Contractors Only */}
{activeTab === 'licenses' && showLicensesTab && (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Licenses</h2>
        <p className="mt-1 text-sm text-gray-600">
          Your contractor licenses
        </p>
      </div>
      <Link href="/dashboard/profile/licenses">
        <Button variant="outline" size="sm">
          Add License
        </Button>
      </Link>
    </div>

    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <LicensesTab userId={profile.id} isOwner={false} />
    </div>
  </div>
)}
```

**Step 2: Commit**

```bash
git add features/profile/components/profile-view-tabs.tsx
git commit -m "$(cat <<'EOF'
feat(profile): add Licenses tab to profile view for contractors

Workers see Certifications tab, contractors see Licenses tab.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Update Profile Edit Tabs

**Files:**

- Modify: `features/profile/components/profile-edit-tabs.tsx`

**Step 1: Update for role-based credential tabs**

Add imports at top:

```typescript
import { CertificationFormNew } from "@/features/profiles/components/certification-form-new";
import { LicenseForm } from "@/features/profiles/components/license-form";
import { CertificationsTabNew } from "@/features/profiles/components/tabs/certifications-tab-new";
import { LicensesTab } from "@/features/profiles/components/tabs/licenses-tab";
```

Update `TabId` type (line 30):

```typescript
type TabId =
  | "basic"
  | "portfolio"
  | "experience"
  | "certifications"
  | "licenses";
```

Add detection variables after existing ones (around line 43):

```typescript
const isContractor = isEmployer && profile.employer_type === "contractor";
// Only workers see certifications tab
const showCertificationsTab = isWorker;
// Only contractors see licenses tab
const showLicensesTab = isContractor;
```

Update tabs array (around line 49-54):

```typescript
const tabs: Tab[] = useMemo(
  () => [
    { id: "basic", label: "Basic Info", icon: User },
    ...(showPortfolioTab
      ? [{ id: "portfolio" as TabId, label: "Portfolio", icon: ImageIcon }]
      : []),
    ...(showExperienceTab
      ? [
          {
            id: "experience" as TabId,
            label: experienceLabels?.tabTitle || "Experience",
            icon: Briefcase,
          },
        ]
      : []),
    ...(showCertificationsTab
      ? [
          {
            id: "certifications" as TabId,
            label: "Certifications",
            icon: Award,
          },
        ]
      : []),
    ...(showLicensesTab
      ? [{ id: "licenses" as TabId, label: "Licenses", icon: Award }]
      : []),
  ],
  [
    showPortfolioTab,
    showExperienceTab,
    showCertificationsTab,
    showLicensesTab,
    experienceLabels?.tabTitle,
  ],
);
```

Replace certifications tab content (around line 222-239):

```typescript
{activeTab === 'certifications' && showCertificationsTab && (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Certifications</h2>
      <p className="mt-1 text-sm text-gray-600">
        Upload your certifications for verification.
      </p>
    </div>

    {/* Existing certifications */}
    <CertificationsTabNew userId={profile.id} isOwner={true} />

    {/* Add new certification */}
    <div className="border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Certification</h3>
      <CertificationFormNew />
    </div>
  </div>
)}

{activeTab === 'licenses' && showLicensesTab && (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Licenses</h2>
      <p className="mt-1 text-sm text-gray-600">
        Upload your contractor licenses for verification.
      </p>
    </div>

    {/* Existing licenses */}
    <LicensesTab userId={profile.id} isOwner={true} />

    {/* Add new license */}
    <div className="border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New License</h3>
      <LicenseForm />
    </div>
  </div>
)}
```

**Step 2: Commit**

```bash
git add features/profile/components/profile-edit-tabs.tsx
git commit -m "$(cat <<'EOF'
feat(profile): update edit tabs with role-based credential tabs

- Workers see Certifications tab with upload form
- Contractors see Licenses tab with upload form
- Other roles see no credentials tab

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Add US_STATES Constant

**Files:**

- Modify: `lib/constants/index.ts`

**Step 1: Add US_STATES array**

Add at the end of the file:

```typescript
export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
] as const;
```

**Step 2: Commit**

```bash
git add lib/constants/index.ts
git commit -m "$(cat <<'EOF'
feat(constants): add US_STATES constant for license form

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Run Full Test Suite

**Step 1: Run type check**

Run: `npm run type-check`
Expected: No TypeScript errors

**Step 2: Run ESLint**

Run: `npm run lint`
Expected: No ESLint warnings

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Run build**

Run: `npm run build`
Expected: Production build succeeds

---

## Task 15: Final Cleanup and Integration

**Step 1: Rename new components to replace old ones**

```bash
# Rename new components to replace old
mv features/profiles/components/credential-item-new.tsx features/profiles/components/credential-item.tsx
mv features/profiles/components/certification-form-new.tsx features/profiles/components/certification-form.tsx
mv features/profiles/components/tabs/certifications-tab-new.tsx features/profiles/components/tabs/certifications-tab.tsx
```

**Step 2: Update imports in profile tabs to use renamed components**

Update `profile-view-tabs.tsx` and `profile-edit-tabs.tsx` to import from the renamed files (remove `-new` suffix).

**Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(profiles): rename credential components and finalize integration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

**Total Tasks:** 15

**Files Created:**

- `supabase/migrations/20260210100000_credentials_table.sql`
- `features/profiles/actions/credential-actions.ts`
- `features/profiles/hooks/use-credentials.ts`
- `features/profiles/components/credential-photo-upload.tsx`
- `features/profiles/components/credential-item.tsx`
- `features/profiles/components/certification-form.tsx`
- `features/profiles/components/license-form.tsx`
- `features/profiles/components/tabs/licenses-tab.tsx`
- `__tests__/features/profiles/actions/credential-actions.test.ts`

**Files Modified:**

- `features/profiles/types/index.ts`
- `features/profile/components/profile-view-tabs.tsx`
- `features/profile/components/profile-edit-tabs.tsx`
- `features/profiles/components/tabs/certifications-tab.tsx`
- `lib/constants/index.ts`

**Key Decisions:**

- Photo is the only required field for verification
- Unified `credentials` table with `credential_type` discriminator
- Role-based visibility: workers see "Certifications", contractors see "Licenses"
- All credentials publicly visible; rejection reason owner-only
