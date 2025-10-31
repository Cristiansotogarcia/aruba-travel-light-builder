-- Add room_number column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS room_number text;

-- Add comment to describe the column
COMMENT ON COLUMN public.bookings.room_number IS 'Room number at the accommodation';
