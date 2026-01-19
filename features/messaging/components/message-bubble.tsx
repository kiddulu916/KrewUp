'use client';

import React from 'react';
import type { Message } from '../types';
import { Avatar } from '@/components/ui';

type Props = {
  message: Message;
  isOwnMessage: boolean;
};

function MessageBubbleComponent({ message, isOwnMessage }: Props) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div
      className={`flex gap-2 max-w-[75%] ${isOwnMessage ? 'ml-auto flex-row-reverse' : ''}`}
    >
      {/* Avatar for received messages */}
      {!isOwnMessage && message.sender && (
        <Avatar
          src={message.sender.profile_image_url}
          name={message.sender.name}
          userId={message.sender.id}
          size="sm"
          shadow
        />
      )}

      <div className="flex flex-col">
        {/* Message bubble */}
        <div
          className={`rounded-xl px-4 py-2.5 shadow-md ${
            isOwnMessage
              ? 'bg-gradient-to-br from-krewup-blue to-krewup-light-blue text-white'
              : 'bg-white border-2 border-gray-200 text-gray-900'
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <p
          className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

// * Memoized to prevent re-renders when parent state changes but message props are unchanged
export const MessageBubble = React.memo(MessageBubbleComponent, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.created_at === nextProps.message.created_at &&
    prevProps.message.sender_id === nextProps.message.sender_id &&
    prevProps.isOwnMessage === nextProps.isOwnMessage &&
    prevProps.message.sender?.id === nextProps.message.sender?.id &&
    prevProps.message.sender?.name === nextProps.message.sender?.name &&
    prevProps.message.sender?.profile_image_url === nextProps.message.sender?.profile_image_url
  );
});
