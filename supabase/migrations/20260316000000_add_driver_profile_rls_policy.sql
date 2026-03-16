-- Add RLS policy to allow authenticated users to view Driver profiles
-- This is needed for driver assignment functionality

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Profiles: Authenticated users can view Driver profiles" ON public.profiles;

-- Create new policy to allow all authenticated users to view profiles with role 'Driver'
CREATE POLICY "Profiles: Authenticated users can view Driver profiles" ON public.profiles
FOR SELECT
USING (
  role = 'Driver'
);

-- Also allow viewing Booker profiles for booking assignment
DROP POLICY IF EXISTS "Profiles: Authenticated users can view Booker profiles" ON public.profiles;

CREATE POLICY "Profiles: Authenticated users can view Booker profiles" ON public.profiles
FOR SELECT
USING (
  role = 'Booker'
);