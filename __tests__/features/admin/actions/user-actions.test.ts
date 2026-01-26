import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  suspendUser,
  banUser,
  unbanUser,
  grantProSubscription,
  revokeProSubscription,
  getUserModerationHistory,
  getUserModerationStatus,
} from '@/features/admin/actions/user-actions';

// Mock dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock Supabase
const createMockChain = () => {
  const mockChain: any = {
    select: vi.fn(() => mockChain),
    insert: vi.fn(() => mockChain),
    update: vi.fn(() => mockChain),
    delete: vi.fn(() => mockChain),
    eq: vi.fn(() => mockChain),
    in: vi.fn(() => mockChain),
    order: vi.fn(() => mockChain),
    limit: vi.fn(() => mockChain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    data: null,
    error: null,
  };
  return mockChain;
};

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => createMockChain()),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('User Actions', () => {
  const mockAdminId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('suspendUser', () => {
    describe('Authentication', () => {
      it('should return error when not authenticated', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: null },
          error: null,
        });

        const result = await suspendUser(mockUserId, 'Test reason', 7);

        expect(result).toEqual({ success: false, error: 'Not authenticated' });
      });
    });

    describe('Authorization', () => {
      it('should return error when not admin', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockUserId } },
          error: null,
        });

        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: false },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const result = await suspendUser(mockUserId, 'Test reason', 7);

        expect(result).toEqual({ success: false, error: 'Not authorized' });
      });
    });

    describe('Validation', () => {
      it('should validate durationDays is positive', async () => {
        const result = await suspendUser(mockUserId, 'Test reason', -1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Validation failed');
        expect(result.fieldErrors).toBeDefined();
        expect(result.fieldErrors?.durationDays).toBeDefined();
      });

      it('should validate durationDays is not zero', async () => {
        const result = await suspendUser(mockUserId, 'Test reason', 0);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Validation failed');
      });

      it('should validate reason is not empty', async () => {
        const result = await suspendUser(mockUserId, '', 7);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Validation failed');
        expect(result.fieldErrors?.reason).toBeDefined();
      });

      it('should validate userId is a valid UUID', async () => {
        const result = await suspendUser('invalid-uuid', 'Test reason', 7);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Validation failed');
        expect(result.fieldErrors?.userId).toBeDefined();
      });
    });

    describe('Success Path', () => {
      it('should create suspension record for valid request', async () => {
        const { revalidatePath } = await import('next/cache');

        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        // Admin check
        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        // Insert moderation action
        const moderationChain = createMockChain();
        moderationChain.insert = vi.fn(() => Promise.resolve({ error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(moderationChain);

        // Activity log
        const logChain = createMockChain();
        logChain.insert = vi.fn(() => Promise.resolve({ error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(logChain);

        const result = await suspendUser(mockUserId, 'Test suspension reason', 7);

        expect(result.success).toBe(true);
        expect(moderationChain.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: mockUserId,
            action_type: 'suspension',
            reason: 'Test suspension reason',
            duration_days: 7,
            expires_at: expect.any(String),
            actioned_by: mockAdminId,
          })
        );
        expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
      });
    });

    describe('Error Handling', () => {
      it('should return error when moderation insert fails', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const moderationChain = createMockChain();
        moderationChain.insert = vi.fn(() =>
          Promise.resolve({ error: { message: 'Insert failed' } })
        );
        mockSupabaseClient.from.mockReturnValueOnce(moderationChain);

        const result = await suspendUser(mockUserId, 'Test reason', 7);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to suspend user');
      });
    });
  });

  describe('banUser', () => {
    describe('Authorization', () => {
      it('should return error when not admin', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockUserId } },
          error: null,
        });

        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: false },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const result = await banUser(mockUserId, 'Test reason');

        expect(result).toEqual({ success: false, error: 'Not authorized' });
      });
    });

    describe('Success Path', () => {
      it('should create ban record with null expires_at', async () => {
        const { revalidatePath } = await import('next/cache');

        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        // Admin check
        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        // Insert ban
        const banChain = createMockChain();
        banChain.insert = vi.fn(() => Promise.resolve({ error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(banChain);

        // Activity log
        const logChain = createMockChain();
        logChain.insert = vi.fn(() => Promise.resolve({ error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(logChain);

        const result = await banUser(mockUserId, 'Severe violation');

        expect(result.success).toBe(true);
        expect(banChain.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: mockUserId,
            action_type: 'ban',
            reason: 'Severe violation',
            duration_days: null,
            expires_at: null,
            actioned_by: mockAdminId,
          })
        );
        expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
      });
    });

    describe('Validation', () => {
      it('should validate reason is not empty', async () => {
        const result = await banUser(mockUserId, '');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Validation failed');
        expect(result.fieldErrors?.reason).toBeDefined();
      });
    });

    describe('Error Handling', () => {
      it('should return error when ban insert fails', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const banChain = createMockChain();
        banChain.insert = vi.fn(() => Promise.resolve({ error: { message: 'Insert failed' } }));
        mockSupabaseClient.from.mockReturnValueOnce(banChain);

        const result = await banUser(mockUserId, 'Test reason');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to ban user');
      });
    });
  });

  describe('unbanUser', () => {
    describe('Authentication', () => {
      it('should return error when not authenticated', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: null },
          error: null,
        });

        const result = await unbanUser(mockUserId);

        expect(result).toEqual({ success: false, error: 'Not authenticated' });
      });
    });

    describe('Authorization', () => {
      it('should return error when not admin', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockUserId } },
          error: null,
        });

        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: false },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const result = await unbanUser(mockUserId);

        expect(result).toEqual({ success: false, error: 'Not authorized' });
      });
    });

    describe('Validation', () => {
      it('should return error when user not banned', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        // Admin check
        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        // Query for latest ban (returns null - user not banned)
        const banQueryChain = createMockChain();
        banQueryChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
        mockSupabaseClient.from.mockReturnValueOnce(banQueryChain);

        const result = await unbanUser(mockUserId);

        expect(result).toEqual({ success: false, error: 'User is not currently banned' });
      });
    });

    describe('Success Path', () => {
      it('should delete ban record successfully', async () => {
        const { revalidatePath } = await import('next/cache');
        const mockBanId = '123e4567-e89b-12d3-a456-426614174002';

        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        // Admin check
        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        // Query for latest ban
        const banQueryChain = createMockChain();
        banQueryChain.maybeSingle.mockResolvedValueOnce({ data: { id: mockBanId }, error: null });
        mockSupabaseClient.from.mockReturnValueOnce(banQueryChain);

        // Delete ban
        const deleteChain = createMockChain();
        deleteChain.eq = vi.fn(() => Promise.resolve({ error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(deleteChain);

        // Activity log
        const logChain = createMockChain();
        logChain.insert = vi.fn(() => Promise.resolve({ error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(logChain);

        const result = await unbanUser(mockUserId);

        expect(result).toEqual({ success: true });
        expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
      });
    });

    describe('Error Handling', () => {
      it('should return error when delete fails', async () => {
        const mockBanId = '123e4567-e89b-12d3-a456-426614174002';

        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const banQueryChain = createMockChain();
        banQueryChain.maybeSingle.mockResolvedValueOnce({ data: { id: mockBanId }, error: null });
        mockSupabaseClient.from.mockReturnValueOnce(banQueryChain);

        const deleteChain = createMockChain();
        deleteChain.eq = vi.fn(() => Promise.resolve({ error: { message: 'Delete failed' } }));
        mockSupabaseClient.from.mockReturnValueOnce(deleteChain);

        const result = await unbanUser(mockUserId);

        expect(result).toEqual({ success: false, error: 'Failed to unban user' });
      });
    });
  });

  describe('grantProSubscription', () => {
    describe('Authentication', () => {
      it('should return error when not authenticated', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: null },
          error: null,
        });

        const result = await grantProSubscription(mockUserId, 'Test reason');

        expect(result).toEqual({ success: false, error: 'Not authenticated' });
      });
    });

    describe('Authorization', () => {
      it('should return error when not admin', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockUserId } },
          error: null,
        });

        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: false },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const result = await grantProSubscription(mockUserId, 'Test reason');

        expect(result).toEqual({ success: false, error: 'Not authorized' });
      });
    });

    describe('Success Path', () => {
      it('should update user subscription_status to pro', async () => {
        const { revalidatePath } = await import('next/cache');

        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        // Admin check
        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        // Update subscription status
        const updateChain = createMockChain();
        updateChain.eq = vi.fn(() => Promise.resolve({ error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(updateChain);

        // Create subscription record
        const subscriptionChain = createMockChain();
        subscriptionChain.insert = vi.fn(() => Promise.resolve({ error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(subscriptionChain);

        // Activity log
        const logChain = createMockChain();
        logChain.insert = vi.fn(() => Promise.resolve({ error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(logChain);

        const result = await grantProSubscription(mockUserId, 'Contest winner');

        expect(result).toEqual({ success: true });
        expect(updateChain.update).toHaveBeenCalledWith({
          subscription_status: 'pro',
        });
        expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
      });
    });

    describe('Error Handling', () => {
      it('should return error when update fails', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const updateChain = createMockChain();
        updateChain.eq = vi.fn(() => Promise.resolve({ error: { message: 'Update failed' } }));
        mockSupabaseClient.from.mockReturnValueOnce(updateChain);

        const result = await grantProSubscription(mockUserId, 'Test reason');

        expect(result).toEqual({ success: false, error: 'Failed to grant Pro subscription' });
      });
    });
  });

  describe('revokeProSubscription', () => {
    describe('Authorization', () => {
      it('should return error when not admin', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockUserId } },
          error: null,
        });

        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: false },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const result = await revokeProSubscription(mockUserId, 'Test reason');

        expect(result).toEqual({ success: false, error: 'Not authorized' });
      });
    });

    describe('Success Path', () => {
      it('should update user subscription_status to free', async () => {
        const { revalidatePath } = await import('next/cache');

        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        // Admin check
        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        // Update subscription status - chain: .update().eq()
        const updateChain = createMockChain();
        updateChain.eq = vi.fn(() => Promise.resolve({ error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(updateChain);

        // Cancel active subscriptions - chain: .update().eq().eq() (two eq calls)
        const cancelChain = createMockChain();
        // First .eq() returns a chain with second .eq()
        cancelChain.eq = vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        }));
        mockSupabaseClient.from.mockReturnValueOnce(cancelChain);

        // Activity log
        const logChain = createMockChain();
        logChain.insert = vi.fn(() => Promise.resolve({ error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(logChain);

        const result = await revokeProSubscription(mockUserId, 'Terms violation');

        expect(result).toEqual({ success: true });
        expect(updateChain.update).toHaveBeenCalledWith({
          subscription_status: 'free',
        });
        expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
      });
    });

    describe('Error Handling', () => {
      it('should return error when update fails', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const updateChain = createMockChain();
        updateChain.eq = vi.fn(() => Promise.resolve({ error: { message: 'Update failed' } }));
        mockSupabaseClient.from.mockReturnValueOnce(updateChain);

        const result = await revokeProSubscription(mockUserId, 'Test reason');

        expect(result).toEqual({ success: false, error: 'Failed to revoke Pro subscription' });
      });
    });
  });

  describe('getUserModerationHistory', () => {
    describe('Authentication', () => {
      it('should return error when not authenticated', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: null },
          error: null,
        });

        const result = await getUserModerationHistory(mockUserId);

        expect(result).toEqual({ success: false, error: 'Not authenticated', data: null });
      });
    });

    describe('Authorization', () => {
      it('should return error when not admin', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockUserId } },
          error: null,
        });

        // Admin check - chain: .select().eq().single()
        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: false },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const result = await getUserModerationHistory(mockUserId);

        expect(result).toEqual({ success: false, error: 'Not authorized', data: null });
      });
    });

    describe('Success Path', () => {
      it('should return moderation history for user', async () => {
        const mockHistory = [
          { id: 'action-1', action_type: 'warning', reason: 'First warning' },
          { id: 'action-2', action_type: 'suspension', reason: 'Repeated violation' },
        ];

        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        // Admin check
        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        // Query moderation history - chain: .select().eq().order() returns { data, error }
        const historyChain = createMockChain();
        historyChain.order = vi.fn(() => Promise.resolve({ data: mockHistory, error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(historyChain);

        const result = await getUserModerationHistory(mockUserId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockHistory);
      });
    });

    describe('Error Handling', () => {
      it('should return error when query fails', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: mockAdminId } },
          error: null,
        });

        const profileChain = createMockChain();
        profileChain.single.mockResolvedValueOnce({
          data: { is_admin: true },
          error: null,
        });
        mockSupabaseClient.from.mockReturnValueOnce(profileChain);

        const historyChain = createMockChain();
        historyChain.order = vi.fn(() =>
          Promise.resolve({ data: null, error: { message: 'Query failed' } })
        );
        mockSupabaseClient.from.mockReturnValueOnce(historyChain);

        const result = await getUserModerationHistory(mockUserId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch moderation history');
      });
    });
  });

  describe('getUserModerationStatus', () => {
    describe('No Moderation Actions', () => {
      it('should return isBanned=false, isSuspended=false when no actions exist', async () => {
        // Query for moderation actions - chain: .select().eq().in().order().limit()
        const actionsChain = createMockChain();
        actionsChain.limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(actionsChain);

        const result = await getUserModerationStatus(mockUserId);

        expect(result).toEqual({ isBanned: false, isSuspended: false });
      });

      it('should return isBanned=false, isSuspended=false when data is null', async () => {
        const actionsChain = createMockChain();
        actionsChain.limit = vi.fn(() => Promise.resolve({ data: null, error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(actionsChain);

        const result = await getUserModerationStatus(mockUserId);

        expect(result).toEqual({ isBanned: false, isSuspended: false });
      });
    });

    describe('Banned User', () => {
      it('should return isBanned=true when ban exists', async () => {
        const mockActions = [
          { action_type: 'ban', expires_at: null, created_at: '2024-01-01T00:00:00Z' },
        ];

        const actionsChain = createMockChain();
        actionsChain.limit = vi.fn(() => Promise.resolve({ data: mockActions, error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(actionsChain);

        const result = await getUserModerationStatus(mockUserId);

        expect(result.isBanned).toBe(true);
        expect(result.isSuspended).toBe(false);
      });
    });

    describe('Suspended User', () => {
      it('should return isSuspended=true when active suspension exists', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const mockActions = [
          {
            action_type: 'suspension',
            expires_at: futureDate.toISOString(),
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const actionsChain = createMockChain();
        actionsChain.limit = vi.fn(() => Promise.resolve({ data: mockActions, error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(actionsChain);

        const result = await getUserModerationStatus(mockUserId);

        expect(result.isBanned).toBe(false);
        expect(result.isSuspended).toBe(true);
        expect(result.suspensionExpiresAt).toBe(futureDate.toISOString());
      });

      it('should return isSuspended=false when suspension has expired', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const mockActions = [
          {
            action_type: 'suspension',
            expires_at: pastDate.toISOString(),
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const actionsChain = createMockChain();
        actionsChain.limit = vi.fn(() => Promise.resolve({ data: mockActions, error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(actionsChain);

        const result = await getUserModerationStatus(mockUserId);

        expect(result.isBanned).toBe(false);
        expect(result.isSuspended).toBe(false);
      });
    });

    describe('Both Ban and Suspension', () => {
      it('should return isBanned=true and isSuspended=true when both exist', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const mockActions = [
          { action_type: 'ban', expires_at: null, created_at: '2024-01-02T00:00:00Z' },
          {
            action_type: 'suspension',
            expires_at: futureDate.toISOString(),
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const actionsChain = createMockChain();
        actionsChain.limit = vi.fn(() => Promise.resolve({ data: mockActions, error: null }));
        mockSupabaseClient.from.mockReturnValueOnce(actionsChain);

        const result = await getUserModerationStatus(mockUserId);

        expect(result.isBanned).toBe(true);
        expect(result.isSuspended).toBe(true);
      });
    });
  });
});
