-- =====================================================================
-- SECURITY FIX: remove the over-permissive legacy delivery-proofs
-- storage policies.
--
-- The original bucket migration (20250315000000) created three broad
-- policies that let ANY authenticated user (including a Customer) read,
-- upload, and overwrite EVERY delivery proof / signature image in the
-- bucket. A later migration (20260315010000) added properly scoped
-- "Delivery proofs read"/"write" policies but never dropped the broad
-- ones; since RLS policies are OR-combined, the permissive legacy
-- policies still won.
--
-- This drops the legacy policies and adds a scoped UPDATE policy (the
-- 20260315 migration only added read + insert) so staff overwrite/upsert
-- of proof files keeps working without re-opening access to customers.
-- =====================================================================

DROP POLICY IF EXISTS "Allow authenticated reads from delivery-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to delivery-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to delivery-proofs" ON storage.objects;

-- Scoped UPDATE so staff can overwrite/upsert proofs (mirrors "write").
DROP POLICY IF EXISTS "Delivery proofs update" ON storage.objects;
CREATE POLICY "Delivery proofs update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'SuperUser', 'Booker', 'Driver')
  )
)
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'SuperUser', 'Booker', 'Driver')
  )
);
