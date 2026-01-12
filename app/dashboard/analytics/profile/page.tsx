import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProfileViewsChart } from '@/features/subscriptions/components/profile-views-chart';
import { ProfileViewsList } from '@/features/subscriptions/components/profile-views-list';
import { CollapsibleSection } from '@/components/common';

export const metadata = {
  title: 'Profile Analytics - KrewUp',
  description: 'See who viewed your profile and track your visibility',
};

export default async function ProfileAnalyticsPage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is a worker
  const { data: profile } = await supabase
    .from('users')
    .select('role, subscription_status')
    .eq('id', user.id)
    .single();

  // Only workers can access profile analytics
  if (profile?.role !== 'worker') {
    redirect('/dashboard');
  }

  const isPro = profile?.subscription_status === 'pro';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Analytics</h1>
        <p className="mt-2 text-gray-600">
          Track who's viewing your profile and monitor your visibility to employers
        </p>
      </div>

      {/* Pro Feature Notice for Free Users */}
      {!isPro && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h2 className="text-xl font-bold mb-2">Unlock Full Analytics</h2>
          <p className="text-blue-100 mb-4">
            Upgrade to Pro to see detailed analytics, charts, and who's viewing your profile.
          </p>
          <a
            href="/pricing"
            className="inline-block bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Upgrade to Pro - $15/month
          </a>
        </div>
      )}

      {/* Analytics Chart */}
      <CollapsibleSection title="Views Over Time" defaultOpen={true}>
        <ProfileViewsChart />
      </CollapsibleSection>

      {/* Recent Viewers List */}
      <CollapsibleSection title="Recent Profile Viewers" defaultOpen={true}>
        <ProfileViewsList />
      </CollapsibleSection>
    </div>
  );
}
