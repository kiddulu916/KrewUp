import { createClient } from '@/lib/supabase/server';
import { ProfileEditTabs } from '@/features/profile/components/profile-edit-tabs';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { canHaveExperiences } from '@/features/profiles/constants/experience-labels';

export const metadata = {
  title: 'Edit Profile - KrewUp',
  description: 'Update your profile information and preferences',
};

export default async function ProfileEditPage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/onboarding');
  }

  // Fetch experiences only if user can have experiences (all roles except homeowner)
  let experiences: Array<{
    id: string;
    job_title: string;
    company: string;
    start_date: string;
    end_date?: string | null;
    description?: string | null;
  }> = [];

  if (canHaveExperiences(profile.role, profile.employer_type)) {
    const { data: experienceData } = await supabase
      .from('experiences')
      .select('id, job_title, company, start_date, end_date, description')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    if (experienceData) {
      experiences = experienceData;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">
          Edit Profile
        </h1>
        <p className="mt-2 text-gray-600">
          Update your profile information and preferences
        </p>
      </div>

      <ProfileEditTabs profile={profile} experiences={experiences} />
    </div>
  );
}
