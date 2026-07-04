-- W6: customer self-service — cancel and reschedule own bookings.
--
-- Business rule (enforced HERE, not just in the UI): self-service changes are
-- allowed only when the booking starts at least 7 days from today. Inside that
-- window customers must contact staff (info@travelightaruba.com).
--
-- Both functions are SECURITY DEFINER so they can update bookings regardless of
-- RLS, which is why every access is gated on auth.uid() ownership first.

-- ---------------------------------------------------------------------------
-- Cancel own booking.
-- Frees availability automatically: the W1 availability math only counts
-- bookings with active statuses, so status='cancelled' drops out of the
-- committed set (see 20260601000001_w1_availability_functions.sql).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.customer_cancel_booking(
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- Same error for "does not exist" and "not yours": don't leak other
  -- customers' booking ids.
  IF NOT FOUND OR v_booking.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.status NOT IN ('pending', 'pending_admin_review', 'confirmed') THEN
    RAISE EXCEPTION 'NOT_CANCELLABLE: %', v_booking.status;
  END IF;

  -- The 7-day rule, in SQL. start_date - CURRENT_DATE is whole days.
  IF v_booking.start_date - CURRENT_DATE < 7 THEN
    RAISE EXCEPTION 'CANCELLATION_WINDOW_CLOSED';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      hold_expires_at = NULL,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('ok', true, 'booking_id', p_booking_id, 'status', 'cancelled');
END;
$$;

-- ---------------------------------------------------------------------------
-- Reschedule own booking.
-- Re-checks availability for ALL items on the new range, excluding this
-- booking's own footprint (p_exclude_booking_id). On conflict returns the
-- conflicts JSON from check_booking_availability instead of updating.
-- On success the booking goes back to pending_admin_review with a fresh hold
-- so staff re-approve the new dates.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.customer_reschedule_booking(
  p_booking_id uuid,
  p_new_start date,
  p_new_end date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_items jsonb;
  v_check jsonb;
  v_hold_hours int := COALESCE(
    (SELECT setting_value::int FROM public.system_settings
      WHERE setting_key = 'hold_window_hours' AND is_active), 48);
  v_hold_expires timestamptz := now() + (v_hold_hours || ' hours')::interval;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND OR v_booking.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.status NOT IN ('pending', 'pending_admin_review', 'confirmed') THEN
    RAISE EXCEPTION 'NOT_RESCHEDULABLE: %', v_booking.status;
  END IF;

  -- 7-day rule against the CURRENT start date, in SQL.
  IF v_booking.start_date - CURRENT_DATE < 7 THEN
    RAISE EXCEPTION 'RESCHEDULE_WINDOW_CLOSED';
  END IF;

  -- New range validation.
  IF p_new_start IS NULL OR p_new_end IS NULL
     OR p_new_end < p_new_start
     OR p_new_start < CURRENT_DATE THEN
    RAISE EXCEPTION 'INVALID_DATES';
  END IF;

  IF p_new_start = v_booking.start_date AND p_new_end = v_booking.end_date THEN
    RAISE EXCEPTION 'DATES_UNCHANGED';
  END IF;

  -- booking_items.equipment_id is TEXT holding a uuid; check_booking_availability
  -- reads it back with (item->>'equipment_id')::uuid, so pass it through as-is.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'equipment_id', bi.equipment_id,
           'quantity', bi.quantity)), '[]'::jsonb)
  INTO v_items
  FROM public.booking_items bi
  WHERE bi.booking_id = p_booking_id;

  IF jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'NO_ITEMS';
  END IF;

  -- Serialize against concurrent bookings of the same equipment
  -- (same deterministic lock order as create_booking_with_items).
  PERFORM 1
  FROM public.equipment e
  WHERE e.id IN (SELECT (i->>'equipment_id')::uuid FROM jsonb_array_elements(v_items) i)
  ORDER BY e.id
  FOR UPDATE;

  -- Availability on the new range, ignoring this booking's own footprint.
  v_check := public.check_booking_availability(p_new_start, p_new_end, v_items, p_booking_id);
  IF NOT (v_check->>'ok')::boolean THEN
    RETURN v_check; -- { ok: false, conflicts: [{equipment_id, requested, available}] }
  END IF;

  UPDATE public.bookings
  SET start_date = p_new_start,
      end_date = p_new_end,
      status = 'pending_admin_review',
      hold_expires_at = v_hold_expires,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'ok', true,
    'booking_id', p_booking_id,
    'start_date', p_new_start,
    'end_date', p_new_end,
    'status', 'pending_admin_review',
    'hold_expires_at', v_hold_expires
  );
END;
$$;

-- Customers only; no anonymous access.
REVOKE ALL ON FUNCTION public.customer_cancel_booking(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_reschedule_booking(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_cancel_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_reschedule_booking(uuid, date, date) TO authenticated;
