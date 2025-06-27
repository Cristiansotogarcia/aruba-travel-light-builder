-- Add image_url and availability_status columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url text;

-- Add availability_status column with default 'Available'
-- Consider converting to an enum if desired
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'Available';
