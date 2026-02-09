-- Create storage bucket for experience photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'experience-photos',
  'experience-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for experience-photos bucket

-- Allow public read access to all experience photos
CREATE POLICY "Experience photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'experience-photos');

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload experience photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'experience-photos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own photos
CREATE POLICY "Users can update own experience photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'experience-photos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own experience photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'experience-photos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
