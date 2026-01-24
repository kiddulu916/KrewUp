'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '../actions/message-actions';
import { useCsrfToken } from '@/components/providers/csrf-provider';

type SendMessageParams = {
  conversationId: string;
  content: string;
};

export function useSendMessage() {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken();

  return useMutation({
    mutationFn: async ({ conversationId, content }: SendMessageParams) => {
      const result = await sendMessage(conversationId, content, csrfToken || '');

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate conversations to update last_message_at
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // Invalidate messages for this conversation to show new message immediately
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
    },
  });
}
