'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { PublicProfile } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, trade, sub_trade, location, bio, profile_image_url, years_of_experience, has_tools, tools_owned, skills, subscription_status, created_at')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as PublicProfile;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId && UUID_REGEX.test(userId),
  });
}
