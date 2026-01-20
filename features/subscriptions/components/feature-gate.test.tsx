import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureGate } from './feature-gate';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock useSubscription hook
vi.mock('../hooks/use-subscription', () => ({
  useSubscription: vi.fn(),
}));

// Mock ProBadge component
vi.mock('./pro-badge', () => ({
  ProBadge: () => <span data-testid="pro-badge">Pro</span>,
}));

import { useSubscription } from '../hooks/use-subscription';

describe('FeatureGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show children for pro users with profileSubscriptionStatus', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        profileSubscriptionStatus: 'pro',
        subscription: null,
      },
      isLoading: false,
      error: null,
    } as any);

    render(
      <FeatureGate feature="analytics">
        <div data-testid="pro-content">Pro Content</div>
      </FeatureGate>
    );

    expect(screen.getByTestId('pro-content')).toBeInTheDocument();
  });

  it('should show children for pro users with active subscription', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        profileSubscriptionStatus: 'free',
        subscription: {
          status: 'active',
          stripe_subscription_id: 'sub_123',
        },
      },
      isLoading: false,
      error: null,
    } as any);

    render(
      <FeatureGate feature="analytics">
        <div data-testid="pro-content">Pro Content</div>
      </FeatureGate>
    );

    expect(screen.getByTestId('pro-content')).toBeInTheDocument();
  });

  it('should show upgrade prompt for free users', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        profileSubscriptionStatus: 'free',
        subscription: null,
      },
      isLoading: false,
      error: null,
    } as any);

    render(
      <FeatureGate feature="analytics">
        <div data-testid="pro-content">Pro Content</div>
      </FeatureGate>
    );

    expect(screen.queryByTestId('pro-content')).not.toBeInTheDocument();
    expect(screen.getByText(/pro feature/i)).toBeInTheDocument();
    expect(screen.getByText(/upgrade to krewup pro to access analytics/i)).toBeInTheDocument();
  });

  it('should show loading skeleton while loading', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);

    render(
      <FeatureGate feature="analytics">
        <div data-testid="pro-content">Pro Content</div>
      </FeatureGate>
    );

    expect(screen.queryByTestId('pro-content')).not.toBeInTheDocument();
    // Check for animate-pulse class (loading skeleton)
    expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it('should show error state on error', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    } as any);

    render(
      <FeatureGate feature="analytics">
        <div data-testid="pro-content">Pro Content</div>
      </FeatureGate>
    );

    expect(screen.queryByTestId('pro-content')).not.toBeInTheDocument();
    expect(screen.getByText(/unable to verify subscription status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should show custom fallback for free users', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        profileSubscriptionStatus: 'free',
        subscription: null,
      },
      isLoading: false,
      error: null,
    } as any);

    render(
      <FeatureGate feature="analytics" fallback={<div data-testid="custom-fallback">Custom Fallback</div>}>
        <div data-testid="pro-content">Pro Content</div>
      </FeatureGate>
    );

    expect(screen.queryByTestId('pro-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('should navigate to pricing page on upgrade button click', async () => {
    const user = userEvent.setup();
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        profileSubscriptionStatus: 'free',
        subscription: null,
      },
      isLoading: false,
      error: null,
    } as any);

    render(
      <FeatureGate feature="analytics">
        <div data-testid="pro-content">Pro Content</div>
      </FeatureGate>
    );

    const upgradeButton = screen.getByRole('button', { name: /upgrade to pro/i });
    await user.click(upgradeButton);

    expect(mockPush).toHaveBeenCalledWith('/pricing');
  });

  it('should show ProBadge in upgrade prompt', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        profileSubscriptionStatus: 'free',
        subscription: null,
      },
      isLoading: false,
      error: null,
    } as any);

    render(
      <FeatureGate feature="analytics">
        <div data-testid="pro-content">Pro Content</div>
      </FeatureGate>
    );

    expect(screen.getByTestId('pro-badge')).toBeInTheDocument();
  });

  it('should include feature name in upgrade message', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        profileSubscriptionStatus: 'free',
        subscription: null,
      },
      isLoading: false,
      error: null,
    } as any);

    render(
      <FeatureGate feature="custom screening questions">
        <div>Pro Content</div>
      </FeatureGate>
    );

    expect(screen.getByText(/upgrade to krewup pro to access custom screening questions/i)).toBeInTheDocument();
  });

  it('should not show children for user with active subscription but empty stripe_subscription_id', () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        profileSubscriptionStatus: 'free',
        subscription: {
          status: 'active',
          stripe_subscription_id: '',
        },
      },
      isLoading: false,
      error: null,
    } as any);

    render(
      <FeatureGate feature="analytics">
        <div data-testid="pro-content">Pro Content</div>
      </FeatureGate>
    );

    expect(screen.queryByTestId('pro-content')).not.toBeInTheDocument();
    expect(screen.getByText(/pro feature/i)).toBeInTheDocument();
  });
});
