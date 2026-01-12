import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the action
const mockUpdateProfile = vi.fn();

vi.mock('../actions/profile-actions', () => ({
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
}));

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

import { useUpdateProfile } from './use-update-profile';

// Create wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useUpdateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({ success: true, data: {} });
  });

  it('should return a mutation object', () => {
    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should call updateProfile action when mutate is called', async () => {
    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    const profileData = { first_name: 'John', last_name: 'Doe' };

    await act(async () => {
      result.current.mutate(profileData);
    });

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(profileData);
    });
  });

  it('should refresh router on success', async () => {
    mockUpdateProfile.mockResolvedValue({ success: true, data: { id: 'user-123' } });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ first_name: 'John' });
    });

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('should throw error when updateProfile returns success: false', async () => {
    mockUpdateProfile.mockResolvedValue({ success: false, error: 'Update failed' });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.mutateAsync({ first_name: 'John' });
      } catch (error: any) {
        caughtError = error;
      }
    });

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toBe('Update failed');
  });

  it('should use default error message when error is not provided', async () => {
    mockUpdateProfile.mockResolvedValue({ success: false });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.mutateAsync({ first_name: 'John' });
      } catch (error: any) {
        caughtError = error;
      }
    });

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toBe('Failed to update profile');
  });

  it('should return updated data on success', async () => {
    const updatedProfile = { id: 'user-123', first_name: 'John', last_name: 'Doe' };
    mockUpdateProfile.mockResolvedValue({ success: true, data: updatedProfile });

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    let returnedData;
    await act(async () => {
      returnedData = await result.current.mutateAsync({ first_name: 'John' });
    });

    expect(returnedData).toEqual(updatedProfile);
  });

  it('should be in pending state while mutation is in progress', async () => {
    let resolvePromise: (value: any) => void;
    mockUpdateProfile.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ first_name: 'John' });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    // Resolve the promise
    await act(async () => {
      resolvePromise!({ success: true, data: {} });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should handle complex profile data', async () => {
    const complexData = {
      first_name: 'John',
      last_name: 'Doe',
      bio: 'Experienced electrician',
      location: 'Chicago, IL',
      trade: 'Electrical',
      sub_trade: 'Commercial',
    };

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(complexData);
    });

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(complexData);
    });
  });
});
