'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Credential } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useCredentials(userId: string, credentialType?: 'certification' | 'license') {
  return useQuery({
    queryKey: ['credentials', userId, credentialType],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from('credentials')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (credentialType) {
        query = query.eq('credential_type', credentialType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Credential[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId && UUID_REGEX.test(userId),
  });
}

export function useCredentialMutations() {
  const queryClient = useQueryClient();

  const invalidateCredentials = () => {
    queryClient.invalidateQueries({ queryKey: ['credentials'] });
  };

  return { invalidateCredentials };
}
