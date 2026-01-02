-- Add new fields to profiles table
ALTER TABLE profiles
  ADD COLUMN has_tools boolean DEFAULT false,
  ADD COLUMN tools_owned text[] DEFAULT '{}',
  ADD COLUMN is_lifetime_pro boolean DEFAULT false,
  ADD COLUMN lifetime_pro_granted_at timestamptz,
  ADD COLUMN lifetime_pro_granted_by uuid REFERENCES profiles(id);
