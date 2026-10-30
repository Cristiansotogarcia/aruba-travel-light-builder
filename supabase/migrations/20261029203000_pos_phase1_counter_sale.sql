-- POS Phase 1 (counter rental). Contract: PLANS/TLB_POS_PHASE1_CONTRACT.md
-- (Buzz Nest, goal tlb-pos). Adds card as a recordable method, cash
-- tendered/change tracking, a channel column distinguishing office
-- (website/admin) reconciliation from pos (counter) sales, widens
-- record_booking_payment's role gate to StoreStaff, and adds the
-- pos_create_sale RPC that lets counter staff ring up a sale (booking +
-- payments) in one transaction.
--
-- Additive only: no existing migration is edited. RLS is left exactly as it
-- is (contract: "RLS unchanged otherwise. No data changes."); pos_create_sale
-- and record_booking_payment are both SECURITY DEFINER and gate access with
-- an in-body role check, same pattern as create_booking_as_staff.

-- ---------------------------------------------------------------------------
-- 1. booking_payments: card method, cash tendered/change, pos channel.
-- ---------------------------------------------------------------------------
ALTER TABLE public.booking_payments
  DROP CONSTRAINT IF EXISTS booking_payments_method_check;

ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_method_check
  CHECK (method IN ('bank_transfer', 'cash', 'payment_link', 'other', 'card'));

ALTER TABLE public.booking_payments
  ADD COLUMN IF NOT EXISTS tendered numeric NULL,
  ADD COLUMN IF NOT EXISTS change_due numeric NULL,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'office';

ALTER TABLE public.booking_payments
  DROP CONSTRAINT IF EXISTS booking_payments_channel_check;
ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_channel_check
  CHECK (channel IN ('office', 'pos'));

-- tendered/change_due only make sense together, on a cash row, non-negative.
ALTER TABLE public.booking_payments
  DROP CONSTRAINT IF EXISTS booking_payments_tendered_cash_only_check;
ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_tendered_cash_only_check
  CHECK (tendered IS NULL OR method = 'cash');

ALTER TABLE public.booking_payments
  DROP CONSTRAINT IF EXISTS booking_payments_change_due_check;
ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_change_due_check
  CHECK (change_due IS NULL OR (change_due >= 0 AND tendered IS NOT NULL));

COMMENT ON COLUMN public.booking_payments.channel IS
  'office = recorded via the admin/booker manual-reconciliation screen (record_booking_payment); pos = rung up at the counter (pos_create_sale).';

