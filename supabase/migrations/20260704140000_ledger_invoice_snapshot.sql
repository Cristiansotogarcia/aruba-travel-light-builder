-- W4 follow-up (cohesion gap): bookings paid via the manual booking_payments
-- ledger reached payment_status='paid' but never got an `invoices` snapshot,
-- so /invoice/<booking_id> showed "Invoice not found" for ledger-paid bookings.
--
-- Why not reuse public.issue_booking_invoice? Its semantics do not fit the
-- ledger path: it REQUIRES a paid `payment_records` row (raises 'Paid payment
-- record not found' otherwise), and it mints legacy 'TLA-' numbers from
-- invoice_number_seq, ignoring the W5 per-booking bookings.invoice_number.
-- Ledger-paid bookings have booking_payments rows, not payment_records rows.
--
-- This migration adds an internal helper that idempotently creates the
-- snapshot for a ledger-paid booking, numbering it consistently with W5's
-- get_or_assign_invoice_number (migration 20260704120000):
--   * booking already has bookings.invoice_number  -> snapshot carries THAT
--     number (never mints a rival).
--   * no number yet -> mint INV-YYYY-NNNN via public.next_document_number and
--     persist it on the booking (exactly what get_or_assign would do), under
--     the SAME advisory lock key so the two paths cannot race each other.
--   * snapshot already exists -> nothing to do (invoices.booking_id is UNIQUE).
-- recompute_booking_payment_status then invokes it on the transition to
-- 'paid'. The reverse transition (paid -> partial after a payment delete)
-- deliberately leaves the snapshot untouched: it is a historical document.

-- 1. Internal helper: idempotent snapshot for a ledger-paid booking ----------
CREATE OR REPLACE FUNCTION public.ensure_ledger_invoice_snapshot(p_booking_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_invoice_id     uuid;
  v_booking        public.bookings%ROWTYPE;
  v_number         text;
  v_snapshot_number text;
  v_line_items     jsonb := '[]'::jsonb;
  v_items_total    numeric(10,2) := 0;
  v_delivery_fee   numeric(10,2) := 0;
  v_total_paid     numeric;
  v_last_paid_at   timestamptz;
  v_currency       text;
BEGIN
  -- Fast path: snapshot already exists (invoices.booking_id is UNIQUE).
  SELECT id INTO v_invoice_id
  FROM public.invoices
  WHERE booking_id = p_booking_id;

  IF v_invoice_id IS NOT NULL THEN
    RETURN v_invoice_id;
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  -- Same advisory lock key as public.get_or_assign_invoice_number (W5), so
  -- number assignment cannot race between the two paths.
  PERFORM pg_advisory_xact_lock(hashtextextended('invoice_number:' || p_booking_id::text, 0));

  -- Re-check under the lock (a concurrent caller may have inserted).
  SELECT id INTO v_invoice_id
  FROM public.invoices
  WHERE booking_id = p_booking_id;

  IF v_invoice_id IS NOT NULL THEN
    RETURN v_invoice_id;
  END IF;

  -- Number selection, mirroring get_or_assign_invoice_number:
  -- 1) the booking's persisted number wins;
  -- 2) otherwise mint INV-YYYY-NNNN and persist it on the booking.
  SELECT invoice_number INTO v_number
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_number IS NULL OR btrim(v_number) = '' THEN
    v_number := 'INV-' || EXTRACT(YEAR FROM NOW())::int || '-' ||
                LPAD(public.next_document_number('invoice', EXTRACT(YEAR FROM NOW())::int)::text, 4, '0');

    UPDATE public.bookings
    SET invoice_number = v_number
    WHERE id = p_booking_id;
  END IF;

  -- Line items (same shape as issue_booking_invoice).
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'equipment_id',    equipment_id,
          'equipment_name',  equipment_name,
          'quantity',        quantity,
          'equipment_price', equipment_price,
          'subtotal',        subtotal
        )
        ORDER BY equipment_name, id
      ),
      '[]'::jsonb
    ),
    COALESCE(SUM(subtotal), 0)
  INTO v_line_items, v_items_total
  FROM public.booking_items
  WHERE booking_id = p_booking_id;

  v_delivery_fee := GREATEST(COALESCE(v_booking.total_amount, 0) - COALESCE(v_items_total, 0), 0);

  SELECT COALESCE(SUM(amount), 0), MAX(created_at)
  INTO v_total_paid, v_last_paid_at
  FROM public.booking_payments
  WHERE booking_id = p_booking_id;

  SELECT COALESCE(
           (SELECT setting_value FROM public.system_settings
            WHERE setting_key = 'default_currency' AND is_active = true),
           'AWG')
  INTO v_currency;

  INSERT INTO public.invoices (
    booking_id,
    payment_record_id,
    invoice_number,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    rental_start_date,
    rental_end_date,
    currency_code,
    items_total,
    delivery_fee,
    total_amount,
    payment_status,
    payment_processed_at,
    line_items,
    metadata,
    issued_at
  ) VALUES (
    v_booking.id,
    NULL, -- manual ledger payments have no payment_records row
    v_number,
    v_booking.customer_name,
    v_booking.customer_email,
    v_booking.customer_phone,
    v_booking.customer_address,
    v_booking.start_date::date,
    v_booking.end_date::date,
    v_currency,
    COALESCE(v_items_total, 0),
    COALESCE(v_delivery_fee, 0),
    v_booking.total_amount,
    'paid',
    COALESCE(v_last_paid_at, NOW()),
    v_line_items,
    jsonb_build_object(
      'source',      'booking_payments_ledger',
      'total_paid',  v_total_paid,
      'payments',    (
        SELECT COALESCE(
                 jsonb_agg(
                   jsonb_build_object(
                     'id',        bp.id,
                     'amount',    bp.amount,
                     'method',    bp.method,
                     'reference', bp.reference,
                     'paid_at',   bp.created_at
                   )
                   ORDER BY bp.created_at
                 ),
                 '[]'::jsonb)
        FROM public.booking_payments bp
        WHERE bp.booking_id = p_booking_id
      )
    ),
    COALESCE(v_last_paid_at, NOW())
  )
  ON CONFLICT (booking_id) DO NOTHING
  RETURNING id INTO v_invoice_id;

  -- ON CONFLICT race fallback: return whichever row won.
  IF v_invoice_id IS NULL THEN
    SELECT id INTO v_invoice_id
    FROM public.invoices
    WHERE booking_id = p_booking_id;
  END IF;

  RETURN v_invoice_id;
END;
$$;

-- Internal only: reachable exclusively through SECURITY DEFINER RPC paths that
-- already enforce role checks (record/delete booking payment).
REVOKE EXECUTE ON FUNCTION public.ensure_ledger_invoice_snapshot(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_ledger_invoice_snapshot(uuid) FROM anon, authenticated;

-- 2. Recompute now snapshots on the transition to 'paid' ---------------------
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

  -- Fully paid via the ledger -> make sure the invoice snapshot exists so
  -- /invoice/<booking_id> works. Snapshot failure must never block payment
  -- recording, so it is contained.
  IF v_status = 'paid' THEN
    BEGIN
      PERFORM public.ensure_ledger_invoice_snapshot(p_booking_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ledger invoice snapshot failed for booking %: %', p_booking_id, SQLERRM;
    END;
  END IF;

  RETURN v_status;
END;
$$;
