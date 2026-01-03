'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { WorkExperience } from '../types';

export function useWorkExperience(userId: string) {
  return useQuery({
    queryKey: ['workExperience', userId],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('work_experience')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as WorkExperience[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
}
