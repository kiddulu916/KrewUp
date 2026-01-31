'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { addCertification } from '@/features/profiles/actions/certification-actions';
import { logger, sanitizeUserId, sanitizeEmail } from '@/lib/utils/logger';
import { getUserFriendlyError } from '@/lib/utils/action-response';

export type OnboardingData = {
  name: string;
  phone: string;
  email: string;
  role: 'worker' | 'employer';
  employer_type?: 'contractor' | 'recruiter' | 'homeowner' | 'developer';
  company_name?: string; // Business name for employers
  trade: string;
  sub_trade?: string;
  location: string;
  coords?: { lat: number; lng: number } | null;
  bio?: string;
  licenseData?: {
    license_type: string;
    license_number: string;
    issuing_authority: string;
    issuing_state: string;
    issue_date: string;
    expires_at: string;
    photo_url: string;
  };
};

export type OnboardingResult = {
  success: boolean;
  error?: string;
};

/**
 * Complete user onboarding and update profile
 */
export async function completeOnboarding(data: OnboardingData): Promise<OnboardingResult> {
  const supabase = await createClient(await cookies());

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if profile exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  logger.info('Checking existing profile', {
    userId: sanitizeUserId(user.id),
    exists: !!existingProfile,
    error: checkError?.message,
  });

  // If profile doesn't exist, create it first
  if (!existingProfile) {
    logger.info('Profile does not exist, creating new profile', {
      userId: sanitizeUserId(user.id),
      role: data.role,
    });
    const [firstName, ...lastNameParts] = data.name.trim().split(' ');
    const lastName = lastNameParts.join(' ') || '';

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email || data.email,
        first_name: firstName,
        last_name: lastName,
        role: data.role,
        subscription_status: 'free',
        location: data.location || 'Update Location',
        bio: data.bio || `${data.role === 'worker' ? 'Skilled' : 'Hiring'} professional`,
        phone: data.phone,
      });

    if (insertError) {
      logger.error('Error creating profile', {
        userId: sanitizeUserId(user.id),
        error: insertError.message,
        code: insertError.code,
      });
      return { success: false, error: getUserFriendlyError(insertError, 'Failed to create profile') };
    }
    logger.info('Profile created successfully', {
      userId: sanitizeUserId(user.id),
      role: data.role,
    });
  }

  // Set default location if not provided
  const location = data.location || 'United States';
  const coords = data.coords;

  // 1. Update users table
  const [firstName, ...lastNameParts] = data.name.trim().split(' ');
  const lastName = lastNameParts.join(' ') || '';

  const userUpdate: Record<string, unknown> = {
    first_name: firstName,
    last_name: lastName,
    phone: data.phone,
    email: data.email,
    role: data.role,
    location: location,
    bio: data.bio || `${data.role === 'worker' ? 'Skilled' : 'Hiring'} ${data.trade} professional`,
    employer_type: data.role === 'employer' ? data.employer_type || null : null,
  };

  const { error: userError } = await supabase
    .from('users')
    .update(userUpdate)
    .eq('id', user.id);

  if (userError) {
    return { success: false, error: getUserFriendlyError(userError, 'Failed to update profile') };
  }

  // 2. Update role-specific tables using UPSERT to handle role switching
  // (User may have signed up as worker but selected employer during onboarding)
  if (data.role === 'worker') {
    const { error: workerError } = await supabase
      .from('workers')
      .upsert({
        user_id: user.id,
        trade: data.trade || 'General Laborer',
        sub_trade: data.sub_trade || null,
      }, { onConflict: 'user_id' });

    if (workerError) {
      logger.error('Worker table upsert error', {
        userId: sanitizeUserId(user.id),
        error: workerError.message,
        code: workerError.code,
      });
      return { success: false, error: getUserFriendlyError(workerError, 'Failed to save worker profile') };
    }
  } else if (data.role === 'employer') {
    // Handle all employer types with their respective tables
    const employerTableMap: Record<string, string> = {
      contractor: 'contractors',
      recruiter: 'recruiters',
      homeowner: 'home_owners',
      developer: 'developers',
    };

    const tableName = data.employer_type ? employerTableMap[data.employer_type] : null;

    if (tableName) {
      const { error: employerError } = await supabase
        .from(tableName)
        .upsert({
          user_id: user.id,
          company_name: data.company_name || null,
        }, { onConflict: 'user_id' });

      if (employerError) {
        logger.error(`${data.employer_type} table upsert error`, {
          userId: sanitizeUserId(user.id),
          error: employerError.message,
          code: employerError.code,
        });
        return { success: false, error: getUserFriendlyError(employerError, `Failed to save ${data.employer_type} profile`) };
      }
    }
  }

  // 3. Handle coords update separately with PostGIS
  // * Use proper RPC function for PostGIS operations
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    const { error: coordsError } = await supabase.rpc('update_user_coords', {
      p_user_id: user.id,
      p_lng: coords.lng,
      p_lat: coords.lat,
    });

    if (coordsError) {
      logger.error('Coords update error', {
        userId: sanitizeUserId(user.id),
        error: coordsError.message,
        lat: coords.lat,
        lng: coords.lng,
      });
    }
  }

  // If contractor, create license certification and set can_post_jobs to false
  if (data.employer_type === 'contractor' && data.licenseData) {
    // Save license as certification
    const certResult = await addCertification({
      credential_category: 'license',
      certification_type: data.licenseData.license_type,
      certification_number: data.licenseData.license_number,
      issued_by: data.licenseData.issuing_authority,
      issuing_state: data.licenseData.issuing_state,
      issue_date: data.licenseData.issue_date,
      expires_at: data.licenseData.expires_at,
      photo_url: data.licenseData.photo_url,
    });

    if (!certResult.success) {
      return { success: false, error: certResult.error || 'Failed to save license' };
    }

    logger.info('Contractor license saved', {
      userId: sanitizeUserId(user.id),
      licenseType: data.licenseData.license_type,
      issuingState: data.licenseData.issuing_state,
    });
  }

  // Verify the profile was updated correctly
  const { data: updatedProfile, error: verifyError } = await supabase
    .from('users')
    .select('first_name, last_name, role, location, phone, email')
    .eq('id', user.id)
    .single();

  const profile = updatedProfile ? {
    ...updatedProfile,
    name: `${updatedProfile.first_name} ${updatedProfile.last_name}`.trim()
  } : null;

  logger.info('Onboarding completed successfully', {
    userId: sanitizeUserId(user.id),
    role: data.role,
    hasName: !!profile?.name,
    hasLocation: !!profile?.location,
    nameStartsWithUser: profile?.name?.startsWith('User-'),
    locationIsDefault: profile?.location === 'Update Location',
    verifyError: verifyError?.message,
  });

  revalidatePath('/', 'layout');
  // Return success - client handles redirect (server redirect doesn't work reliably from onClick handlers)
  return { success: true };
}
