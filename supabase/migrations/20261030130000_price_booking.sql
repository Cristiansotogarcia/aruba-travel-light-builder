-- public.price_booking(p_booking jsonb, p_items jsonb) RETURNS jsonb
--
-- Server-side pricing seam. The POS RPCs (pos_create_sale, extend_booking_rental)
-- read the charged total from here and never from the client. It is a line-for-
-- line port of src/lib/pricing/bookingTotals.ts + deliveryFee.ts so the price a
-- customer sees in the web flow and the price the counter charges cannot drift.
--
-- Rules (same as computeBookingTotals):
--   * days = end_date - start_date, plus one when delivery_slot = 'morning' and
--     pickup_slot = 'afternoon'.
--   * Per line, with weekly = price_per_week, or price_per_day * 5 when the
--     weekly rate is null or 0:
--       1-4 days -> price_per_day * quantity * days
--       5-7 days -> weekly * quantity
--       8+ days  -> full weeks at weekly, remainder 1-4 days daily, 5-6 weekly.
--   * Delivery fee: pickup 0; delivery 20 on a Sunday start, else 10 under
--     5 days, else 0. fulfillment_method defaults to 'delivery' like the client.
--
-- Differences from the client, both deliberate:
--   * Prices come only from public.equipment. Any price, subtotal or total keys
--     in the input are ignored.
--   * Where the client quietly returns a zero total (missing dates, end on or
--     before start), this raises, so a caller can never charge 0 by accident.
--
-- Output keys: days, equipment_total, delivery_fee, total, lines[] with
-- equipment_id, quantity, price_per_day, weekly_rate, subtotal.
--
-- Crib move charges (20 USD per recorded move, Cristian 2026-10-30) are not
-- part of a cart price. They come from the move records of an existing booking
-- and are added by the crib-move recompute, not here.
CREATE OR REPLACE FUNCTION public.price_booking(p_booking jsonb, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_start date;
  v_end date;
  v_delivery_slot text := p_booking->>'delivery_slot';
  v_pickup_slot text := p_booking->>'pickup_slot';
  v_method text := COALESCE(NULLIF(p_booking->>'fulfillment_method', ''), 'delivery');
  v_days integer;
  v_item jsonb;
  v_equipment_id uuid;
  v_quantity integer;
  v_per_day numeric;
  v_per_week numeric;
  v_weekly numeric;
  v_full_weeks integer;
  v_rest integer;
  v_subtotal numeric;
  v_equipment_total numeric := 0;
  v_delivery_fee numeric;
  v_lines jsonb := '[]'::jsonb;
BEGIN
  IF p_booking IS NULL OR jsonb_typeof(p_booking) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_BOOKING: booking must be an object';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_ITEMS: at least one item is required';
  END IF;

  BEGIN
    v_start := (p_booking->>'start_date')::date;
    v_end := (p_booking->>'end_date')::date;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'INVALID_DATES: start_date and end_date must be dates';
  END;
  IF v_start IS NULL OR v_end IS NULL OR v_end <= v_start THEN
    RAISE EXCEPTION 'INVALID_DATES: end_date must be after start_date';
  END IF;

  IF v_delivery_slot IS NOT NULL AND v_delivery_slot NOT IN ('morning', 'afternoon') THEN
    RAISE EXCEPTION 'INVALID_SLOT: delivery_slot %', v_delivery_slot;
  END IF;
  IF v_pickup_slot IS NOT NULL AND v_pickup_slot NOT IN ('morning', 'afternoon') THEN
    RAISE EXCEPTION 'INVALID_SLOT: pickup_slot %', v_pickup_slot;
  END IF;
  IF v_method NOT IN ('delivery', 'pickup') THEN
    RAISE EXCEPTION 'INVALID_FULFILLMENT: %', v_method;
  END IF;

  v_days := v_end - v_start;
  IF v_delivery_slot = 'morning' AND v_pickup_slot = 'afternoon' THEN
    v_days := v_days + 1;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'INVALID_ITEMS: each item must be an object';
    END IF;
    BEGIN
      v_equipment_id := (v_item->>'equipment_id')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'INVALID_ITEMS: equipment_id must be a uuid';
    END;
    IF COALESCE(jsonb_typeof(v_item->'quantity'), '') <> 'number' THEN
      RAISE EXCEPTION 'INVALID_ITEMS: quantity must be a whole number of at least 1';
    END IF;
    IF (v_item->>'quantity')::numeric <> trunc((v_item->>'quantity')::numeric)
       OR (v_item->>'quantity')::numeric < 1 THEN
      RAISE EXCEPTION 'INVALID_ITEMS: quantity must be a whole number of at least 1';
    END IF;
    v_quantity := (v_item->>'quantity')::integer;

    SELECT e.price_per_day, e.price_per_week
      INTO v_per_day, v_per_week
      FROM public.equipment e
     WHERE e.id = v_equipment_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'UNKNOWN_EQUIPMENT: %', v_equipment_id;
    END IF;
    -- price_per_day is NOT NULL DEFAULT 0 on the real table, so a row saved
    -- without a price reads as 0. Refuse it rather than rent it for free.
    IF v_per_day IS NULL OR v_per_day <= 0 THEN
      RAISE EXCEPTION 'UNPRICED_EQUIPMENT: %', v_equipment_id;
    END IF;

    v_weekly := COALESCE(NULLIF(v_per_week, 0), v_per_day * 5);

    IF v_days <= 4 THEN
      v_subtotal := v_per_day * v_quantity * v_days;
    ELSIF v_days <= 7 THEN
      v_subtotal := v_weekly * v_quantity;
    ELSE
      v_full_weeks := v_days / 7;
      v_rest := v_days % 7;
      v_subtotal := v_full_weeks * v_weekly * v_quantity;
      IF v_rest BETWEEN 1 AND 4 THEN
        v_subtotal := v_subtotal + v_rest * v_per_day * v_quantity;
      ELSIF v_rest >= 5 THEN
        v_subtotal := v_subtotal + v_weekly * v_quantity;
      END IF;
    END IF;

    v_equipment_total := v_equipment_total + v_subtotal;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'equipment_id', v_equipment_id,
      'quantity', v_quantity,
      'price_per_day', v_per_day,
      'weekly_rate', v_weekly,
      'subtotal', v_subtotal
    ));
  END LOOP;

  IF v_method = 'pickup' THEN
    v_delivery_fee := 0;
  ELSIF extract(dow FROM v_start) = 0 THEN
    v_delivery_fee := 20;
  ELSIF v_days < 5 THEN
    v_delivery_fee := 10;
  ELSE
    v_delivery_fee := 0;
  END IF;

  RETURN jsonb_build_object(
    'days', v_days,
    'equipment_total', v_equipment_total,
    'delivery_fee', v_delivery_fee,
    'total', v_equipment_total + v_delivery_fee,
    'lines', v_lines
  );
END;
$$;

-- Only the SECURITY DEFINER RPCs call this, and they run as the owner.
REVOKE ALL ON FUNCTION public.price_booking(jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.price_booking(jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.price_booking(jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.price_booking(jsonb, jsonb) TO service_role;
