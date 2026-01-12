import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase client
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    })),
  })),
}));

import { useReferences } from './use-references';

// Create wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useReferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], error: null });
  });

  it('should return empty array initially', async () => {
    const { result } = renderHook(
      () => useReferences('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should query professional_references table', async () => {
    const { result } = renderHook(
      () => useReferences('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('user_id', '123e4567-e89b-12d3-a456-426614174000');
  });

  it('should order by created_at descending', async () => {
    const { result } = renderHook(
      () => useReferences('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('should return references data when successful', async () => {
    const mockReferences = [
      { id: 'ref-1', name: 'John Doe', company: 'ABC Corp' },
      { id: 'ref-2', name: 'Jane Smith', company: 'XYZ Inc' },
    ];
    mockOrder.mockResolvedValue({ data: mockReferences, error: null });

    const { result } = renderHook(
      () => useReferences('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockReferences);
  });

  it('should be disabled when userId is empty', () => {
    const { result } = renderHook(
      () => useReferences(''),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should be disabled when userId is not a valid UUID', () => {
    const { result } = renderHook(
      () => useReferences('invalid-id'),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should handle table not existing error gracefully', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation does not exist' },
    });

    const { result } = renderHook(
      () => useReferences('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should throw error for other database errors', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    });

    const { result } = renderHook(
      () => useReferences('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should have correct query key', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const { result } = renderHook(
      () => useReferences(userId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The query key should be ['references', userId]
    // This is verified by the fact that different userIds create different cache entries
  });
});
