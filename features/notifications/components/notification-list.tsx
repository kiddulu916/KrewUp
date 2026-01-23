'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useNotifications } from '../hooks/use-notifications';
import { markNotificationAsRead, deleteNotification, markAllNotificationsAsRead } from '../actions/notification-actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyNotifications } from '@/components/ui/empty-state';
import { useQueryClient } from '@tanstack/react-query';
import { NotificationItem } from './notification-item';
import type { Notification } from '../actions/notification-actions';

export function NotificationList() {
  const { notifications, isLoading, error, isFetching } = useNotifications();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const handleMarkAsRead = useCallback(async (notification: Notification) => {
    if (notification.read_at) {
      // If already read, just navigate
      const link = notification.data?.link;
      if (link && typeof link === 'string') {
        window.location.href = link;
      }
      return;
    }

    await markNotificationAsRead(notification.id);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    // Navigate if there's a link
    const link = notification.data?.link;
    if (link && typeof link === 'string') {
      window.location.href = link;
    }
  }, [queryClient]);

  const handleDelete = useCallback(async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    setDeletingId(notificationId);
    const result = await deleteNotification(notificationId);

    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } else {
      alert('Failed to delete notification');
    }
    setDeletingId(null);
  }, [queryClient]);

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    const result = await markAllNotificationsAsRead();

    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } else {
      alert('Failed to mark all as read');
    }
    setMarkingAllRead(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600">Failed to load notifications</p>
      </Card>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <EmptyNotifications />
    );
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-4">
      {/* Header with Mark All Read button */}
      {(unreadCount > 0 || isFetching) && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            {isFetching && (
              <span className="text-xs text-gray-500">
                Syncing…
              </span>
            )}
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllAsRead}
                isLoading={markingAllRead}
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Notification Items */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={() => handleMarkAsRead(notification)}
            onDelete={(e) => handleDelete(notification.id, e)}
            isDeleting={deletingId === notification.id}
          />
        ))}
      </div>
    </div>
  );
}
