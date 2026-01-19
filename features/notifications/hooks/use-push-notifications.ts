'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  savePushSubscription,
  removePushSubscription,
  getVapidPublicKey,
} from '../actions/push-subscription-actions';

type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Hook for managing Web Push notifications
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Check browser support and current permission on mount
  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    // Check if browser supports push notifications
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // Check current permission
    const currentPermission = Notification.permission as PushPermissionState;
    setPermission(currentPermission);

    // If permission is granted, check for existing subscription
    if (currentPermission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        setSubscription(existingSubscription);
      } catch (err) {
        console.error('Error checking existing subscription:', err);
      }
    }
  };

  /**
   * Request permission and subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PushPermissionState);

      if (permissionResult !== 'granted') {
        setError('Notification permission was denied');
        setIsLoading(false);
        return false;
      }

      // Get VAPID public key from server
      const keyResult = await getVapidPublicKey();
      if (!keyResult.success || !keyResult.key) {
        setError(keyResult.error || 'Failed to get VAPID key');
        setIsLoading(false);
        return false;
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(keyResult.key);

      // Subscribe to push manager
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      // Save subscription to server
      const subscriptionJson = pushSubscription.toJSON();
      const saveResult = await savePushSubscription(
        {
          endpoint: subscriptionJson.endpoint!,
          keys: {
            p256dh: subscriptionJson.keys!.p256dh!,
            auth: subscriptionJson.keys!.auth!,
          },
        },
        navigator.userAgent
      );

      if (!saveResult.success) {
        setError(saveResult.error || 'Failed to save subscription');
        setIsLoading(false);
        return false;
      }

      setSubscription(pushSubscription);
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      console.error('Error subscribing to push:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe to push notifications');
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      return true;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Remove from server
      await removePushSubscription(subscription.endpoint);

      setSubscription(null);
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      console.error('Error unsubscribing from push:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      setIsLoading(false);
      return false;
    }
  }, [subscription]);

  return {
    permission,
    subscription,
    isLoading,
    error,
    isSupported,
    isSubscribed: !!subscription,
    subscribe,
    unsubscribe,
  };
}

/**
 * Convert a URL-safe base64 string to a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
