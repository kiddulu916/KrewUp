'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { logger } from '@/lib/utils/logger';
import type { Credential, CredentialFormData } from '../types';

export type CredentialResult<T = Credential | { url: string; path: string } | Credential[]> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Upload credential photo to Supabase Storage
 * Validates file type (jpeg/png/webp/pdf) and size (5MB max)
 */
export async function uploadCredentialPhoto(file: File): Promise<CredentialResult<{ url: string; path: string }>> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Only images (JPEG, PNG, WebP) and PDF files are allowed' };
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { success: false, error: 'File size must be less than 5MB' };
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('credentials')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    logger.error('Upload credential photo error', {
      fileType: file.type,
      fileSize: file.size,
      errorMessage: error.message,
    });
    // Provide more detailed error messages
    let errorMessage = 'Failed to upload photo';
    if (error.message.includes('bucket')) {
      errorMessage = 'Upload storage not configured. Please contact support.';
    } else if (error.message) {
      errorMessage = `Failed to upload photo: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('credentials')
    .getPublicUrl(fileName);

  return { success: true, data: { url: urlData.publicUrl, path: fileName } };
}

/**
 * Create a new credential
 * Workers can only add certifications, contractors can only add licenses
 * Other employer types (recruiter, developer, homeowner) are blocked
 */
export async function createCredential(data: CredentialFormData): Promise<CredentialResult<Credential>> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's profile to determine role and employer_type
  const { data: profile } = await supabase
    .from('users')
    .select('role, employer_type')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  // Validate credential_type matches user role
  if (profile.role === 'worker' && data.credential_type !== 'certification') {
    return { success: false, error: 'Workers can only add certifications' };
  }

  if (profile.role === 'employer') {
    if (profile.employer_type === 'contractor' && data.credential_type !== 'license') {
      return { success: false, error: 'Contractors can only add licenses' };
    }

    // Block other employer types from adding credentials
    if (profile.employer_type !== 'contractor') {
      return { success: false, error: 'Only contractors can add credentials' };
    }
  }

  // Validate required field - image_url
  if (!data.image_url || data.image_url.trim().length === 0) {
    return { success: false, error: 'Credential photo is required' };
  }

  try {
    const { data: credential, error: insertError } = await supabase
      .from('credentials')
      .insert({
        user_id: user.id,
        credential_type: data.credential_type,
        image_url: data.image_url.trim(),
        holder_name: data.holder_name?.trim() || null,
        issue_date: data.issue_date || null,
        expiration_date: data.expiration_date || null,
        // Certification fields
        certification_name: data.certification_name?.trim() || null,
        issuing_organization: data.issuing_organization?.trim() || null,
        credential_id: data.credential_id?.trim() || null,
        // License fields
        license_number: data.license_number?.trim() || null,
        classification: data.classification?.trim() || null,
        issuing_state: data.issuing_state?.trim() || null,
        licensee_name: data.licensee_name?.trim() || null,
        // Default status
        verification_status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    revalidatePath('/dashboard/profile');

    return { success: true, data: credential };
  } catch (error: any) {
    logger.error('Create credential error', {
      credentialType: data.credential_type,
      errorCode: error.code,
      errorMessage: error.message,
    });
    let errorMessage = 'Failed to create credential';
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      errorMessage = 'This credential already exists in your profile';
    } else if (error instanceof Error && error.message) {
      errorMessage = `Failed to create credential: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Update a credential
 * Resets verification_status to 'pending' and clears rejection_reason
 */
export async function updateCredential(
  id: string,
  data: Partial<CredentialFormData>
): Promise<CredentialResult<Credential>> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // First verify the credential belongs to the user
  const { data: existingCredential, error: fetchError } = await supabase
    .from('credentials')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existingCredential) {
    return { success: false, error: 'Credential not found' };
  }

  try {
    const updateData: Record<string, any> = {
      // Reset verification on update
      verification_status: 'pending',
      rejection_reason: null,
    };

    // Only include fields that are provided
    if (data.holder_name !== undefined) updateData.holder_name = data.holder_name?.trim() || null;
    if (data.issue_date !== undefined) updateData.issue_date = data.issue_date || null;
    if (data.expiration_date !== undefined) updateData.expiration_date = data.expiration_date || null;
    if (data.image_url !== undefined) updateData.image_url = data.image_url.trim();
    // Certification fields
    if (data.certification_name !== undefined) updateData.certification_name = data.certification_name?.trim() || null;
    if (data.issuing_organization !== undefined) updateData.issuing_organization = data.issuing_organization?.trim() || null;
    if (data.credential_id !== undefined) updateData.credential_id = data.credential_id?.trim() || null;
    // License fields
    if (data.license_number !== undefined) updateData.license_number = data.license_number?.trim() || null;
    if (data.classification !== undefined) updateData.classification = data.classification?.trim() || null;
    if (data.issuing_state !== undefined) updateData.issuing_state = data.issuing_state?.trim() || null;
    if (data.licensee_name !== undefined) updateData.licensee_name = data.licensee_name?.trim() || null;

    const { data: credential, error: updateError } = await supabase
      .from('credentials')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    revalidatePath('/dashboard/profile');

    return { success: true, data: credential };
  } catch (error: any) {
    logger.error('Update credential error', {
      credentialId: id,
      errorCode: error.code,
      errorMessage: error.message,
    });
    return { success: false, error: 'Failed to update credential' };
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
    return { success: false, error: 'Not authenticated' };
  }

  // First fetch the credential to get the image path
  const { data: credential, error: fetchError } = await supabase
    .from('credentials')
    .select('id, user_id, image_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !credential) {
    return { success: false, error: 'Credential not found' };
  }

  // Delete the credential from the database
  const { error: deleteError } = await supabase
    .from('credentials')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    logger.error('Delete credential error', {
      credentialId: id,
      errorMessage: deleteError.message,
    });
    return { success: false, error: 'Failed to delete credential' };
  }

  // Try to delete the photo from storage (best effort, don't fail if this fails)
  if (credential.image_url) {
    try {
      // Extract the path from the URL (everything after /credentials/)
      const urlParts = credential.image_url.split('/credentials/');
      if (urlParts.length > 1) {
        const storagePath = urlParts[1];
        await supabase.storage.from('credentials').remove([storagePath]);
      }
    } catch (storageError: any) {
      // Log but don't fail the operation
      logger.error('Delete credential photo error', {
        credentialId: id,
        imageUrl: credential.image_url,
        errorMessage: storageError.message,
      });
    }
  }

  revalidatePath('/dashboard/profile');

  return { success: true };
}

