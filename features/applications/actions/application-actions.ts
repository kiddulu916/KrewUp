'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { moveFileToApplication } from './file-upload-actions';
import { deleteDraft } from './draft-actions';
import { saveApplicationDataToProfile } from './save-to-profile-actions';
import type { ApplicationFormData } from '../types/application.types';
import { logger } from '@/lib/utils/logger';
import { success, error, handleActionError, requireAuth, getUserFriendlyError, validateInput } from '@/lib/utils/action-response';
import type { ActionResponse } from '@/lib/utils/action-response';
import { createApplicationSchema, updateApplicationStatusSchema, type CreateApplicationInput, type UpdateApplicationStatusInput } from '@/lib/validation/schemas';

type ApplicationResult = ActionResponse<void>;

type CreateApplicationData = {
  jobId: string;
  coverLetter?: string;
};

/**
 * Submit a job application as a worker.
 *
 * Validates that the user is authenticated and is a worker, checks for duplicate
 * applications, and creates a new application record with 'pending' status.
 *
 * @param data - Application data containing jobId and optional coverLetter
 * @param data.jobId - UUID of the job to apply to
 * @param data.coverLetter - Optional cover letter text (max 5000 characters)
 * @returns Promise resolving to ApplicationResult with success status
 * @throws Will return error if user is not authenticated, not a worker, or already applied
 *
 * @example
 * ```ts
 * const result = await createApplication({
 *   jobId: '123e4567-e89b-12d3-a456-426614174000',
 *   coverLetter: 'I am interested in this position...'
 * });
 * if (result.success) {
 *   // Application submitted successfully
 * }
 * ```
 */
export async function createApplication(
  data: CreateApplicationData
): Promise<ApplicationResult> {
  return handleActionError(async () => {
    // Validate input
    const validation = validateInput(createApplicationSchema, data);
    if (!validation.success) return validation.error;
    const validatedData: CreateApplicationInput = validation.data;

    const supabase = await createClient(await cookies());

    // Authentication check
    const authResult = await requireAuth(supabase);
    if (!authResult.success || !authResult.data) {
      return error(authResult.error || 'Not authenticated');
    }
    const user = authResult.data;

    // Check if user is a worker
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'worker') {
      return error('Only workers can apply to jobs');
    }

    // Check if already applied
    const { data: existingApp } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', validatedData.jobId)
      .eq('applicant_id', user.id)
      .single();

    if (existingApp) {
      return error('You have already applied to this job');
    }

    // Create application
    const { error: insertError } = await supabase.from('job_applications').insert({
      job_id: validatedData.jobId,
      applicant_id: user.id,
      cover_letter: validatedData.coverLetter || null,
      status: 'pending',
    });

    if (insertError) {
      return error(getUserFriendlyError(insertError, 'Failed to submit application'));
    }

    revalidatePath('/dashboard/applications');
    revalidatePath('/dashboard/jobs');

    return success();
  }, 'Failed to create application');
}

