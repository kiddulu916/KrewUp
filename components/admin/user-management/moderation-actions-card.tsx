'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/providers/toast-provider';
import {
  suspendUser,
  banUser,
  unbanUser,
} from '@/features/admin/actions/user-actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SuspendUserDialog } from './suspend-user-dialog';
import { BanUserDialog } from './ban-user-dialog';
import { getFullName } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import type { UserProfile, ModerationStatus } from './types';

type ModerationActionsCardProps = {
  user: UserProfile;
  moderationStatus: ModerationStatus | null;
  onActionComplete: () => void;
};

/**
 * Moderation action buttons and dialogs (suspend, ban, unban)
 */
export function ModerationActionsCard({
  user,
  moderationStatus,
  onActionComplete,
}: ModerationActionsCardProps) {
  const toast = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showUnbanConfirm, setShowUnbanConfirm] = useState(false);

  const handleSuspendUser = async (reason: string, duration: number) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }

    setActionLoading(true);
    try {
      const result = await suspendUser(user.id, reason, duration);

      if (result.success) {
        toast.success(`User suspended for ${duration} days`);
        setShowSuspendDialog(false);
        onActionComplete();
      } else {
        toast.error(result.error || 'Failed to suspend user');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async (reason: string) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for ban');
      return;
    }

    setActionLoading(true);
    try {
      const result = await banUser(user.id, reason);

      if (result.success) {
        toast.success('User permanently banned');
        setShowBanDialog(false);
        onActionComplete();
      } else {
        toast.error(result.error || 'Failed to ban user');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async () => {
    setShowUnbanConfirm(false);
    setActionLoading(true);
    try {
      const result = await unbanUser(user.id);

      if (result.success) {
        toast.success('User unbanned');
        onActionComplete();
      } else {
        toast.error(result.error || 'Failed to unban user');
      }
    } catch (error) {
      logger.error('Error unbanning user', {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to unban user');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Moderation Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {!moderationStatus?.isBanned && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowSuspendDialog(true)}
                  disabled={actionLoading || moderationStatus?.isSuspended}
                >
                  Suspend User
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowBanDialog(true)}
                  disabled={actionLoading}
                >
                  Ban User
                </Button>
              </>
            )}
            {moderationStatus?.isBanned && (
              <Button
                variant="primary"
                onClick={() => setShowUnbanConfirm(true)}
                disabled={actionLoading}
                className="col-span-2"
              >
                Unban User
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suspend User Dialog */}
      <SuspendUserDialog
        isOpen={showSuspendDialog}
        onClose={() => setShowSuspendDialog(false)}
        onConfirm={handleSuspendUser}
        isLoading={actionLoading}
      />

      {/* Ban User Dialog */}
      <BanUserDialog
        isOpen={showBanDialog}
        onClose={() => setShowBanDialog(false)}
        onConfirm={handleBanUser}
        isLoading={actionLoading}
      />

      {/* Unban Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showUnbanConfirm}
        onClose={() => setShowUnbanConfirm(false)}
        onConfirm={handleUnbanUser}
        title="Unban User"
        message={`Are you sure you want to unban ${getFullName(user)}? This will restore full account access.`}
        confirmText="Unban"
        isLoading={actionLoading}
      />
    </>
  );
}
