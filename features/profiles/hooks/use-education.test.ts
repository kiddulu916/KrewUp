import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper, createMockSupabaseClient, mockSupabaseSuccess, mockSupabaseError } from '@/tests/hooks-setup';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/client';
import { useEducation } from './use-education';

describe('useEducation', () => {
  const mockEducation = [
    {
      id: 'edu-1',
      user_id: 'user-123',
      institution: 'Community College',
      degree: 'Associate',
      field_of_study: 'Electrical Technology',
      start_date: '2018-08-01',
      end_date: '2020-05-15',
      current: false,
      created_at: '2020-05-15T00:00:00Z',
    },
    {
      id: 'edu-2',
      user_id: 'user-123',
      institution: 'Trade School',
      degree: 'Certificate',
      field_of_study: 'HVAC',
      start_date: '2017-01-01',
      end_date: '2017-12-15',
      current: false,
      created_at: '2017-12-15T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch education for valid user ID', async () => {
    const mockClient = createMockSupabaseClient({
      education: mockSupabaseSuccess(mockEducation),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useEducation('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockEducation);
  });

  it('should return empty array when user has no education', async () => {
    const mockClient = createMockSupabaseClient({
      education: mockSupabaseSuccess([]),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useEducation('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle loading state', async () => {
    const mockClient = createMockSupabaseClient({
      education: mockSupabaseSuccess(mockEducation),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useEducation('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('should handle error state', async () => {
    const mockClient = createMockSupabaseClient({
      education: mockSupabaseError('Database error'),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useEducation('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should not fetch for invalid UUID', async () => {
    const mockClient = createMockSupabaseClient({
      education: mockSupabaseSuccess(mockEducation),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useEducation('not-a-valid-uuid'),
      { wrapper: createWrapper() }
    );

    // Should remain in initial state - not loading
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should not fetch for empty user ID', async () => {
    const mockClient = createMockSupabaseClient({
      education: mockSupabaseSuccess(mockEducation),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useEducation(''),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
  });
});
