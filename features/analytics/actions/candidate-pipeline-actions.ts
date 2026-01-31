'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/utils/logger';

export type PipelineStage = 'pending' | 'viewed' | 'contacted' | 'hired' | 'rejected';

export type PipelineMetrics = {
  totalApplications: number;
  pending: number;
  viewed: number;
  contacted: number;
  hired: number;
  rejected: number;
  conversionRate: number; // hired / total
  averageTimeToHire: number | null; // in days
  stageConversionRates: {
    pendingToViewed: number;
    viewedToContacted: number;
    contactedToHired: number;
  };
};

export type ApplicationWithMetrics = {
  id: string;
  status: PipelineStage;
  created_at: string;
  status_updated_at: string | null;
  hired_at: string | null;
  job_title: string;
  applicant_name: string;
  time_in_stage_days: number;
};

/**
 * Get candidate pipeline metrics for all jobs by employer (Pro feature)
 */
export async function getCandidatePipelineMetrics(
  dateRange: '7d' | '30d' | 'all' = 'all'
): Promise<{ success: boolean; data?: PipelineMetrics; error?: string }> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is employer
    const { data: profile } = await supabase
      .from('users')
      .select('role, subscription_status')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'employer') {
      return { success: false, error: 'Only employers can view pipeline metrics' };
    }

    if (profile?.subscription_status !== 'pro') {
      return { success: false, error: 'Pro subscription required' };
    }

    // Calculate date filter
    let dateFilter = null;
    if (dateRange === '7d') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (dateRange === '30d') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 30);
    }

    // Get all jobs by this employer
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('employer_id', user.id);

    if (!jobs || jobs.length === 0) {
      return {
        success: true,
        data: {
          totalApplications: 0,
          pending: 0,
          viewed: 0,
          contacted: 0,
          hired: 0,
          rejected: 0,
          conversionRate: 0,
          averageTimeToHire: null,
          stageConversionRates: {
            pendingToViewed: 0,
            viewedToContacted: 0,
            contactedToHired: 0,
          },
        },
      };
    }

    const jobIds = jobs.map(j => j.id);

    // Build query for applications
    let query = supabase
      .from('job_applications')
      .select('id, status, created_at, status_updated_at, hired_at')
      .in('job_id', jobIds);

    if (dateFilter) {
      query = query.gte('created_at', dateFilter.toISOString());
    }

    const { data: applications, error } = await query;

    if (error) {
      logger.error('Error fetching applications', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { success: false, error: 'Failed to fetch applications' };
    }

    if (!applications || applications.length === 0) {
      return {
        success: true,
        data: {
          totalApplications: 0,
          pending: 0,
          viewed: 0,
          contacted: 0,
          hired: 0,
          rejected: 0,
          conversionRate: 0,
          averageTimeToHire: null,
          stageConversionRates: {
            pendingToViewed: 0,
            viewedToContacted: 0,
            contactedToHired: 0,
          },
        },
      };
    }

    // Calculate metrics
    const totalApplications = applications.length;
    const pending = applications.filter(a => a.status === 'pending').length;
    const viewed = applications.filter(a => a.status === 'viewed').length;
    const contacted = applications.filter(a => a.status === 'contacted').length;
    const hired = applications.filter(a => a.status === 'hired').length;
    const rejected = applications.filter(a => a.status === 'rejected').length;

    const conversionRate = totalApplications > 0 ? (hired / totalApplications) * 100 : 0;

    // Calculate average time-to-hire
    const hiredApps = applications.filter(a => a.hired_at);
    let averageTimeToHire: number | null = null;

    if (hiredApps.length > 0) {
      const times = hiredApps.map(a => {
        const created = new Date(a.created_at);
        const hired = new Date(a.hired_at!);
        return (hired.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
      });
      averageTimeToHire = times.reduce((sum, t) => sum + t, 0) / times.length;
    }

    // Calculate stage conversion rates
    const viewedOrBeyond = viewed + contacted + hired;
    const contactedOrBeyond = contacted + hired;

    const pendingToViewed = totalApplications > 0 ? (viewedOrBeyond / totalApplications) * 100 : 0;
    const viewedToContacted = viewedOrBeyond > 0 ? (contactedOrBeyond / viewedOrBeyond) * 100 : 0;
    const contactedToHired = contactedOrBeyond > 0 ? (hired / contactedOrBeyond) * 100 : 0;

    return {
      success: true,
      data: {
        totalApplications,
        pending,
        viewed,
        contacted,
        hired,
        rejected,
        conversionRate: Math.round(conversionRate * 10) / 10,
        averageTimeToHire: averageTimeToHire ? Math.round(averageTimeToHire * 10) / 10 : null,
        stageConversionRates: {
          pendingToViewed: Math.round(pendingToViewed * 10) / 10,
          viewedToContacted: Math.round(viewedToContacted * 10) / 10,
          contactedToHired: Math.round(contactedToHired * 10) / 10,
        },
      },
    };
  } catch (error) {
    logger.error('Error in getCandidatePipelineMetrics', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get detailed application list with time-in-stage metrics
 */
export async function getPipelineApplications(
  stage: PipelineStage | 'all' = 'all',
  dateRange: '7d' | '30d' | 'all' = 'all'
): Promise<{ success: boolean; data?: ApplicationWithMetrics[]; error?: string }> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is employer with Pro
    const { data: profile } = await supabase
      .from('users')
      .select('role, subscription_status')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'employer') {
      return { success: false, error: 'Only employers can view pipeline' };
    }

    if (profile?.subscription_status !== 'pro') {
      return { success: false, error: 'Pro subscription required' };
    }

    // Get all jobs by this employer
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('employer_id', user.id);

    if (!jobs || jobs.length === 0) {
      return { success: true, data: [] };
    }

    const jobIds = jobs.map(j => j.id);

    // Calculate date filter
    let dateFilter = null;
    if (dateRange === '7d') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (dateRange === '30d') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 30);
    }

    // Build query
    let query = supabase
      .from('job_applications')
      .select(`
        id,
        status,
        created_at,
        status_updated_at,
        hired_at,
        jobs!inner(title),
        users!inner(first_name, last_name)
      `)
      .in('job_id', jobIds);

    if (stage !== 'all') {
      query = query.eq('status', stage);
    }

    if (dateFilter) {
      query = query.gte('created_at', dateFilter.toISOString());
    }

    query = query.order('created_at', { ascending: false });

    const { data: applications, error } = await query;

    if (error) {
      logger.error('Error fetching applications', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { success: false, error: 'Failed to fetch applications' };
    }

    if (!applications) {
      return { success: true, data: [] };
    }

    // Calculate time in stage for each application
    const now = new Date();
    type ApplicationQueryResult = {
      id: string;
      status: string;
      created_at: string;
      status_updated_at: string | null;
      hired_at: string | null;
      jobs: { title: string }[] | null;
      users: { first_name: string | null; last_name: string | null }[] | null;
    };
    
    const result: ApplicationWithMetrics[] = (applications as unknown as ApplicationQueryResult[]).map((app) => {
      const statusDate = app.status_updated_at
        ? new Date(app.status_updated_at)
        : new Date(app.created_at);
      const timeInStageDays = (now.getTime() - statusDate.getTime()) / (1000 * 60 * 60 * 24);

      // * Supabase returns joined relations as arrays, so we access the first element
      const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
      const user = Array.isArray(app.users) ? app.users[0] : app.users;

      return {
        id: app.id,
        status: app.status as PipelineStage,
        created_at: app.created_at,
        status_updated_at: app.status_updated_at,
        hired_at: app.hired_at,
        job_title: job?.title || 'Unknown Job',
        applicant_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
        time_in_stage_days: Math.round(timeInStageDays * 10) / 10,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error('Error in getPipelineApplications', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Unexpected error occurred' };
  }
}
