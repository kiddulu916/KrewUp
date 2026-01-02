'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { hasProAccess } from '@/lib/utils/subscription';

/**
 * Upload a portfolio photo
 * Free users: max 5 photos
 * Pro users: unlimited
 */
export async function uploadPortfolioPhoto(formData: FormData) {
  const supabase = await createClient(await cookies());

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, is_lifetime_pro')
    .eq('id', user.id)
    .single();

  // 3. Check existing photo count
  const { count } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // 4. Enforce limits (5 for free, unlimited for Pro)
  if (!hasProAccess(profile) && count && count >= 5) {
    return { success: false, error: 'Free users can upload maximum 5 portfolio photos. Upgrade to Pro for unlimited.' };
  }

  // 5. Get file from form data
  const file = formData.get('file') as File;
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  // 6. Upload to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('portfolio-images')
    .upload(fileName, file);

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  // 7. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('portfolio-images')
    .getPublicUrl(fileName);

  // 8. Create database record
  const { error: dbError } = await supabase
    .from('portfolio_images')
    .insert({
      user_id: user.id,
      image_url: publicUrl,
      display_order: count || 0
    });

  if (dbError) {
    // Cleanup storage if DB insert fails
    await supabase.storage
      .from('portfolio-images')
      .remove([fileName]);
    return { success: false, error: dbError.message };
  }

  revalidatePath('/dashboard/profile/edit');
  return { success: true };
}

/**
 * Delete a portfolio photo
 */
export async function deletePortfolioPhoto(imageId: string) {
  const supabase = await createClient(await cookies());

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Get image record (verify ownership via RLS)
  const { data: image, error: fetchError } = await supabase
    .from('portfolio_images')
    .select('image_url, user_id')
    .eq('id', imageId)
    .single();

  if (fetchError || !image) {
    return { success: false, error: 'Image not found' };
  }

  // 3. Verify ownership
  if (image.user_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // 4. Extract file path from URL
  const urlParts = image.image_url.split('/portfolio-images/');
  const filePath = urlParts[urlParts.length - 1];

  // 5. Delete from storage
  await supabase.storage
    .from('portfolio-images')
    .remove([filePath]);

  // 6. Delete from database
  const { error: deleteError } = await supabase
    .from('portfolio_images')
    .delete()
    .eq('id', imageId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath('/dashboard/profile/edit');
  return { success: true };
}

/**
 * Reorder portfolio photos (drag and drop)
 */
export async function reorderPortfolioPhotos(imageIds: string[]) {
  const supabase = await createClient(await cookies());

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Update display_order for each image
  for (let i = 0; i < imageIds.length; i++) {
    await supabase
      .from('portfolio_images')
      .update({ display_order: i })
      .eq('id', imageIds[i])
      .eq('user_id', user.id); // Verify ownership
  }

  revalidatePath('/dashboard/profile/edit');
  return { success: true };
}
