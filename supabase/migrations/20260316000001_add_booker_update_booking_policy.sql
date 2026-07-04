-- Add explicit UPDATE policy for Bookers to update any booking (not just their own)
-- This is needed because the existing FOR ALL policy requires email match

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Bookers can update bookings" ON public.bookings;

-- Create new policy to allow Bookers to update bookings
CREATE POLICY "Bookers can update bookings" ON public.bookings
FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Booker'))
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Booker'))
);