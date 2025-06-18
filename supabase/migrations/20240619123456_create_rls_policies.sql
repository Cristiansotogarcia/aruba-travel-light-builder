-- Step 1: Review Existing RLS Policies
-- Before applying new policies, please review any existing policies for these tables.
-- Execute this query in your Supabase SQL Editor to see current policies:
/*
SELECT
    n.nspname AS schemaname,
    c.relname AS tablename,
    pol.polname AS policyname,
    pol.polcmd AS cmd_type, -- r = SELECT, a = INSERT, w = UPDATE, d = DELETE, * = ALL
    CASE
        WHEN pol.polroles = '{0}' THEN 'public'
        ELSE array_to_string(ARRAY(
            SELECT rolname FROM pg_roles WHERE oid = ANY(pol.polroles)
        ), ', ')
    END AS roles,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM
    pg_policy pol
JOIN
    pg_class c ON pol.polrelid = c.oid
JOIN
    pg_namespace n ON c.relnamespace = n.oid
WHERE
    n.nspname = 'public' AND c.relname IN ('profiles', 'bookings', 'booking_items');
*/

-- Step 2: Define/Refine RLS Policies for 'profiles' table
-- Note: RLS is already enabled on this table.
-- Drop existing policies if they conflict or are being replaced. Example: DROP POLICY IF EXISTS "Old Policy Name" ON public.profiles;

-- Policy 1: Users can view their own profile.
CREATE POLICY "Profiles: Users can view their own profile" ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Users can update their own profile.
CREATE POLICY "Profiles: Users can update their own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Admin/SuperUser roles can view all profiles.
-- Assumes 'Admin' and 'SuperUser' are values in the 'role' column of the 'profiles' table.
CREATE POLICY "Profiles: Admins/SuperUsers can view all profiles" ON public.profiles
FOR SELECT
USING (
  (EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Admin', 'SuperUser') ))
);

-- Policy 4: Admin/SuperUser roles can update all profiles.
CREATE POLICY "Profiles: Admins/SuperUsers can update all profiles" ON public.profiles
FOR UPDATE
USING (
  (EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Admin', 'SuperUser') ))
);

-- Step 3: Define/Refine RLS Policies for 'bookings' table
-- Note: RLS is already enabled on this table.
-- Drop existing policies if they conflict or are being replaced.

-- Policy 1: Booker role can manage bookings matching their email.
-- Assumes 'Booker' is a value in 'profiles.role'.
CREATE POLICY "Bookings: Bookers can manage their bookings by email" ON public.bookings
FOR ALL
USING (
  auth.email() = customer_email AND
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Booker'))
)
WITH CHECK (
  auth.email() = customer_email AND
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Booker'))
);

-- Policy 2: Driver role can manage bookings assigned to them.
-- Assumes 'Driver' is a value in 'profiles.role' and 'assigned_to' is the driver's user_id.
CREATE POLICY "Bookings: Drivers can manage assigned bookings" ON public.bookings
FOR ALL
USING (
  auth.uid() = assigned_to AND
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Driver'))
)
WITH CHECK (
  auth.uid() = assigned_to AND
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Driver'))
);

-- Policy 3: Admin/SuperUser roles can manage all bookings.
CREATE POLICY "Bookings: Admins/SuperUsers can manage all bookings" ON public.bookings
FOR ALL
USING (
  (EXISTS ( SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Admin', 'SuperUser') ))
);

-- Step 4: Define/Refine RLS Policies for 'booking_items' table
-- Note: RLS is already enabled on this table.
-- Access to booking_items mirrors access to the parent booking record.
-- Drop existing policies if they conflict or are being replaced.

CREATE POLICY "BookingItems: Users can manage items for their accessible bookings" ON public.booking_items
FOR ALL
USING (
  (EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id)) -- This subquery is subject to RLS on 'bookings' table
);

-- IMPORTANT: 
-- 1. Review the output of the Step 1 query carefully.
-- 2. If existing policies conflict with these new ones, you may need to DROP or ALTER them first.
--    Example: DROP POLICY "Existing Policy Name" ON public.bookings;
-- 3. Test thoroughly after applying these policies to ensure correct access control for all user roles.