-- Special Request form (Workstream B, PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md).
--
-- Replaces the mailto-only /contact page with a real stored request: last
-- minute rentals, general inquiries, and "special arrangements" (car seat
-- delivery at the car rental place, Sunday crib delivery/collection, moving
-- a crib between locations). Anyone (including signed-out visitors) can
-- submit one; only staff can read or triage them. Role-check pattern mirrors
-- 20260930114000_security_p1_hardening.sql and 20260930090000_blog.sql
-- (EXISTS against public.profiles, gated on role and is_deactivated).

CREATE TABLE public.special_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  email           text NOT NULL CHECK (char_length(btrim(email)) BETWEEN 3 AND 200),
  phone           text CHECK (phone IS NULL OR char_length(btrim(phone)) <= 30),
  request_type    text NOT NULL CHECK (request_type IN ('general', 'last_minute', 'special_arrangement')),
  message         text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
  preferred_dates text CHECK (preferred_dates IS NULL OR char_length(btrim(preferred_dates)) <= 200),
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.special_requests IS
  'Customer-submitted special requests from the /contact page: last-minute rentals, general inquiries, and special arrangements (car seat delivery, Sunday crib legs, crib relocation). Staff-only read/triage.';

CREATE OR REPLACE FUNCTION public.special_requests_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_special_requests_updated_at
  BEFORE UPDATE ON public.special_requests
  FOR EACH ROW EXECUTE FUNCTION public.special_requests_touch_updated_at();

ALTER TABLE public.special_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or signed in) may submit a request. The WITH CHECK duplicates
-- the column CHECK constraints so a malformed row is rejected by RLS before
-- it ever reaches the constraint, and status can only be created as 'new'.
CREATE POLICY "Anyone can submit a special request" ON public.special_requests
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(name)) BETWEEN 1 AND 100
  AND char_length(btrim(email)) BETWEEN 3 AND 200
  AND (phone IS NULL OR char_length(btrim(phone)) <= 30)
  AND request_type IN ('general', 'last_minute', 'special_arrangement')
  AND char_length(btrim(message)) BETWEEN 1 AND 2000
  AND (preferred_dates IS NULL OR char_length(btrim(preferred_dates)) <= 200)
  AND status = 'new'
);

-- Staff-only read: Admin/SuperUser (full access), Booker and StoreStaff (the
-- roles that actually triage reservations and in-store requests).
CREATE POLICY "Staff can view special requests" ON public.special_requests
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff')
    AND coalesce(is_deactivated, false) = false
  )
);

-- Staff-only triage (status / notes-style updates). Same role gate as SELECT.
CREATE POLICY "Staff can update special requests" ON public.special_requests
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff')
    AND coalesce(is_deactivated, false) = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff')
    AND coalesce(is_deactivated, false) = false
  )
);

-- No DELETE policy: staff triage by changing `status`, nothing deletes a
-- submitted request. GRANTs below are the table-level floor; RLS above is
-- what actually scopes the rows.
GRANT INSERT ON public.special_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.special_requests TO authenticated;

CREATE INDEX special_requests_status_created_at_idx
  ON public.special_requests (status, created_at DESC);
