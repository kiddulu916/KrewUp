import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui';
import { ProfileViewTabs } from '@/features/profile/components/profile-view-tabs';
import { canHaveExperiences } from '@/features/profiles/constants/experience-labels';
import Link from 'next/link';
import { cookies } from 'next/headers';
import type { Certification } from '@/types/database';
import type { ExperiencePhoto } from '@/features/profiles/types';

export const metadata = {
  title: 'Profile - KrewUp',
  description: 'View and manage your profile',
};

export default async function ProfilePage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select(`
      *,
      workers(trade, sub_trade, years_of_experience),
      contractors(company_name)
    `)
    .eq('id', user.id)
    .single();

  // Map to common format for UI
  const profileWithMeta = profile ? {
    ...profile,
    name: `${profile.first_name} ${profile.last_name}`.trim(),
    trade: profile.workers?.[0]?.trade,
    sub_trade: profile.workers?.[0]?.sub_trade,
    company_name: profile.contractors?.[0]?.company_name,
  } : null;

  if (!profileWithMeta) return null;

  // Get certifications if worker
  const { data: certificationsRaw } = profileWithMeta.role === 'worker'
    ? await supabase
        .from('certifications')
        .select('*')
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false })
    : { data: null };

  // Map certification fields to component expected format
  const certifications = (certificationsRaw || []).map((cert: Certification) => ({
    id: cert.id,
    credential_category: 'certification' as const,
    certification_type: cert.name,
    certification_number: cert.credential_id,
    issued_by: cert.issuing_organization,
    expires_at: cert.expiration_date,
    is_verified: cert.verification_status === 'verified',
    verification_status: cert.verification_status as 'pending' | 'verified' | 'rejected' | undefined,
    rejection_reason: cert.rejection_reason,
  }));

  // Get work experience for all users who can have experiences (not homeowners)
  const showExperience = canHaveExperiences(profile?.role, profile?.employer_type);

  const { data: workExperience } = showExperience
    ? await supabase
        .from('experiences')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
    : { data: null };

  // Fetch experience photos for employers
  const experienceIds = workExperience?.map((exp) => exp.id) || [];
  const { data: experiencePhotosRaw } = experienceIds.length > 0
    ? await supabase
        .from('experience_photos')
        .select('*')
        .in('experience_id', experienceIds)
        .order('display_order', { ascending: true })
    : { data: null };

  // Group photos by experience_id
  const experiencePhotosMap = (experiencePhotosRaw as ExperiencePhoto[] || []).reduce<Record<string, ExperiencePhoto[]>>(
    (acc, photo) => {
      if (!acc[photo.experience_id]) {
        acc[photo.experience_id] = [];
      }
      acc[photo.experience_id].push(photo);
      return acc;
    },
    {}
  );

  // Get education if worker
  const { data: education } = profileWithMeta.role === 'worker'
    ? await supabase
        .from('education')
        .select('*')
        .eq('user_id', user.id)
        .order('end_date', { ascending: false, nullsFirst: false })
    : { data: null };

  // Get contractor license if contractor
  const { data: contractorLicense } = profileWithMeta.role === 'employer' &&
    profileWithMeta.employer_type === 'contractor'
    ? await supabase
        .from('licenses')
        .select('*')
        .eq('contractor_id', user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-gray-600">
            View and manage your profile information
          </p>
        </div>
        <Link href="/dashboard/profile/edit">
          <Button>Edit Profile</Button>
        </Link>
      </div>

      {/* Profile Tabs */}
      <ProfileViewTabs
        profile={profileWithMeta}
        certifications={certifications}
        workExperience={workExperience || []}
        experiencePhotosMap={experiencePhotosMap}
        education={education || []}
        contractorLicense={contractorLicense}
      />
    </div>
  );
}
