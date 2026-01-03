'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { PortfolioImage } from '@/lib/types/profile.types';

/**
 * Custom hook to fetch portfolio images for the current user
 * Images are ordered by display_order for drag-and-drop support
 */
export function usePortfolioImages() {
  return useQuery({
    queryKey: ['portfolio-images'],
    queryFn: async () => {
      const supabase = createClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Fetch portfolio images ordered by display_order
      const { data, error } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as PortfolioImage[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