/**
 * Update the status of a job application (employer only).
 *
 * Allows employers to update the status of applications for their own job postings.
 * Validates that the user is authenticated, owns the job, and the application exists.
 *
 * @param applicationId - UUID of the application to update
 * @param status - New status for the application ('pending' | 'viewed' | 'hired' | 'rejected')
 * @returns Promise resolving to ApplicationResult with success status
 * @throws Will return error if user is not authenticated, doesn't own the job, or application not found
 *
 * @example
 * ```ts
 * const result = await updateApplicationStatus(
 *   '123e4567-e89b-12d3-a456-426614174000',
 *   'viewed'
 * );
 * if (result.success) {
 *   // Status updated successfully
 * }
 * ```
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: 'pending' | 'viewed' | 'hired' | 'rejected'
): Promise<ApplicationResult> {
  return handleActionError(async () => {
    // Validate input
    const validation = validateInput(updateApplicationStatusSchema, { applicationId, status });
    if (!validation.success) return validation.error;
    const validatedData: UpdateApplicationStatusInput = validation.data;

    const supabase = await createClient(await cookies());

    // Authentication check
    const authResult = await requireAuth(supabase);
    if (!authResult.success || !authResult.data) {
      return error(authResult.error || 'Not authenticated');
    }
    const user = authResult.data;

    // Check if user is an employer and owns the job
    const { data: application } = await supabase
      .from('job_applications')
      .select('id, job_id')
      .eq('id', validatedData.applicationId)
      .single();

    if (!application) {
      return error('Application not found');
    }

    // Verify the job belongs to the user
    const { data: job } = await supabase
      .from('jobs')
      .select('employer_id')
      .eq('id', application.job_id)
      .single();

    if (!job || job.employer_id !== user.id) {
      return error('You can only update applications to your jobs');
    }

    // Update status
    const { error: updateError } = await supabase
      .from('job_applications')
      .update({ status: validatedData.status })
      .eq('id', validatedData.applicationId);

    if (updateError) {
      return error(getUserFriendlyError(updateError, 'Failed to update application status'));
    }

    revalidatePath('/dashboard/applications');
    revalidatePath('/dashboard/jobs');

    return success();
  }, 'Failed to update application status');
}

/**
 * Check if the current authenticated user has already applied to a specific job.
 *
 * Returns false if user is not authenticated or has not applied.
 * Used to prevent duplicate applications and show application status in UI.
 *
 * @param jobId - UUID of the job to check
 * @returns Promise resolving to boolean indicating if user has applied
 *
 * @example
 * ```ts
 * const applied = await hasApplied('123e4567-e89b-12d3-a456-426614174000');
 * if (applied) {
 *   // Show "Already Applied" button
 * }
 * ```
 */
