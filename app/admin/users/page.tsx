'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/providers/toast-provider';
import {
  getUserModerationHistory,
  getUserModerationStatus,
} from '@/features/admin/actions/user-actions';
import { UserSearchFilters } from '@/components/admin/user-management/user-search-filters';
import { UserList } from '@/components/admin/user-management/user-list';
import { UserInfoCard } from '@/components/admin/user-management/user-info-card';
import { ModerationActionsCard } from '@/components/admin/user-management/moderation-actions-card';
import { ProSubscriptionCard } from '@/components/admin/user-management/pro-subscription-card';
import { ModerationHistoryCard } from '@/components/admin/user-management/moderation-history-card';
import type {
  UserProfile,
  ModerationAction,
  ModerationStatus,
} from '@/components/admin/user-management/types';

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [moderationHistory, setModerationHistory] = useState<ModerationAction[]>([]);
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, subscriptionFilter]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserDetails(selectedUser.id);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const [historyResult, statusResult] = await Promise.all([
        getUserModerationHistory(userId),
        getUserModerationStatus(userId),
      ]);

      if (historyResult.success) {
        setModerationHistory(historyResult.data || []);
      }

      setModerationStatus(statusResult);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          `${user.first_name} ${user.last_name}`.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Subscription filter
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(
        (user) => user.subscription_status === subscriptionFilter
      );
    }

    setFilteredUsers(filtered);
  };

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
  };

  const handleActionComplete = () => {
    if (selectedUser) {
      fetchUsers();
      fetchUserDetails(selectedUser.id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">
          Search, view, and moderate user accounts
        </p>
      </div>

      <UserSearchFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        subscriptionFilter={subscriptionFilter}
        onSubscriptionFilterChange={setSubscriptionFilter}
        totalUsers={users.length}
        filteredUsersCount={filteredUsers.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <UserList
            users={filteredUsers}
            selectedUser={selectedUser}
            onUserSelect={handleUserSelect}
          />
        </div>

        <div className="lg:col-span-2">
          {!selectedUser ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon="👤"
                  title="No user selected"
                  description="Select a user from the list to view details"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <UserInfoCard
                user={selectedUser}
                moderationStatus={moderationStatus}
              />

              <ModerationActionsCard
                user={selectedUser}
                moderationStatus={moderationStatus}
                onActionComplete={handleActionComplete}
              />

              <ProSubscriptionCard
                user={selectedUser}
                onActionComplete={handleActionComplete}
              />

              <ModerationHistoryCard history={moderationHistory} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
