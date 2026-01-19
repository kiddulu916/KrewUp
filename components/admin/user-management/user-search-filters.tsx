'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type UserSearchFiltersProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  subscriptionFilter: string;
  onSubscriptionFilterChange: (subscription: string) => void;
  totalUsers: number;
  filteredUsersCount: number;
};

/**
 * Search and filter controls for user management
 */
export function UserSearchFilters({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  subscriptionFilter,
  onSubscriptionFilterChange,
  totalUsers,
  filteredUsersCount,
}: UserSearchFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="worker">Workers</option>
            <option value="employer">Employers</option>
          </select>
          <select
            value={subscriptionFilter}
            onChange={(e) => onSubscriptionFilterChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent"
          >
            <option value="all">All Subscriptions</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Showing {filteredUsersCount} of {totalUsers} users
        </p>
      </CardContent>
    </Card>
  );
}
