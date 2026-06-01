-- W1 Phase 1: auto-expire unconfirmed holds.

-- 1. Backfill: give existing pending requests a FRESH window so day-one cleanup doesn't mass-expire history.
UPDATE public.bookings
SET hold_expires_at = now() + (
  COALESCE((SELECT setting_value::int FROM public.system_settings WHERE setting_key = 'hold_window_hours' AND is_active), 48)
  || ' hours')::interval
WHERE status IN ('pending', 'pending_admin_review') AND hold_expires_at IS NULL;

-- 2. expire_holds(): flip expired unconfirmed holds to 'expired'. Returns count expired.
CREATE OR REPLACE FUNCTION public.expire_holds()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count int;
BEGIN
  WITH expired AS (
    UPDATE public.bookings
    SET status = 'expired', updated_at = now()
    WHERE status IN ('pending', 'pending_admin_review')
      AND hold_expires_at IS NOT NULL
      AND hold_expires_at <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_holds() TO authenticated, service_role;

-- 3. Keep the service-task trigger from materializing tasks for expired holds.
--    (Reproduces the existing guard with 'expired' added; rest of the body is unchanged.)
CREATE OR REPLACE FUNCTION public.upsert_booking_service_tasks(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_assigned_driver_id uuid;
  v_delivery_window_start timestamptz;
  v_delivery_window_end timestamptz;
  v_pickup_window_start timestamptz;
  v_pickup_window_end timestamptz;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_booking.status IN ('pending', 'pending_admin_review', 'expired') THEN
    DELETE FROM public.booking_service_tasks WHERE booking_id = p_booking_id;
    RETURN;
  END IF;

  v_assigned_driver_id := COALESCE(v_booking.assigned_driver_id, v_booking.assigned_to);

  SELECT window_start, window_end INTO v_delivery_window_start, v_delivery_window_end
  FROM public.get_service_window(v_booking.start_date, COALESCE(v_booking.delivery_slot, 'morning'));
  SELECT window_start, window_end INTO v_pickup_window_start, v_pickup_window_end
  FROM public.get_service_window(v_booking.end_date, COALESCE(v_booking.pickup_slot, 'morning'));

  INSERT INTO public.booking_service_tasks (
    booking_id, task_type, assigned_driver_id, scheduled_for, eta_window_start, eta_window_end, status)
  VALUES (
    v_booking.id, 'delivery', v_assigned_driver_id,
    COALESCE(v_booking.delivery_scheduled_at, v_delivery_window_start),
    v_delivery_window_start, v_delivery_window_end,
    public.derive_service_task_status(v_booking.status, 'delivery'))
  ON CONFLICT (booking_id, task_type) DO UPDATE SET
    assigned_driver_id = EXCLUDED.assigned_driver_id,
    scheduled_for = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.scheduled_for ELSE booking_service_tasks.scheduled_for END,
    eta_window_start = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_start ELSE booking_service_tasks.eta_window_start END,
    eta_window_end = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_end ELSE booking_service_tasks.eta_window_end END,
    status = CASE
      WHEN EXCLUDED.status = 'cancelled' THEN 'cancelled'
      WHEN EXCLUDED.status = 'completed' THEN 'completed'
      WHEN booking_service_tasks.status = 'failed' AND EXCLUDED.status = 'en_route' THEN 'en_route'
      WHEN booking_service_tasks.status IN ('completed', 'cancelled') THEN booking_service_tasks.status
      ELSE booking_service_tasks.status END,
    updated_at = now();

  INSERT INTO public.booking_service_tasks (
    booking_id, task_type, assigned_driver_id, scheduled_for, eta_window_start, eta_window_end, status)
  VALUES (
    v_booking.id, 'pickup', v_assigned_driver_id,
    COALESCE(v_booking.pickup_scheduled_at, v_pickup_window_start),
    v_pickup_window_start, v_pickup_window_end,
    public.derive_service_task_status(v_booking.status, 'pickup'))
  ON CONFLICT (booking_id, task_type) DO UPDATE SET
    assigned_driver_id = EXCLUDED.assigned_driver_id,
    scheduled_for = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.scheduled_for ELSE booking_service_tasks.scheduled_for END,
    eta_window_start = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_start ELSE booking_service_tasks.eta_window_start END,
    eta_window_end = CASE WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_end ELSE booking_service_tasks.eta_window_end END,
    status = CASE
      WHEN EXCLUDED.status = 'cancelled' THEN 'cancelled'
      WHEN EXCLUDED.status = 'completed' THEN 'completed'
      WHEN booking_service_tasks.status IN ('completed', 'cancelled') THEN booking_service_tasks.status
      ELSE booking_service_tasks.status END,
    updated_at = now();
END;
$$;

-- 4. Schedule expiry every 15 minutes. pg_cron must be enabled (Supabase Dashboard > Database > Extensions).
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('expire-booking-holds', '*/15 * * * *', $$ SELECT public.expire_holds(); $$);
