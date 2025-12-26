'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { findOrCreateConversation } from '../actions/conversation-actions';
import { useToast } from '@/components/providers/toast-provider';
import { cn } from '@/lib/utils';

type Props = {
  recipientId: string;
  recipientName: string;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  fullWidth?: boolean;
};

export function MessageButton({
  recipientId,
  recipientName,
  variant = 'primary',
  className = '',
  fullWidth = false,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  async function handleClick() {
    setIsLoading(true);
    try {
      await findOrCreateConversation(recipientId);
      // findOrCreateConversation handles the redirect via Next.js redirect()
      // The redirect throws a special error that Next.js catches
      // If we reach here, redirect succeeded
    } catch (error) {
      console.error('Failed to start conversation:', error);

      // Check if this is a Next.js redirect (which is expected)
      const isRedirect = error instanceof Error &&
        (error.message.includes('NEXT_REDIRECT') ||
         (error as any).digest?.startsWith('NEXT_REDIRECT'));

      if (isRedirect) {
        // This is expected - Next.js redirect is working
        // The error will be caught by Next.js and handled properly
        throw error;
      }

      // Actual error - show user-friendly message
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to start conversation. Please try again.';

      toast.error(errorMessage);
      setIsLoading(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      isLoading={isLoading}
      className={cn(fullWidth && 'w-full', className)}
    >
      {isLoading ? 'Starting conversation...' : `Message ${recipientName}`}
    </Button>
  );
}
