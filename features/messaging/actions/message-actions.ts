'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { rateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { logger, sanitizeUserId } from '@/lib/utils/logger';
import { assertValidCsrfToken } from '@/lib/security/csrf';
import type { Message } from '../types';

export type MessageResult<T = Message | void> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Send a message in a conversation
 * 
 * ! Rate limited: 30 messages per minute per IP
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  csrfToken: string,
): Promise<MessageResult> {
  const csrfResult = await assertValidCsrfToken(csrfToken);
  if (!csrfResult.ok) {
    return { success: false, error: csrfResult.error ?? 'Security validation failed' };
  }

  // * Rate limiting - prevent message spam
  const rateLimitResult = await rateLimit('message:send', RATE_LIMITS.message);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate content
  if (!content || content.trim().length === 0) {
    return { success: false, error: 'Message cannot be empty' };
  }

  if (content.length > 1000) {
    return { success: false, error: 'Message is too long (max 1000 characters)' };
  }

  // Verify conversation exists and user is a participant
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, participant_1_id, participant_2_id')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    return { success: false, error: 'Conversation not found' };
  }

  const isParticipant =
    conversation.participant_1_id === user.id || conversation.participant_2_id === user.id;

  if (!isParticipant) {
    return { success: false, error: 'You are not a participant in this conversation' };
  }

  // Insert message
  const { data: message, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (insertError) {
    logger.error('Failed to send message', {
      conversationId,
      senderId: sanitizeUserId(user.id),
      error: insertError.message,
      code: insertError.code,
    });
    return { success: false, error: 'Failed to send message' };
  }

  // Update conversation's last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  revalidatePath('/dashboard/messages');

  return { success: true, data: message };
}

/**
 * Mark all messages in a conversation as read
 * Uses service role to bypass RLS since users can't update messages they didn't send
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
