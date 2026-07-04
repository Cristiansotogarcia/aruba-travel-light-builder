-- W8 hardening: fixes from the adversarial review.
--
-- H1: restore 'expired' to the delete-guard of upsert_booking_service_tasks.
--     W1 (20260601000002) added 'expired' so expire_holds() tears down the
--     service tasks of lapsed holds; the W3 rewrite (20260704100000) was based
--     on the original 20260315 body and silently dropped it, so expiring a
--     hold re-created fresh 'scheduled' delivery+pickup tasks (phantom tasks
--     on the driver board). 'cancelled'/'rejected' are deliberately NOT added
--     to the guard: derive_service_task_status maps both to task status
--     'cancelled', which the conflict-update branches persist so cancelled
--     work remains visible in driver history. Deleting those rows would
--     change that behaviour.
--
-- M1: defense-in-depth EXECUTE revokes (PUBLIC + anon) on the operational
--     money/receipt RPCs, and an explicit authorization guard inside
--     issue_collection_receipt (it previously relied entirely on its
--     callers). anon is revoked as well as PUBLIC because Supabase grants
--     anon an explicit EXECUTE by default; authenticated/service_role keep
--     their grants - the in-function role checks remain the primary gate.
--
-- L1: state guards - complete_collection_task rejects terminal/ineligible
--     task+booking states (INVALID_TASK_STATE), record_booking_payment
--     rejects payments against cancelled/rejected/expired bookings
--     (BOOKING_NOT_PAYABLE).
--
-- recompute_booking_payment_status (20260704140000) is intentionally NOT
-- touched.

-- ---------------------------------------------------------------------------
-- 1. H1: upsert_booking_service_tasks - restore the 'expired' delete-guard.
--    Body otherwise identical to the live definition (W3 version with the
--    ON CONFLICT proposed-row clamp).
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

  -- W1 semantics restored: expired holds lose their service tasks entirely.
  IF v_booking.status IN ('pending', 'pending_admin_review', 'expired') THEN
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
-- 2. M1: issue_collection_receipt - explicit authorization guard.
--    Same rule as complete_collection_task: Admin/SuperUser any, Driver only
--    when assigned to the task. The internal call from
--    complete_collection_task runs under the same auth.uid(), whose caller
--    already passed this exact check, so the internal path still succeeds.
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
  v_has_access BOOLEAN := FALSE;
BEGIN
  SELECT *
  INTO v_task
  FROM public.booking_service_tasks
  WHERE id = p_pickup_task_id
  AND task_type = 'pickup';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pickup task % not found', p_pickup_task_id;
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
    RAISE EXCEPTION 'You do not have permission to issue this receipt';
  END IF;

  SELECT id
  INTO v_existing_receipt_id
  FROM public.delivery_slips
  WHERE delivery_task_id = p_pickup_task_id;

  IF v_existing_receipt_id IS NOT NULL THEN
    RETURN v_existing_receipt_id;
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
-- 3. L1: complete_collection_task - state guards.
--    Rejects terminal task states and bookings outside the collectable
--    window. Body otherwise identical to the live W3 definition.
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

  IF v_task.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'INVALID_TASK_STATE: pickup task % is already %', p_task_id, v_task.status;
  END IF;

  IF v_booking.status NOT IN ('delivered', 'out_for_delivery', 'in_transit', 'confirmed') THEN
    RAISE EXCEPTION 'INVALID_TASK_STATE: booking % status % does not allow collection',
      v_booking.id, v_booking.status;
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

-- ---------------------------------------------------------------------------
-- 4. L1: record_booking_payment - reject non-payable bookings.
--    Recreated from the live definition (which already reflects
--    20260704110000..140000); only the BOOKING_NOT_PAYABLE guard is new.
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
      AND role::text IN ('Admin', 'SuperUser', 'Accounting', 'Booker')
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

-- ---------------------------------------------------------------------------
-- 5. M1: defense-in-depth EXECUTE revokes.
--    PUBLIC and anon lose EXECUTE; authenticated/service_role keep it (the
--    in-function role checks stay the primary gate).
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.issue_collection_receipt(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_collection_task(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_booking_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_booking_payments(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_booking_payment(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_credit_note(UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_assign_invoice_number(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.issue_collection_receipt(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_collection_task(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_booking_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_booking_payments(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_booking_payment(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_credit_note(UUID, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_or_assign_invoice_number(UUID) TO authenticated, service_role;
