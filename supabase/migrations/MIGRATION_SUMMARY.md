# Migration Summary: Portfolio Tools & Lifetime Pro

**Date:** 2026-01-02
**Feature:** Portfolio Photos, Tools Owned, Lifetime Pro

## Migrations to Apply (in order)

### 045_add_profile_tools_and_lifetime_pro.sql
- Adds columns to profiles table: has_tools, tools_owned, is_lifetime_pro, lifetime_pro_granted_at, lifetime_pro_granted_by
- Creates performance index on is_lifetime_pro
- Adds column documentation

### 046_update_employer_type_constraint.sql
- Updates employer_type constraint from 2 to 4 types
- New types: contractor, developer, homeowner, recruiter

### 047_create_portfolio_images_table.sql
- Creates portfolio_images table with columns: id, user_id, image_url, display_order, uploaded_at
- Creates composite index on (user_id, display_order)
- Creates RLS policies for CRUD operations
- Adds admin DELETE policy for content moderation

### 048_create_portfolio_storage_bucket.sql
- Creates portfolio-images storage bucket
- Sets 5MB file size limit
- Restricts to image MIME types (JPEG, PNG, WebP)
- Creates RLS policies with folder-based user ownership

### 049_add_portfolio_limit_constraint.sql
- Creates database trigger to prevent race conditions
- Enforces 5-photo limit for free users atomically
- Checks subscription status at database level
- Prevents concurrent uploads from bypassing limits

## Application Instructions

**Via Supabase Dashboard:**
1. Navigate to Database → Migrations
2. Apply migrations 045-049 in order
3. Verify each migration completes successfully
4. Test portfolio upload limits with test user

**Via Supabase CLI:**
```bash
# From project root
supabase db push

# Or apply specific migration
supabase migration up --local
```

## Verification

After applying migrations:
- [ ] Verify profiles table has new columns
- [ ] Verify employer_type constraint allows all 4 types
- [ ] Verify portfolio_images table exists with correct schema
- [ ] Verify portfolio-images bucket exists in Storage
- [ ] Test portfolio upload (should trigger limit function)
- [ ] Test that free users can only upload 5 photos
- [ ] Test that Pro/lifetime Pro users can upload unlimited

## Rollback

If needed, migrations can be rolled back in reverse order:
```sql
-- 049
DROP TRIGGER IF EXISTS enforce_portfolio_limit ON portfolio_images;
DROP FUNCTION IF EXISTS check_portfolio_limit();

-- 048
DELETE FROM storage.buckets WHERE id = 'portfolio-images';

-- 047
DROP TABLE IF EXISTS portfolio_images;

-- 046
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_employer_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_employer_type_check
  CHECK (employer_type IN ('recruiter'));

-- 045
ALTER TABLE profiles
  DROP COLUMN IF EXISTS has_tools,
  DROP COLUMN IF EXISTS tools_owned,
  DROP COLUMN IF EXISTS is_lifetime_pro,
  DROP COLUMN IF EXISTS lifetime_pro_granted_at,
  DROP COLUMN IF EXISTS lifetime_pro_granted_by;
DROP INDEX IF EXISTS idx_profiles_lifetime_pro;
```

## Notes

- All migrations use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- Storage bucket RLS policies follow project's folder-based ownership pattern
- Trigger function provides atomic enforcement of upload limits (prevents race conditions)
- Migrations are compatible with existing data (no data loss)