export async function hasApplied(jobId: string): Promise<boolean> {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('applicant_id', user.id)
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Get all applications for a specific job (employer only).
 *
 * Fetches applications for a job, including applicant profile information.
 * Applications are sorted with boosted profiles first, then by creation date (newest first).
 * Only the job owner can access this data.
 *
 * @param jobId - UUID of the job to get applications for
 * @returns Promise resolving to object with success status and applications array
 * @throws Will return error if user is not authenticated or doesn't own the job
 *
 * @example
 * ```ts
 * const result = await getJobApplications('123e4567-e89b-12d3-a456-426614174000');
 * if (result.success && result.data) {
 *   // Display applications list
 *   result.data.forEach(app => console.log(app.applicant.name));
 * }
 * ```
 */
export async function getJobApplications(jobId: string) {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated', data: null };
    }

    // Verify user owns the job
    const { data: job } = await supabase
      .from('jobs')
      .select('employer_id')
      .eq('id', jobId)
      .single();

    if (!job || job.employer_id !== user.id) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    const { data: applications, error } = await supabase
      .from('job_applications')
      .select(
        `
        *,
        applicant:users!applicant_id(
          id,
          name,
          trade,
          sub_trade,
          location,
          bio,
          is_profile_boosted,
          boost_expires_at
        )
      `
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false});

    if (error) {
      logger.error('Error fetching applications', { error: error instanceof Error ? error.message : String(error) });
      return { success: false, error: 'Failed to fetch applications', data: null };
    }

    // Sort applications: boosted profiles first, then by creation date
    const sortedApplications = applications?.sort((a, b) => {
      // Check if boosts are active (not expired)
      const aIsBoosted = a.worker?.is_profile_boosted &&
        a.worker?.boost_expires_at &&
        new Date(a.worker.boost_expires_at) > new Date();
      const bIsBoosted = b.worker?.is_profile_boosted &&
        b.worker?.boost_expires_at &&
        new Date(b.worker.boost_expires_at) > new Date();

      // Boosted profiles come first
      if (aIsBoosted && !bIsBoosted) return -1;
      if (!aIsBoosted && bIsBoosted) return 1;

      // If both have same boost status, sort by created_at (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return { success: true, data: sortedApplications };
  } catch (error) {
    logger.error('Error in getJobApplications', { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'An unexpected error occurred', data: null };
  }
}

/**
 * Submit comprehensive job application from the application wizard.
 *
 * Creates a final application record, moves files from draft storage to application storage,
 * saves application data to user profile for future auto-fill, and deletes the draft.
 * This is the final submission step after completing all wizard steps.
 *
 * @param jobId - UUID of the job to apply to
 * @param formData - Complete application form data from all wizard steps
 * @param resumeUrl - Optional URL of the uploaded resume (may be in draft storage)
 * @param coverLetterUrl - Optional URL of the uploaded cover letter (may be in draft storage)
 * @param resumeExtractedText - Optional extracted text from resume for searchability
 * @returns Promise resolving to object with success status and optional applicationId
 * @throws Will return error if user is not authenticated, not a worker, or already applied
 *
 * @example
 * ```ts
 * const result = await submitApplication(
 *   jobId,
 *   formData,
 *   resumeUrl,
 *   coverLetterUrl,
 *   extractedText
 * );
 * if (result.success) {
 *   // Redirect to success page
 *   router.push(`/dashboard/applications/${result.applicationId}`);
 * }
 * ```
 */
export async function submitApplication(
  jobId: string,
  formData: Partial<ApplicationFormData>,
  resumeUrl?: string,
  coverLetterUrl?: string,
  resumeExtractedText?: string
): Promise<{ success: boolean; error?: string; applicationId?: string }> {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is a worker
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'worker') {
      return { success: false, error: 'Only workers can apply to jobs' };
    }

    // Check if already applied
    const { data: existingApp } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('applicant_id', user.id)
      .single();

    if (existingApp) {
      return { success: false, error: 'You have already applied to this job' };
    }

    // Extract custom answers if present (not part of ApplicationFormData type)
    const customAnswers = (formData as any).customAnswers || null;

    // Create the application
    const { data: application, error: createError } = await supabase
      .from('job_applications')
      .insert({
        job_id: jobId,
        applicant_id: user.id,
        status: 'pending',
        form_data: formData,
        custom_answers: customAnswers,
        resume_extracted_text: resumeExtractedText || null,
      })
      .select('id')
      .single();

    if (createError || !application) {
      logger.error('Error creating application', { error: createError instanceof Error ? createError.message : String(createError) });
      return { success: false, error: 'Failed to submit application' };
    }

    const applicationId = application.id;

    // Move files from draft storage to application storage
    let finalResumeUrl = resumeUrl;
    let finalCoverLetterUrl = coverLetterUrl;

    if (resumeUrl && resumeUrl.includes('application-drafts')) {
      // Extract the file path from the URL
      const urlParts = resumeUrl.split('/application-drafts/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const moveResult = await moveFileToApplication(
          filePath,
          applicationId,
          'resume.' + filePath.split('.').pop()
        );
        if (moveResult.success && moveResult.url) {
          finalResumeUrl = moveResult.url;
        }
      }
    }

    if (coverLetterUrl && coverLetterUrl.includes('application-drafts')) {
      const urlParts = coverLetterUrl.split('/application-drafts/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const moveResult = await moveFileToApplication(
          filePath,
          applicationId,
          'cover-letter.' + filePath.split('.').pop()
        );
        if (moveResult.success && moveResult.url) {
          finalCoverLetterUrl = moveResult.url;
        }
      }
    }

    // Update application with final file URLs
    if (finalResumeUrl || finalCoverLetterUrl) {
      await supabase
        .from('job_applications')
        .update({
          resume_url: finalResumeUrl || null,
          cover_letter_url: finalCoverLetterUrl || null,
        })
        .eq('id', applicationId);
    }

    // Save application data back to profile (for future auto-fill)
    await saveApplicationDataToProfile(formData);

    // Delete the draft
    await deleteDraft(jobId);

    // Revalidate paths
    revalidatePath('/dashboard/applications');
    revalidatePath('/dashboard/jobs');
    revalidatePath(`/dashboard/jobs/${jobId}`);

    return { success: true, applicationId };
  } catch (error) {
    logger.error('Error in submitApplication', { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
