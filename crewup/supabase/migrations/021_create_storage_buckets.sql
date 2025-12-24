-- Create application-drafts bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-drafts', 'application-drafts', false)
ON CONFLICT (id) DO NOTHING;

-- Create applications bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('applications', 'applications', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for application-drafts bucket
-- Users can upload to their own folder only
CREATE POLICY "Users upload to own draft folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own draft files
CREATE POLICY "Users view own draft files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own draft files
CREATE POLICY "Users update own draft files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own draft files
CREATE POLICY "Users delete own draft files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for applications bucket
-- System can upload (via service role)
CREATE POLICY "System uploads application files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'applications'
  );

-- Worker or employer can view application files
CREATE POLICY "Worker or employer views application files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'applications'
    AND (
      -- Worker who submitted
      auth.uid() IN (
        SELECT worker_id FROM job_applications
        WHERE id::text = (storage.foldername(name))[1]
      )
      OR
      -- Employer of the job
      auth.uid() IN (
        SELECT j.employer_id FROM job_applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id::text = (storage.foldername(name))[1]
      )
    )
  );
