-- W1 Phase 1: availability RPCs. Mirrors src/lib/availability/availabilityMath.ts.

-- Available units of one equipment for a requested window, honoring the turnaround buffer
-- and live holds. p_exclude_booking_id lets an edit ignore its own booking.
CREATE OR REPLACE FUNCTION public.equipment_available_units(
  p_equipment_id uuid,
  p_start date,
  p_end date,
  p_exclude_booking_id uuid DEFAULT NULL
)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH cfg AS (
    SELECT
      COALESCE(
        (SELECT ec.turnaround_buffer_days
           FROM public.equipment e
           LEFT JOIN public.equipment_category ec ON ec.id = e.category_id
          WHERE e.id = p_equipment_id),
        (SELECT setting_value::int FROM public.system_settings
          WHERE setting_key = 'turnaround_buffer_days' AND is_active),
        0
      ) AS buffer_days,
      (SELECT stock_quantity FROM public.equipment WHERE id = p_equipment_id) AS stock
  ),
  days AS (
    SELECT gs::date AS day
    FROM cfg,
    LATERAL generate_series(p_start, (p_end + (cfg.buffer_days || ' days')::interval)::date, interval '1 day') gs
  ),
  committed AS (
    SELECT b.start_date, b.end_date, bi.quantity
    FROM public.bookings b
    JOIN public.booking_items bi ON bi.booking_id = b.id
    WHERE bi.equipment_id = p_equipment_id
      AND (p_exclude_booking_id IS NULL OR b.id <> p_exclude_booking_id)
      AND b.status IN ('pending', 'pending_admin_review', 'confirmed', 'out_for_delivery', 'in_transit', 'delivered')
      AND (b.status NOT IN ('pending', 'pending_admin_review') OR b.hold_expires_at IS NULL OR b.hold_expires_at > now())
  ),
  per_day AS (
    SELECT d.day, COALESCE(SUM(c.quantity), 0) AS committed_qty
    FROM days d
    LEFT JOIN committed c
      ON d.day BETWEEN c.start_date AND (c.end_date + ((SELECT buffer_days FROM cfg) || ' days')::interval)::date
    GROUP BY d.day
  )
  SELECT GREATEST(0, (SELECT stock FROM cfg) - COALESCE(MAX(committed_qty), 0))::int
  FROM per_day;
$$;

-- Bulk availability for a set of equipment (NULL = all). Powers the Phase 2 catalog.
CREATE OR REPLACE FUNCTION public.get_equipment_availability(
  p_start date,
  p_end date,
  p_equipment_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (equipment_id uuid, available_units int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id, public.equipment_available_units(e.id, p_start, p_end)
  FROM public.equipment e
  WHERE p_equipment_ids IS NULL OR e.id = ANY(p_equipment_ids);
$$;

-- Pre-check a multi-item cart for a date range. Returns { ok, conflicts: [{equipment_id, requested, available}] }.
CREATE OR REPLACE FUNCTION public.check_booking_availability(
  p_start date,
  p_end date,
  p_items jsonb,
  p_exclude_booking_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item jsonb;
  v_equipment_id uuid;
  v_qty int;
  v_available int;
  v_conflicts jsonb := '[]'::jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_equipment_id := (v_item->>'equipment_id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    v_available := public.equipment_available_units(v_equipment_id, p_start, p_end, p_exclude_booking_id);
    IF v_available < v_qty THEN
      v_conflicts := v_conflicts || jsonb_build_object(
        'equipment_id', v_equipment_id, 'requested', v_qty, 'available', v_available
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', jsonb_array_length(v_conflicts) = 0, 'conflicts', v_conflicts);
END;
$$;

-- Atomic, race-safe booking creation. Locks the referenced equipment rows (deterministic order),
-- re-checks availability, then inserts the booking + items. Raises AVAILABILITY_CONFLICT on oversell.
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

  -- Serialize concurrent bookings for the same equipment via row locks in a deterministic order.
  PERFORM 1
  FROM public.equipment e
  WHERE e.id IN (SELECT (i->>'equipment_id')::uuid FROM jsonb_array_elements(p_items) i)
  ORDER BY e.id
  FOR UPDATE;

  -- Re-check availability now that rows are locked.
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

  INSERT INTO public.bookings (
    user_id, start_date, end_date, total_amount, status,
    customer_name, customer_email, customer_phone, customer_address,
    room_number, customer_comment, delivery_slot, pickup_slot,
    payment_status, hold_expires_at
  ) VALUES (
    auth.uid(), v_start, v_end, (p_booking->>'total_amount')::numeric, 'pending_admin_review',
    p_booking->>'customer_name', lower(p_booking->>'customer_email'),
    COALESCE(p_booking->>'customer_phone', ''), COALESCE(p_booking->>'customer_address', ''),
    NULLIF(p_booking->>'room_number', ''), NULLIF(p_booking->>'customer_comment', ''),
    p_booking->>'delivery_slot', p_booking->>'pickup_slot',
    'pending', v_hold_expires
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (booking_id, equipment_id, equipment_name, equipment_price, quantity, subtotal)
  SELECT v_booking_id, (i->>'equipment_id')::uuid, i->>'equipment_name',
         (i->>'equipment_price')::numeric, (i->>'quantity')::int, (i->>'subtotal')::numeric
  FROM jsonb_array_elements(p_items) i;

  RETURN jsonb_build_object('booking_id', v_booking_id, 'hold_expires_at', v_hold_expires);
END;
$$;

GRANT EXECUTE ON FUNCTION public.equipment_available_units(uuid, date, date, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_availability(date, date, uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_booking_availability(date, date, jsonb, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_with_items(jsonb, jsonb) TO anon, authenticated;
