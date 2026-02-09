import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Avatar } from '@/components/ui';
import { CertificationItem } from '@/features/profiles/components/certification-item';
import { ExperienceItem } from '@/features/profiles/components/experience-item';
import { EducationItem } from '@/features/profiles/components/education-item';
import { ProfileViewsList } from '@/features/subscriptions/components/profile-views-list';
import { CollapsibleSection, LicensePreviewCard } from '@/components/common';
import { canHaveExperiences, getExperienceLabels } from '@/features/profiles/constants/experience-labels';
import Link from 'next/link';
import { cookies } from 'next/headers';
import type { Certification, Experience, Education } from '@/types/database';

      

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

  // Get certifications if worker
  const { data: certificationsRaw } = profileWithMeta?.role === 'worker'
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
  const experienceLabels = getExperienceLabels(profile?.role, profile?.employer_type);

  const { data: workExperience } = showExperience
    ? await supabase
        .from('experiences')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
    : { data: null };

  // Get education if worker
  const { data: education } = profileWithMeta?.role === 'worker'
    ? await supabase
        .from('education')
        .select('*')
        .eq('user_id', user.id)
        .order('end_date', { ascending: false, nullsFirst: false })
    : { data: null };

  // Get contractor license if contractor
  const { data: contractorLicense } = profileWithMeta?.role === 'employer' &&
    profileWithMeta?.employer_type === 'contractor'
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
            Manage your profile information and settings
          </p>
        </div>
        <Link href="/dashboard/profile/edit">
          <Button>Edit Profile</Button>
        </Link>
      </div>

      {/* Basic Info Card */}
      <CollapsibleSection
        title="Basic Information"
        defaultOpen={true}
        badge={profileWithMeta?.subscription_status === 'pro' ? <Badge variant="pro">Pro Member</Badge> : undefined}
      >
        <div className="flex items-start gap-6">
          {/* Profile Picture */}
          <Avatar
            src={profileWithMeta?.profile_image_url}
            name={profileWithMeta?.name || ''}
            userId={profileWithMeta?.id || ''}
            size="xl"
            className="border-4 border-gray-200"
          />

          {/* Info Grid */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="mt-1 text-base text-gray-900">{profileWithMeta?.name}</p>
            </div>
            {profileWithMeta?.role === 'employer' && profileWithMeta?.company_name && (
              <div>
                <p className="text-sm font-medium text-gray-500">Company Name</p>
                <p className="mt-1 text-base text-gray-900">{profileWithMeta.company_name}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="mt-1 text-base text-gray-900">{profileWithMeta?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <p className="mt-1 text-base text-gray-900 capitalize">{profileWithMeta?.role}</p>
            </div>
            {profileWithMeta?.employer_type && (
              <div>
                <p className="text-sm font-medium text-gray-500">Employer Type</p>
                <p className="mt-1 text-base text-gray-900 capitalize">
                  {profileWithMeta.employer_type}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Trade</p>
              <p className="mt-1 text-base text-gray-900">{profileWithMeta?.trade}</p>
            </div>
            {profileWithMeta?.sub_trade && (
              <div>
                <p className="text-sm font-medium text-gray-500">Specialty</p>
                <p className="mt-1 text-base text-gray-900">{profileWithMeta.sub_trade}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Location</p>
              <p className="mt-1 text-base text-gray-900">{profileWithMeta?.location}</p>
            </div>
            {profileWithMeta?.phone && (
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="mt-1 text-base text-gray-900">{profileWithMeta.phone}</p>
              </div>
            )}
          </div>
        </div>

        {profileWithMeta?.bio && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-500">Bio</p>
            <p className="mt-2 text-base text-gray-700">{profileWithMeta.bio}</p>
          </div>
        )}
      </CollapsibleSection>

      {/* Contractor License - Contractors Only */}
      {profileWithMeta?.role === 'employer' && profileWithMeta?.employer_type === 'contractor' && (
        <CollapsibleSection title="Contractor License" defaultOpen={true}>
          <LicensePreviewCard license={contractorLicense} />
        </CollapsibleSection>
      )}

      {/* Who Viewed My Profile - Workers Only */}
      {profileWithMeta?.role === 'worker' && (
        <CollapsibleSection title="Who Viewed My Profile" defaultOpen={true}>
          <ProfileViewsList />
        </CollapsibleSection>
      )}

      {/* Certifications - Workers Only */}
      {profileWithMeta?.role === 'worker' && (
        <CollapsibleSection
          title="Certifications"
          defaultOpen={true}
          actions={
            <Link href="/dashboard/profile/certifications">
              <Button variant="outline" size="sm">
                Add Certification
              </Button>
            </Link>
          }
        >
          {certifications.length > 0 ? (
            <div className="space-y-3">
              {certifications.map((cert) => (
                <CertificationItem key={cert.id} cert={cert} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No certifications added yet</p>
              <p className="text-sm mt-1">
                Add certifications to stand out to employers
              </p>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Experience - All users except homeowners */}
      {showExperience && experienceLabels && (
        <CollapsibleSection
          title={experienceLabels.tabTitle}
          defaultOpen={true}
          actions={
            <Link href="/dashboard/profile/experience">
              <Button variant="outline" size="sm">
                Add {experienceLabels.tabTitle}
              </Button>
            </Link>
          }
        >
          {workExperience && workExperience.length > 0 ? (
            <div className="space-y-4">
              {workExperience.map((exp) => (
                <ExperienceItem key={exp.id} exp={exp} labels={experienceLabels} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No {experienceLabels.tabTitle.toLowerCase()} added yet</p>
              <p className="text-sm mt-1">
                Add your {experienceLabels.tabTitle.toLowerCase()} to showcase your background
              </p>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Education - Workers Only */}
      {profile?.role === 'worker' && (
        <CollapsibleSection
          title="Education"
          defaultOpen={true}
          actions={
            <Link href="/dashboard/profile/education">
              <Button variant="outline" size="sm">
                Add Education
              </Button>
            </Link>
          }
        >
          {education && education.length > 0 ? (
            <div className="space-y-3">
              {education.map((edu) => (
                <EducationItem key={edu.id} education={edu} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No education added yet</p>
              <p className="text-sm mt-1">
                Add your education to enhance your profile
              </p>
            </div>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}
