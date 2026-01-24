'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { extractTextFromFile } from '@/lib/resume-parser/text-extractor';
import { validateFile, FILE_SIZE_LIMITS } from '@/lib/security/file-validation';
import { logger } from '@/lib/utils/logger';

type UploadResult = {
  success: boolean;
  error?: string;
  url?: string;
  extractedText?: string;
};

/**
 * Upload resume to draft storage bucket
 * Validates file type and size, extracts text content
 * Files stored in: application-drafts/{userId}/{jobId}/resume.{ext}
 */
export async function uploadResumeToDraft(
  jobId: string,
  file: File
): Promise<UploadResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // * Server-side file validation (type, size, name, magic bytes)
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ] as const;
    const validation = await validateFile(file, {
      allowedTypes,
      maxSize: FILE_SIZE_LIMITS.resume,
    });

    if (!validation.valid) {
      return { success: false, error: validation.error ?? 'Invalid file' };
    }

    // Extract file extension
    const safeName = validation.sanitizedName ?? file.name;
    const ext = safeName.split('.').pop() || 'pdf';

    // Upload to application-drafts storage bucket
    const filePath = `${user.id}/${jobId}/resume.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('application-drafts')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      logger.error('Upload error', { error: uploadError instanceof Error ? uploadError.message : String(uploadError) });
      return { success: false, error: 'Failed to upload file' };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('application-drafts')
      .getPublicUrl(filePath);

    // Extract text from resume
    let extractedText: string | undefined;
    try {
      extractedText = await extractTextFromFile(file);
    } catch (error) {
      logger.error('Text extraction error', { error: error instanceof Error ? error.message : String(error) });
      // Non-fatal - file uploaded successfully even if text extraction fails
    }

    return {
      success: true,
      url: publicUrl,
      extractedText,
    };
  } catch (error) {
    logger.error('Error in uploadResumeToDraft', { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Upload cover letter to draft storage bucket
 * Validates file type and size
 * Files stored in: application-drafts/{userId}/{jobId}/cover-letter.{ext}
 */
export async function uploadCoverLetterToDraft(
  jobId: string,
  file: File
): Promise<UploadResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // * Server-side file validation (type, size, name, magic bytes)
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ] as const;
    const validation = await validateFile(file, {
      allowedTypes,
      maxSize: FILE_SIZE_LIMITS.resume,
    });

    if (!validation.valid) {
      return { success: false, error: validation.error ?? 'Invalid file' };
    }

    // Extract file extension
    const safeName = validation.sanitizedName ?? file.name;
    const ext = safeName.split('.').pop() || 'pdf';

    // Upload to application-drafts storage bucket
    const filePath = `${user.id}/${jobId}/cover-letter.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('application-drafts')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      logger.error('Upload error', { error: uploadError instanceof Error ? uploadError.message : String(uploadError) });
      return { success: false, error: 'Failed to upload file' };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('application-drafts')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error) {
    logger.error('Error in uploadCoverLetterToDraft', { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Move file from draft storage to application storage
 * Called during application submission to move files to permanent storage
 * Files moved to: applications/{applicationId}/{fileName}
 *
 * @param sourcePath - Path in application-drafts bucket (e.g., "userId/jobId/resume.pdf")
 * @param applicationId - UUID of the submitted application
 * @param fileName - Destination filename (e.g., "resume.pdf", "cover-letter.pdf")
 */
export async function moveFileToApplication(
  sourcePath: string,
  applicationId: string,
  fileName: string
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const supabase = await createClient(await cookies());

    // Download from draft storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('application-drafts')
      .download(sourcePath);

    if (downloadError) {
      logger.error('Download error', { error: downloadError instanceof Error ? downloadError.message : String(downloadError) });
      return { success: false, error: 'Failed to move file' };
    }

    // Upload to applications storage
    const destPath = `${applicationId}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('applications')
      .upload(destPath, fileData, { upsert: true });

    if (uploadError) {
      logger.error('Upload error', { error: uploadError instanceof Error ? uploadError.message : String(uploadError) });
      return { success: false, error: 'Failed to move file' };
    }

    // Get public URL from applications bucket
    const { data: { publicUrl } } = supabase.storage
      .from('applications')
      .getPublicUrl(destPath);

    // Delete from draft storage (cleanup)
    await supabase.storage
      .from('application-drafts')
      .remove([sourcePath]);

    return { success: true, url: publicUrl };
  } catch (error) {
    logger.error('Error in moveFileToApplication', { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
