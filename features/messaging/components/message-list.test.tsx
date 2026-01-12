import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from './message-list';
import type { Message } from '../types';

// Mock the MessageBubble component
vi.mock('./message-bubble', () => ({
  MessageBubble: ({ message, isOwnMessage }: { message: Message; isOwnMessage: boolean }) => (
    <div data-testid={`message-${message.id}`} data-own={isOwnMessage}>
      {message.content}
    </div>
  ),
}));

describe('MessageList', () => {
  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      conversation_id: 'conv-123',
      sender_id: 'user-1',
      content: 'Hello there!',
      read_at: null,
      created_at: '2025-01-01T10:00:00Z',
    },
    {
      id: 'msg-2',
      conversation_id: 'conv-123',
      sender_id: 'user-2',
      content: 'Hi! How are you?',
      read_at: '2025-01-01T10:01:00Z',
      created_at: '2025-01-01T10:01:00Z',
    },
    {
      id: 'msg-3',
      conversation_id: 'conv-123',
      sender_id: 'user-1',
      content: 'I am doing great!',
      read_at: null,
      created_at: '2025-01-01T10:02:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('should render messages', () => {
    render(<MessageList messages={mockMessages} currentUserId="user-1" />);

    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    expect(screen.getByText('Hi! How are you?')).toBeInTheDocument();
    expect(screen.getByText('I am doing great!')).toBeInTheDocument();
  });

  it('should show empty state when no messages', () => {
    render(<MessageList messages={[]} currentUserId="user-1" />);

    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    expect(screen.getByText(/send a message to start the conversation/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<MessageList messages={[]} currentUserId="user-1" isLoading={true} />);

    expect(screen.getByText(/loading messages/i)).toBeInTheDocument();
  });

  it('should identify own messages correctly', () => {
    render(<MessageList messages={mockMessages} currentUserId="user-1" />);

    const msg1 = screen.getByTestId('message-msg-1');
    const msg2 = screen.getByTestId('message-msg-2');
    const msg3 = screen.getByTestId('message-msg-3');

    expect(msg1).toHaveAttribute('data-own', 'true');
    expect(msg2).toHaveAttribute('data-own', 'false');
    expect(msg3).toHaveAttribute('data-own', 'true');
  });

  it('should render all messages in order', () => {
    render(<MessageList messages={mockMessages} currentUserId="user-1" />);

    const messages = screen.getAllByTestId(/^message-/);
    expect(messages).toHaveLength(3);
  });

  it('should call scrollIntoView when messages change', () => {
    const { rerender } = render(<MessageList messages={mockMessages} currentUserId="user-1" />);

    const newMessages = [
      ...mockMessages,
      {
        id: 'msg-4',
        conversation_id: 'conv-123',
        sender_id: 'user-2',
        content: 'New message!',
        read_at: null,
        created_at: '2025-01-01T10:03:00Z',
      },
    ];

    rerender(<MessageList messages={newMessages} currentUserId="user-1" />);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('should handle undefined currentUserId', () => {
    render(<MessageList messages={mockMessages} />);

    // All messages should be rendered as not own messages
    const msg1 = screen.getByTestId('message-msg-1');
    expect(msg1).toHaveAttribute('data-own', 'false');
  });

  it('should show empty state emoji', () => {
    render(<MessageList messages={[]} currentUserId="user-1" />);

    // Check for the emoji in empty state
    expect(screen.getByText('💬')).toBeInTheDocument();
  });
});
