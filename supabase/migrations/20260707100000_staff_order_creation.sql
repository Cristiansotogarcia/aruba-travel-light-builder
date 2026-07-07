-- Staff order creation. Lets Admin / SuperUser / Booker / StoreStaff place orders
-- (phone orders, walk-ins) through the same race-safe path the public flow uses.
-- Mirrors public.create_booking_with_items exactly (deterministic equipment row
-- locks, availability re-check, AVAILABILITY_CONFLICT with conflicts JSON, pickup
-- path mints a pickup_code) with staff-specific differences:
--   * Only privileged roles may call it (role gate via public.profiles).
--   * Staff ARE the review step, so the booking is created already 'confirmed'
--     (default) or 'pending' (awaiting payment) — never 'pending_admin_review'.
--   * No hold_expires_at in either case: a staff-placed order is a permanent hold,
--     matching how BookingConfirmationModal clears the transient request-hold when
--     an admin approves a reservation (hold_expires_at := NULL, payment_status :=
--     'pending').
-- The booking_audit_log INSERT trigger (trigger_booking_audit_log) fires
-- automatically on INSERT and records auth.uid() (the staff member) — auth.uid()
-- resolves from the JWT even inside a SECURITY DEFINER function — so no explicit
-- audit write is needed here.
CREATE OR REPLACE FUNCTION public.create_booking_as_staff(
  p_booking jsonb,
  p_items jsonb,
  p_initial_status text DEFAULT 'confirmed'
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
  v_fulfillment text := COALESCE(p_booking->>'fulfillment_method', 'delivery');
  v_status text := COALESCE(p_initial_status, 'confirmed');
  v_pickup_code text := NULL;
  v_booking_id uuid;
  v_item jsonb;
  v_available int;
  v_conflicts jsonb := '[]'::jsonb;
BEGIN
  -- Role gate: only privileged staff may place orders on a customer's behalf.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: staff order creation requires Admin, SuperUser, Booker or StoreStaff';
  END IF;

  -- Basic shape validation.
  IF v_start IS NULL OR v_end IS NULL OR v_end < v_start THEN
    RAISE EXCEPTION 'Invalid rental dates';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided';
  END IF;
  IF v_fulfillment NOT IN ('delivery', 'pickup') THEN
    RAISE EXCEPTION 'Invalid fulfillment_method: %', v_fulfillment;
  END IF;
  IF v_status NOT IN ('confirmed', 'pending') THEN
    RAISE EXCEPTION 'Invalid initial status: % (expected confirmed or pending)', v_status;
  END IF;

  -- Delivery orders need a destination and both time slots.
  IF v_fulfillment = 'delivery' THEN
    IF COALESCE(NULLIF(TRIM(p_booking->>'customer_address'), ''), NULL) IS NULL THEN
      RAISE EXCEPTION 'Delivery orders require a customer address';
    END IF;
    IF COALESCE(p_booking->>'delivery_slot', '') NOT IN ('morning', 'afternoon')
       OR COALESCE(p_booking->>'pickup_slot', '') NOT IN ('morning', 'afternoon') THEN
      RAISE EXCEPTION 'Delivery orders require morning/afternoon delivery and pickup slots';
    END IF;
  END IF;

  -- Serialize concurrent bookings for the same equipment via row locks in a
  -- deterministic order, then re-check availability now that rows are locked.
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

  IF v_fulfillment = 'pickup' THEN
    v_pickup_code := public.generate_pickup_code();
  END IF;

  INSERT INTO public.bookings (
    user_id, start_date, end_date, total_amount, status,
    customer_name, customer_email, customer_phone, customer_address,
    room_number, customer_comment, delivery_slot, pickup_slot,
    payment_status, hold_expires_at, fulfillment_method, pickup_code
  ) VALUES (
    -- The staff member owns the booking record; the customer is captured in the
    -- customer_* columns. NULL user_id (guest) is also acceptable, but attributing
    -- it to the creator keeps a clean audit trail.
    v_uid, v_start, v_end, (p_booking->>'total_amount')::numeric, v_status,
    p_booking->>'customer_name', lower(p_booking->>'customer_email'),
    COALESCE(p_booking->>'customer_phone', ''), COALESCE(p_booking->>'customer_address', ''),
    NULLIF(p_booking->>'room_number', ''), NULLIF(p_booking->>'customer_comment', ''),
    p_booking->>'delivery_slot', p_booking->>'pickup_slot',
    -- Staff orders are never auto-expired: permanent hold, payment handled manually.
    'pending', NULL, v_fulfillment, v_pickup_code
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (booking_id, equipment_id, equipment_name, equipment_price, quantity, subtotal)
  SELECT v_booking_id, (i->>'equipment_id'), i->>'equipment_name',
         (i->>'equipment_price')::numeric, (i->>'quantity')::int, (i->>'subtotal')::numeric
  FROM jsonb_array_elements(p_items) i;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'status', v_status,
    'fulfillment_method', v_fulfillment,
    'pickup_code', v_pickup_code
  );
END;
$$;

-- Never callable anonymously; only signed-in staff (gated again inside the body).
REVOKE ALL ON FUNCTION public.create_booking_as_staff(jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_booking_as_staff(jsonb, jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_booking_as_staff(jsonb, jsonb, text) TO authenticated;
