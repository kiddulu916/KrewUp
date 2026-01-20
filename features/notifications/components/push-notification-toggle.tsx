'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '../hooks/use-push-notifications';
import { Bell, BellOff, AlertTriangle, Check, Loader2 } from 'lucide-react';

/**
 * Toggle component for enabling/disabling browser push notifications
 */
export function PushNotificationToggle() {
  const {
    permission,
    isLoading,
    error,
    isSupported,
    isSubscribed,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [showSuccess, setShowSuccess] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } else {
      const success = await subscribe();
      if (success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    }
  };

  // Not supported
  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-gray-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">Push notifications not supported</p>
          <p className="text-xs text-gray-500">
            Your browser doesn't support push notifications
          </p>
        </div>
      </div>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
        <BellOff className="h-5 w-5 text-red-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-700">Notifications blocked</p>
          <p className="text-xs text-red-600">
            You've blocked notifications for this site. To enable them, update your browser settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-green-600" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isSubscribed ? 'Push notifications enabled' : 'Push notifications disabled'}
            </p>
            <p className="text-xs text-gray-500">
              {isSubscribed
                ? 'You will receive notifications even when the app is closed'
                : 'Enable to get notified about new messages, job matches, and more'}
            </p>
          </div>
        </div>

        <Button
          onClick={handleToggle}
          disabled={isLoading}
          variant={isSubscribed ? 'outline' : 'primary'}
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 motion-safe:animate-spin motion-reduce:animate-none" />
          ) : isSubscribed ? (
            'Disable'
          ) : (
            'Enable'
          )}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success message */}
      {showSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">
            {isSubscribed
              ? 'Push notifications enabled successfully!'
              : 'Push notifications disabled'}
          </p>
        </div>
      )}
    </div>
  );
}
