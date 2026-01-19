'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/utils/logger';

type UploadResult = {
  success: boolean;
  error?: string;
  url?: string;
};

/**
 * Upload profile picture to Supabase Storage
 * Validates file type and size (already resized on client)
 * Files stored in: profile-pictures/{userId}/avatar.{ext}
 */
export async function uploadProfilePicture(file: File): Promise<UploadResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate file size (max 2MB - should be smaller after client resize)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be under 2MB' };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Please upload JPEG, PNG, or WebP images only' };
    }

    // Extract extension
    const ext = file.name.split('.').pop() || 'jpg';

    // Upload with upsert (overwrites previous)
    const filePath = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      logger.error('Upload error', {
        fileType: file.type,
        fileSize: file.size,
        errorMessage: uploadError.message,
      });
      return { success: false, error: 'Failed to upload image' };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error: any) {
    logger.error('Error in uploadProfilePicture', {
      errorMessage: error.message,
    });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
