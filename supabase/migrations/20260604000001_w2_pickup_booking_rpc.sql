-- W2 Phase 1: pickup-aware booking creation. Supersedes the W1 definition.
CREATE OR REPLACE FUNCTION public.create_booking_with_items(
  p_booking jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_start date := (p_booking->>'start_date')::date;
  v_end date := (p_booking->>'end_date')::date;
  v_fulfillment text := COALESCE(p_booking->>'fulfillment_method', 'delivery');
  v_pickup_code text := NULL;
  v_hold_hours int := COALESCE(
    (SELECT setting_value::int FROM public.system_settings WHERE setting_key = 'hold_window_hours' AND is_active), 48);
  v_hold_expires timestamptz := now() + (v_hold_hours || ' hours')::interval;
  v_booking_id uuid;
  v_item jsonb;
  v_available int;
  v_conflicts jsonb := '[]'::jsonb;
BEGIN
  IF v_start IS NULL OR v_end IS NULL OR v_end < v_start THEN
    RAISE EXCEPTION 'Invalid rental dates';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided';
  END IF;
  IF v_fulfillment NOT IN ('delivery', 'pickup') THEN
    RAISE EXCEPTION 'Invalid fulfillment_method: %', v_fulfillment;
  END IF;

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
    auth.uid(), v_start, v_end, (p_booking->>'total_amount')::numeric, 'pending_admin_review',
    p_booking->>'customer_name', lower(p_booking->>'customer_email'),
    COALESCE(p_booking->>'customer_phone', ''), COALESCE(p_booking->>'customer_address', ''),
    NULLIF(p_booking->>'room_number', ''), NULLIF(p_booking->>'customer_comment', ''),
    p_booking->>'delivery_slot', p_booking->>'pickup_slot',
    'pending', v_hold_expires, v_fulfillment, v_pickup_code
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (booking_id, equipment_id, equipment_name, equipment_price, quantity, subtotal)
  SELECT v_booking_id, (i->>'equipment_id'), i->>'equipment_name',
         (i->>'equipment_price')::numeric, (i->>'quantity')::int, (i->>'subtotal')::numeric
  FROM jsonb_array_elements(p_items) i;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'hold_expires_at', v_hold_expires,
    'fulfillment_method', v_fulfillment,
    'pickup_code', v_pickup_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_with_items(jsonb, jsonb) TO anon, authenticated;
