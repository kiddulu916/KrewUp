import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock dependencies
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefetch = vi.fn();
const mockOpenPortal = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

const mockUseSubscription = vi.fn();
vi.mock('../hooks/use-subscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

vi.mock('../hooks/use-checkout', () => ({
  useCheckout: () => ({
    openPortal: mockOpenPortal,
    isLoading: false,
  }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/loading-spinner', () => ({
  LoadingSpinner: ({ className }: any) => (
    <div data-testid="loading-spinner" className={className}>Loading...</div>
  ),
}));

vi.mock('./pro-badge', () => ({
  ProBadge: () => <span data-testid="pro-badge">PRO</span>,
}));

import { SubscriptionManager } from './subscription-manager';

describe('SubscriptionManager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockUseSubscription.mockReturnValue({
      data: {
        subscription: null,
        profileSubscriptionStatus: 'free',
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when loading', () => {
      mockUseSubscription.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<SubscriptionManager />);

      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('should show error message when error occurs', () => {
      mockUseSubscription.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch,
      });

      render(<SubscriptionManager />);

      expect(screen.getByText(/Unable to load subscription information/i)).toBeInTheDocument();
    });

    it('should show Retry button on error', () => {
      mockUseSubscription.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch,
      });

      render(<SubscriptionManager />);

      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  describe('Free User State', () => {
    it('should show Your Subscription title', () => {
      render(<SubscriptionManager />);

      expect(screen.getByText('Your Subscription')).toBeInTheDocument();
    });

    it('should show Free plan for free users', () => {
      render(<SubscriptionManager />);

      expect(screen.getByText(/Current Plan:/i)).toBeInTheDocument();
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('should NOT show Pro badge for free users', () => {
      render(<SubscriptionManager />);

      expect(screen.queryByTestId('pro-badge')).not.toBeInTheDocument();
    });

    it('should show upgrade message for free users', () => {
      render(<SubscriptionManager />);

      expect(screen.getByText(/Upgrade to Pro to unlock advanced features/i)).toBeInTheDocument();
    });

    it('should show View Pricing button for free users', () => {
      render(<SubscriptionManager />);

      expect(screen.getByRole('button', { name: /View Pricing/i })).toBeInTheDocument();
    });

    it('should navigate to pricing when View Pricing is clicked', () => {
      render(<SubscriptionManager />);

      const button = screen.getByRole('button', { name: /View Pricing/i });
      fireEvent.click(button);

      expect(mockPush).toHaveBeenCalledWith('/pricing');
    });
  });

  describe('Pro User State', () => {
    beforeEach(() => {
      mockUseSubscription.mockReturnValue({
        data: {
          subscription: {
            status: 'active',
            stripe_subscription_id: 'sub_123',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: false,
          },
          profileSubscriptionStatus: 'pro',
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('should show Pro badge for pro users', () => {
      render(<SubscriptionManager />);

      expect(screen.getByTestId('pro-badge')).toBeInTheDocument();
    });

    it('should show KrewUp Pro plan', () => {
      render(<SubscriptionManager />);

      expect(screen.getByText('KrewUp Pro')).toBeInTheDocument();
    });

    it('should show renewal date for pro users', () => {
      render(<SubscriptionManager />);

      expect(screen.getByText(/Renews on/i)).toBeInTheDocument();
    });

    it('should show Manage Subscription button for pro users', () => {
      render(<SubscriptionManager />);

      expect(screen.getByRole('button', { name: /Manage Subscription/i })).toBeInTheDocument();
    });

    it('should call openPortal when Manage Subscription is clicked', () => {
      render(<SubscriptionManager />);

      const button = screen.getByRole('button', { name: /Manage Subscription/i });
      fireEvent.click(button);

      expect(mockOpenPortal).toHaveBeenCalled();
    });

    it('should NOT show upgrade message for pro users', () => {
      render(<SubscriptionManager />);

      expect(screen.queryByText(/Upgrade to Pro/i)).not.toBeInTheDocument();
    });
  });

  describe('Cancellation State', () => {
    it('should show cancellation date when subscription is canceling', () => {
      const cancelDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      mockUseSubscription.mockReturnValue({
        data: {
          subscription: {
            status: 'active',
            stripe_subscription_id: 'sub_123',
            current_period_end: cancelDate.toISOString(),
            cancel_at_period_end: true,
          },
          profileSubscriptionStatus: 'pro',
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<SubscriptionManager />);

      expect(screen.getByText(/Cancels on/i)).toBeInTheDocument();
    });
  });

  describe('Checkout Success Polling', () => {
    it('should show processing message when polling after checkout', () => {
      mockSearchParams = new URLSearchParams('success=true');
      mockUseSubscription.mockReturnValue({
        data: {
          subscription: null,
          profileSubscriptionStatus: 'free',
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<SubscriptionManager />);

      // Initial render should trigger polling
      expect(screen.getByText(/Processing Your Subscription/i)).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Pro Status Based on Profile', () => {
    it('should consider user Pro if profileSubscriptionStatus is pro', () => {
      mockUseSubscription.mockReturnValue({
        data: {
          subscription: null, // No subscription record yet
          profileSubscriptionStatus: 'pro', // But profile says Pro
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<SubscriptionManager />);

      expect(screen.getByTestId('pro-badge')).toBeInTheDocument();
      expect(screen.getByText('KrewUp Pro')).toBeInTheDocument();
    });

    it('should consider user Pro if subscription is active', () => {
      mockUseSubscription.mockReturnValue({
        data: {
          subscription: {
            status: 'active',
            stripe_subscription_id: 'sub_123',
            current_period_end: new Date().toISOString(),
            cancel_at_period_end: false,
          },
          profileSubscriptionStatus: 'free', // Profile not yet updated
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<SubscriptionManager />);

      expect(screen.getByTestId('pro-badge')).toBeInTheDocument();
    });
  });
});
