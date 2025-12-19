'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type JobData = {
  title: string;
  trade: string;
  sub_trade?: string;
  job_type: string;
  description: string;
  location: string;
  coords?: { lat: number; lng: number } | null;
  pay_rate: string;
  pay_min?: number;
  pay_max?: number;
  required_certs?: string[];
};

export type JobResult = {
  success: boolean;
  error?: string;
  jobId?: string;
};

/**
 * Create a new job posting (employers only)
 */
export async function createJob(data: JobData): Promise<JobResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user is an employer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'employer') {
    return { success: false, error: 'Only employers can post jobs' };
  }

  // Convert coords to PostGIS POINT format if provided
  let coordsValue = null;
  if (data.coords) {
    // PostGIS expects POINT(longitude latitude) format
    coordsValue = `POINT(${data.coords.lng} ${data.coords.lat})`;
  }

  const { data: job, error: createError } = await supabase
    .from('jobs')
    .insert({
      employer_id: user.id,
      title: data.title,
      trade: data.trade,
      sub_trade: data.sub_trade,
      job_type: data.job_type,
      description: data.description,
      location: data.location,
      coords: coordsValue,
      pay_rate: data.pay_rate,
      pay_min: data.pay_min,
      pay_max: data.pay_max,
      required_certs: data.required_certs || [],
      status: 'active',
    })
    .select()
    .single();

  if (createError) {
    return { success: false, error: createError.message };
  }

  revalidatePath('/dashboard/jobs');
  redirect(`/dashboard/jobs/${job.id}`);
}

/**
 * Update an existing job
 */
export async function updateJob(jobId: string, data: Partial<JobData>): Promise<JobResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user owns this job
  const { data: job } = await supabase
    .from('jobs')
    .select('employer_id')
    .eq('id', jobId)
    .single();

  if (job?.employer_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // Convert coords to PostGIS POINT format if provided in the update data
  const updateData = { ...data };
  if (updateData.coords) {
    updateData.coords = `POINT(${updateData.coords.lng} ${updateData.coords.lat})` as any;
  }

  const { error: updateError } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', jobId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath('/dashboard/jobs');

  return { success: true, jobId };
}

/**
 * Delete a job posting
 */
export async function deleteJob(jobId: string): Promise<JobResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user owns this job
  const { data: job } = await supabase
    .from('jobs')
    .select('employer_id')
    .eq('id', jobId)
    .single();

  if (job?.employer_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error: deleteError } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath('/dashboard/jobs');
  redirect('/dashboard/jobs');
}

/**
 * Get a single job by ID
 */
export async function getJob(jobId: string): Promise<JobResult & { data?: any }> {
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    console.error('Get job error:', error);
    return { success: false, error: 'Job not found' };
  }

  return { success: true, data: job };
}

/**
 * Get jobs with optional filters
 */
export async function getJobs(filters?: {
  trade?: string;
  subTrade?: string;
  jobType?: string;
  status?: string;
  employerId?: string;
}): Promise<JobResult & { data?: any[] }> {
  const supabase = await createClient();

  let query = supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.trade) {
    query = query.eq('trade', filters.trade);
  }

  if (filters?.subTrade) {
    query = query.eq('sub_trade', filters.subTrade);
  }

  if (filters?.jobType) {
    query = query.eq('job_type', filters.jobType);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  } else {
    // Default to active jobs only
    query = query.eq('status', 'active');
  }

  if (filters?.employerId) {
    query = query.eq('employer_id', filters.employerId);
  }

  const { data: jobs, error } = await query;

  if (error) {
    console.error('Get jobs error:', error);
    return { success: false, error: 'Failed to get jobs' };
  }

  return { success: true, data: jobs || [] };
}
