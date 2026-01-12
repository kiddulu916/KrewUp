import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper, createMockSupabaseClient, mockSupabaseSuccess, mockSupabaseError } from '@/tests/hooks-setup';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/client';
import { useWorkExperience } from './use-work-experience';

describe('useWorkExperience', () => {
  const mockExperiences = [
    {
      id: 'exp-1',
      user_id: 'user-123',
      company: 'ABC Electric',
      title: 'Journeyman Electrician',
      start_date: '2022-01-01',
      end_date: null,
      current: true,
      description: 'Commercial electrical work',
      created_at: '2022-01-01T00:00:00Z',
    },
    {
      id: 'exp-2',
      user_id: 'user-123',
      company: 'XYZ Contractors',
      title: 'Apprentice Electrician',
      start_date: '2019-06-01',
      end_date: '2021-12-31',
      current: false,
      description: 'Residential electrical installations',
      created_at: '2019-06-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch work experience for valid user ID', async () => {
    const mockClient = createMockSupabaseClient({
      experiences: mockSupabaseSuccess(mockExperiences),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useWorkExperience('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockExperiences);
  });

  it('should return empty array when user has no experience', async () => {
    const mockClient = createMockSupabaseClient({
      experiences: mockSupabaseSuccess([]),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useWorkExperience('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle loading state', async () => {
    const mockClient = createMockSupabaseClient({
      experiences: mockSupabaseSuccess(mockExperiences),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useWorkExperience('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('should handle error state', async () => {
    const mockClient = createMockSupabaseClient({
      experiences: mockSupabaseError('Database error'),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useWorkExperience('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should not fetch for invalid UUID', async () => {
    const mockClient = createMockSupabaseClient({
      experiences: mockSupabaseSuccess(mockExperiences),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useWorkExperience('invalid-uuid-format'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should not fetch for empty user ID', async () => {
    const mockClient = createMockSupabaseClient({
      experiences: mockSupabaseSuccess(mockExperiences),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useWorkExperience(''),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
  });
});
