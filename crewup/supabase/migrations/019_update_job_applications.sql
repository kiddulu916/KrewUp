-- Add new columns to job_applications table
ALTER TABLE job_applications
  ADD COLUMN form_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN resume_url TEXT,
  ADD COLUMN cover_letter_url TEXT,
  ADD COLUMN resume_extracted_text TEXT;

-- Migrate existing cover_message to form_data
UPDATE job_applications
SET form_data = jsonb_build_object('coverLetterText', cover_message)
WHERE cover_message IS NOT NULL AND cover_message != '';

-- Add indexes for performance
CREATE INDEX idx_job_applications_job_status ON job_applications(job_id, status);
CREATE INDEX idx_job_applications_worker_created ON job_applications(worker_id, created_at DESC);

-- Add new status value 'withdrawn' to check constraint
ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;
ALTER TABLE job_applications ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('pending', 'viewed', 'contacted', 'rejected', 'hired', 'withdrawn'));
