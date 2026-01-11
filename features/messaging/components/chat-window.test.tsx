import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies BEFORE importing the component
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
      refetchQueries: vi.fn(),
    }),
  };
});

const mockMarkActive = vi.fn();
const mockRefetchNow = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('../hooks/use-messages', () => ({
  useMessages: vi.fn(() => ({
    messages: [],
    isLoading: false,
    isFetching: false,
    status: {
      isPolling: true,
      interval: 5000,
      errorCount: 0,
    },
    markActive: mockMarkActive,
    refetchNow: mockRefetchNow,
  })),
}));

vi.mock('../hooks/use-send-message', () => ({
  useSendMessage: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('../actions/message-actions', () => ({
  markMessagesAsRead: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'current-user-123' } },
      }),
    },
  }),
}));

vi.mock('@/components/ui', () => ({
  Avatar: ({ name, src, userId }: { name: string; src?: string; userId: string }) => (
    <div data-testid="avatar" data-name={name} data-src={src || ''} data-userid={userId}>
      {name}
    </div>
  ),
}));

vi.mock('@/components/ui/polling-status', () => ({
  PollingStatusIndicator: ({ status, isFetching, onRefresh }: any) => (
    <div data-testid="polling-status" data-is-fetching={isFetching}>
      <button onClick={onRefresh} data-testid="refresh-button">
        Refresh
      </button>
    </div>
  ),
  ConnectionErrorBanner: ({ errorCount, onRetry }: any) => (
    errorCount > 0 ? (
      <div data-testid="error-banner" data-error-count={errorCount}>
        <button onClick={onRetry} data-testid="retry-button">Retry</button>
      </div>
    ) : null
  ),
}));

vi.mock('./message-list', () => ({
  MessageList: ({ messages, currentUserId, isLoading }: any) => (
    <div data-testid="message-list" data-loading={isLoading} data-user-id={currentUserId}>
      {messages.map((msg: any) => (
        <div key={msg.id} data-testid="message-item">
          {msg.content}
        </div>
      ))}
      {messages.length === 0 && <span data-testid="empty-messages">No messages</span>}
    </div>
  ),
}));

vi.mock('./message-input', () => ({
  MessageInput: ({ onSend, isLoading }: any) => (
    <div data-testid="message-input" data-loading={isLoading}>
      <input
        data-testid="message-text-input"
        type="text"
        placeholder="Type a message..."
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
            onSend((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).value = '';
          }
        }}
      />
      <button
        data-testid="send-button"
        onClick={() => {
          const input = document.querySelector('[data-testid="message-text-input"]') as HTMLInputElement;
          if (input?.value) {
            onSend(input.value);
            input.value = '';
          }
        }}
      >
        Send
      </button>
    </div>
  ),
}));

import { ChatWindow } from './chat-window';
import { useMessages } from '../hooks/use-messages';
import { markMessagesAsRead } from '../actions/message-actions';

