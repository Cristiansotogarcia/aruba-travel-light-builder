-- Step 1: Drop the existing foreign key constraint on booking_items
ALTER TABLE public.booking_items DROP CONSTRAINT IF EXISTS booking_items_equipment_id_fkey;

-- Step 2: Add the correct foreign key constraint, referencing the equipment table
ALTER TABLE public.booking_items
ADD CONSTRAINT booking_items_equipment_id_fkey
FOREIGN KEY (equipment_id) REFERENCES public.equipment(id);

-- Step 3: Add the missing price_at_booking column to the booking_items table
ALTER TABLE public.booking_items
ADD COLUMN IF NOT EXISTS price_at_booking numeric;
