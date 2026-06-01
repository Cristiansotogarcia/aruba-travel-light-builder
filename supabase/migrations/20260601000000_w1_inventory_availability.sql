-- W1 Phase 1: date-aware availability foundation.

-- 1. Hold expiry on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_hold_expires_at
  ON public.bookings(hold_expires_at)
  WHERE status IN ('pending', 'pending_admin_review');

CREATE INDEX IF NOT EXISTS idx_bookings_status_dates
  ON public.bookings(status, start_date, end_date);

-- 2. Allow the new 'expired' status by extending the existing CHECK constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check') THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_status_check;
  END IF;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending', 'pending_admin_review', 'confirmed', 'out_for_delivery', 'in_transit',
    'delivered', 'completed', 'cancelled', 'rejected', 'undeliverable', 'expired'
  ));

-- 3. Optional per-category turnaround buffer (NULL = use global default)
ALTER TABLE public.equipment_category
  ADD COLUMN IF NOT EXISTS turnaround_buffer_days INTEGER;

-- 4. Settings: hold window + global buffer (idempotent seed)
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_active)
VALUES
  ('hold_window_hours', '48', 'number', 'Hours an unconfirmed reservation holds stock before auto-expiry', TRUE),
  ('turnaround_buffer_days', '0', 'number', 'Default days a unit is unavailable after a rental ends', TRUE)
ON CONFLICT (setting_key) DO NOTHING;

-- 5. Repurpose availability_status as a manual override: stop deriving it from the global counter
DROP TRIGGER IF EXISTS trigger_update_equipment_availability ON public.stock_movements;
DROP FUNCTION IF EXISTS public.update_equipment_availability();

-- 6. Retire the global reserved counter from availability decisions (kept for back-compat, zeroed)
UPDATE public.equipment SET reserved_quantity = 0 WHERE COALESCE(reserved_quantity, 0) <> 0;
