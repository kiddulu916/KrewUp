'use client';

import { createClient } from '@/lib/supabase/client';
import { useSmartPolling, POLLING_CONFIGS } from '@/lib/hooks/use-smart-polling';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// * Extends the base JobApplication row with a loosely-typed worker relation
// * to avoid mismatches with Supabase's inferred nested relation types.
type JobApplication = Database['public']['Tables']['job_applications']['Row'] & {
  worker?: Record<string, unknown>;
};

async function fetchEmployerJobApplications(
  supabase: SupabaseClient<Database>,
  jobId: string
): Promise<JobApplication[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select(
      `
        *,
        worker:users!applicant_id(
          id,
          first_name,
          last_name,
          location,
          bio,
          profile_image_url,
          workers(
            trade, 
            sub_trade, 
            years_of_experience
          ),
          experiences(
            job_title,
            company,
            start_date,
            end_date
          )
        )
      `
    )
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Hook for fetching employer job applications with smart polling.
 *
 * Uses adaptive polling tuned for employers actively monitoring new candidates.
 */
export function useEmployerApplications(jobId: string) {
  const supabase = createClient();

  const result = useSmartPolling<JobApplication[], Error>(
    ['applications', jobId],
    () => fetchEmployerJobApplications(supabase, jobId),
    POLLING_CONFIGS.applications,
    {
      enabled: !!jobId,
    }
  );

  return {
    ...result,
    applications: result.data ?? [],
    isLoading: result.isLoading,
    isFetching: result.isFetching,
  };
}

