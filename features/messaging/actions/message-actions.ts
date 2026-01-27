'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { rateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { logger, sanitizeUserId } from '@/lib/utils/logger';
import { assertValidCsrfToken } from '@/lib/security/csrf';
import type { Message } from '../types';
import { success, error, handleActionError, requireAuth, getUserFriendlyError, validateInput } from '@/lib/utils/action-response';
import { sendMessageSchema, type SendMessageInput } from '@/lib/validation/schemas';
import type { ActionResponse } from '@/lib/utils/action-response';

export type MessageResult<T = Message | void> = ActionResponse<T>;

/**
 * Send a message in a conversation.
 *
 * Validates CSRF token, applies rate limiting, verifies user is a participant,
 * and creates a new message. Updates conversation's last_message_at timestamp.
 *
 * @param conversationId - UUID of the conversation to send message in
 * @param content - Message content (1-2000 characters, validated by schema)
 * @param csrfToken - CSRF token for security validation
 * @returns Promise resolving to MessageResult with success status and message data
 * @throws Will return error if CSRF validation fails, rate limit exceeded, user not authenticated,
 *         conversation not found, or user is not a participant
 *
 * @example
 * ```ts
 * const result = await sendMessage(
 *   '123e4567-e89b-12d3-a456-426614174000',
 *   'Hello, I am interested in this job.',
 *   csrfToken
 * );
 * if (result.success && result.data) {
 *   // Message sent successfully
 *   console.log('Message ID:', result.data.id);
 * }
 * ```
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  csrfToken: string,
): Promise<MessageResult> {
  const csrfResult = await assertValidCsrfToken(csrfToken);
  if (!csrfResult.ok) {
    return error(csrfResult.error ?? 'Security validation failed');
  }

  // * Rate limiting - prevent message spam
  const rateLimitResult = await rateLimit('message:send', RATE_LIMITS.message);
  if (rateLimitResult) return rateLimitResult;

  return handleActionError(async () => {
    // Validate input
    const validation = validateInput(sendMessageSchema, { conversationId, content });
    if (!validation.success) return validation.error;
    const validatedData: SendMessageInput = validation.data;

    const supabase = await createClient(await cookies());

    // Authentication check
    const authResult = await requireAuth(supabase);
    if (!authResult.success || !authResult.data) {
      return error(authResult.error || 'Not authenticated');
    }
    const user = authResult.data;

    // Verify conversation exists and user is a participant
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, participant_1_id, participant_2_id')
      .eq('id', validatedData.conversationId)
      .single();

    if (!conversation) {
      return error('Conversation not found');
    }

    const isParticipant =
      conversation.participant_1_id === user.id || conversation.participant_2_id === user.id;

    if (!isParticipant) {
      return error('You are not a participant in this conversation');
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: validatedData.conversationId,
        sender_id: user.id,
        content: validatedData.content.trim(),
      })
      .select()
      .single();

    if (insertError) {
      return error(getUserFriendlyError(insertError, 'Failed to send message'));
    }

    // Update conversation's last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', validatedData.conversationId);

    revalidatePath('/dashboard/messages');
    revalidatePath(`/dashboard/messages/${validatedData.conversationId}`);

    return success(message);
  }, 'Failed to send message');
}

/**
 * Mark all unread messages in a conversation as read.
 *
 * Uses service role client to bypass RLS since users can't update messages they didn't send.
 * Only marks messages from the other participant as read (not the user's own messages).
 *
 * @param conversationId - UUID of the conversation to mark messages as read
 * @returns Promise resolving to MessageResult with success status
 * @throws Will return error if user is not authenticated
 *
 * @example
 * ```ts
 * const result = await markMessagesAsRead('123e4567-e89b-12d3-a456-426614174000');
 * if (result.success) {
 *   // Messages marked as read, notification count will update
 * }
 * ```
 */
export async function markMessagesAsRead(conversationId: string): Promise<MessageResult> {
  logger.debug('Marking messages as read', { conversationId });

  // Get authenticated user first
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.error('Failed to mark messages as read: not authenticated', { conversationId });
    return { success: false, error: 'Not authenticated' };
  }

  logger.debug('Retrieved user for marking messages', {
    conversationId,
    userId: sanitizeUserId(user.id),
  });

  // Use service role client to bypass RLS for updating read_at
  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // First, count how many unread messages there are
  const { count: unreadCount } = await supabaseAdmin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  logger.debug('Found unread messages', {
    conversationId,
    unreadCount: unreadCount || 0,
  });

  // Mark all messages from other participant as read (using admin client to bypass RLS)
  const { data, error } = await supabaseAdmin
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null)
    .select();

  if (error) {
    logger.error('Failed to mark messages as read', {
      conversationId,
      userId: sanitizeUserId(user.id),
      error: error.message,
      code: error.code,
    });
    return { success: false, error: 'Failed to mark messages as read' };
  }

  logger.info('Marked messages as read', {
    conversationId,
    messageCount: data?.length || 0,
  });

  revalidatePath('/dashboard/messages');

  return { success: true };
}
