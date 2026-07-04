-- Workstream W4: manual-payment reconciliation
-- ------------------------------------------------------------------------
-- Payments for Travel Light Aruba are MANUAL: admins send bank/PayPal-style
-- payment links (or take cash) and then record what was received here. This
-- is distinct from `payment_records` (the Stripe/accounting ledger, owned by
-- the accounting workstream). `booking_payments` is the admin-facing manual
-- reconciliation ledger and the source of truth for bookings.payment_status.
--
-- `bookings.payment_status` is a varchar with NO check constraint today and
-- already carries 'pending' / 'paid'. We add 'partial' simply by writing it
-- (nothing to alter). We keep the RPC as the only writer of payment_status so
-- the derivation stays in one place.

-- 1. Manual payments ledger --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount       numeric(10,2) NOT NULL CHECK (amount > 0),
  method       text NOT NULL DEFAULT 'other'
               CHECK (method IN ('bank_transfer', 'cash', 'payment_link', 'other')),
  reference    text,
  note         text,
  recorded_by  uuid REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_payments_booking_id
  ON public.booking_payments (booking_id);

-- 2. RLS ---------------------------------------------------------------------
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "BookingPayments: staff can read" ON public.booking_payments;
CREATE POLICY "BookingPayments: staff can read" ON public.booking_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('Admin', 'SuperUser', 'Accounting', 'Booker')
  )
);

DROP POLICY IF EXISTS "BookingPayments: staff can write" ON public.booking_payments;
CREATE POLICY "BookingPayments: staff can write" ON public.booking_payments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('Admin', 'SuperUser', 'Accounting', 'Booker')
  )
);

DROP POLICY IF EXISTS "BookingPayments: admins can delete" ON public.booking_payments;
CREATE POLICY "BookingPayments: admins can delete" ON public.booking_payments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('Admin', 'SuperUser')
  )
);

-- 3. Internal helper: recompute bookings.payment_status from the ledger ------
CREATE OR REPLACE FUNCTION public.recompute_booking_payment_status(p_booking_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_total    numeric;
  v_paid     numeric;
  v_status   text;
BEGIN
  SELECT total_amount INTO v_total
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.booking_payments
  WHERE booking_id = p_booking_id;

  -- Mirrors src/lib/payments.ts derivePaymentStatus():
  --   paid    when sum >= total (total > 0)
  --   partial when 0 < sum < total
  --   pending otherwise (leaves 'pending')
  IF v_paid <= 0 THEN
    v_status := 'pending';
  ELSIF v_total > 0 AND v_paid >= (v_total - 0.005) THEN
    v_status := 'paid';
  ELSE
    v_status := 'partial';
  END IF;

  UPDATE public.bookings
  SET payment_status = v_status,
      updated_at     = now()
  WHERE id = p_booking_id;

  RETURN v_status;
END;
$$;

-- 4. RPC: record a manual payment -------------------------------------------
CREATE OR REPLACE FUNCTION public.record_booking_payment(
  p_booking_id uuid,
  p_amount     numeric,
  p_method     text,
  p_reference  text DEFAULT NULL,
  p_note       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_has_access boolean;
  v_payment_id uuid;
  v_status     text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('Admin', 'SuperUser', 'Accounting', 'Booker')
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF COALESCE(p_method, '') NOT IN ('bank_transfer', 'cash', 'payment_link', 'other') THEN
    RAISE EXCEPTION 'Invalid payment method %', p_method;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = p_booking_id) THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  INSERT INTO public.booking_payments (
    booking_id, amount, method, reference, note, recorded_by
  ) VALUES (
    p_booking_id,
    round(p_amount, 2),
    p_method,
    NULLIF(btrim(p_reference), ''),
    NULLIF(btrim(p_note), ''),
    auth.uid()
  )
  RETURNING id INTO v_payment_id;

  v_status := public.recompute_booking_payment_status(p_booking_id);

  RETURN jsonb_build_object(
    'payment_id',     v_payment_id,
    'booking_id',     p_booking_id,
    'payment_status', v_status
  );
END;
$$;

-- 5. RPC: read all payments for a booking -----------------------------------
CREATE OR REPLACE FUNCTION public.get_booking_payments(p_booking_id uuid)
RETURNS SETOF public.booking_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('Admin', 'SuperUser', 'Accounting', 'Booker')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.booking_payments
  WHERE booking_id = p_booking_id
  ORDER BY created_at ASC;
END;
$$;

-- 6. RPC: delete a payment (Admin/SuperUser only) ---------------------------
CREATE OR REPLACE FUNCTION public.delete_booking_payment(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_booking_id uuid;
  v_status     text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('Admin', 'SuperUser')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.booking_payments
  WHERE id = p_payment_id
  RETURNING booking_id INTO v_booking_id;

  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  v_status := public.recompute_booking_payment_status(v_booking_id);

  RETURN jsonb_build_object(
    'booking_id',     v_booking_id,
    'payment_status', v_status
  );
END;
$$;

-- 7. Grants ------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.record_booking_payment(uuid, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_payments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_booking_payment(uuid) TO authenticated;
