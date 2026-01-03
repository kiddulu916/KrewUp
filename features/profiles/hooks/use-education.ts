'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Education } from '../types';

export function useEducation(userId: string) {
  return useQuery({
    queryKey: ['education', userId],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('education')
        .select('*')
        .eq('user_id', userId)
        .order('graduation_year', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Education[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
}
