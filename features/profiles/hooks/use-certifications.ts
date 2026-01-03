'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Certification } from '../types';

export function useCertifications(userId: string) {
  return useQuery({
    queryKey: ['certifications', userId],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Certification[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
}
