-- Add pickup_slot column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS pickup_slot TEXT CHECK (pickup_slot IN ('morning', 'afternoon'));

-- Add comment explaining the column
COMMENT ON COLUMN bookings.pickup_slot IS 'Time slot for equipment pickup: morning (8-10 AM) or afternoon (4-6 PM)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_slot ON bookings(pickup_slot);
