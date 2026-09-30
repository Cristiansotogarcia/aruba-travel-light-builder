-- =====================================================================
-- SECURITY P0: close the profiles privilege-escalation routes found by
-- the 2026-09-30 live DB audit.
--
-- Live state this fixes:
--   1. The own-profile UPDATE policies allow writing the `role` column
--      and the 20260626000000 guard trigger never reached the live DB
--      (zero triggers exist on public.profiles live). With signup open
--      and auto-confirmed, any visitor could sign up and run
--      `update profiles set role = 'SuperUser' where id = auth.uid()`.
--   2. Five profiles policies trust auth.jwt()->'user_metadata'->>'role'.
--      user_metadata is client-writable via supabase.auth.updateUser(),
--      so those policies grant themselves to anyone who asks.
--
-- Verified on live before writing this migration:
--   - profiles.role is the authoritative role store: 0 of 21 auth.users
--     have user_metadata.role set, so dropping the metadata policies
--     changes nothing for any legitimate user.
--   - public.handle_new_user() hardcodes role='Customer' on signup, so
--     the signup path itself does not mint privileged roles.
--   - public.get_current_user_role() exists live (SECURITY DEFINER,
--     reads public.profiles), which lets admin policies on profiles
--     check profiles.role without infinite policy recursion.
--
-- Idempotent: safe to re-run, and safe on a database where the
-- 20260626000000 migration DID run.
-- =====================================================================

-- 1. RLS on (no-op on live, where these are already enabled) ------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

-- 2. Guard trigger: non-admins cannot change role / is_deactivated ------
-- (Same function and trigger as 20260626000000, re-asserted because that
-- migration never reached the live database.)
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

-- 3. Drop every policy that trusts client-writable user_metadata --------
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "SuperUsers can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "SuperUsers can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "SuperUsers can view all profiles" ON public.profiles;

-- Replacements check profiles.role via the SECURITY DEFINER helper
-- (definer bypasses RLS on its own SELECT, so no policy recursion).
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.get_current_user_role() IN ('Admin', 'SuperUser'));

CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING (public.get_current_user_role() IN ('Admin', 'SuperUser'))
WITH CHECK (public.get_current_user_role() IN ('Admin', 'SuperUser'));

-- get_current_user_role is now load-bearing for profiles policies: pin
-- its search_path (it was created without one; advisor
-- function_search_path_mutable). Body already schema-qualifies
-- public.profiles, so pinning cannot change its behaviour.
ALTER FUNCTION public.get_current_user_role() SET search_path = public;

-- 4. Collapse the duplicate own-profile UPDATE policies into one --------
-- Live has three UPDATE policies with the same predicate; keep a single
-- canonical one with an explicit WITH CHECK. Column-level protection of
-- `role`/`is_deactivated` is the trigger's job (a policy cannot see
-- which columns changed).
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
CREATE POLICY "Enable update for users based on id" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Self-service INSERTs may only create Customer rows -----------------
-- (Staff accounts are created server-side with the service role, which
-- bypasses RLS; handle_new_user is a definer trigger and also bypasses.)
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Users can insert their own profile" ON public.profiles;
CREATE POLICY "Profiles: Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id AND role = 'Customer');
