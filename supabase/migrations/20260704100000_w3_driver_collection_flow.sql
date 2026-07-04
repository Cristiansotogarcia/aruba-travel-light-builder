-- W3: driver end-of-rental COLLECTION flow.
-- Mirrors the delivery proof pattern for pickup (collection) tasks:
--   1. delivery_slips gains a `type` column ('delivery' | 'collection') and
--      `condition_notes` so one table stores both delivery slips and
--      collection receipts.
--   2. issue_collection_receipt(p_pickup_task_id) mirrors issue_delivery_slip.
--   3. complete_collection_task(...) mirrors complete_delivery_task: completes
--      the pickup task with a customer signature, records equipment condition
--      on return, finalises the booking (status -> 'completed'), writes the
--      collection receipt row, and logs an audit entry.
--
-- The legacy complete_pickup_task RPC is left untouched for backward
-- compatibility (the driver UI now uses complete_collection_task).

-- ---------------------------------------------------------------------------
-- 1. delivery_slips: type + condition_notes
-- ---------------------------------------------------------------------------
ALTER TABLE public.delivery_slips
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'delivery';

ALTER TABLE public.delivery_slips
  DROP CONSTRAINT IF EXISTS delivery_slips_type_check;
ALTER TABLE public.delivery_slips
  ADD CONSTRAINT delivery_slips_type_check
  CHECK (type IN ('delivery', 'collection'));

ALTER TABLE public.delivery_slips
  ADD COLUMN IF NOT EXISTS condition_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_delivery_slips_type
ON public.delivery_slips(type);

