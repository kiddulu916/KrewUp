'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useNotifications } from '../hooks/use-notifications';
import { markNotificationAsRead, deleteNotification, markAllNotificationsAsRead } from '../actions/notification-actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useQueryClient } from '@tanstack/react-query';
import { NotificationItem } from './notification-item';
import type { Notification } from '../actions/notification-actions';

export function NotificationList() {
  const { data: notifications, isLoading, error } = useNotifications();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const handleMarkAsRead = useCallback(async (notification: Notification) => {
    if (notification.read_at) {
      // If already read, just navigate
      if (notification.data?.link) {
        window.location.href = notification.data.link;
      }
      return;
    }

    await markNotificationAsRead(notification.id);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    // Navigate if there's a link
    if (notification.data?.link) {
      window.location.href = notification.data.link;
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
      <EmptyState
        icon="🔔"
        title="No notifications"
        description="You're all caught up! Check back later for updates."
      />
    );
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-4">
      {/* Header with Mark All Read button */}
      {unreadCount > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllAsRead}
            isLoading={markingAllRead}
          >
            Mark all as read
          </Button>
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
