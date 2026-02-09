'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ExperiencePhoto } from '../types';

/**
 * Custom hook to fetch experience photos for a specific experience
 * Photos are ordered by display_order for drag-and-drop support
 */
export function useExperiencePhotos(experienceId: string | undefined) {
  return useQuery({
    queryKey: ['experience-photos', experienceId],
    queryFn: async () => {
      if (!experienceId) {
        return [];
      }

      const supabase = createClient();

      // Fetch experience photos ordered by display_order
      const { data, error } = await supabase
        .from('experience_photos')
        .select('*')
        .eq('experience_id', experienceId)
        .order('display_order', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as ExperiencePhoto[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!experienceId,
  });
}
