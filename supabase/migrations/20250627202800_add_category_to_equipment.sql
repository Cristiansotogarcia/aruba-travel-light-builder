-- First, create the equipment_category table
CREATE TABLE IF NOT EXISTS public.equipment_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add a foreign key column for 'category_id' to the 'equipment' table
ALTER TABLE public.equipment
ADD COLUMN category_id UUID REFERENCES public.equipment_category(id) ON DELETE SET NULL;

-- Optional: Create an index on the new foreign key for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_category_id ON public.equipment(category_id);

-- Enable RLS for the new table and set up policies
ALTER TABLE public.equipment_category ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all equipment categories" ON public.equipment_category;
DROP POLICY IF EXISTS "Public can view all equipment categories" ON public.equipment_category;

-- Policy for Admins to manage categories
CREATE POLICY "Admins can manage all equipment categories"
ON public.equipment_category
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

-- Policy for public to view categories
CREATE POLICY "Public can view all equipment categories"
ON public.equipment_category
FOR SELECT
USING (true);
