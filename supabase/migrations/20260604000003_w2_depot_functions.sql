-- W2: depot self-pickup data layer.
-- Three SECURITY DEFINER functions for depot staff to manage pickup bookings.

-- Depot hand-over signatures are optional, so relax the delivery-completion check
-- to require only a recipient name (drivers still capture a signature via their own RPC).
ALTER TABLE public.booking_service_tasks
  DROP CONSTRAINT IF EXISTS booking_service_tasks_delivery_signature_check;
ALTER TABLE public.booking_service_tasks
  ADD CONSTRAINT booking_service_tasks_delivery_signature_check
  CHECK (task_type <> 'delivery' OR status <> 'completed' OR signed_by_name IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 1. get_depot_pickups()
--    Returns a JSON array of active pickup bookings for depot cache.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_depot_pickups()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_access boolean;
  v_result     jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff')
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'booking_id',      b.id,
        'pickup_code',     b.pickup_code,
        'customer_name',   b.customer_name,
        'customer_phone',  b.customer_phone,
        'start_date',      b.start_date,
        'end_date',        b.end_date,
        'status',          b.status,
        'items',           (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'equipment_name', bi.equipment_name,
                'quantity',       bi.quantity
              )
              ORDER BY bi.equipment_name
            ),
            '[]'::jsonb
          )
          FROM public.booking_items bi
          WHERE bi.booking_id = b.id
        ),
        'next_action', CASE
          WHEN b.delivered_at IS NULL THEN 'handover'
          ELSE 'return'
        END
      )
      ORDER BY b.start_date, b.id
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.bookings b
  WHERE b.fulfillment_method = 'pickup'
    AND b.status IN ('confirmed', 'out_for_delivery', 'in_transit', 'delivered');

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. complete_depot_handover(...)
--    Marks a pickup booking's delivery task as completed (gear handed to customer).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_depot_handover(
  p_booking_id        uuid,
  p_collected_by_name text,
  p_signature_path    text DEFAULT NULL,
  p_notes             text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_access  boolean;
  v_task_id     uuid;
  v_task_status text;
  v_booking     public.bookings%ROWTYPE;
BEGIN
  -- Role check
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff')
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Validate required param
  IF COALESCE(BTRIM(p_collected_by_name), '') = '' THEN
    RAISE EXCEPTION 'p_collected_by_name is required';
  END IF;

  -- Fetch the delivery task for this booking
  SELECT id, status
  INTO v_task_id, v_task_status
  FROM public.booking_service_tasks
  WHERE booking_id = p_booking_id
    AND task_type = 'delivery';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery task not found for booking %', p_booking_id;
  END IF;

  -- Idempotent: already completed
  IF v_task_status = 'completed' THEN
    RETURN jsonb_build_object('booking_id', p_booking_id, 'already', true);
  END IF;

  -- Fetch booking for audit old_status
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  -- Complete the delivery task
  UPDATE public.booking_service_tasks
  SET
    status        = 'completed',
    completed_at  = now(),
    signed_by_name = p_collected_by_name,
    signature_path = p_signature_path,
    notes         = p_notes,
    updated_at    = now()
  WHERE id = v_task_id;

  -- Advance the booking
  UPDATE public.bookings
  SET
    delivered_at = COALESCE(delivered_at, now()),
    status       = 'delivered',
    updated_at   = now()
  WHERE id = p_booking_id;

  -- Audit
  INSERT INTO public.booking_audit_log (
    booking_id,
    user_id,
    action,
    old_status,
    new_status,
    notes,
    metadata
  ) VALUES (
    p_booking_id,
    auth.uid(),
    'DEPOT_HANDOVER',
    v_booking.status,
    'delivered',
    p_notes,
    jsonb_build_object(
      'collected_by', p_collected_by_name,
      'signature',    p_signature_path
    )
  );

  RETURN jsonb_build_object('booking_id', p_booking_id, 'status', 'delivered');
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. complete_depot_return(...)
--    Marks a pickup booking's pickup task as completed (gear returned to depot).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_depot_return(
  p_booking_id      uuid,
  p_returned_by_name text DEFAULT NULL,
  p_condition_note  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_access  boolean;
  v_task_id     uuid;
  v_task_status text;
  v_booking     public.bookings%ROWTYPE;
BEGIN
  -- Role check
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff')
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Fetch the pickup task for this booking
  SELECT id, status
  INTO v_task_id, v_task_status
  FROM public.booking_service_tasks
  WHERE booking_id = p_booking_id
    AND task_type = 'pickup';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pickup task not found for booking %', p_booking_id;
  END IF;

  -- Idempotent: already completed
  IF v_task_status = 'completed' THEN
    RETURN jsonb_build_object('booking_id', p_booking_id, 'already', true);
  END IF;

  -- Fetch booking for audit old_status
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  -- Complete the pickup task
  UPDATE public.booking_service_tasks
  SET
    status         = 'completed',
    completed_at   = now(),
    signed_by_name = p_returned_by_name,
    notes          = p_condition_note,
    updated_at     = now()
  WHERE id = v_task_id;

  -- Finalise the booking
  UPDATE public.bookings
  SET
    picked_up_at = COALESCE(picked_up_at, now()),
    status       = 'completed',
    updated_at   = now()
  WHERE id = p_booking_id;

  -- Audit
  INSERT INTO public.booking_audit_log (
    booking_id,
    user_id,
    action,
    old_status,
    new_status,
    notes,
    metadata
  ) VALUES (
    p_booking_id,
    auth.uid(),
    'DEPOT_RETURN',
    v_booking.status,
    'completed',
    p_condition_note,
    jsonb_build_object(
      'returned_by', p_returned_by_name,
      'condition',   p_condition_note
    )
  );

  RETURN jsonb_build_object('booking_id', p_booking_id, 'status', 'completed');
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_depot_pickups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_depot_handover(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_depot_return(uuid, text, text) TO authenticated;
