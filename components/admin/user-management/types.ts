/**
 * Shared types for user management components
 */

export type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  subscription_status: string;
  trade: string;
  sub_trade: string | null;
  location: string;
  created_at: string;
  phone: string | null;
  is_admin: boolean;
  can_post_jobs: boolean;
};

export type ModerationAction = {
  id: string;
  action_type: string;
  reason: string;
  duration_days: number | null;
  expires_at: string | null;
  created_at: string;
  actioned_by_profile: { first_name: string; last_name: string } | null;
};

export type ModerationStatus = {
  isBanned: boolean;
  isSuspended: boolean;
  suspensionExpiresAt?: string;
};
