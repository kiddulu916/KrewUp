'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/providers/toast-provider';
import {
  grantProSubscription,
  revokeProSubscription,
} from '@/features/admin/actions/user-actions';
import { logger } from '@/lib/utils/logger';
import type { UserProfile } from './types';

type ProSubscriptionCardProps = {
  user: UserProfile;
  onActionComplete: () => void;
};

/**
 * Pro subscription management (grant/revoke)
 */
export function ProSubscriptionCard({
  user,
  onActionComplete,
}: ProSubscriptionCardProps) {
  const toast = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [showGrantProDialog, setShowGrantProDialog] = useState(false);
  const [proReason, setProReason] = useState('');

  const handleGrantPro = async () => {
    if (!proReason.trim()) {
      toast.error('Please provide a reason for granting Pro');
      return;
    }

    setActionLoading(true);
    try {
      const result = await grantProSubscription(user.id, proReason);

      if (result.success) {
        toast.success('Pro subscription granted');
        setShowGrantProDialog(false);
        setProReason('');
        onActionComplete();
      } else {
        toast.error(result.error || 'Failed to grant Pro subscription');
      }
    } catch (error) {
      logger.error('Error granting Pro', {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to grant Pro subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokePro = async () => {
    const reason = prompt('Please provide a reason for revoking Pro subscription:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const result = await revokeProSubscription(user.id, reason);

      if (result.success) {
        toast.success('Pro subscription revoked');
        onActionComplete();
      } else {
        toast.error(result.error || 'Failed to revoke Pro subscription');
      }
    } catch (error) {
      logger.error('Error revoking Pro', {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to revoke Pro subscription');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pro Subscription Management</CardTitle>
      </CardHeader>
      <CardContent>
        {user.subscription_status === 'free' ? (
          <Button
            variant="primary"
            onClick={() => setShowGrantProDialog(true)}
            disabled={actionLoading}
            className="w-full"
          >
            Grant Pro Subscription
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={handleRevokePro}
            disabled={actionLoading}
            className="w-full"
          >
            Revoke Pro Subscription
          </Button>
        )}

        {/* Grant Pro Dialog */}
        {showGrantProDialog && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold mb-2">Grant Pro Subscription</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <Input
                  type="text"
                  value={proReason}
                  onChange={(e) => setProReason(e.target.value)}
                  placeholder="Enter reason for granting Pro..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleGrantPro}
                  disabled={actionLoading}
                >
                  Confirm Grant
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowGrantProDialog(false);
                    setProReason('');
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
