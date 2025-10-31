-- Fix booking status constraint and add weekly pricing
-- Allows 'pending_admin_review' status and adds price_per_week column

-- Step 1: Drop existing status constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'bookings_status_check'
    ) THEN
        ALTER TABLE public.bookings DROP CONSTRAINT bookings_status_check;
    END IF;
END $$;

-- Step 2: Add new status constraint with all valid statuses
ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_status_check 
    CHECK (status IN (
        'pending',
        'pending_admin_review',
        'confirmed',
        'in_transit',
        'delivered',
        'completed',
        'cancelled',
        'rejected'
    ));

-- Step 3: Add price_per_week column to equipment table
ALTER TABLE public.equipment 
    ADD COLUMN IF NOT EXISTS price_per_week NUMERIC;

-- Step 4: Add price_per_week column to products table (legacy)
ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS price_per_week NUMERIC;

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_weekly_pricing 
    ON public.equipment(price_per_week) 
    WHERE price_per_week IS NOT NULL;

-- Add comments for documentation
COMMENT ON CONSTRAINT bookings_status_check ON public.bookings 
    IS 'Valid booking statuses including pending_admin_review for guest bookings';
COMMENT ON COLUMN public.equipment.price_per_week 
    IS 'Weekly rental rate - applies when booking is 5-7 days';
COMMENT ON COLUMN public.products.price_per_week 
    IS 'Weekly rental rate - applies when booking is 5-7 days';
