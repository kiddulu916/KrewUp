'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { getFullName } from '@/lib/utils';
import type { UserProfile } from './types';

type UserListProps = {
  users: UserProfile[];
  selectedUser: UserProfile | null;
  onUserSelect: (user: UserProfile) => void;
};

/**
 * Scrollable list of users with selection
 */
export function UserList({ users, selectedUser, onUserSelect }: UserListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No users found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => onUserSelect(user)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedUser?.id === user.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {getFullName(user)}
                    </p>
                    <p className="text-sm text-gray-600 truncate">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge
                        variant={user.role === 'employer' ? 'warning' : 'default'}
                      >
                        {user.role}
                      </Badge>
                      {user.subscription_status === 'pro' && (
                        <Badge variant="success">Pro</Badge>
                      )}
                      {user.is_admin && <Badge variant="danger">Admin</Badge>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
