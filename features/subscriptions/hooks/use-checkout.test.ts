import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the actions
vi.mock('../actions/subscription-actions', () => ({
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
}));

// Mock window.location
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

import { createCheckoutSession, createPortalSession } from '../actions/subscription-actions';
import { useCheckout } from './use-checkout';

describe('useCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
  });

  describe('checkout', () => {
    it('should redirect to checkout URL on success', async () => {
      vi.mocked(createCheckoutSession).mockResolvedValue({
        success: true,
        url: 'https://checkout.stripe.com/session123',
      });

      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        await result.current.checkout('price_monthly_123');
      });

      expect(createCheckoutSession).toHaveBeenCalledWith('price_monthly_123');
      expect(mockLocation.href).toBe('https://checkout.stripe.com/session123');
    });

    it('should set loading state during checkout', async () => {
      let resolveCheckout: (value: any) => void;
      vi.mocked(createCheckoutSession).mockImplementation(
        () => new Promise((resolve) => {
          resolveCheckout = resolve;
        })
      );

      const { result } = renderHook(() => useCheckout());

      expect(result.current.isLoading).toBe(false);

      let checkoutPromise: Promise<void>;
      act(() => {
        checkoutPromise = result.current.checkout('price_123');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolveCheckout!({ success: true, url: 'https://checkout.stripe.com/test' });
        await checkoutPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should throw error when checkout fails', async () => {
      vi.mocked(createCheckoutSession).mockResolvedValue({
        success: false,
        error: 'Invalid price ID',
      });

      const { result } = renderHook(() => useCheckout());

      await expect(
        act(async () => {
          await result.current.checkout('invalid_price');
        })
      ).rejects.toThrow('Invalid price ID');
    });

    it('should reset loading state on error', async () => {
      vi.mocked(createCheckoutSession).mockResolvedValue({
        success: false,
        error: 'Error',
      });

      const { result } = renderHook(() => useCheckout());

      try {
        await act(async () => {
          await result.current.checkout('price_123');
        });
      } catch {
        // Expected
      }

      expect(result.current.isLoading).toBe(false);
    });

    it('should not redirect if no URL returned', async () => {
      vi.mocked(createCheckoutSession).mockResolvedValue({
        success: true,
        url: undefined,
      });

      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        await result.current.checkout('price_123');
      });

      expect(mockLocation.href).toBe('');
    });
  });

  describe('openPortal', () => {
    it('should redirect to portal URL on success', async () => {
      vi.mocked(createPortalSession).mockResolvedValue({
        success: true,
        url: 'https://billing.stripe.com/portal123',
      });

      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        await result.current.openPortal();
      });

      expect(createPortalSession).toHaveBeenCalled();
      expect(mockLocation.href).toBe('https://billing.stripe.com/portal123');
    });

    it('should set loading state during portal open', async () => {
      let resolvePortal: (value: any) => void;
      vi.mocked(createPortalSession).mockImplementation(
        () => new Promise((resolve) => {
          resolvePortal = resolve;
        })
      );

      const { result } = renderHook(() => useCheckout());

      let portalPromise: Promise<void>;
      act(() => {
        portalPromise = result.current.openPortal();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolvePortal!({ success: true, url: 'https://portal.stripe.com/test' });
        await portalPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should throw error when portal fails', async () => {
      vi.mocked(createPortalSession).mockResolvedValue({
        success: false,
        error: 'No subscription found',
      });

      const { result } = renderHook(() => useCheckout());

      await expect(
        act(async () => {
          await result.current.openPortal();
        })
      ).rejects.toThrow('No subscription found');
    });
  });
});
