-- =====================================================================
-- SECURITY P1 (storage): delivery-proofs was writable and readable by
-- ANY signed-in user via blanket {authenticated} policies. With signup
-- open, that means any new sign-up could read every customer signature
-- and proof photo, and write the bucket.
--
-- Writer roles verified against the app (2026-09-30): driver proof
-- dialogs, depot HandoverDialog (StoreStaff route /depot, App.tsx) and
-- collection flows upload with upsert:true, which needs INSERT and
-- UPDATE plus read-back. Role set: Admin, SuperUser, Booker, Driver,
-- StoreStaff. The live "Delivery proofs write" INSERT policy lacked
-- StoreStaff, so it is recreated with the full set (review finding on
-- the first cut of this file: dropping the blanket policies alone
-- would have broken depot handover for the live StoreStaff user).
--
-- Readers: the writer roles plus Accounting; booking owners and
-- assigned drivers keep access through the existing row-scoped
-- "Delivery proofs read" policy, which is untouched.
--
-- Separate file on purpose: CREATE/DROP POLICY on storage.objects can
-- fail with "must be owner of table objects" on newer Supabase storage
-- lockdown. Isolating the storage statements means such a failure
-- cannot roll back the table/function hardening in the previous
-- migration. If this file fails: recreate the same policies via the
-- dashboard/storage API instead.
--
-- Idempotent: safe to re-run.
-- =====================================================================

DROP POLICY IF EXISTS "Allow authenticated uploads to delivery-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to delivery-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from delivery-proofs" ON storage.objects;

DROP POLICY IF EXISTS "Delivery proofs write" ON storage.objects;
CREATE POLICY "Delivery proofs write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('Admin', 'SuperUser', 'Booker', 'Driver', 'StoreStaff')
  )
);

DROP POLICY IF EXISTS "Delivery proofs update" ON storage.objects;
CREATE POLICY "Delivery proofs update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('Admin', 'SuperUser', 'Booker', 'Driver', 'StoreStaff')
  )
)
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('Admin', 'SuperUser', 'Booker', 'Driver', 'StoreStaff')
  )
);

DROP POLICY IF EXISTS "Delivery proofs staff read" ON storage.objects;
CREATE POLICY "Delivery proofs staff read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('Admin', 'SuperUser', 'Booker', 'Accounting', 'Driver', 'StoreStaff')
  )
);
