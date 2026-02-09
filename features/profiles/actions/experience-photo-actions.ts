'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { rateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateFile, FILE_SIZE_LIMITS } from '@/lib/security/file-validation';
import { logger, sanitizeUserId } from '@/lib/utils/logger';
import { getUserFriendlyError } from '@/lib/utils/action-response';
import type { ExperiencePhoto } from '../types';

/**
 * Upload a photo for an experience/project (employers only)
 * Free users: max 5 photos per project
 * Pro users: unlimited
 *
 * Security features:
 * - Rate limiting (10 uploads/minute)
 * - File type validation (MIME + magic bytes)
 * - File size validation (5MB max)
 * - File name sanitization
 *
 * ! Rate limited: 10 uploads per minute per IP
 */
export async function uploadExperiencePhoto(
  formData: FormData,
  experienceId: string
): Promise<{ success: boolean; error?: string }> {
  // Rate limiting - prevent upload spam/DOS
  const rateLimitResult = await rateLimit('upload:experience-photo', RATE_LIMITS.upload);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient(await cookies());

  // 1. Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Verify experience exists and belongs to user
  const { data: experience, error: expError } = await supabase
    .from('experiences')
    .select('id, user_id')
    .eq('id', experienceId)
    .single();

  if (expError || !experience) {
    return { success: false, error: 'Experience not found' };
  }

  if (experience.user_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // 3. Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status, is_lifetime_pro')
    .eq('id', user.id)
    .single();

  // 4. Check existing photo count for this experience
  const { count } = await supabase
    .from('experience_photos')
    .select('*', { count: 'exact', head: true })
    .eq('experience_id', experienceId);

  // 5. Enforce limits (5 for free, unlimited for Pro)
  const isPro = profile?.subscription_status === 'pro' || profile?.is_lifetime_pro === true;
  if (!isPro && count && count >= 5) {
    return {
      success: false,
      error: 'Free users can upload maximum 5 photos per project. Upgrade to Pro for unlimited.',
    };
  }

  // 6. Get file from form data
  const file = formData.get('file') as File;
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  // Enhanced file validation (type, size, and content verification)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
  const validation = await validateFile(file, {
    allowedTypes,
    maxSize: FILE_SIZE_LIMITS.portfolioImage,
  });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // 7. Upload to Supabase Storage
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${user.id}/${experienceId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('experience-photos')
    .upload(fileName, file);

  if (uploadError) {
    return { success: false, error: getUserFriendlyError(uploadError, 'Failed to upload photo') };
  }

  // 8. Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('experience-photos').getPublicUrl(fileName);

  // 9. Create database record
  const { error: dbError } = await supabase.from('experience_photos').insert({
    experience_id: experienceId,
    user_id: user.id,
    image_url: publicUrl,
    display_order: count || 0,
  });

  if (dbError) {
    // Cleanup storage if DB insert fails
    await supabase.storage.from('experience-photos').remove([fileName]);
    return { success: false, error: getUserFriendlyError(dbError, 'Failed to save photo') };
  }

  revalidatePath('/dashboard/profile/edit');
  revalidatePath(`/dashboard/profile/experience/${experienceId}`);
  return { success: true };
}

/**
 * Delete an experience photo
 */
export async function deleteExperiencePhoto(
  photoId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient(await cookies());

  // 1. Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Get photo record (verify ownership via RLS)
  const { data: photo, error: fetchError } = await supabase
    .from('experience_photos')
    .select('image_url, user_id, experience_id')
    .eq('id', photoId)
    .single();

  if (fetchError || !photo) {
    return { success: false, error: 'Photo not found' };
  }

  // 3. Verify ownership
  if (photo.user_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // 4. Extract file path from URL
  const urlParts = photo.image_url.split('/experience-photos/');
  const filePath = urlParts[urlParts.length - 1];

  // 5. Delete from storage
  const { error: storageError } = await supabase.storage
    .from('experience-photos')
    .remove([filePath]);

  if (storageError) {
    logger.error('Failed to delete storage file', {
      userId: sanitizeUserId(user.id),
      photoId,
      filePath,
      error: storageError.message,
    });
    // Continue with DB deletion - orphaned files can be cleaned up later
  }

  // 6. Delete from database
  const { error: deleteError } = await supabase
    .from('experience_photos')
    .delete()
    .eq('id', photoId);

  if (deleteError) {
    return { success: false, error: getUserFriendlyError(deleteError, 'Failed to delete photo') };
  }

  revalidatePath('/dashboard/profile/edit');
  revalidatePath(`/dashboard/profile/experience/${photo.experience_id}`);
  return { success: true };
}

/**
 * Reorder experience photos (drag and drop)
 */
export async function reorderExperiencePhotos(
  photoIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient(await cookies());

  // 1. Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Validate that all photo IDs are valid UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!photoIds.every((id) => uuidRegex.test(id))) {
    return { success: false, error: 'Invalid photo ID format' };
  }

  // 3. Update all photos in parallel with error handling
  const results = await Promise.all(
    photoIds.map((id, i) =>
      supabase
        .from('experience_photos')
        .update({ display_order: i })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  );

  // Check for failures
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    return { success: false, error: 'Failed to reorder some photos' };
  }

  revalidatePath('/dashboard/profile/edit');
  return { success: true };
}

/**
 * Get photos for an experience (server-side fetch)
 */
export async function getExperiencePhotos(
  experienceId: string
): Promise<{ success: boolean; data?: ExperiencePhoto[]; error?: string }> {
  const supabase = await createClient(await cookies());

  const { data, error } = await supabase
    .from('experience_photos')
    .select('*')
    .eq('experience_id', experienceId)
    .order('display_order', { ascending: true });

  if (error) {
    return { success: false, error: getUserFriendlyError(error, 'Failed to fetch photos') };
  }

  return { success: true, data: data as ExperiencePhoto[] };
}
