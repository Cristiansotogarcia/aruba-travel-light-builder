-- Update equipment stock quantities to enable Book Now buttons
-- This migration adds reasonable stock quantities to all equipment items

-- Update all equipment items with stock quantities
UPDATE public.equipment 
SET 
  stock_quantity = CASE 
    WHEN availability = false OR availability_status = 'Out of Stock' THEN 0
    WHEN availability_status = 'Low Stock' THEN 3
    ELSE 15
  END,
  low_stock_threshold = 5
WHERE stock_quantity IS NULL OR stock_quantity = 0;

-- Ensure reserved_quantity is initialized
UPDATE public.equipment 
SET reserved_quantity = 0 
WHERE reserved_quantity IS NULL;

-- Update availability status based on stock levels
UPDATE public.equipment 
SET availability_status = CASE 
  WHEN stock_quantity = 0 THEN 'Out of Stock'
  WHEN stock_quantity <= low_stock_threshold THEN 'Low Stock'
  ELSE 'Available'
END;

-- Update availability boolean based on stock
UPDATE public.equipment 
SET availability = (stock_quantity > 0);

COMMIT;