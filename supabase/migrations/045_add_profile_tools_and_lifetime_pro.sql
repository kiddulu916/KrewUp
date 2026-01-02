-- Migration 045: Profile Tools and Lifetime Pro Fields
-- Created: 2026-01-02
-- Description: Adds portfolio tools tracking and lifetime Pro subscription support

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_tools boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tools_owned text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_lifetime_pro boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS lifetime_pro_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS lifetime_pro_granted_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Documentation
COMMENT ON COLUMN profiles.has_tools IS 'Whether worker has marked they own their own tools';
COMMENT ON COLUMN profiles.tools_owned IS 'List of tools owned by the worker (free-form text array)';
COMMENT ON COLUMN profiles.is_lifetime_pro IS 'Lifetime Pro status (granted manually, never expires)';
COMMENT ON COLUMN profiles.lifetime_pro_granted_at IS 'Timestamp when lifetime Pro was granted';
COMMENT ON COLUMN profiles.lifetime_pro_granted_by IS 'Admin who granted lifetime Pro status';

-- Performance index for lifetime Pro queries
CREATE INDEX IF NOT EXISTS idx_profiles_lifetime_pro
  ON profiles(is_lifetime_pro)
  WHERE is_lifetime_pro = true;