-- ---------------------------------------------------------------------------
-- 2. Fix a latent bug in upsert_booking_service_tasks that breaks BOTH
--    complete_delivery_task and the new collection flow.
--
--    PostgreSQL evaluates CHECK constraints on the proposed INSERT row of an
--    INSERT ... ON CONFLICT DO UPDATE *before* taking the update path. The
--    upsert proposes a delivery-task row with status 'completed' and NULL
--    signed_by_name whenever a booking moves to 'delivered'/'completed',
--    which violates booking_service_tasks_delivery_signature_check even
--    though the existing (signed) row would have been the one updated.
--    Verified against the live DB inside a rollback block on 2026-07-04.
--
--    Fix: clamp the *proposed* delivery row to 'scheduled' when the derived
--    status is 'completed', and drive the conflict-update CASE from plpgsql
--    variables instead of EXCLUDED.status so the update path still lands on
--    the real derived status.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_booking_service_tasks(
  p_booking_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_assigned_driver_id UUID;
  v_delivery_window_start TIMESTAMP WITH TIME ZONE;
  v_delivery_window_end TIMESTAMP WITH TIME ZONE;
  v_pickup_window_start TIMESTAMP WITH TIME ZONE;
  v_pickup_window_end TIMESTAMP WITH TIME ZONE;
  v_delivery_status TEXT;
  v_pickup_status TEXT;
BEGIN
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_booking.status IN ('pending', 'pending_admin_review') THEN
    DELETE FROM public.booking_service_tasks
    WHERE booking_id = p_booking_id;
    RETURN;
  END IF;

  v_assigned_driver_id := COALESCE(v_booking.assigned_driver_id, v_booking.assigned_to);
  v_delivery_status := public.derive_service_task_status(v_booking.status, 'delivery');
  v_pickup_status := public.derive_service_task_status(v_booking.status, 'pickup');

  SELECT window_start, window_end
  INTO v_delivery_window_start, v_delivery_window_end
  FROM public.get_service_window(v_booking.start_date, COALESCE(v_booking.delivery_slot, 'morning'));

  SELECT window_start, window_end
  INTO v_pickup_window_start, v_pickup_window_end
  FROM public.get_service_window(v_booking.end_date, COALESCE(v_booking.pickup_slot, 'morning'));

  INSERT INTO public.booking_service_tasks (
    booking_id,
    task_type,
    assigned_driver_id,
    scheduled_for,
    eta_window_start,
    eta_window_end,
    status
  )
  VALUES (
    v_booking.id,
    'delivery',
    v_assigned_driver_id,
    COALESCE(v_booking.delivery_scheduled_at, v_delivery_window_start),
    v_delivery_window_start,
    v_delivery_window_end,
    -- A brand-new delivery task can never be born 'completed': it has no
    -- signature yet, and proposed ON CONFLICT rows are CHECK-constrained
    -- too. The update path below still applies the real derived status to
    -- existing rows.
    CASE WHEN v_delivery_status = 'completed' THEN 'scheduled' ELSE v_delivery_status END
  )
  ON CONFLICT (booking_id, task_type) DO UPDATE
  SET
    assigned_driver_id = EXCLUDED.assigned_driver_id,
    scheduled_for = CASE
      WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.scheduled_for
      ELSE booking_service_tasks.scheduled_for
    END,
    eta_window_start = CASE
      WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_start
      ELSE booking_service_tasks.eta_window_start
    END,
    eta_window_end = CASE
      WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_end
      ELSE booking_service_tasks.eta_window_end
    END,
    status = CASE
      WHEN v_delivery_status = 'cancelled' THEN 'cancelled'
      WHEN v_delivery_status = 'completed'
        AND booking_service_tasks.signed_by_name IS NOT NULL THEN 'completed'
      WHEN booking_service_tasks.status = 'failed' AND v_delivery_status = 'en_route' THEN 'en_route'
      WHEN booking_service_tasks.status IN ('completed', 'cancelled') THEN booking_service_tasks.status
      ELSE booking_service_tasks.status
    END,
    updated_at = NOW();

  INSERT INTO public.booking_service_tasks (
    booking_id,
    task_type,
    assigned_driver_id,
    scheduled_for,
    eta_window_start,
    eta_window_end,
    status
  )
  VALUES (
    v_booking.id,
    'pickup',
    v_assigned_driver_id,
    COALESCE(v_booking.pickup_scheduled_at, v_pickup_window_start),
    v_pickup_window_start,
    v_pickup_window_end,
    v_pickup_status
  )
  ON CONFLICT (booking_id, task_type) DO UPDATE
  SET
    assigned_driver_id = EXCLUDED.assigned_driver_id,
    scheduled_for = CASE
      WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.scheduled_for
      ELSE booking_service_tasks.scheduled_for
    END,
    eta_window_start = CASE
      WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_start
      ELSE booking_service_tasks.eta_window_start
    END,
    eta_window_end = CASE
      WHEN booking_service_tasks.status = 'scheduled' THEN EXCLUDED.eta_window_end
      ELSE booking_service_tasks.eta_window_end
    END,
    status = CASE
      WHEN v_pickup_status = 'cancelled' THEN 'cancelled'
      WHEN v_pickup_status = 'completed' THEN 'completed'
      WHEN booking_service_tasks.status IN ('completed', 'cancelled') THEN booking_service_tasks.status
      ELSE booking_service_tasks.status
    END,
    updated_at = NOW();
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. issue_collection_receipt(p_pickup_task_id)
--    Idempotent: returns the existing receipt id when one was already issued
--    for the task. Receipt numbers share the delivery slip sequence but use
--    the COL- prefix.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_collection_receipt(
  p_pickup_task_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing_receipt_id UUID;
  v_task public.booking_service_tasks%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_driver_name TEXT;
  v_line_items JSONB := '[]'::jsonb;
  v_receipt_id UUID;
  v_receipt_number VARCHAR(32);
BEGIN
  SELECT id
  INTO v_existing_receipt_id
  FROM public.delivery_slips
  WHERE delivery_task_id = p_pickup_task_id;

  IF v_existing_receipt_id IS NOT NULL THEN
    RETURN v_existing_receipt_id;
  END IF;

  SELECT *
  INTO v_task
  FROM public.booking_service_tasks
  WHERE id = p_pickup_task_id
  AND task_type = 'pickup';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pickup task % not found', p_pickup_task_id;
  END IF;

  IF v_task.status <> 'completed' OR v_task.signature_path IS NULL OR v_task.signed_by_name IS NULL THEN
    RAISE EXCEPTION 'Pickup task % is not completed with proof-of-collection', p_pickup_task_id;
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = v_task.booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found for pickup task %', v_task.booking_id, p_pickup_task_id;
  END IF;

  SELECT name
  INTO v_driver_name
  FROM public.profiles
  WHERE id = v_task.assigned_driver_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'equipment_id', equipment_id,
        'equipment_name', equipment_name,
        'equipment_price', equipment_price,
        'quantity', quantity,
        'subtotal', subtotal
      )
      ORDER BY equipment_name, id
    ),
    '[]'::jsonb
  )
  INTO v_line_items
  FROM public.booking_items
  WHERE booking_id = v_booking.id;

  v_receipt_number := 'COL-' || LPAD(nextval('public.delivery_slip_number_seq')::TEXT, 6, '0');

  INSERT INTO public.delivery_slips (
    delivery_task_id,
    booking_id,
    type,
    slip_number,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    assigned_driver_id,
    assigned_driver_name,
    rental_start_date,
    rental_end_date,
    delivered_at,
    signed_by_name,
    signature_path,
    line_items,
    total_amount,
    notes,
    condition_notes,
    metadata,
    issued_at
  )
  VALUES (
    v_task.id,
    v_booking.id,
    'collection',
    v_receipt_number,
    v_booking.customer_name,
    v_booking.customer_email,
    v_booking.customer_phone,
    v_booking.customer_address,
    v_task.assigned_driver_id,
    v_driver_name,
    v_booking.start_date,
    v_booking.end_date,
    COALESCE(v_task.completed_at, NOW()),
    v_task.signed_by_name,
    v_task.signature_path,
    v_line_items,
    COALESCE(v_booking.total_amount, 0),
    v_task.notes,
    NULLIF(BTRIM(COALESCE(v_task.metadata->>'condition_notes', '')), ''),
    jsonb_build_object(
      'public_tracking_token', v_task.public_tracking_token,
      'booking_status', v_booking.status,
      'record_type', 'collection'
    ),
    COALESCE(v_task.completed_at, NOW())
  )
  RETURNING id INTO v_receipt_id;

  RETURN v_receipt_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. complete_collection_task(...)
