-- Add years_experience_required field to jobs table
-- This enables proper compatibility scoring for job matching

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS years_experience_required integer DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN jobs.years_experience_required IS 'Minimum years of experience required for this job. NULL means no requirement.';

-- Add index for filtering by experience
CREATE INDEX IF NOT EXISTS idx_jobs_years_experience ON jobs(years_experience_required)
WHERE years_experience_required IS NOT NULL;
