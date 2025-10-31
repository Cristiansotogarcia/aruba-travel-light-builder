-- Add customer_comment column to bookings table
-- This allows customers to add special instructions or notes with their booking

ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS customer_comment TEXT;

-- Create index for better query performance if needed
CREATE INDEX IF NOT EXISTS idx_bookings_customer_comment ON public.bookings(customer_comment) WHERE customer_comment IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.customer_comment IS 'Optional customer comments or special instructions for the booking';