--    Driver-facing RPC that completes a pickup task with signed
--    proof-of-collection and equipment condition notes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_collection_task(
  p_task_id UUID,
  p_signed_by_name TEXT,
  p_signature_path TEXT,
  p_condition_notes TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.booking_service_tasks%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_has_access BOOLEAN := FALSE;
  v_receipt_id UUID;
BEGIN
  IF COALESCE(BTRIM(p_signed_by_name), '') = '' THEN
    RAISE EXCEPTION 'Collected-by name is required';
  END IF;

  IF COALESCE(BTRIM(p_signature_path), '') = '' THEN
    RAISE EXCEPTION 'Signature path is required';
  END IF;

  SELECT *
  INTO v_task
  FROM public.booking_service_tasks
  WHERE id = p_task_id
  AND task_type = 'pickup';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pickup task % not found', p_task_id;
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = v_task.booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found for pickup task %', v_task.booking_id, p_task_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role::text IN ('Admin', 'SuperUser')
      OR (role::text = 'Driver' AND id = v_task.assigned_driver_id)
    )
  )
  INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'You do not have permission to complete this task';
  END IF;

  UPDATE public.booking_service_tasks
  SET
    status = 'completed',
    completed_at = COALESCE(completed_at, NOW()),
    signed_by_name = p_signed_by_name,
    signature_path = p_signature_path,
    signature_uploaded_at = NOW(),
    notes = p_notes,
    metadata = metadata || jsonb_strip_nulls(jsonb_build_object(
      'condition_notes', NULLIF(BTRIM(COALESCE(p_condition_notes, '')), '')
    )),
    failure_reason = NULL,
    updated_at = NOW()
  WHERE id = p_task_id;

  UPDATE public.bookings
  SET
    status = 'completed',
    picked_up_at = COALESCE(picked_up_at, NOW()),
    updated_at = NOW()
  WHERE id = v_task.booking_id;

  INSERT INTO public.booking_audit_log (
    booking_id,
    user_id,
    action,
    old_status,
    new_status,
    notes,
    metadata
  ) VALUES (
    v_task.booking_id,
    auth.uid(),
    'COMPLETE_COLLECTION',
    v_booking.status,
    'completed',
    COALESCE(p_condition_notes, p_notes),
    jsonb_build_object(
      'task_id', v_task.id,
      'task_type', v_task.task_type,
      'signed_by_name', p_signed_by_name,
      'signature_path', p_signature_path,
      'condition_notes', p_condition_notes,
      'notes', p_notes
    )
  );

  v_receipt_id := public.issue_collection_receipt(p_task_id);

  RETURN jsonb_build_object(
    'booking_id', v_task.booking_id,
    'task_id', v_task.id,
    'task_type', v_task.task_type,
    'slip_id', v_receipt_id,
    'tracking_token', v_task.public_tracking_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_collection_receipt(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_collection_task(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
