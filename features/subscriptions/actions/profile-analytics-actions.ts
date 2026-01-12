'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type ProfileViewAnalytics = {
  date: string;
  views: number;
};

export type ProfileAnalyticsResult = {
  success: boolean;
  error?: string;
  data?: {
    totalViews: number;
    uniqueViewers: number;
    viewsByDate: ProfileViewAnalytics[];
    topViewerTypes: { type: string; count: number }[];
    recentViewers: {
      id: string;
      name: string;
      employer_type: string | null;
      location: string;
      viewed_at: string;
    }[];
  };
};

/**
 * Get profile analytics for the current user (Pro workers only)
 * Returns aggregated view data for charts and insights
 */
export async function getProfileAnalytics(
  dateRange: '7' | '30' | 'all' = '30'
): Promise<ProfileAnalyticsResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is Pro worker
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_status, role')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status !== 'pro') {
      return { success: false, error: 'Pro subscription required' };
    }

    if (profile?.role !== 'worker') {
      return { success: false, error: 'Only workers can view profile analytics' };
    }

    // Calculate date filter
    let dateFilter: Date | null = null;
    if (dateRange === '7') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (dateRange === '30') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 30);
    }

    // Build query for views
    let query = supabase
      .from('profile_views')
      .select(`
        id,
        viewed_at,
        viewer_id,
        viewer:users!viewer_id(
          id,
          first_name,
          last_name,
          employer_type,
          location
        )
      `)
      .eq('viewed_profile_id', user.id);

    if (dateFilter) {
      query = query.gte('viewed_at', dateFilter.toISOString());
    }

    const { data: views, error } = await query.order('viewed_at', { ascending: false });

    if (error) {
      console.error('Error fetching profile views:', error);
      return { success: false, error: 'Failed to fetch profile analytics' };
    }

    // Calculate metrics
    const totalViews = views?.length || 0;
    const uniqueViewers = new Set(views?.map(v => v.viewer_id)).size;

    // Group views by date
    const viewsByDateMap = new Map<string, number>();

    // Initialize dates for the range
    const days = dateRange === '7' ? 7 : dateRange === '30' ? 30 : Math.min(90, totalViews > 0 ? 90 : 30);
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      viewsByDateMap.set(dateKey, 0);
    }

    // Count views per day
    views?.forEach(view => {
      const dateKey = new Date(view.viewed_at).toISOString().split('T')[0];
      if (viewsByDateMap.has(dateKey)) {
        viewsByDateMap.set(dateKey, (viewsByDateMap.get(dateKey) || 0) + 1);
      }
    });

    const viewsByDate = Array.from(viewsByDateMap.entries())
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by employer type
    const typeCountMap = new Map<string, number>();
    views?.forEach(view => {
      const type = (view.viewer as any)?.employer_type || 'Unknown';
      typeCountMap.set(type, (typeCountMap.get(type) || 0) + 1);
    });

    const topViewerTypes = Array.from(typeCountMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent viewers (deduplicated by viewer)
    const seenViewers = new Set<string>();
    const recentViewers = views
      ?.filter(view => {
        if (!view.viewer_id || seenViewers.has(view.viewer_id)) return false;
        seenViewers.add(view.viewer_id);
        return true;
      })
      .slice(0, 10)
      .map(view => {
        const viewer = view.viewer as any;
        return {
          id: view.viewer_id,
          name: viewer ? `${viewer.first_name || ''} ${viewer.last_name || ''}`.trim() : 'Unknown',
          employer_type: viewer?.employer_type || null,
          location: viewer?.location || 'Unknown',
          viewed_at: view.viewed_at,
        };
      }) || [];

    return {
      success: true,
      data: {
        totalViews,
        uniqueViewers,
        viewsByDate,
        topViewerTypes,
        recentViewers,
      },
    };
  } catch (error) {
    console.error('Error in getProfileAnalytics:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}
