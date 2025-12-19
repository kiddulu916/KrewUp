# PostGIS Setup for CrewUp

This document contains all the SQL you need to run in Supabase to fix the "parse error - invalid geometry" issue.

## Background

The issue occurs because we're trying to insert coordinate strings like `"POINT(lng lat)"` directly into PostGIS geometry columns. PostgreSQL requires us to use PostGIS functions like `ST_MakePoint()` or `ST_GeomFromText()` to properly create geometry objects.

## Solution

We've created Postgres functions that handle the PostGIS conversion correctly. You need to run these SQL commands in your Supabase Dashboard.

---

## Step 1: Go to Supabase SQL Editor

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

---

## Step 2: Run These SQL Commands

Copy and paste each of these SQL blocks into the SQL Editor and run them:

### Function 1: Update Profile with Coords

```sql
-- Function to update profile with coords
CREATE OR REPLACE FUNCTION update_profile_coords(
  p_user_id UUID,
  p_name TEXT,
  p_role TEXT,
  p_trade TEXT,
  p_location TEXT,
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_bio TEXT DEFAULT NULL,
  p_sub_trade TEXT DEFAULT NULL,
  p_employer_type TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET
    name = p_name,
    role = p_role,
    trade = p_trade,
    location = p_location,
    coords = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    bio = p_bio,
    sub_trade = p_sub_trade,
    employer_type = p_employer_type,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
```

### Function 2: Create Job with Coords

```sql
-- Function to create job with coords
CREATE OR REPLACE FUNCTION create_job_with_coords(
  p_employer_id UUID,
  p_title TEXT,
  p_trade TEXT,
  p_job_type TEXT,
  p_description TEXT,
  p_location TEXT,
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_pay_rate TEXT,
  p_sub_trade TEXT DEFAULT NULL,
  p_pay_min NUMERIC DEFAULT NULL,
  p_pay_max NUMERIC DEFAULT NULL,
  p_required_certs TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO jobs (
    employer_id,
    title,
    trade,
    sub_trade,
    job_type,
    description,
    location,
    coords,
    pay_rate,
    pay_min,
    pay_max,
    required_certs,
    status
  ) VALUES (
    p_employer_id,
    p_title,
    p_trade,
    p_sub_trade,
    p_job_type,
    p_description,
    p_location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    p_pay_rate,
    p_pay_min,
    p_pay_max,
    COALESCE(p_required_certs, ARRAY[]::TEXT[]),
    'active'
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;
```

---

## Step 3: Verify Functions Were Created

After running both SQL blocks, verify the functions were created successfully:

```sql
-- Check if functions exist
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_profile_coords', 'create_job_with_coords');
```

You should see both functions listed.

---

## Step 4: Deploy Updated Code

After running the SQL, deploy the updated code:

```bash
# If you haven't committed the changes yet
git add .
git commit -m "Fix PostGIS geometry errors with RPC functions"
git push
```

Vercel will automatically deploy the changes.

---

## What This Fixes

These functions fix the "parse error - invalid geometry" error in:

1. **Onboarding** (Step 4 - Location selection)
2. **Profile Editing** (Updating location with Google Places)
3. **Job Posting** (Setting job location with coords)

All three now use `ST_SetSRID(ST_MakePoint(lng, lat), 4326)` which properly creates PostGIS geometry objects.

---

## Technical Details

- **ST_MakePoint(lng, lat)**: Creates a POINT geometry from longitude and latitude
- **ST_SetSRID(..., 4326)**: Sets the Spatial Reference System ID to 4326 (WGS 84 - standard GPS coordinates)
- **SECURITY DEFINER**: Allows the function to run with the privileges of the function owner, bypassing RLS

---

## Testing After Setup

1. **Test Onboarding**:
   - Sign up with a new account
   - Go through onboarding
   - On Step 4, type a location or click "Use my current location"
   - Click "Complete Setup"
   - Should succeed without "parse error - invalid geometry"

2. **Test Profile Edit**:
   - Go to Profile → Edit Profile
   - Change location using autocomplete
   - Save
   - Should succeed

3. **Test Job Posting**:
   - As an employer, create a new job
   - Select location
   - Submit
   - Should succeed

---

## Troubleshooting

If you still get errors:

1. **Check PostGIS Extension**: Verify PostGIS is enabled
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'postgis';
   ```

2. **Check Column Types**: Verify coords columns are geometry type
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name IN ('profiles', 'jobs')
     AND column_name = 'coords';
   ```

3. **Check RLS Policies**: Make sure RLS policies allow updates
   ```sql
   SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'jobs');
   ```

---

## Need Help?

If you encounter any issues, check:
- Supabase logs in Dashboard → Logs
- Browser console for JavaScript errors
- Network tab to see the actual error from Supabase