const mockUseMessages = useMessages as ReturnType<typeof vi.fn>;

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('ChatWindow Component', () => {
  const otherParticipant = {
    id: 'user-456',
    name: 'John Doe',
    profile_image_url: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
    mockUseMessages.mockReturnValue({
      messages: [],
      isLoading: false,
      isFetching: false,
      status: { isPolling: true, interval: 5000, errorCount: 0 },
      markActive: mockMarkActive,
      refetchNow: mockRefetchNow,
    });
  });

  describe('Initial Render', () => {
    it('should render the chat window structure', () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });

    it('should render the header with participant info', () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      // The name appears in both the avatar and the header
      const nameElements = screen.getAllByText('John Doe');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('avatar')).toHaveAttribute('data-name', 'John Doe');
    });

    it('should render the avatar with correct props', () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveAttribute('data-src', 'https://example.com/avatar.jpg');
      expect(avatar).toHaveAttribute('data-userid', 'user-456');
    });

    it('should show "Active conversation" text', () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      expect(screen.getByText('Active conversation')).toBeInTheDocument();
    });

    it('should render polling status indicator', () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      expect(screen.getByTestId('polling-status')).toBeInTheDocument();
    });
  });

  describe('Without Other Participant', () => {
    it('should NOT render header when no other participant', () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" />
      );

      expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
      expect(screen.queryByText('Active conversation')).not.toBeInTheDocument();
    });

    it('should still render message list and input', () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" />
      );

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should pass loading state to message list', () => {
      mockUseMessages.mockReturnValue({
        messages: [],
        isLoading: true,
        isFetching: false,
        status: { isPolling: true, interval: 5000, errorCount: 0 },
        markActive: mockMarkActive,
        refetchNow: mockRefetchNow,
      });

      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      expect(screen.getByTestId('message-list')).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Message Display', () => {
    it('should display messages when available', () => {
      const messages = [
        { id: 'msg-1', content: 'Hello there!', sender_id: 'user-456' },
        { id: 'msg-2', content: 'How are you?', sender_id: 'current-user-123' },
      ];

      mockUseMessages.mockReturnValue({
        messages,
        isLoading: false,
        isFetching: false,
        status: { isPolling: true, interval: 5000, errorCount: 0 },
        markActive: mockMarkActive,
        refetchNow: mockRefetchNow,
      });

      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      expect(screen.getByText('Hello there!')).toBeInTheDocument();
      expect(screen.getByText('How are you?')).toBeInTheDocument();
    });

    it('should show empty state when no messages', () => {
      mockUseMessages.mockReturnValue({
        messages: [],
        isLoading: false,
        isFetching: false,
        status: { isPolling: true, interval: 5000, errorCount: 0 },
        markActive: mockMarkActive,
        refetchNow: mockRefetchNow,
      });

      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      expect(screen.getByTestId('empty-messages')).toBeInTheDocument();
    });
  });

  describe('Sending Messages', () => {
    it('should call send message mutation when message is sent', async () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      const input = screen.getByTestId('message-text-input');
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          conversationId: 'conv-123',
          content: 'Test message',
        });
      });
    });

    it('should call markActive when sending a message', async () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      const input = screen.getByTestId('message-text-input');
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockMarkActive).toHaveBeenCalled();
      });
    });

    it('should call markActive on input focus', () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      const inputContainer = screen.getByTestId('message-input').parentElement!;
      fireEvent.focus(inputContainer);

      expect(mockMarkActive).toHaveBeenCalled();
    });
  });

  describe('Mark Messages as Read', () => {
    it('should call markMessagesAsRead on mount', async () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      await waitFor(() => {
        expect(markMessagesAsRead).toHaveBeenCalledWith('conv-123');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error banner when error count > 0', () => {
      mockUseMessages.mockReturnValue({
        messages: [],
        isLoading: false,
        isFetching: false,
        status: { isPolling: true, interval: 5000, errorCount: 3 },
        markActive: mockMarkActive,
        refetchNow: mockRefetchNow,
      });

      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
    });

    it('should NOT show error banner when no errors', () => {
      mockUseMessages.mockReturnValue({
        messages: [],
        isLoading: false,
        isFetching: false,
        status: { isPolling: true, interval: 5000, errorCount: 0 },
        markActive: mockMarkActive,
        refetchNow: mockRefetchNow,
      });

      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      expect(screen.queryByTestId('error-banner')).not.toBeInTheDocument();
    });

    it('should call refetchNow when retry button is clicked', () => {
      mockUseMessages.mockReturnValue({
        messages: [],
        isLoading: false,
        isFetching: false,
        status: { isPolling: true, interval: 5000, errorCount: 3 },
        markActive: mockMarkActive,
        refetchNow: mockRefetchNow,
      });

      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      fireEvent.click(screen.getByTestId('retry-button'));

      expect(mockRefetchNow).toHaveBeenCalled();
    });
  });

  describe('Refresh Functionality', () => {
    it('should call refetchNow when refresh button is clicked', () => {
      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      fireEvent.click(screen.getByTestId('refresh-button'));

      expect(mockRefetchNow).toHaveBeenCalled();
    });

    it('should show fetching state in polling indicator', () => {
      mockUseMessages.mockReturnValue({
        messages: [],
        isLoading: false,
        isFetching: true,
        status: { isPolling: true, interval: 5000, errorCount: 0 },
        markActive: mockMarkActive,
        refetchNow: mockRefetchNow,
      });

      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={otherParticipant} />
      );

      expect(screen.getByTestId('polling-status')).toHaveAttribute('data-is-fetching', 'true');
    });
  });

  describe('Participant Without Profile Image', () => {
    it('should handle participant without profile image', () => {
      const participantNoImage = {
        id: 'user-456',
        name: 'John Doe',
        profile_image_url: null,
      };

      renderWithProviders(
        <ChatWindow conversationId="conv-123" otherParticipant={participantNoImage} />
      );

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveAttribute('data-src', '');
    });
  });
});
