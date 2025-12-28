'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function getUserGrowthData() {
  const supabase = await createClient(await cookies());

  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .order('created_at', { ascending: true });

  // Group by date
  const grouped = data?.reduce((acc, profile) => {
    const date = new Date(profile.created_at).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped || {}).map(([date, count]) => ({
    date,
    users: count,
  }));
}

export async function getEngagementMetrics() {
  const supabase = await createClient(await cookies());

  const [{ count: jobs }, { count: apps }, { count: messages }] =
    await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('job_applications').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
    ]);

  return { jobs, apps, messages };
}
