-- Part 2: public signups are customers, not drivers. Existing rows are left
-- untouched (real drivers keep their role; staff were assigned explicitly).
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'Customer'::public.app_role;

-- Also fix the signup trigger, which hardcoded 'Driver' (and lacked a pinned
-- search_path despite SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, role, is_deactivated)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'Customer',
    false
  );
  RETURN NEW;
END;
$function$;
