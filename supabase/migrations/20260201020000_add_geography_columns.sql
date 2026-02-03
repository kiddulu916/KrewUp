-- Add missing geography columns to existing tables

-- Add geo_coords to users table
ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "geo_coords" extensions.geography(Point, 4326);

-- Add coords to jobs table
ALTER TABLE "public"."jobs"
ADD COLUMN IF NOT EXISTS "coords" extensions.geography(Point, 4326);

-- Create GIST indexes for spatial queries if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'users'
        AND indexname = 'idx_users_coords'
    ) THEN
        CREATE INDEX "idx_users_coords" ON "public"."users" USING GIST ("geo_coords");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'jobs'
        AND indexname = 'idx_jobs_coords'
    ) THEN
        CREATE INDEX "idx_jobs_coords" ON "public"."jobs" USING GIST ("coords");
    END IF;
END $$;
