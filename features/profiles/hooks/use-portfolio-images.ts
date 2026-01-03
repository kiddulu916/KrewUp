'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { PortfolioImage } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function usePortfolioImages(userId: string) {
  return useQuery({
    queryKey: ['portfolioImages', userId],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as PortfolioImage[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId && UUID_REGEX.test(userId),
  });
}
