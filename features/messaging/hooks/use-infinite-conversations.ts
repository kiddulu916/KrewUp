'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ConversationWithDetails } from '../types';

// * Page size for conversations pagination
const PAGE_SIZE = 20;

/**
 * Hook for fetching conversations with infinite scroll pagination.
 *
 * * Features:
 * - Cursor-based pagination via Supabase range queries
 * - Loads PAGE_SIZE conversations at a time
 * - Preserves ConversationWithDetails shape used elsewhere in messaging
 */
export function useInfiniteConversations() {
  const supabase = createClient();

  return useInfiniteQuery({
    queryKey: ['conversations', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        // * Surfaces authentication issues clearly for the UI
        throw authError;
      }

      if (!user) {
        throw new Error('Not authenticated');
      }

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // * Fetch a page of conversations for the current user with participant profiles
      const { data, error, count } = await supabase
        .from('conversations')
        .select(
          `
          *,
          participant_1:users!participant_1_id (
            id,
            first_name,
            last_name,
            profile_image_url
          ),
          participant_2:users!participant_2_id (
            id,
            first_name,
            last_name,
            profile_image_url
          )
        `,
          { count: 'exact' },
        )
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) {
        // * Logs remain in the hook that uses this data for easier debugging
        // eslint-disable-next-line no-console
        console.error('[useInfiniteConversations] Error fetching conversations:', error);
        throw error;
      }

      const conversations = data ?? [];

      if (conversations.length === 0) {
        return {
          conversations: [] as ConversationWithDetails[],
          nextPage: undefined as number | undefined,
          totalCount: count ?? 0,
        };
      }

      // * Collect IDs for batched follow-up queries
      const conversationIds = conversations.map((c: any) => c.id as string);

      // * Batch fetch last messages for all conversations in this page
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, conversation_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      const lastMessagesByConv = new Map<string, any>();
      (lastMessages ?? []).forEach((msg: any) => {
        if (!lastMessagesByConv.has(msg.conversation_id)) {
          lastMessagesByConv.set(msg.conversation_id, msg);
        }
      });

      // * Batch fetch unread counts for all conversations in this page
      const { data: unreadData } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .is('read_at', null);

      const unreadCountsByConv = new Map<string, number>();
      (unreadData ?? []).forEach((msg: any) => {
        const current = unreadCountsByConv.get(msg.conversation_id) ?? 0;
        unreadCountsByConv.set(msg.conversation_id, current + 1);
      });

      // * Transform conversations into ConversationWithDetails for UI consumption
      const conversationsWithDetails: ConversationWithDetails[] = conversations.map((conv: any) => {
        const isParticipant1 = conv.participant_1_id === user.id;
        const otherParticipant = isParticipant1 ? conv.participant_2 : conv.participant_1;

        const participantWithLegacyName = otherParticipant
          ? {
              id: otherParticipant.id as string,
              name:
                `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() ||
                'Unknown User',
              profile_image_url: otherParticipant.profile_image_url as string | undefined,
            }
          : {
              id: (isParticipant1 ? conv.participant_2_id : conv.participant_1_id) as string,
              name: 'Unknown User',
              profile_image_url: undefined,
            };

        const lastMessage = lastMessagesByConv.get(conv.id) || undefined;

        return {
          id: conv.id as string,
          otherParticipant: participantWithLegacyName,
          lastMessage:
            lastMessage && lastMessage.id
              ? {
                  id: lastMessage.id as string,
                  content: lastMessage.content as string,
                  sender_id: lastMessage.sender_id as string,
                  created_at: lastMessage.created_at as string,
                }
              : undefined,
          lastMessageAt: conv.last_message_at as string | null,
          unreadCount: unreadCountsByConv.get(conv.id) ?? 0,
        };
      });

      const totalCount = count ?? 0;
      const hasMore = (pageParam + 1) * PAGE_SIZE < totalCount;

      return {
        conversations: conversationsWithDetails,
        nextPage: hasMore ? (pageParam as number) + 1 : undefined,
        totalCount,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 30000,
  });
}

