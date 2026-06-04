-- W2 Phase 1: pickup data model.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS fulfillment_method TEXT NOT NULL DEFAULT 'delivery'
    CHECK (fulfillment_method IN ('delivery', 'pickup'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_pickup_code
  ON public.bookings(pickup_code) WHERE pickup_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_fulfillment_method
  ON public.bookings(fulfillment_method);

-- Store info + feature flag (idempotent)
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_active)
VALUES
  ('store_name', 'Travel Light Aruba', 'string', 'Pickup store display name', TRUE),
  ('store_address', 'Caya Taratata 15, Unit 11 (Coral Plaza)', 'string', 'Pickup store address', TRUE),
  ('store_hours', 'Mon–Sat 9:00–17:00', 'string', 'Pickup store opening hours', TRUE),
  ('pickup_enabled', 'false', 'boolean', 'Whether self-pickup is offered at checkout', TRUE)
ON CONFLICT (setting_key) DO NOTHING;

-- Short, human-friendly, unique pickup code (no ambiguous chars).
CREATE OR REPLACE FUNCTION public.generate_pickup_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_i int;
BEGIN
  LOOP
    v_code := 'TLA-';
    FOR v_i IN 1..4 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE pickup_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_pickup_code() TO authenticated;
