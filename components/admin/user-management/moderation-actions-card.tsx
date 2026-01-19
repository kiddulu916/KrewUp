'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/providers/toast-provider';
import {
  suspendUser,
  banUser,
  unbanUser,
} from '@/features/admin/actions/user-actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getFullName } from '@/lib/utils';
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
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState(7);
  const [banReason, setBanReason] = useState('');

  const handleSuspendUser = async () => {
    if (!suspendReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }

    setActionLoading(true);
    try {
      const result = await suspendUser(user.id, suspendReason, suspendDuration);

      if (result.success) {
        toast.success(`User suspended for ${suspendDuration} days`);
        setShowSuspendDialog(false);
        setSuspendReason('');
        setSuspendDuration(7);
        onActionComplete();
      } else {
        toast.error(result.error || 'Failed to suspend user');
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!banReason.trim()) {
      toast.error('Please provide a reason for ban');
      return;
    }

    setActionLoading(true);
    try {
      const result = await banUser(user.id, banReason);

      if (result.success) {
        toast.success('User permanently banned');
        setShowBanDialog(false);
        setBanReason('');
        onActionComplete();
      } else {
        toast.error(result.error || 'Failed to ban user');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
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
      console.error('Error unbanning user:', error);
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

          {/* Suspend Dialog */}
          {showSuspendDialog && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold mb-2">Suspend User</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Duration (days)
                  </label>
                  <Input
                    type="number"
                    value={suspendDuration}
                    onChange={(e) =>
                      setSuspendDuration(parseInt(e.target.value))
                    }
                    min={1}
                    max={365}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <Input
                    type="text"
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Enter reason for suspension..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleSuspendUser}
                    disabled={actionLoading}
                  >
                    Confirm Suspension
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSuspendDialog(false);
                      setSuspendReason('');
                    }}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Ban Dialog */}
          {showBanDialog && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold mb-2 text-red-900">
                Permanently Ban User
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <Input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Enter reason for ban..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    onClick={handleBanUser}
                    disabled={actionLoading}
                  >
                    Confirm Ban
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBanDialog(false);
                      setBanReason('');
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
