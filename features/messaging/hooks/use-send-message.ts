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
      console.log('[useSendMessage] Sending message:', { conversationId, contentLength: content.length });
      const result = await sendMessage(conversationId, content, csrfToken || '');

      if (!result.success) {
        console.error('[useSendMessage] Failed to send:', result.error);
        throw new Error(result.error || 'Failed to send message');
      }

      console.log('[useSendMessage] Message sent successfully');
      return result.data;
    },
    onSuccess: (data, variables) => {
      console.log('[useSendMessage] Invalidating queries...');
      // Invalidate conversations to update last_message_at
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // Invalidate messages for this conversation to show new message immediately
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
    },
  });
}
