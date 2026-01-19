'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type ProfileView = {
  id: string;
  viewed_at: string;
  viewer: {
    id: string;
    name: string;
    location: string;
    employer_type?: string | null;
  };
};

type ProfileViewItemProps = {
  view: ProfileView;
};

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

function ProfileViewItemComponent({ view }: ProfileViewItemProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold">{view.viewer.name}</h4>
          {view.viewer.employer_type && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {view.viewer.employer_type}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{view.viewer.location}</p>
        <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(view.viewed_at)}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => router.push(`/dashboard/profiles/${view.viewer.id}`)}
      >
        View Profile
      </Button>
    </div>
  );
}

// * Memoized to prevent re-renders when parent state changes but view props are unchanged
export const ProfileViewItem = React.memo(ProfileViewItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.view.id === nextProps.view.id &&
    prevProps.view.viewed_at === nextProps.view.viewed_at &&
    prevProps.view.viewer.id === nextProps.view.viewer.id &&
    prevProps.view.viewer.name === nextProps.view.viewer.name &&
    prevProps.view.viewer.location === nextProps.view.viewer.location &&
    prevProps.view.viewer.employer_type === nextProps.view.viewer.employer_type
  );
});
