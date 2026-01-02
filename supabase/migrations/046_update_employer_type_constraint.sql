-- Migration 046: Update Employer Type Constraint
-- Created: 2026-01-02
-- Description: Expand employer types to include developer and homeowner

-- Drop old constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_employer_type_check;

-- Add new constraint with all 4 employer types
ALTER TABLE profiles
  ADD CONSTRAINT profiles_employer_type_check
  CHECK (employer_type IN ('contractor', 'developer', 'homeowner', 'recruiter'));

-- Documentation
COMMENT ON CONSTRAINT profiles_employer_type_check ON profiles IS 'Employer types: contractor (licensed to contract jobs), developer (big projects), homeowner (individuals with homes), recruiter (staffing agencies)';
