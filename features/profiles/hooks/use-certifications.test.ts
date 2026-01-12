import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper, createMockSupabaseClient, mockSupabaseSuccess, mockSupabaseError } from '@/tests/hooks-setup';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/client';
import { useCertifications } from './use-certifications';

describe('useCertifications', () => {
  const mockCertifications = [
    {
      id: 'cert-1',
      worker_id: 'user-123',
      certification_type: 'Electrical License',
      issued_by: 'State of Illinois',
      issue_date: '2023-01-01',
      expires_at: '2025-01-01',
      verification_status: 'verified',
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 'cert-2',
      worker_id: 'user-123',
      certification_type: 'OSHA 30',
      issued_by: 'OSHA',
      issue_date: '2022-06-01',
      expires_at: null,
      verification_status: 'pending',
      created_at: '2022-06-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch certifications for valid user ID', async () => {
    const mockClient = createMockSupabaseClient({
      certifications: mockSupabaseSuccess(mockCertifications),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useCertifications('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockCertifications);
  });

  it('should return empty array when user has no certifications', async () => {
    const mockClient = createMockSupabaseClient({
      certifications: mockSupabaseSuccess([]),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useCertifications('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle loading state', async () => {
    const mockClient = createMockSupabaseClient({
      certifications: mockSupabaseSuccess(mockCertifications),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useCertifications('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('should handle error state', async () => {
    const mockClient = createMockSupabaseClient({
      certifications: mockSupabaseError('Database error'),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useCertifications('123e4567-e89b-12d3-a456-426614174000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should not fetch for invalid UUID', async () => {
    const mockClient = createMockSupabaseClient({
      certifications: mockSupabaseSuccess(mockCertifications),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useCertifications('invalid-uuid'),
      { wrapper: createWrapper() }
    );

    // Should remain in initial state - not loading, not success
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should not fetch for empty user ID', async () => {
    const mockClient = createMockSupabaseClient({
      certifications: mockSupabaseSuccess(mockCertifications),
    });
    vi.mocked(createClient).mockReturnValue(mockClient as any);

    const { result } = renderHook(
      () => useCertifications(''),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
  });
});
