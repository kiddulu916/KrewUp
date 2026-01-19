'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { getFullName } from '@/lib/utils';
import type { ModerationAction } from './types';

type ModerationHistoryCardProps = {
  history: ModerationAction[];
};

/**
 * Displays user's moderation history
 */
export function ModerationHistoryCard({
  history,
}: ModerationHistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Moderation History</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No moderation history"
            description="This user has not been moderated"
          />
        ) : (
          <div className="space-y-3">
            {history.map((action) => (
              <div
                key={action.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          action.action_type === 'ban'
                            ? 'danger'
                            : action.action_type === 'suspension'
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {action.action_type}
                      </Badge>
                      <p className="text-sm text-gray-600">
                        {new Date(action.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm mt-1">{action.reason}</p>
                    {action.duration_days && (
                      <p className="text-sm text-gray-600 mt-1">
                        Duration: {action.duration_days} days
                      </p>
                    )}
                    {action.expires_at && (
                      <p className="text-sm text-gray-600">
                        Expires: {new Date(action.expires_at).toLocaleString()}
                      </p>
                    )}
                    {action.actioned_by_profile && (
                      <p className="text-sm text-gray-600">
                        By: {getFullName(action.actioned_by_profile)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