-- ---------------------------------------------------------------------------
-- 2. record_booking_payment: widen the role gate to include StoreStaff.
--    Recreated faithfully from the live definition in
--    20260704150000_w8_hardening.sql (which already carries the
--    BOOKING_NOT_PAYABLE guard) with ONLY the role list changed. The method
--    whitelist is intentionally left untouched: record_booking_payment is
--    the office/manual reconciliation RPC and does not accept 'card' or any
--    POS-only shape; counter card sales go through pos_create_sale instead.
--    recompute_booking_payment_status is untouched.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_booking_payment(
  p_booking_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_reference TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_access boolean;
  v_payment_id uuid;
  v_status     text;
  v_booking_status text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('Admin', 'SuperUser', 'Accounting', 'Booker', 'StoreStaff')
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

  SELECT status
  INTO v_booking_status
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  IF v_booking_status IN ('cancelled', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'BOOKING_NOT_PAYABLE: booking % is %', p_booking_id, v_booking_status;
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

-- Grants unchanged (already authenticated/service_role-only from
-- 20260930114000); recreating the function body does not touch them, but
-- restate for clarity / idempotency.
REVOKE EXECUTE ON FUNCTION public.record_booking_payment(uuid, numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_booking_payment(uuid, numeric, text, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. pos_create_sale: counter rental in one transaction (booking + payments).
--
--    Stock locks and the availability re-check are reused verbatim from
--    create_booking_as_staff (20260707100000_staff_order_creation.sql):
--    deterministic FOR UPDATE row lock over the touched equipment rows, then
--    a per-item equipment_available_units re-check, collecting conflicts.
--
--    Pricing is server-derived. pos_create_sale ignores any client total or
--    item price/subtotal (rejected outright if sent) and prices the sale via
--    the shared seam public.price_booking(p_booking, p_items) — the SAME
--    function create_booking_as_staff's sibling flows are meant to consume
--    once it lands (Plutus, 2026-10-29). price_booking does not exist on
--    this branch yet; its output keys are not final. The ONE place this RPC
--    reads a total from it is marked below. POS does not implement its own
--    fee logic.
--
--    Payment rules: card requires a reference; tendered is cash-only and
--    must be >= the applied amount (change_due = tendered - amount); the
--    sum of applied payment amounts may be < total (partial) but never > it
--    — a cash overpay is returned as change_due, which is never added to
--    the applied amount or the running sum. Any stock conflict or invalid
--    payment raises, rolling back the whole transaction (booking, items and
--    any payments already inserted in this call).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_create_sale(
  p_booking jsonb,
  p_items jsonb,
  p_payments jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.app_role;
  v_start date := (p_booking->>'start_date')::date;
  v_end date := (p_booking->>'end_date')::date;
  v_fulfillment text := COALESCE(p_booking->>'fulfillment_method', 'pickup');
  v_pickup_code text := NULL;
  v_booking_id uuid;
  v_item jsonb;
  v_available int;
  v_conflicts jsonb := '[]'::jsonb;
  v_priced jsonb;
  v_total numeric;
  v_payment jsonb;
  v_amount numeric;
  v_method text;
  v_reference text;
  v_tendered numeric;
  v_change_due numeric;
  v_payment_total numeric := 0;
  v_change_due_total numeric := 0;
  v_payment_status text;
BEGIN
  -- Role gate: only privileged staff may ring up a counter sale.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: pos_create_sale requires Admin, SuperUser, Booker or StoreStaff';
  END IF;

  -- Reject any client-sent price/total. Only equipment_id/quantity (and the
  -- non-pricing booking fields below) are trusted from p_booking/p_items.
  IF p_booking ? 'total_amount' OR p_booking ? 'total' OR p_booking ? 'price' THEN
    RAISE EXCEPTION 'PRICING_IS_SERVER_DERIVED: total_amount/total/price must not be sent by the client';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF v_item ? 'equipment_price' OR v_item ? 'subtotal' OR v_item ? 'price'
       OR v_item ? 'unit_price' OR v_item ? 'total_price' THEN
      RAISE EXCEPTION 'PRICING_IS_SERVER_DERIVED: item prices/subtotals must not be sent by the client';
    END IF;
    -- A zero or negative quantity would pass the availability check below
    -- (available < -2 is never true) and persist a negative line and total.
    IF NULLIF(v_item->>'equipment_id', '') IS NULL
       OR NULLIF(v_item->>'quantity', '') IS NULL
       OR (v_item->>'quantity')::int < 1 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: every item needs an equipment_id and a quantity of at least 1';
    END IF;
  END LOOP;

  -- Basic shape validation (mirrors create_booking_as_staff).
  IF v_start IS NULL OR v_end IS NULL OR v_end < v_start THEN
    RAISE EXCEPTION 'Invalid rental dates';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided';
  END IF;
  -- Availability is checked per line, so two lines of the same equipment
  -- would each pass against the same free stock and together oversell it.
  -- One line per equipment, carrying the total quantity.
  IF (SELECT count(*) FROM jsonb_array_elements(p_items))
     <> (SELECT count(DISTINCT (i->>'equipment_id')::uuid) FROM jsonb_array_elements(p_items) i) THEN
    RAISE EXCEPTION 'DUPLICATE_ITEM: each equipment may appear on one line only, with the total quantity';
  END IF;
  IF v_fulfillment NOT IN ('delivery', 'pickup') THEN
    RAISE EXCEPTION 'Invalid fulfillment_method: %', v_fulfillment;
  END IF;
  IF COALESCE(NULLIF(TRIM(p_booking->>'customer_name'), ''), NULL) IS NULL THEN
    RAISE EXCEPTION 'A customer name is required';
  END IF;
  IF v_fulfillment = 'delivery'
     AND COALESCE(NULLIF(TRIM(p_booking->>'customer_address'), ''), NULL) IS NULL THEN
    RAISE EXCEPTION 'Delivery orders require a customer address';
  END IF;

  -- Serialize concurrent bookings for the same equipment via row locks in a
  -- deterministic order (reused from create_booking_as_staff), then re-check
  -- availability now that the rows are locked. Catalog rows are locked
  -- before validation/pricing.
  PERFORM 1
  FROM public.equipment e
  WHERE e.id IN (SELECT (i->>'equipment_id')::uuid FROM jsonb_array_elements(p_items) i)
  ORDER BY e.id
  FOR UPDATE;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_available := public.equipment_available_units((v_item->>'equipment_id')::uuid, v_start, v_end);
    IF v_available < (v_item->>'quantity')::int THEN
      v_conflicts := v_conflicts || jsonb_build_object(
        'equipment_id', (v_item->>'equipment_id')::uuid,
        'requested', (v_item->>'quantity')::int,
        'available', v_available);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_conflicts) > 0 THEN
    RAISE EXCEPTION 'AVAILABILITY_CONFLICT: %', v_conflicts::text;
  END IF;

  -- ---------------------------------------------------------------------
  -- price_booking output key pending, contract TLB_POS_PHASE1_CONTRACT.md
  -- This is the ONE place pos_create_sale reads a total; it is the only
  -- total payments are checked against below.
  v_priced := public.price_booking(p_booking, p_items);
  v_total := (v_priced->>'total')::numeric;
  -- ---------------------------------------------------------------------
  IF v_total IS NULL THEN
    RAISE EXCEPTION 'PRICING_UNAVAILABLE: price_booking did not return a total';
  END IF;

  IF v_fulfillment = 'pickup' THEN
    v_pickup_code := public.generate_pickup_code();
  END IF;

  INSERT INTO public.bookings (
    user_id, start_date, end_date, total_amount, status,
    customer_name, customer_email, customer_phone, customer_address,
    room_number, customer_comment, delivery_slot, pickup_slot,
    payment_status, hold_expires_at, fulfillment_method, pickup_code
  ) VALUES (
    v_uid, v_start, v_end, v_total, 'confirmed',
    p_booking->>'customer_name',
    lower(COALESCE(p_booking->>'customer_email', '')),
    COALESCE(p_booking->>'customer_phone', ''),
    COALESCE(p_booking->>'customer_address', ''),
    NULLIF(p_booking->>'room_number', ''),
    NULLIF(p_booking->>'customer_comment', ''),
    p_booking->>'delivery_slot', p_booking->>'pickup_slot',
    'pending', NULL, v_fulfillment, v_pickup_code
  )
  RETURNING id INTO v_booking_id;

  -- booking_items.equipment_price/subtotal are a per-unit-rate x quantity
  -- REFERENCE figure for line-item display/reporting only (server equipment
  -- price, never the client's). They are not fee-inclusive and are not the
  -- authoritative charged amount — that is v_total from price_booking above,
  -- persisted on bookings.total_amount.
  INSERT INTO public.booking_items (booking_id, equipment_id, equipment_name, equipment_price, quantity, subtotal)
  SELECT
    v_booking_id,
    (i->>'equipment_id'),
    COALESCE(i->>'equipment_name', e.name),
    e.price_per_day,
    (i->>'quantity')::int,
    e.price_per_day * (i->>'quantity')::int
  FROM jsonb_array_elements(p_items) i
  JOIN public.equipment e ON e.id = (i->>'equipment_id')::uuid;

  -- Payments: cash (tendered -> change_due), card (reference required), or
  -- other. sum(applied amount) must never exceed v_total; a cash overpay is
  -- returned as change_due and is not part of the applied amount.
  FOR v_payment IN SELECT * FROM jsonb_array_elements(COALESCE(p_payments, '[]'::jsonb))
  LOOP
    v_amount := (v_payment->>'amount')::numeric;
    v_method := v_payment->>'method';
    v_reference := NULLIF(btrim(v_payment->>'reference'), '');
    v_tendered := CASE
      WHEN v_payment ? 'tendered' AND v_payment->>'tendered' IS NOT NULL
        THEN (v_payment->>'tendered')::numeric
      ELSE NULL
    END;

    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    IF COALESCE(v_method, '') NOT IN ('cash', 'card', 'other') THEN
      RAISE EXCEPTION 'Invalid payment method %', v_method;
    END IF;

    IF v_method = 'card' AND v_reference IS NULL THEN
      RAISE EXCEPTION 'CARD_REFERENCE_REQUIRED: card payments need a reference';
    END IF;

    IF v_tendered IS NOT NULL THEN
      IF v_method <> 'cash' THEN
        RAISE EXCEPTION 'TENDERED_CASH_ONLY: tendered is only valid for cash payments';
      END IF;
      IF v_tendered < v_amount THEN
        RAISE EXCEPTION 'TENDERED_BELOW_AMOUNT: tendered must be at least the applied amount';
      END IF;
      v_change_due := round(v_tendered - v_amount, 2);
    ELSE
      v_change_due := NULL;
    END IF;

    v_payment_total := v_payment_total + round(v_amount, 2);
    IF v_payment_total > (v_total + 0.005) THEN
      RAISE EXCEPTION 'OVERPAY: sum of payments exceeds the booking total';
    END IF;

    INSERT INTO public.booking_payments (
      booking_id, amount, method, reference, tendered, change_due, recorded_by, channel
    ) VALUES (
      v_booking_id, round(v_amount, 2), v_method, v_reference, v_tendered, v_change_due, v_uid, 'pos'
    );

    v_change_due_total := v_change_due_total + COALESCE(v_change_due, 0);
  END LOOP;

  v_payment_status := public.recompute_booking_payment_status(v_booking_id);

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'pickup_code', v_pickup_code,
    'payment_status', v_payment_status,
    'total', v_total,
    'paid', v_payment_total,
    'change_due', v_change_due_total
  );
END;
$$;

-- Never callable anonymously; only signed-in staff (gated again inside the
-- body), same pattern as create_booking_as_staff.
REVOKE ALL ON FUNCTION public.pos_create_sale(jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pos_create_sale(jsonb, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.pos_create_sale(jsonb, jsonb, jsonb) TO authenticated;
