import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ExperienceForm } from '@/features/profiles/components/experience-form';
import { cookies } from 'next/headers';
import {
  getExperienceLabels,
  canHaveExperiences,
} from '@/features/profiles/constants/experience-labels';

      

export const metadata = {
  title: 'Add Work Experience - KrewUp',
  description: 'Add work experience to your profile',
};

export default async function AddExperiencePage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role, employer_type, subscription_status, is_lifetime_pro, is_admin, location, created_at, updated_at')
    .eq('id', user.id)
    .single();

  // Only workers and certain employer types can add experiences
  if (error || !profile || !canHaveExperiences(profile.role, profile.employer_type)) {
    redirect('/dashboard/profile');
  }

  const labels = getExperienceLabels(profile.role, profile.employer_type);

  // Show photo upload only for contractors and developers
  const isContractorOrDeveloper =
    profile.role === 'employer' &&
    (profile.employer_type === 'contractor' || profile.employer_type === 'developer');
  const showPhotoUpload = isContractorOrDeveloper;

  // Determine description text based on user type
  const getDescriptionText = () => {
    if (profile.role === 'worker') {
      return 'Showcase your work history and skills';
    }
    if (profile.employer_type === 'recruiter') {
      return 'Add your recruiting experience';
    }
    // Contractors and developers
    return 'Add your projects and client work';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">
          Add {labels?.tabTitle || 'Experience'}
        </h1>
        <p className="mt-2 text-gray-600">
          {getDescriptionText()}
        </p>
      </div>

      <ExperienceForm
        labels={labels ?? undefined}
        profile={profile}
        showPhotoUpload={showPhotoUpload}
      />
    </div>
  );
}
