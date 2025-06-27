-- Enable Row Level Security on the equipment table
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, to ensure a clean slate.
DROP POLICY IF EXISTS "Admins can manage all equipment" ON public.equipment;
DROP POLICY IF EXISTS "Public can view all equipment" ON public.equipment;

-- Create a policy to allow Admin and SuperUser roles to perform all actions.
CREATE POLICY "Admins can manage all equipment"
ON public.equipment
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'SuperUser')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'SuperUser')
  )
);

-- Create a policy to allow all users (including unauthenticated ones) to view equipment.
CREATE POLICY "Public can view all equipment"
ON public.equipment
FOR SELECT
USING (true);
