DROP POLICY IF EXISTS "Accounting can view all bookings" ON public.bookings;
CREATE POLICY "Accounting can view all bookings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'Accounting'
  )
);

DROP POLICY IF EXISTS "Accounting can view all payment records" ON public.payment_records;
CREATE POLICY "Accounting can view all payment records"
ON public.payment_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'Accounting'
  )
);

DROP POLICY IF EXISTS "Accounting can view all invoices" ON public.invoices;
CREATE POLICY "Accounting can view all invoices"
ON public.invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'Accounting'
  )
);

INSERT INTO public.component_visibility (component_name, role, is_visible, created_at, updated_at)
VALUES
  ('ReportingAccess', 'Accounting', true, now(), now()),
  ('BookingManagement', 'Accounting', false, now(), now()),
  ('BookingAssignment', 'Accounting', false, now(), now()),
  ('ProductManagement', 'Accounting', false, now(), now()),
  ('CategoryManagement', 'Accounting', false, now(), now()),
  ('UserManagement', 'Accounting', false, now(), now()),
  ('VisibilitySettings', 'Accounting', false, now(), now()),
  ('DriverTasks', 'Accounting', false, now(), now()),
  ('TaskMaster', 'Accounting', false, now(), now()),
  ('settings', 'Accounting', false, now(), now()),
  ('SeoManager', 'Accounting', false, now(), now()),
  ('AnalyticsDashboard', 'Accounting', false, now(), now())
ON CONFLICT (component_name, role)
DO UPDATE SET
  is_visible = EXCLUDED.is_visible,
  updated_at = now();
