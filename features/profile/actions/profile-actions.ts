'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export type ProfileUpdateData = {
  name: string;
  trade: string;
  sub_trade?: string;
  location: string;
  coords?: { lat: number; lng: number } | null;
  phone?: string;
  bio?: string;
  employer_type?: 'contractor' | 'recruiter';
  profile_image_url?: string | null;
};

export type ProfileResult = {
  success: boolean;
  error?: string;
};

/**
 * Update user profile
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ProfileResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current profile to check role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // If coords are provided, use the Postgres function for proper PostGIS conversion
  if (data.coords && typeof data.coords.lat === 'number' && typeof data.coords.lng === 'number') {
    const { error: updateError } = await supabase.rpc('update_profile_coords', {
      p_user_id: user.id,
      p_name: data.name,
      p_role: currentProfile?.role || 'worker',
      p_trade: data.trade,
      p_location: data.location,
      p_lng: data.coords.lng,
      p_lat: data.coords.lat,
      p_bio: data.bio || null,
      p_sub_trade: data.sub_trade || null,
      p_employer_type: currentProfile?.role === 'employer' ? data.employer_type || null : null,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Update phone and profile_image_url separately if provided (not in RPC function)
    const extraUpdates: any = {};
    if (data.phone) {
      extraUpdates.phone = data.phone;
    }
    if (data.profile_image_url !== undefined) {
      extraUpdates.profile_image_url = data.profile_image_url;
    }

    if (Object.keys(extraUpdates).length > 0) {
      const { error: extraError } = await supabase
        .from('profiles')
        .update(extraUpdates)
        .eq('id', user.id);

      if (extraError) {
        return { success: false, error: extraError.message };
      }
    }
  } else {
    // If no coords provided, do a regular update without coords
    const updateData: any = {
      name: data.name,
      trade: data.trade,
      location: data.location,
      bio: data.bio,
    };

    // Only include phone if provided
    if (data.phone) {
      updateData.phone = data.phone;
    }

    // Only set sub_trade if provided
    if (data.sub_trade) {
      updateData.sub_trade = data.sub_trade;
    }

    // Only set employer_type for employers
    if (currentProfile?.role === 'employer' && data.employer_type) {
      updateData.employer_type = data.employer_type;
    }

    // Only set profile_image_url if provided
    if (data.profile_image_url !== undefined) {
      updateData.profile_image_url = data.profile_image_url;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  }

  revalidatePath('/dashboard/profile');
  return { success: true };
}

/**
 * Update user's location coordinates (used for initial location capture)
 */
export async function updateProfileLocation(data: {
  location: string;
  coords: { lat: number; lng: number };
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient(await cookies());

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current profile data first
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  // Use the existing update_profile_coords function
  const { error: updateError } = await supabase.rpc('update_profile_coords', {
    p_user_id: user.id,
    p_name: profile.name,
    p_role: profile.role,
    p_trade: profile.trade,
    p_location: data.location,
    p_lng: data.coords.lng,
    p_lat: data.coords.lat,
    p_bio: profile.bio,
    p_sub_trade: profile.sub_trade,
    p_employer_type: profile.employer_type,
  });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/dashboard/feed');
  revalidatePath('/dashboard/profile');
  return { success: true };
}
