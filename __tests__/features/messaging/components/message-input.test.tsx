import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '@/features/messaging/components/message-input';

describe('MessageInput', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render textarea and send button', () => {
      render(<MessageInput onSend={mockOnSend} />);

      expect(
        screen.getByPlaceholderText(/type a message/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should show character count', () => {
      render(<MessageInput onSend={mockOnSend} />);

      expect(screen.getByText('0/1000 characters')).toBeInTheDocument();
    });

    it('should show keyboard shortcut hints', () => {
      render(<MessageInput onSend={mockOnSend} />);

      expect(screen.getByText(/enter to send/i)).toBeInTheDocument();
      expect(screen.getByText(/shift\+enter for new line/i)).toBeInTheDocument();
    });
  });

  describe('Input Interactions', () => {
    it('should update character count on input', async () => {
      const user = userEvent.setup();
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      await user.type(textarea, 'Hello world');

      expect(screen.getByText('11/1000 characters')).toBeInTheDocument();
    });

    it('should update textarea value on input', async () => {
      const user = userEvent.setup();
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      await user.type(textarea, 'Test message');

      expect(textarea).toHaveValue('Test message');
    });
  });

  describe('Character Limit', () => {
    it('should show orange warning when approaching limit', () => {
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      // Use fireEvent.change for long text to avoid memory issues with userEvent.type
      const longText = 'a'.repeat(950);
      fireEvent.change(textarea, { target: { value: longText } });

      const charCount = screen.getByText('950/1000 characters');
      expect(charCount).toHaveClass('text-orange-600');
    });

    it('should show red error when over limit', () => {
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      // Use fireEvent.change for long text to avoid memory issues with userEvent.type
      const longText = 'a'.repeat(1001);
      fireEvent.change(textarea, { target: { value: longText } });

      const charCount = screen.getByText('1001/1000 characters');
      expect(charCount).toHaveClass('text-red-600');
    });

    it('should disable send button when over limit', () => {
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      // Use fireEvent.change for long text to avoid memory issues with userEvent.type
      const longText = 'a'.repeat(1001);
      fireEvent.change(textarea, { target: { value: longText } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('should call onSend with trimmed content on submit', async () => {
      const user = userEvent.setup();
      mockOnSend.mockResolvedValueOnce(undefined);

      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(textarea, '  Hello world  ');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockOnSend).toHaveBeenCalledWith('Hello world');
      });
    });

    it('should clear input after successful send', async () => {
      const user = userEvent.setup();
      mockOnSend.mockResolvedValueOnce(undefined);

      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(textarea, 'Hello world');
      await user.click(sendButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should not submit empty message', async () => {
      const user = userEvent.setup();
      render(<MessageInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();

      await user.click(sendButton);
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should not submit whitespace-only message', async () => {
      const user = userEvent.setup();
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      await user.type(textarea, '     ');

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should submit on Enter key press', async () => {
      const user = userEvent.setup();
      mockOnSend.mockResolvedValueOnce(undefined);

      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      await user.type(textarea, 'Hello world');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSend).toHaveBeenCalledWith('Hello world');
      });
    });

    it('should not submit on Shift+Enter (newline)', async () => {
      const user = userEvent.setup();
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      await user.type(textarea, 'Hello');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(textarea, 'world');

      expect(mockOnSend).not.toHaveBeenCalled();
      // The textarea should have newline in value
      expect(textarea).toHaveValue('Hello\nworld');
    });
  });

  describe('Loading State', () => {
    it('should disable input when loading', () => {
      render(<MessageInput onSend={mockOnSend} isLoading={true} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      expect(textarea).toBeDisabled();
    });

    it('should show loading text when loading', () => {
      render(<MessageInput onSend={mockOnSend} isLoading={true} />);

      // Button shows Loading... (from isLoading prop) not Sending...
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not submit when loading', async () => {
      const user = userEvent.setup();
      render(<MessageInput onSend={mockOnSend} isLoading={true} />);

      const textarea = screen.getByPlaceholderText(/type a message/i);
      // Even if disabled, test the form behavior
      await user.type(textarea, 'Hello', { skipClick: true });

      // Try keyboard submit
      await user.keyboard('{Enter}');

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });
});
