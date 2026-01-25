'use client';

import { useConversations } from '../hooks/use-conversations';
import { ConversationItem } from './conversation-item';
import { EmptyMessages, ListSkeleton } from '@/components/ui';

type Props = {
  activeConversationId?: string;
};

export function ConversationList({ activeConversationId }: Props) {
  const { data: conversations, isLoading, error } = useConversations();

  if (isLoading) {
    return (
      <div className="p-4">
        <ListSkeleton
          count={6}
          showAvatar
          className="divide-y divide-gray-100"
          itemClassName="py-3"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Error loading conversations</h3>
          <p className="text-sm text-red-600 mb-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-krewup-blue hover:underline"
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-4">
        <EmptyMessages />
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={activeConversationId === conversation.id}
        />
      ))}
    </div>
  );
}
