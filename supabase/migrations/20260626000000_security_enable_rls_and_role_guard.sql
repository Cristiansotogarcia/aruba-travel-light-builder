-- =====================================================================
-- SECURITY FIX: enable Row-Level Security on bookings, booking_items,
-- profiles, and stop role self-escalation.
--
-- Context: these three tables were created with plain CREATE TABLE and
-- RLS was NEVER enabled (no ALTER TABLE ... ENABLE ROW LEVEL SECURITY in
-- any prior migration). The policy migration 20240619123456 falsely
-- commented "RLS is already enabled". As a result every policy on these
-- tables was inert and ANY holder of the public anon key could read all
-- customer PII, tamper with bookings, and UPDATE their own
-- profiles.role to 'Admin'/'SuperUser' (full privilege escalation).
--
-- This migration:
--   1. Enables RLS on the three tables (policies already exist and were
--      audited for complete coverage of guest/customer/driver/booker/
--      accounting/admin access paths).
--   2. Adds a BEFORE UPDATE trigger that forbids a non-admin from
--      changing their own `role` or `is_deactivated` (defense that holds
--      even if a future migration loosens the profiles UPDATE policy).
--   3. Adds an INSERT policy on profiles that pins self-inserts to the
--      'Customer' role (service-role edge functions bypass RLS, so admin
--      user creation is unaffected).
--
-- NOTE: ENABLE (not FORCE) is intentional. The attack surface is the
-- `anon`/`authenticated` Postgres roles, which do not have BYPASSRLS.
-- The service_role key and SECURITY DEFINER functions (owned by a
-- BYPASSRLS role) keep working as before, so guest booking via
-- create_booking_with_items and all server-side flows are unaffected.
-- =====================================================================

-- 1. Enable RLS (idempotent: ENABLE on an already-RLS table is a no-op)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Prevent privilege escalation on profiles ----------------------------
-- A user may update their own profile (name, etc.) but must NOT be able to
-- change `role` or `is_deactivated` unless they are Admin/SuperUser.
-- Runs as SECURITY DEFINER so the caller-role lookup is not itself filtered
-- by RLS. When there is no JWT (auth.uid() IS NULL) the statement is being
-- executed by the service role / a SECURITY DEFINER function, which is
-- trusted, so the change is allowed.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_deactivated IS DISTINCT FROM OLD.is_deactivated THEN

    -- Trusted server-side context (service role / definer functions).
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    -- Only Admin/SuperUser may change role or activation status.
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('Admin', 'SuperUser')
    ) THEN
      RAISE EXCEPTION 'Not authorized to change role or activation status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_priv_esc ON public.profiles;
CREATE TRIGGER trg_prevent_profile_priv_esc
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3. Constrain self-service profile INSERTs to the Customer role ---------
-- (No client path currently inserts profiles directly — staff accounts are
-- created by service-role edge functions which bypass RLS — but this closes
-- the door on any self-signup path minting a privileged role.)
DROP POLICY IF EXISTS "Profiles: Users can insert their own profile" ON public.profiles;
CREATE POLICY "Profiles: Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id AND role = 'Customer');
