import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ExperienceForm } from '@/features/profiles/components/experience-form';
import { cookies } from 'next/headers';
import {
  getExperienceLabels,
  canHaveExperiences,
} from '@/features/profiles/constants/experience-labels';

export const metadata = {
  title: 'Edit Experience - KrewUp',
  description: 'Edit your experience',
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditExperiencePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile to check role, employer type, and subscription status
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role, employer_type, subscription_status, is_lifetime_pro, is_admin, location, created_at, updated_at')
    .eq('id', user.id)
    .single();

  // Only workers and certain employer types can edit experiences
  if (profileError || !profile || !canHaveExperiences(profile.role, profile.employer_type)) {
    redirect('/dashboard/profile');
  }

  // Fetch the experience by ID and user_id (ownership check)
  const { data: experience, error: experienceError } = await supabase
    .from('experiences')
    .select('id, job_title, company, start_date, end_date, is_current, description')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  // If experience not found or doesn't belong to user, show 404
  if (experienceError || !experience) {
    notFound();
  }

  const labels = getExperienceLabels(profile.role, profile.employer_type);

  // Show photo upload for employers (contractors, developers, recruiters - not homeowners)
  const isEmployer = profile.role === 'employer';
  const showPhotoUpload = isEmployer;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">
          Edit {labels?.tabTitle || 'Experience'}
        </h1>
        <p className="mt-2 text-gray-600">
          Update your {labels?.tabTitle?.toLowerCase() || 'experience'} details
        </p>
      </div>

      <ExperienceForm
        labels={labels ?? undefined}
        existingExperience={experience}
        profile={profile}
        showPhotoUpload={showPhotoUpload}
      />
    </div>
  );
}
