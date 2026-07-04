-- Create delivery-proofs storage bucket for driver delivery signatures
-- Run: supabase db push or apply this migration

-- Create the bucket (private by default - requires auth to access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, owner)
VALUES (
  'delivery-proofs',
  'delivery-proofs',
  false,  -- private bucket - access via signed URLs
  5242880,  -- 5MB limit per file (signatures are small)
  ARRAY['image/png', 'image/jpeg', 'image/webp'],
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload delivery proofs
CREATE POLICY "Allow authenticated uploads to delivery-proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-proofs');

-- Allow authenticated users to update their own delivery proofs
CREATE POLICY "Allow authenticated updates to delivery-proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'delivery-proofs');

-- Allow authenticated users to read delivery proofs (for viewing signed URLs)
CREATE POLICY "Allow authenticated reads from delivery-proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'delivery-proofs');

-- Allow service role to manage all delivery proofs (for admin functions)
CREATE POLICY "Allow service role full access to delivery-proofs"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'delivery-proofs')
WITH CHECK (bucket_id = 'delivery-proofs');

-- Note: For public tracking, you'll need to create signed URLs or a separate public bucket
-- The delivery slip page already uses signed URLs via supabase.storage.from('delivery-proofs').createSignedUrl()