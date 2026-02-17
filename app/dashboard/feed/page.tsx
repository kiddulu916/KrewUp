import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { InitialLocationCapture } from '@/features/dashboard/components/initial-location-capture';
import { cookies } from 'next/headers';
import { getFullName } from '@/lib/utils';
import Link from 'next/link';
import { InFeedAd } from '@/components/ads';

      

export const metadata = {
  title: 'Feed - KrewUp',
  description: 'Your personalized job feed',
};

export default async function FeedPage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*, is_admin')
    .eq('id', user.id)
    .single();

  // Fetch quick stats in parallel using Promise.all() to optimize page load time
  // This reduces database query time from ~300ms sequential to ~100ms parallel
  const isWorker = profile?.role === 'worker';

  let applicationsCount = 0;
  let conversationsCount = 0;
  let profileViewsCount = 0;

  if (isWorker) {
    // Parallelize all stats queries for workers
    const [
      { count: applications },
      { count: conversations },
      { count: profileViews },
    ] = await Promise.all([
      supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('applicant_id', user.id),
      supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`),
      supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('viewed_profile_id', user.id),
    ]);

    applicationsCount = applications || 0;
    conversationsCount = conversations || 0;
    profileViewsCount = profileViews || 0;
  } else {
    // For employers, fetch jobs then parallelize stats
    const { data: employerJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('employer_id', user.id);

    const jobIds = employerJobs?.map(job => job.id) || [];

    const [
      { count: applications },
      { count: conversations },
      { count: profileViews },
    ] = await Promise.all([
      jobIds.length > 0
        ? supabase
            .from('job_applications')
            .select('*', { count: 'exact', head: true })
            .in('job_id', jobIds)
        : Promise.resolve({ count: 0 }),
      supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`),
      supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('viewed_profile_id', user.id),
    ]);

    applicationsCount = applications || 0;
    conversationsCount = conversations || 0;
    profileViewsCount = profileViews || 0;
  }

  // Get full name for display
  const fullName = profile ? getFullName(profile) : '';

  return (
    <div className="space-y-6">
      {/* Capture initial location on first visit */}
      <InitialLocationCapture />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Welcome back, {fullName}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Here&apos;s what&apos;s happening in your network
          </p>
        </div>

        {/* Admin Panel Button - Only visible to admins */}
        {profile?.is_admin && (
          <a
            href="/admin/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Admin Panel →
          </a>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile?.role === 'worker' ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <p className="text-gray-600">
                  Start browsing jobs to find your next opportunity
                </p>
                <Link
                  href="/dashboard/jobs"
                  className="mt-2 inline-block text-krewup-blue hover:underline"
                >
                  Browse Jobs →
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <p className="text-gray-600">
                  Post your first job to start finding great workers
                </p>
                <Link
                  href="/dashboard/jobs/new"
                  className="mt-2 inline-block text-krewup-blue hover:underline"
                >
                  Post a Job →
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-krewup-blue">{applicationsCount}</p>
              <p className="text-sm text-gray-600">
                {profile?.role === 'worker' ? 'Applications' : 'Applications'}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-krewup-blue">{conversationsCount || 0}</p>
              <p className="text-sm text-gray-600">Messages</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-krewup-blue">{profileViewsCount || 0}</p>
              <p className="text-sm text-gray-600">Profile Views</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ad banner for free users (AdSense via env: NEXT_PUBLIC_ADSENSE_*) */}
      <InFeedAd
        subscriptionStatus={profile?.subscription_status}
        isLifetimePro={profile?.is_lifetime_pro}
      />
    </div>
  );
}
