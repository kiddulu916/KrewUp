'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { Notification } from '../actions/notification-actions';

export interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
}

function NotificationItemComponent({ notification, onMarkAsRead, onDelete, isDeleting }: NotificationItemProps) {
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'proximity_alert':
        return '📍';
      case 'application_status':
        return '📋';
      case 'new_message':
        return '💬';
      case 'profile_view':
        return '👁️';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        notification.read_at ? 'bg-white' : 'bg-blue-50 border-l-4 border-l-blue-600'
      }`}
      onClick={onMarkAsRead}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${notification.read_at ? 'text-gray-900' : 'text-blue-900'}`}>
            {notification.title}
          </h3>
          <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
          <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(notification.created_at)}</p>
        </div>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors p-1"
          aria-label="Delete notification"
        >
          {isDeleting ? (
            <LoadingSpinner size="sm" />
          ) : (
            <span className="text-lg">🗑️</span>
          )}
        </button>
      </div>
    </Card>
  );
}

// * Memoized to prevent re-renders when parent state changes but notification props are unchanged
// * Note: Handler functions are not compared since they're recreated per notification in the map
// * The notification object comparison is sufficient to prevent unnecessary re-renders
export const NotificationItem = React.memo(NotificationItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.notification.id === nextProps.notification.id &&
    prevProps.notification.title === nextProps.notification.title &&
    prevProps.notification.message === nextProps.notification.message &&
    prevProps.notification.type === nextProps.notification.type &&
    prevProps.notification.read_at === nextProps.notification.read_at &&
    prevProps.notification.created_at === nextProps.notification.created_at &&
    prevProps.isDeleting === nextProps.isDeleting
  );
});
