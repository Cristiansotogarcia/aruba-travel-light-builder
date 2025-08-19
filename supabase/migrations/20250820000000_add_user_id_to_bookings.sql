-- Add user_id column to bookings and update RLS policies
ALTER TABLE public.bookings
ADD COLUMN user_id uuid REFERENCES public.profiles(id);

-- Backfill existing rows using profile email if possible
UPDATE public.bookings b
SET user_id = p.id
FROM public.profiles p
WHERE b.user_id IS NULL AND p.email = b.customer_email;

-- Replace email-based Booker policy with user_id-based policy
DROP POLICY IF EXISTS "Bookings: Bookers can manage their bookings by email" ON public.bookings;

CREATE POLICY "Bookings: Bookers can manage their bookings by user_id" ON public.bookings
FOR ALL
USING (
  user_id = auth.uid() AND
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Booker'))
)
WITH CHECK (
  user_id = auth.uid() AND
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Booker'))
);
