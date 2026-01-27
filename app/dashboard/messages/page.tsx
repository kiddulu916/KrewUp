'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ConversationList } from '@/features/messaging/components/conversation-list';
import { ChatWindow } from '@/features/messaging/components/chat-window';
import { useConversations } from '@/features/messaging/hooks/use-conversations';
import { EmptyMessages, Button } from '@/components/ui';

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeConversationId = searchParams.get('conversation');
  const { data: conversations } = useConversations();

  // Find the active conversation details for the chat window
  const activeConversation = conversations?.find(
    (conv) => conv.id === activeConversationId
  );

  // Handle back button on mobile
  function handleBackToList() {
    router.push('/dashboard/messages');
  }

  return (
    <div className="flex flex-col md:flex-row rounded-lg border border-gray-200 bg-white shadow-sm min-h-[calc(100dvh-14rem)] md:min-h-0 md:h-[calc(100vh-10rem)]">
      {/* Left Sidebar - Conversation List */}
      <div
        className={`w-full md:w-1/3 md:border-r md:border-gray-200 overflow-y-auto ${
          activeConversationId ? 'hidden md:block' : 'block'
        }`}
      >
        <div className="bg-linear-to-r from-krewup-blue to-krewup-light-blue p-4 border-b-2 border-gray-200">
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <p className="text-sm text-blue-100">Your conversations</p>
        </div>
        <ConversationList activeConversationId={activeConversationId || undefined} />
      </div>

      {/* Right Panel - Chat Window */}
      <div
        className={`w-full md:w-2/3 h-[calc(100dvh-14rem)] md:h-full flex flex-col ${
          activeConversationId ? 'block' : 'hidden md:block'
        }`}
      >
        {/* Mobile Back Button */}
        {activeConversationId && (
          <div className="md:hidden border-b border-gray-200 p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="flex items-center gap-2 text-gray-600"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to conversations
            </Button>
          </div>
        )}

        {activeConversationId && activeConversation ? (
          <div className="flex-1 min-h-0">
            <ChatWindow
              conversationId={activeConversationId}
              otherParticipant={activeConversation.otherParticipant}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full">
              <EmptyMessages />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
