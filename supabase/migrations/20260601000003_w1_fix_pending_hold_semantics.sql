-- W1 Phase 1 fix: only 'pending_admin_review' is a transient auto-expiring hold.
-- 'pending' means admin-approved / awaiting payment and must keep holding stock (never auto-expire).
-- Also hardens equipment_available_units against a missing/NULL stock_quantity.

-- Corrected availability: gate the hold-expiry filter on 'pending_admin_review' only; coalesce stock.
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
      COALESCE((SELECT stock_quantity FROM public.equipment WHERE id = p_equipment_id), 0) AS stock
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
    WHERE bi.equipment_id = p_equipment_id::text
      AND (p_exclude_booking_id IS NULL OR b.id <> p_exclude_booking_id)
      AND b.status IN ('pending', 'pending_admin_review', 'confirmed', 'out_for_delivery', 'in_transit', 'delivered')
      AND (b.status <> 'pending_admin_review' OR b.hold_expires_at IS NULL OR b.hold_expires_at > now())
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

-- Corrected expiry: only fresh unconfirmed requests expire; never an approved 'pending' (awaiting payment) booking.
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
    WHERE status = 'pending_admin_review'
      AND hold_expires_at IS NOT NULL
      AND hold_expires_at <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;
