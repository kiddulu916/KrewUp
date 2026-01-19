'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { logger, sanitizeUserId } from '@/lib/utils/logger';

export interface Notification {
  id: string;
  user_id: string;
  type: 'proximity_alert' | 'application_status' | 'new_message' | 'profile_view';
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Get all notifications for the current user
 */
export async function getMyNotifications() {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, message, data, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching notifications', {
        userId: sanitizeUserId(user.id),
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    return { success: true, notifications: data as Notification[] };
  } catch (error: any) {
    logger.error('Error in getMyNotifications', {
      error: error?.message || String(error),
    });
    return { success: false, error: error.message || 'Failed to fetch notifications' };
  }
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadCount() {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated', count: 0 };
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      logger.error('Error fetching unread count', {
        userId: sanitizeUserId(user.id),
        error: error.message,
      });
      return { success: false, error: error.message, count: 0 };
    }

    return { success: true, count: count || 0 };
  } catch (error: any) {
    logger.error('Error in getUnreadCount', {
      error: error?.message || String(error),
    });
    return { success: false, error: error.message || 'Failed to fetch unread count', count: 0 };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id); // Ensure user owns the notification

    if (error) {
      logger.error('Error marking notification as read', {
        userId: sanitizeUserId(user.id),
        notificationId,
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/notifications');
    return { success: true };
  } catch (error: any) {
    logger.error('Error in markNotificationAsRead', {
      error: error?.message || String(error),
    });
    return { success: false, error: error.message || 'Failed to mark notification as read' };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      logger.error('Error marking all notifications as read', {
        userId: sanitizeUserId(user.id),
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/notifications');
    return { success: true };
  } catch (error: any) {
    logger.error('Error in markAllNotificationsAsRead', {
      error: error?.message || String(error),
    });
    return { success: false, error: error.message || 'Failed to mark all notifications as read' };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id); // Ensure user owns the notification

    if (error) {
      logger.error('Error deleting notification', {
        userId: sanitizeUserId(user.id),
        notificationId,
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/notifications');
    return { success: true };
  } catch (error: any) {
    logger.error('Error in deleteNotification', {
      error: error?.message || String(error),
    });
    return { success: false, error: error.message || 'Failed to delete notification' };
  }
}
