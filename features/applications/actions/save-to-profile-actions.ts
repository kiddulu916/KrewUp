'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { ApplicationFormData } from '../types/application.types';
import { logger } from '@/lib/utils/logger';

export type SaveToProfileResult = {
  success: boolean;
  error?: string;
};

/**
 * Save application data back to worker profile
 * Updates profile fields and related tables (work_experience, education, references)
 * This keeps profile as master copy for future applications
 */
export async function saveApplicationDataToProfile(
  formData: Partial<ApplicationFormData>
): Promise<SaveToProfileResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // 1. Update profile table (only if fullName provided)
    let firstName = '';
    let lastName = '';
    if (formData.fullName) {
      const nameParts = formData.fullName.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    const { error: profileError } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: formData.phoneNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      logger.error('Profile update error', { error: profileError instanceof Error ? profileError.message : String(profileError) });
      return { success: false, error: 'Failed to update profile' };
    }

    // 2. Update worker table
    const { error: workerError } = await supabase
      .from('workers')
      .update({
        years_of_experience: formData.yearsOfExperience,
        trade_skills: formData.tradeSkills,
        authorized_to_work: formData.authorizedToWork,
        has_dl: formData.hasDriversLicense,
        dl_class: formData.licenseClass || null,
        reliable_transportation: formData.hasReliableTransportation,
        emergency_contact_name: formData.emergencyContact?.name,
        emergency_contact_relationship: formData.emergencyContact?.relationship,
        emergency_contact_phone: formData.emergencyContact?.phone,
      })
      .eq('user_id', user.id);

    if (workerError) {
      logger.error('Worker profile update error', { error: workerError instanceof Error ? workerError.message : String(workerError) });
    }

    // 3. Upsert work experience
    if (formData.workHistory && formData.workHistory.length > 0) {
      const workExpData = formData.workHistory.map((exp) => ({
        id: exp.id.startsWith('temp-') ? undefined : exp.id,
        user_id: user.id,
        job_title: exp.jobTitle,
        company: exp.companyName,
        start_date: exp.startDate,
        end_date: exp.endDate || null,
        is_current: exp.isCurrent,
        description: exp.responsibilities,
      }));

      // Delete existing work experience not in the list
      const existingIds = workExpData
        .filter((exp) => exp.id)
        .map((exp) => exp.id);

      if (existingIds.length > 0) {
        await supabase
          .from('experiences')
          .delete()
          .eq('user_id', user.id)
          .not('id', 'in', `(${existingIds.join(',')})`);
      } else {
        await supabase.from('experiences').delete().eq('user_id', user.id);
      }

      const { error: workExpError } = await supabase
        .from('experiences')
        .upsert(workExpData, { onConflict: 'id', ignoreDuplicates: false });

      if (workExpError) {
        logger.error('Work experience update error', { error: workExpError instanceof Error ? workExpError.message : String(workExpError) });
      }
    }

    // 4. Upsert education
    if (formData.education && formData.education.length > 0) {
      const educationData = formData.education.map((edu) => ({
        id: edu.id.startsWith('temp-') ? undefined : edu.id,
        user_id: user.id,
        institution: edu.institutionName,
        degree: edu.degreeType,
        field_of_study: edu.fieldOfStudy,
        start_date: null, // No start_date in form?
        end_date: edu.graduationYear ? `${edu.graduationYear}-01-01` : null,
      }));

      // Delete existing education not in the list
      const existingIds = educationData.filter((edu) => edu.id).map((edu) => edu.id);

      if (existingIds.length > 0) {
        await supabase
          .from('education')
          .delete()
          .eq('user_id', user.id)
          .not('id', 'in', `(${existingIds.join(',')})`);
      } else {
        await supabase.from('education').delete().eq('user_id', user.id);
      }

      const { error: educationError } = await supabase
        .from('education')
        .upsert(educationData, { onConflict: 'id', ignoreDuplicates: false });

      if (educationError) {
        logger.error('Education update error', { error: educationError instanceof Error ? educationError.message : String(educationError) });
      }
    }

    // 4. Upsert professional references
    if (formData.references && formData.references.length > 0) {
      const referencesData = formData.references.map((ref) => ({
        id: ref.id.startsWith('temp-') ? undefined : ref.id,
        user_id: user.id,
        name: ref.name,
        company: ref.company,
        phone: ref.phone,
        email: ref.email,
        relationship: ref.relationship,
      }));

      // Delete existing professional references not in the list
      const existingIds = referencesData.filter((ref) => ref.id).map((ref) => ref.id);

      if (existingIds.length > 0) {
        await supabase
          .from('professional_references')
          .delete()
          .eq('user_id', user.id)
          .not('id', 'in', `(${existingIds.join(',')})`);
      } else {
        await supabase.from('professional_references').delete().eq('user_id', user.id);
      }

      // Upsert all professional references
      const { error: referencesError } = await supabase
        .from('professional_references')
        .upsert(referencesData, { onConflict: 'id', ignoreDuplicates: false });

      if (referencesError) {
        logger.error('Professional references update error', { error: referencesError instanceof Error ? referencesError.message : String(referencesError) });
      }
    }

    // Note: Certifications are kept separate (image-based verification)
    // They're managed through the certifications table with image uploads

    return { success: true };
  } catch (error) {
    logger.error('Error saving to profile', { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: 'Failed to save application data to profile' };
  }
}
