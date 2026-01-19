'use client';

import { Button } from '@/components/ui';
import { findOrCreateConversation } from '../actions/conversation-actions';
import { useAsyncAction } from '@/hooks/use-async-action';
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
  const { execute, isLoading } = useAsyncAction({
    showToast: true,
    errorMessagePrefix: 'Failed to start conversation',
  });

  async function handleClick() {
    await execute(async () => {
      await findOrCreateConversation(recipientId);
      // findOrCreateConversation handles the redirect via Next.js redirect()
      // The hook will re-throw NEXT_REDIRECT errors for Next.js to handle
    });
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
