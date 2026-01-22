import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModerationActionsCard } from '@/components/admin/user-management/moderation-actions-card';
import type { UserProfile, ModerationStatus } from '@/components/admin/user-management/types';

// Mock the toast provider
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('@/components/providers/toast-provider', () => ({
  useToast: () => mockToast,
}));

// Mock the server actions
vi.mock('@/features/admin/actions/user-actions', () => ({
  suspendUser: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
}));

import {
  suspendUser,
  banUser,
  unbanUser,
} from '@/features/admin/actions/user-actions';

describe('ModerationActionsCard Component', () => {
  const mockUser: UserProfile = {
    id: '123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    role: 'worker',
    subscription_status: 'free',
    trade: 'Electrician',
    sub_trade: 'Commercial',
    location: 'New York, NY',
    created_at: '2024-01-15T10:00:00Z',
    phone: '555-1234',
    is_admin: false,
    can_post_jobs: false,
  };

  const mockOnActionComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with moderation actions card title', () => {
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      expect(screen.getByText('Moderation Actions')).toBeInTheDocument();
    });

    it('should render suspend and ban buttons for active users', () => {
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      expect(screen.getByText('Suspend User')).toBeInTheDocument();
      expect(screen.getByText('Ban User')).toBeInTheDocument();
      expect(screen.queryByText('Unban User')).not.toBeInTheDocument();
    });

    it('should disable suspend button for already suspended users', () => {
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: true,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      const suspendButton = screen.getByText('Suspend User');
      expect(suspendButton).toBeDisabled();
    });

    it('should render unban button for banned users', () => {
      const moderationStatus: ModerationStatus = {
        isBanned: true,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      expect(screen.getByText('Unban User')).toBeInTheDocument();
      expect(screen.queryByText('Suspend User')).not.toBeInTheDocument();
      expect(screen.queryByText('Ban User')).not.toBeInTheDocument();
    });

    it('should render within a Card component', () => {
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      const { container } = render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      const card = container.querySelector('.rounded-xl');
      expect(card).toBeInTheDocument();
    });

    it('should handle null moderation status', () => {
      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={null}
          onActionComplete={mockOnActionComplete}
        />
      );

      expect(screen.getByText('Suspend User')).toBeInTheDocument();
      expect(screen.getByText('Ban User')).toBeInTheDocument();
    });
  });

  describe('Suspend Dialog', () => {
    it('should show suspend dialog when suspend button is clicked', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      const suspendButton = screen.getByText('Suspend User');
      await user.click(suspendButton);

      expect(screen.getByText('Duration (days)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter reason for suspension...')).toBeInTheDocument();
      expect(screen.getByText('Confirm Suspension')).toBeInTheDocument();
    });

    it('should allow input of suspension duration', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Suspend User'));

      const durationInput = screen.getByDisplayValue('7') as HTMLInputElement;
      await user.clear(durationInput);
      await user.type(durationInput, '14');

      expect(durationInput.value).toBe('14');
    });

    it('should allow input of suspension reason', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Suspend User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for suspension...');
      await user.type(reasonInput, 'Violation of terms');

      expect(reasonInput).toHaveValue('Violation of terms');
    });

    it('should close suspend dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Suspend User'));
      expect(screen.getByText('Confirm Suspension')).toBeInTheDocument();

      const cancelButtons = screen.getAllByText('Cancel');
      await user.click(cancelButtons[0]);

      expect(screen.queryByText('Confirm Suspension')).not.toBeInTheDocument();
    });

    it('should show error if suspension reason is empty', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Suspend User'));
      await user.click(screen.getByText('Confirm Suspension'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Please provide a reason for suspension');
      });
    });

    it('should call suspendUser with correct parameters on confirm', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      vi.mocked(suspendUser).mockResolvedValue({ success: true });

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Suspend User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for suspension...');
      await user.type(reasonInput, 'Violation of terms');

      await user.click(screen.getByText('Confirm Suspension'));

      await waitFor(() => {
        expect(suspendUser).toHaveBeenCalledWith('123', 'Violation of terms', 7);
      });
    });

    it('should show success toast and call onActionComplete on successful suspension', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      vi.mocked(suspendUser).mockResolvedValue({ success: true });

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Suspend User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for suspension...');
      await user.type(reasonInput, 'Violation of terms');

      await user.click(screen.getByText('Confirm Suspension'));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('User suspended for 7 days');
        expect(mockOnActionComplete).toHaveBeenCalled();
      });
    });

    it('should show error toast on failed suspension', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      vi.mocked(suspendUser).mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Suspend User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for suspension...');
      await user.type(reasonInput, 'Violation of terms');

      await user.click(screen.getByText('Confirm Suspension'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Database error');
      });
    });
  });

  describe('Ban Dialog', () => {
    it('should show ban dialog when ban button is clicked', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      const banButton = screen.getByText('Ban User');
      await user.click(banButton);

      expect(screen.getByText('Permanently Ban User')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter reason for ban...')).toBeInTheDocument();
      expect(screen.getByText('Confirm Ban')).toBeInTheDocument();
    });

    it('should allow input of ban reason', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Ban User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for ban...');
      await user.type(reasonInput, 'Serious violation');

      expect(reasonInput).toHaveValue('Serious violation');
    });

    it('should close ban dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Ban User'));
      expect(screen.getByText('Confirm Ban')).toBeInTheDocument();

      const cancelButtons = screen.getAllByText('Cancel');
      await user.click(cancelButtons[0]);

      expect(screen.queryByText('Confirm Ban')).not.toBeInTheDocument();
    });

    it('should show error if ban reason is empty', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Ban User'));
      await user.click(screen.getByText('Confirm Ban'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Please provide a reason for ban');
      });
    });

    it('should call banUser with correct parameters on confirm', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      vi.mocked(banUser).mockResolvedValue({ success: true });

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Ban User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for ban...');
      await user.type(reasonInput, 'Serious violation');

      await user.click(screen.getByText('Confirm Ban'));

      await waitFor(() => {
        expect(banUser).toHaveBeenCalledWith('123', 'Serious violation');
      });
    });

    it('should show success toast and call onActionComplete on successful ban', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      vi.mocked(banUser).mockResolvedValue({ success: true });

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Ban User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for ban...');
      await user.type(reasonInput, 'Serious violation');

      await user.click(screen.getByText('Confirm Ban'));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('User permanently banned');
        expect(mockOnActionComplete).toHaveBeenCalled();
      });
    });

    it('should show error toast on failed ban', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      vi.mocked(banUser).mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Ban User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for ban...');
      await user.type(reasonInput, 'Serious violation');

      await user.click(screen.getByText('Confirm Ban'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Permission denied');
      });
    });
  });

  describe('Unban Functionality', () => {
    it('should show unban confirmation dialog when unban button is clicked', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: true,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      const unbanButton = screen.getByRole('button', { name: 'Unban User' });
      await user.click(unbanButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to unban/)).toBeInTheDocument();
    });

    it('should call unbanUser when confirm is clicked', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: true,
        isSuspended: false,
      };

      vi.mocked(unbanUser).mockResolvedValue({ success: true });

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Unban User'));

      const confirmButton = screen.getByText('Unban');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(unbanUser).toHaveBeenCalledWith('123');
      });
    });

    it('should show success toast and call onActionComplete on successful unban', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: true,
        isSuspended: false,
      };

      vi.mocked(unbanUser).mockResolvedValue({ success: true });

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Unban User'));

      const confirmButton = screen.getByText('Unban');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('User unbanned');
        expect(mockOnActionComplete).toHaveBeenCalled();
      });
    });

    it('should show error toast on failed unban', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: true,
        isSuspended: false,
      };

      vi.mocked(unbanUser).mockResolvedValue({
        success: false,
        error: 'Action failed',
      });

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Unban User'));

      const confirmButton = screen.getByText('Unban');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Action failed');
      });
    });
  });

  describe('Button States', () => {
    it('should disable buttons during loading', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      vi.mocked(suspendUser).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Suspend User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for suspension...');
      await user.type(reasonInput, 'Violation');

      await user.click(screen.getByText('Confirm Suspension'));

      const confirmButton = screen.getByText('Confirm Suspension');
      expect(confirmButton).toBeDisabled();
    });

    it('should have correct variant for suspend button', () => {
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      const suspendButton = screen.getByText('Suspend User');
      expect(suspendButton).toBeInTheDocument();
    });

    it('should have correct variant for ban button', () => {
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      const banButton = screen.getByText('Ban User');
      expect(banButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle suspendUser throwing an error', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      vi.mocked(suspendUser).mockRejectedValue(new Error('Network error'));

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Suspend User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for suspension...');
      await user.type(reasonInput, 'Violation');

      await user.click(screen.getByText('Confirm Suspension'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to suspend user');
      });
    });

    it('should handle banUser throwing an error', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      vi.mocked(banUser).mockRejectedValue(new Error('Network error'));

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Ban User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for ban...');
      await user.type(reasonInput, 'Violation');

      await user.click(screen.getByText('Confirm Ban'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to ban user');
      });
    });

    it('should handle unbanUser throwing an error', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: true,
        isSuspended: false,
      };

      vi.mocked(unbanUser).mockRejectedValue(new Error('Network error'));

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Unban User'));

      const confirmButton = screen.getByText('Unban');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to unban user');
      });
    });

    it('should clear form fields after successful suspension', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      vi.mocked(suspendUser).mockResolvedValue({ success: true });

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Suspend User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for suspension...');
      await user.type(reasonInput, 'Violation');

      await user.click(screen.getByText('Confirm Suspension'));

      await waitFor(() => {
        expect(screen.queryByText('Confirm Suspension')).not.toBeInTheDocument();
      });
    });

    it('should clear form fields after successful ban', async () => {
      const user = userEvent.setup();
      const moderationStatus: ModerationStatus = {
        isBanned: false,
        isSuspended: false,
      };

      vi.mocked(banUser).mockResolvedValue({ success: true });

      render(
        <ModerationActionsCard
          user={mockUser}
          moderationStatus={moderationStatus}
          onActionComplete={mockOnActionComplete}
        />
      );

      await user.click(screen.getByText('Ban User'));

      const reasonInput = screen.getByPlaceholderText('Enter reason for ban...');
      await user.type(reasonInput, 'Violation');

      await user.click(screen.getByText('Confirm Ban'));

      await waitFor(() => {
        expect(screen.queryByText('Confirm Ban')).not.toBeInTheDocument();
      });
    });
  });
});