/**
 * Get all credentials for a user
 */
export async function getCredentials(userId: string): Promise<CredentialResult<Credential[]>> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { data: credentials, error } = await supabase
      .from('credentials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: credentials || [] };
  } catch (error: any) {
    logger.error('Get credentials error', {
      userId,
      errorCode: error.code,
      errorMessage: error.message,
    });
    return { success: false, error: 'Failed to get credentials' };
  }
}

/**
 * Resubmit a rejected credential with a new photo
 * This is used when an admin rejects a credential and the user needs to upload a corrected photo
 */
export async function submitCorrectedPhoto(
  credentialId: string,
  imageUrl: string
): Promise<CredentialResult<Credential>> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // First verify the credential belongs to the user and is rejected
  const { data: existingCredential, error: fetchError } = await supabase
    .from('credentials')
    .select('id, user_id, verification_status, image_url')
    .eq('id', credentialId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existingCredential) {
    return { success: false, error: 'Credential not found' };
  }

  if (existingCredential.verification_status !== 'rejected') {
    return { success: false, error: 'Only rejected credentials can be resubmitted' };
  }

  if (!imageUrl || imageUrl.trim().length === 0) {
    return { success: false, error: 'New photo is required' };
  }

  try {
    // Delete old photo from storage (best effort)
    if (existingCredential.image_url) {
      try {
        const urlParts = existingCredential.image_url.split('/credentials/');
        if (urlParts.length > 1) {
          const storagePath = urlParts[1];
          await supabase.storage.from('credentials').remove([storagePath]);
        }
      } catch (storageError: any) {
        logger.error('Delete old credential photo error', {
          credentialId,
          errorMessage: storageError.message,
        });
      }
    }

    // Update credential with new photo and reset verification status
    const { data: credential, error: updateError } = await supabase
      .from('credentials')
      .update({
        image_url: imageUrl.trim(),
        verification_status: 'pending',
        rejection_reason: null,
      })
      .eq('id', credentialId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    revalidatePath('/dashboard/profile');

    return { success: true, data: credential };
  } catch (error: any) {
    logger.error('Submit corrected photo error', {
      credentialId,
      errorCode: error.code,
      errorMessage: error.message,
    });
    return { success: false, error: 'Failed to resubmit credential' };
  }
}
