import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getActiveUsers, getConversionFunnel } from '@/features/admin/actions/analytics-actions';
import type { DateRangeValue } from '@/components/admin/date-range-picker';

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

// Mock Supabase client
const createMockChain = () => {
  const mockChain = {
    select: vi.fn(() => mockChain),
    gte: vi.fn(() => mockChain),
    lte: vi.fn(() => mockChain),
    in: vi.fn(() => mockChain),
    limit: vi.fn(() => mockChain),
    eq: vi.fn(() => mockChain),
    data: [],
    error: null,
  };
  return mockChain;
};

const mockSupabaseClient = {
  from: vi.fn(() => createMockChain()),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('Analytics Actions', () => {
  describe('getActiveUsers', () => {
    it('returns DAU/WAU/MAU metrics', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      const result = await getActiveUsers(dateRange, {});

      expect(result).toHaveProperty('dau');
      expect(result).toHaveProperty('wau');
      expect(result).toHaveProperty('mau');
      expect(result.dau).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getConversionFunnel', () => {
    it('returns conversion funnel stages with correct structure', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last30days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      const result = await getConversionFunnel(dateRange, {});

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);

      // Check first stage (Signup)
      expect(result[0]).toHaveProperty('stage', 'Signup');
      expect(result[0]).toHaveProperty('count');
      expect(result[0]).toHaveProperty('percentage', 100);
      expect(result[0]).toHaveProperty('dropOffRate', null);

      // Check second stage (Profile Complete)
      expect(result[1]).toHaveProperty('stage', 'Profile Complete');
      expect(result[1]).toHaveProperty('count');
      expect(result[1]).toHaveProperty('percentage');
      expect(result[1]).toHaveProperty('dropOffRate');

      // Check third stage (First Action)
      expect(result[2]).toHaveProperty('stage', 'First Action');
      expect(result[2]).toHaveProperty('count');
      expect(result[2]).toHaveProperty('percentage');
      expect(result[2]).toHaveProperty('dropOffRate');
    });

    it('returns zero counts when no data is available', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      const result = await getConversionFunnel(dateRange, {});

      // With mocked empty data, all counts should be 0
      expect(result[0].count).toBe(0);
      expect(result[1].count).toBe(0);
      expect(result[2].count).toBe(0);
    });
  });
});
