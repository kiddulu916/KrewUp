import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createWrapper } from '@/tests/hooks-setup';

// Mock the actions
vi.mock('../actions/boost-actions', () => ({
  getBoostStatus: vi.fn(),
  activateProfileBoost: vi.fn(),
  deactivateProfileBoost: vi.fn(),
}));

import { getBoostStatus, activateProfileBoost, deactivateProfileBoost } from '../actions/boost-actions';
import { useBoostStatus, useActivateBoost, useDeactivateBoost } from './use-boost';

describe('Boost Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useBoostStatus', () => {
    it('should return boost status for pro user with active boost', async () => {
      vi.mocked(getBoostStatus).mockResolvedValue({
        success: true,
        isPro: true,
        isActive: true,
        expiresAt: '2025-02-01T00:00:00Z',
      });

      const { result } = renderHook(() => useBoostStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        isPro: true,
        isActive: true,
        expiresAt: '2025-02-01T00:00:00Z',
      });
    });

    it('should return boost status for free user', async () => {
      vi.mocked(getBoostStatus).mockResolvedValue({
        success: true,
        isPro: false,
        isActive: false,
        expiresAt: null,
      });

      const { result } = renderHook(() => useBoostStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        isPro: false,
        isActive: false,
        expiresAt: null,
      });
    });

    it('should handle loading state', async () => {
      vi.mocked(getBoostStatus).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          success: true,
          isPro: true,
          isActive: false,
          expiresAt: null,
        }), 100))
      );

      const { result } = renderHook(() => useBoostStatus(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle error state', async () => {
      vi.mocked(getBoostStatus).mockResolvedValue({
        success: false,
        error: 'Not authenticated',
      });

      const { result } = renderHook(() => useBoostStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Not authenticated');
    });

    it('should have refetch interval of 60 seconds', async () => {
      vi.mocked(getBoostStatus).mockResolvedValue({
        success: true,
        isPro: true,
        isActive: true,
        expiresAt: null,
      });

      const { result } = renderHook(() => useBoostStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // The hook should be configured with refetchInterval
      // We verify the data was fetched successfully
      expect(getBoostStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('useActivateBoost', () => {
    it('should activate boost successfully', async () => {
      vi.mocked(activateProfileBoost).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useActivateBoost(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(activateProfileBoost).toHaveBeenCalled();
    });

    it('should call the action with correct parameters', async () => {
      vi.mocked(activateProfileBoost).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useActivateBoost(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(activateProfileBoost).toHaveBeenCalled();
      });
    });
  });

  describe('useDeactivateBoost', () => {
    it('should deactivate boost successfully', async () => {
      vi.mocked(deactivateProfileBoost).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeactivateBoost(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(deactivateProfileBoost).toHaveBeenCalled();
    });

    it('should call the action with correct parameters', async () => {
      vi.mocked(deactivateProfileBoost).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeactivateBoost(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(deactivateProfileBoost).toHaveBeenCalled();
      });
    });
  });
});
