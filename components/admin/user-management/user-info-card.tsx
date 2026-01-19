'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFullName } from '@/lib/utils';
import type { UserProfile, ModerationStatus } from './types';

type UserInfoCardProps = {
  user: UserProfile;
  moderationStatus: ModerationStatus | null;
};

/**
 * Displays detailed user information
 */
export function UserInfoCard({ user, moderationStatus }: UserInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{getFullName(user)}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {moderationStatus?.isBanned && (
              <Badge variant="danger">BANNED</Badge>
            )}
            {moderationStatus?.isSuspended && (
              <Badge variant="warning">SUSPENDED</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Role</p>
            <p className="font-semibold capitalize">{user.role}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Subscription</p>
            <p className="font-semibold capitalize">{user.subscription_status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Trade</p>
            <p className="font-semibold">{user.trade}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Location</p>
            <p className="font-semibold">{user.location}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-semibold">{user.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Joined</p>
            <p className="font-semibold">
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Can Post Jobs</p>
            <p className="font-semibold">{user.can_post_jobs ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Admin</p>
            <p className="font-semibold">{user.is_admin ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
