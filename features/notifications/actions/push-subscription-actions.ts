'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import webpush from 'web-push';
import { logger, sanitizeUserId } from '@/lib/utils/logger';

// Web Push VAPID keys configuration
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@krewup.net';

// Track if push notifications are properly configured
const isPushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

// Configure web-push with VAPID keys if available
if (isPushConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
} else {
  logger.warn('Push notifications disabled: VAPID keys not configured', {
    hasPublicKey: Boolean(VAPID_PUBLIC_KEY),
    hasPrivateKey: Boolean(VAPID_PRIVATE_KEY),
  });
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Save a push subscription for the current user
 */
export async function savePushSubscription(
  subscription: PushSubscriptionData,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Upsert the subscription (update if endpoint exists, insert if new)
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,endpoint',
      }
    );

    if (error) {
      logger.error('Error saving push subscription', {
        userId: sanitizeUserId(user.id),
        endpoint: subscription.endpoint,
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in savePushSubscription', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Failed to save subscription' };
  }
}

/**
 * Remove a push subscription
 */
export async function removePushSubscription(
  endpoint: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      logger.error('Error removing push subscription', {
        userId: sanitizeUserId(user.id),
        endpoint,
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error in removePushSubscription', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Failed to remove subscription' };
  }
}

/**
 * Get all push subscriptions for the current user
 */
export async function getUserPushSubscriptions(): Promise<{
  success: boolean;
  subscriptions?: Array<{ id: string; endpoint: string; user_agent: string | null }>;
  error?: string;
}> {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, user_agent')
      .eq('user_id', user.id);

    if (error) {
      logger.error('Error fetching push subscriptions', {
        userId: sanitizeUserId(user.id),
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    return { success: true, subscriptions: data };
  } catch (error) {
    logger.error('Error in getUserPushSubscriptions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Failed to fetch subscriptions' };
  }
}

/**
 * Send a push notification to a user
 * This should be called from server-side only (e.g., cron jobs, webhooks)
 */
export async function sendPushNotification(
  userId: string,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
  }
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
  if (!isPushConfigured) {
    logger.warn('VAPID keys not configured - skipping push notification', {
      userId: sanitizeUserId(userId),
    });
    return { success: false, sent: 0, failed: 0, error: 'VAPID keys not configured' };
  }

  try {
    const supabase = await createServiceClient();

    // Get all push subscriptions for the user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (error) {
      logger.error('Error fetching push subscriptions', {
        userId: sanitizeUserId(userId),
        error: error.message,
      });
      return { success: false, sent: 0, failed: 0, error: error.message };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    // Prepare the notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      data: {
        url: payload.url || '/dashboard/notifications',
      },
      tag: payload.tag,
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    // Send to all subscriptions
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            notificationPayload
          );
          sent++;
        } catch (err: unknown) {
          failed++;
          // If subscription is expired/invalid, mark for removal
          const isWebPushError = err && typeof err === 'object' && 'statusCode' in err;
          if (isWebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
            expiredEndpoints.push(sub.endpoint);
          }
          logger.error('Push notification failed', {
            userId: sanitizeUserId(userId),
            endpoint: sub.endpoint,
            statusCode: isWebPushError ? (err as { statusCode: number }).statusCode : undefined,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .in('endpoint', expiredEndpoints);
    }

    return { success: true, sent, failed };
  } catch (error) {
    logger.error('Error in sendPushNotification', {
      userId: sanitizeUserId(userId),
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, sent: 0, failed: 0, error: 'Failed to send notifications' };
  }
}

/**
 * Get the VAPID public key for the client
 */
export async function getVapidPublicKey(): Promise<{
  success: boolean;
  key?: string;
  error?: string;
}> {
  if (!VAPID_PUBLIC_KEY) {
    return { success: false, error: 'VAPID public key not configured' };
  }

  return { success: true, key: VAPID_PUBLIC_KEY };
}

/**
 * Check if push notifications are properly configured
 */
export async function isPushNotificationsEnabled(): Promise<boolean> {
  return isPushConfigured;
}
