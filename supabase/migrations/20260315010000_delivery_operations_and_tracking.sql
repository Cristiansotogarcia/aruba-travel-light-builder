-- Delivery operations and tracking
-- Adds operational task records, proof-of-delivery snapshots, public tracking, and
-- aligned driver RLS for assigned_driver_id.

DROP POLICY IF EXISTS "Bookings: Drivers can manage assigned bookings" ON public.bookings;
CREATE POLICY "Bookings: Drivers can manage assigned bookings"
ON public.bookings
FOR ALL
USING (
  (
    auth.uid() = assigned_to
    OR auth.uid() = assigned_driver_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'Driver'
  )
)
WITH CHECK (
  (
    auth.uid() = assigned_to
    OR auth.uid() = assigned_driver_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'Driver'
  )
);

CREATE SEQUENCE IF NOT EXISTS public.delivery_slip_number_seq START WITH 1000;

CREATE TABLE IF NOT EXISTS public.booking_service_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('delivery', 'pickup')),
  assigned_driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  eta_window_start TIMESTAMP WITH TIME ZONE,
  eta_window_end TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'en_route', 'arrived', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  arrived_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  public_tracking_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::TEXT, '-', ''),
  signed_by_name TEXT,
  signature_path TEXT,
  signature_uploaded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_service_tasks_booking_task_unique UNIQUE (booking_id, task_type),
  CONSTRAINT booking_service_tasks_delivery_signature_check CHECK (
    task_type <> 'delivery'
    OR status <> 'completed'
    OR (signed_by_name IS NOT NULL AND signature_path IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_service_tasks_public_tracking_token
ON public.booking_service_tasks(public_tracking_token);

CREATE INDEX IF NOT EXISTS idx_booking_service_tasks_booking_id
ON public.booking_service_tasks(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_service_tasks_driver_status
ON public.booking_service_tasks(assigned_driver_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_booking_service_tasks_scheduled_for
ON public.booking_service_tasks(scheduled_for);

CREATE TABLE IF NOT EXISTS public.delivery_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_task_id UUID NOT NULL UNIQUE REFERENCES public.booking_service_tasks(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  slip_number VARCHAR(32) NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  assigned_driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_driver_name TEXT,
  rental_start_date DATE NOT NULL,
  rental_end_date DATE NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  signed_by_name TEXT NOT NULL,
  signature_path TEXT NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_slips_booking_id
ON public.delivery_slips(booking_id);

CREATE INDEX IF NOT EXISTS idx_delivery_slips_issued_at
ON public.delivery_slips(issued_at DESC);

ALTER TABLE public.booking_service_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_slips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operational users can view service tasks" ON public.booking_service_tasks;
CREATE POLICY "Operational users can view service tasks"
ON public.booking_service_tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE bookings.id = booking_service_tasks.booking_id
    AND (
      bookings.user_id = auth.uid()
      OR booking_service_tasks.assigned_driver_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin', 'SuperUser', 'Booker')
      )
    )
  )
);

DROP POLICY IF EXISTS "Operational users can update service tasks" ON public.booking_service_tasks;
CREATE POLICY "Operational users can update service tasks"
ON public.booking_service_tasks
FOR UPDATE
USING (
  booking_service_tasks.assigned_driver_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'SuperUser', 'Booker')
  )
)
WITH CHECK (
  booking_service_tasks.assigned_driver_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'SuperUser', 'Booker')
  )
);

DROP POLICY IF EXISTS "Operational users can view delivery slips" ON public.delivery_slips;
CREATE POLICY "Operational users can view delivery slips"
ON public.delivery_slips
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE bookings.id = delivery_slips.booking_id
    AND (
      bookings.user_id = auth.uid()
      OR delivery_slips.assigned_driver_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin', 'SuperUser', 'Booker', 'Accounting')
      )
    )
  )
);

GRANT SELECT, UPDATE ON public.booking_service_tasks TO authenticated;
GRANT SELECT ON public.delivery_slips TO authenticated;

CREATE OR REPLACE FUNCTION public.set_booking_service_task_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_booking_service_task_updated_at ON public.booking_service_tasks;
CREATE TRIGGER trigger_set_booking_service_task_updated_at
BEFORE UPDATE ON public.booking_service_tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_booking_service_task_updated_at();

CREATE OR REPLACE FUNCTION public.get_service_window(
  p_service_date DATE,
  p_slot TEXT
)
RETURNS TABLE (
  window_start TIMESTAMP WITH TIME ZONE,
  window_end TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_start_hour INTEGER := CASE WHEN COALESCE(p_slot, 'morning') = 'afternoon' THEN 16 ELSE 8 END;
  v_end_hour INTEGER := CASE WHEN COALESCE(p_slot, 'morning') = 'afternoon' THEN 18 ELSE 10 END;
BEGIN
  IF p_service_date IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    make_timestamptz(
      EXTRACT(YEAR FROM p_service_date)::INTEGER,
      EXTRACT(MONTH FROM p_service_date)::INTEGER,
      EXTRACT(DAY FROM p_service_date)::INTEGER,
      v_start_hour,
      0,
      0,
      'America/Aruba'
    ),
    make_timestamptz(
      EXTRACT(YEAR FROM p_service_date)::INTEGER,
      EXTRACT(MONTH FROM p_service_date)::INTEGER,
      EXTRACT(DAY FROM p_service_date)::INTEGER,
      v_end_hour,
      0,
      0,
      'America/Aruba'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.derive_service_task_status(
  p_booking_status TEXT,
  p_task_type TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_task_type = 'delivery' THEN
    RETURN CASE p_booking_status
      WHEN 'out_for_delivery' THEN 'en_route'
      WHEN 'in_transit' THEN 'en_route'
      WHEN 'delivered' THEN 'completed'
      WHEN 'completed' THEN 'completed'
      WHEN 'undeliverable' THEN 'failed'
      WHEN 'cancelled' THEN 'cancelled'
      WHEN 'rejected' THEN 'cancelled'
      ELSE 'scheduled'
    END;
  END IF;

  RETURN CASE p_booking_status
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'rejected' THEN 'cancelled'
    ELSE 'scheduled'
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_booking_service_tasks(
  p_booking_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_assigned_driver_id UUID;
  v_delivery_window_start TIMESTAMP WITH TIME ZONE;
  v_delivery_window_end TIMESTAMP WITH TIME ZONE;
  v_pickup_window_start TIMESTAMP WITH TIME ZONE;
  v_pickup_window_end TIMESTAMP WITH TIME ZONE;
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
    public.derive_service_task_status(v_booking.status, 'delivery')
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
      WHEN EXCLUDED.status = 'cancelled' THEN 'cancelled'
      WHEN EXCLUDED.status = 'completed' THEN 'completed'
      WHEN booking_service_tasks.status = 'failed' AND EXCLUDED.status = 'en_route' THEN 'en_route'
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
    public.derive_service_task_status(v_booking.status, 'pickup')
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
      WHEN EXCLUDED.status = 'cancelled' THEN 'cancelled'
      WHEN EXCLUDED.status = 'completed' THEN 'completed'
      WHEN booking_service_tasks.status IN ('completed', 'cancelled') THEN booking_service_tasks.status
      ELSE booking_service_tasks.status
    END,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_upsert_booking_service_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.upsert_booking_service_tasks(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_upsert_booking_service_tasks ON public.bookings;
CREATE TRIGGER trigger_upsert_booking_service_tasks
AFTER INSERT OR UPDATE OF
  assigned_driver_id,
  assigned_to,
  start_date,
  end_date,
  delivery_slot,
  pickup_slot,
  delivery_scheduled_at,
  pickup_scheduled_at,
  status
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_upsert_booking_service_tasks();

CREATE OR REPLACE FUNCTION public.issue_delivery_slip(
  p_delivery_task_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_slip_id UUID;
  v_task public.booking_service_tasks%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_driver_name TEXT;
  v_line_items JSONB := '[]'::jsonb;
  v_slip_id UUID;
  v_slip_number VARCHAR(32);
BEGIN
  SELECT id
  INTO v_existing_slip_id
  FROM public.delivery_slips
  WHERE delivery_task_id = p_delivery_task_id;

  IF v_existing_slip_id IS NOT NULL THEN
    RETURN v_existing_slip_id;
  END IF;

  SELECT *
  INTO v_task
  FROM public.booking_service_tasks
  WHERE id = p_delivery_task_id
  AND task_type = 'delivery';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery task % not found', p_delivery_task_id;
  END IF;

  IF v_task.status <> 'completed' OR v_task.signature_path IS NULL OR v_task.signed_by_name IS NULL THEN
    RAISE EXCEPTION 'Delivery task % is not completed with proof-of-delivery', p_delivery_task_id;
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = v_task.booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found for delivery task %', v_task.booking_id, p_delivery_task_id;
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

  v_slip_number := 'DLV-' || LPAD(nextval('public.delivery_slip_number_seq')::TEXT, 6, '0');

  INSERT INTO public.delivery_slips (
    delivery_task_id,
    booking_id,
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
    metadata,
    issued_at
  )
  VALUES (
    v_task.id,
    v_booking.id,
    v_slip_number,
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
    jsonb_build_object(
      'public_tracking_token', v_task.public_tracking_token,
      'booking_status', v_booking.status
    ),
    COALESCE(v_task.completed_at, NOW())
  )
  RETURNING id INTO v_slip_id;

  RETURN v_slip_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_service_task_en_route(
  p_task_id UUID,
  p_eta_window_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_eta_window_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.booking_service_tasks%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_previous_booking_status TEXT;
  v_has_access BOOLEAN := FALSE;
BEGIN
  SELECT *
  INTO v_task
  FROM public.booking_service_tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service task % not found', p_task_id;
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = v_task.booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found for task %', v_task.booking_id, p_task_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role IN ('Admin', 'SuperUser', 'Booker')
      OR (role = 'Driver' AND id = v_task.assigned_driver_id)
    )
  )
  INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'You do not have permission to update this task';
  END IF;

  v_previous_booking_status := v_booking.status;

  UPDATE public.booking_service_tasks
  SET
    status = 'en_route',
    started_at = COALESCE(started_at, NOW()),
    eta_window_start = COALESCE(p_eta_window_start, eta_window_start),
    eta_window_end = COALESCE(p_eta_window_end, eta_window_end),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_task_id;

  IF v_task.task_type = 'delivery' THEN
    UPDATE public.bookings
    SET
      status = 'out_for_delivery',
      updated_at = NOW()
    WHERE id = v_booking.id;
  END IF;

  INSERT INTO public.booking_audit_log (
    booking_id,
    user_id,
    action,
    old_status,
    new_status,
    notes,
    metadata
  ) VALUES (
    v_booking.id,
    auth.uid(),
    CASE WHEN v_task.task_type = 'delivery' THEN 'START_DELIVERY' ELSE 'START_PICKUP' END,
    v_previous_booking_status,
    CASE WHEN v_task.task_type = 'delivery' THEN 'out_for_delivery' ELSE v_previous_booking_status END,
    p_notes,
    jsonb_build_object(
      'task_id', v_task.id,
      'task_type', v_task.task_type,
      'eta_window_start', p_eta_window_start,
      'eta_window_end', p_eta_window_end
    )
  );

  RETURN jsonb_build_object(
    'booking_id', v_booking.id,
    'task_id', v_task.id,
    'task_type', v_task.task_type,
    'tracking_token', v_task.public_tracking_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_service_task_arrived(
  p_task_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.booking_service_tasks%ROWTYPE;
  v_has_access BOOLEAN := FALSE;
BEGIN
  SELECT *
  INTO v_task
  FROM public.booking_service_tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service task % not found', p_task_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role IN ('Admin', 'SuperUser', 'Booker')
      OR (role = 'Driver' AND id = v_task.assigned_driver_id)
    )
  )
  INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'You do not have permission to update this task';
  END IF;

  UPDATE public.booking_service_tasks
  SET
    status = 'arrived',
    arrived_at = COALESCE(arrived_at, NOW()),
    updated_at = NOW()
  WHERE id = p_task_id;

  INSERT INTO public.booking_audit_log (
    booking_id,
    user_id,
    action,
    old_status,
    new_status,
    metadata
  ) VALUES (
    v_task.booking_id,
    auth.uid(),
    CASE WHEN v_task.task_type = 'delivery' THEN 'ARRIVE_DELIVERY' ELSE 'ARRIVE_PICKUP' END,
    NULL,
    NULL,
    jsonb_build_object(
      'task_id', v_task.id,
      'task_type', v_task.task_type
    )
  );

  RETURN jsonb_build_object(
    'booking_id', v_task.booking_id,
    'task_id', v_task.id,
    'task_type', v_task.task_type
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_service_task_eta(
  p_task_id UUID,
  p_eta_window_start TIMESTAMP WITH TIME ZONE,
  p_eta_window_end TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.booking_service_tasks%ROWTYPE;
  v_has_access BOOLEAN := FALSE;
BEGIN
  SELECT *
  INTO v_task
  FROM public.booking_service_tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service task % not found', p_task_id;
  END IF;

  IF p_eta_window_start IS NULL OR p_eta_window_end IS NULL OR p_eta_window_end <= p_eta_window_start THEN
    RAISE EXCEPTION 'ETA end time must be after the start time';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role IN ('Admin', 'SuperUser', 'Booker')
      OR (role = 'Driver' AND id = v_task.assigned_driver_id)
    )
  )
  INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'You do not have permission to update this task';
  END IF;

  UPDATE public.booking_service_tasks
  SET
    eta_window_start = p_eta_window_start,
    eta_window_end = p_eta_window_end,
    updated_at = NOW()
  WHERE id = p_task_id;

  INSERT INTO public.booking_audit_log (
    booking_id,
    user_id,
    action,
    old_status,
    new_status,
    metadata
  ) VALUES (
    v_task.booking_id,
    auth.uid(),
    'UPDATE_TASK_ETA',
    NULL,
    NULL,
    jsonb_build_object(
      'task_id', v_task.id,
      'task_type', v_task.task_type,
      'eta_window_start', p_eta_window_start,
      'eta_window_end', p_eta_window_end
    )
  );

  RETURN jsonb_build_object(
    'booking_id', v_task.booking_id,
    'task_id', v_task.id,
    'task_type', v_task.task_type,
    'tracking_token', v_task.public_tracking_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_delivery_task(
  p_task_id UUID,
  p_failure_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.booking_service_tasks%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_has_access BOOLEAN := FALSE;
BEGIN
  IF COALESCE(BTRIM(p_failure_reason), '') = '' THEN
    RAISE EXCEPTION 'A failure reason is required';
  END IF;

  SELECT *
  INTO v_task
  FROM public.booking_service_tasks
  WHERE id = p_task_id
  AND task_type = 'delivery';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery task % not found', p_task_id;
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = v_task.booking_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role IN ('Admin', 'SuperUser', 'Booker')
      OR (role = 'Driver' AND id = v_task.assigned_driver_id)
    )
  )
  INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'You do not have permission to update this task';
  END IF;

  UPDATE public.booking_service_tasks
  SET
    status = 'failed',
    failed_at = NOW(),
    failure_reason = p_failure_reason,
    updated_at = NOW()
  WHERE id = p_task_id;

  UPDATE public.bookings
  SET
    status = 'undeliverable',
    delivery_failure_reason = p_failure_reason,
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
    'FAIL_DELIVERY',
    v_booking.status,
    'undeliverable',
    p_failure_reason,
    jsonb_build_object(
      'task_id', v_task.id,
      'task_type', v_task.task_type
    )
  );

  RETURN jsonb_build_object(
    'booking_id', v_task.booking_id,
    'task_id', v_task.id,
    'task_type', v_task.task_type,
    'tracking_token', v_task.public_tracking_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_delivery_task(
  p_task_id UUID,
  p_signed_by_name TEXT,
  p_signature_path TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.booking_service_tasks%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_has_access BOOLEAN := FALSE;
  v_slip_id UUID;
BEGIN
  IF COALESCE(BTRIM(p_signed_by_name), '') = '' THEN
    RAISE EXCEPTION 'Recipient name is required';
  END IF;

  IF COALESCE(BTRIM(p_signature_path), '') = '' THEN
    RAISE EXCEPTION 'Signature path is required';
  END IF;

  SELECT *
  INTO v_task
  FROM public.booking_service_tasks
  WHERE id = p_task_id
  AND task_type = 'delivery';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery task % not found', p_task_id;
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = v_task.booking_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role IN ('Admin', 'SuperUser', 'Booker')
      OR (role = 'Driver' AND id = v_task.assigned_driver_id)
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
    failure_reason = NULL,
    updated_at = NOW()
  WHERE id = p_task_id;

  UPDATE public.bookings
  SET
    status = 'delivered',
    delivered_at = COALESCE(delivered_at, NOW()),
    delivery_failure_reason = NULL,
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
    'COMPLETE_DELIVERY',
    v_booking.status,
    'delivered',
    p_notes,
    jsonb_build_object(
      'task_id', v_task.id,
      'task_type', v_task.task_type,
      'signed_by_name', p_signed_by_name,
      'signature_path', p_signature_path
    )
  );

  v_slip_id := public.issue_delivery_slip(p_task_id);

  RETURN jsonb_build_object(
    'booking_id', v_task.booking_id,
    'task_id', v_task.id,
    'task_type', v_task.task_type,
    'slip_id', v_slip_id,
    'tracking_token', v_task.public_tracking_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_pickup_task(
  p_task_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.booking_service_tasks%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_has_access BOOLEAN := FALSE;
BEGIN
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

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role IN ('Admin', 'SuperUser', 'Booker')
      OR (role = 'Driver' AND id = v_task.assigned_driver_id)
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
    notes = p_notes,
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
    'COMPLETE_PICKUP',
    v_booking.status,
    'completed',
    p_notes,
    jsonb_build_object(
      'task_id', v_task.id,
      'task_type', v_task.task_type
    )
  );

  RETURN jsonb_build_object(
    'booking_id', v_task.booking_id,
    'task_id', v_task.id,
    'task_type', v_task.task_type,
    'tracking_token', v_task.public_tracking_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_tracking_details(
  p_tracking_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.booking_service_tasks%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_driver_name TEXT;
  v_slip_id UUID;
BEGIN
  SELECT *
  INTO v_task
  FROM public.booking_service_tasks
  WHERE public_tracking_token = p_tracking_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = v_task.booking_id;

  SELECT name
  INTO v_driver_name
  FROM public.profiles
  WHERE id = v_task.assigned_driver_id;

  SELECT id
  INTO v_slip_id
  FROM public.delivery_slips
  WHERE delivery_task_id = v_task.id;

  RETURN jsonb_build_object(
    'task_id', v_task.id,
    'task_type', v_task.task_type,
    'task_status', v_task.status,
    'scheduled_for', v_task.scheduled_for,
    'eta_window_start', v_task.eta_window_start,
    'eta_window_end', v_task.eta_window_end,
    'started_at', v_task.started_at,
    'arrived_at', v_task.arrived_at,
    'completed_at', v_task.completed_at,
    'failure_reason', v_task.failure_reason,
    'signed_by_name', v_task.signed_by_name,
    'slip_id', v_slip_id,
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'customer_name', v_booking.customer_name,
      'start_date', v_booking.start_date,
      'end_date', v_booking.end_date,
      'status', v_booking.status,
      'delivery_slot', v_booking.delivery_slot,
      'pickup_slot', v_booking.pickup_slot
    ),
    'driver', jsonb_build_object(
      'id', v_task.assigned_driver_id,
      'name', v_driver_name
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_booking_service_tasks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_delivery_slip(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_service_task_en_route(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_service_task_arrived(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_service_task_eta(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_delivery_task(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_delivery_task(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_pickup_task(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tracking_details(TEXT) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Delivery proofs read" ON storage.objects;
CREATE POLICY "Delivery proofs read"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'delivery-proofs'
  AND (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'SuperUser', 'Booker', 'Accounting')
    )
    OR EXISTS (
      SELECT 1
      FROM public.delivery_slips
      JOIN public.bookings ON bookings.id = delivery_slips.booking_id
      WHERE delivery_slips.signature_path = storage.objects.name
      AND (
        bookings.user_id = auth.uid()
        OR delivery_slips.assigned_driver_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Delivery proofs write" ON storage.objects;
CREATE POLICY "Delivery proofs write"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'SuperUser', 'Booker', 'Driver')
  )
);

DO $$
DECLARE
  v_booking RECORD;
BEGIN
  FOR v_booking IN
    SELECT id
    FROM public.bookings
    WHERE status NOT IN ('pending', 'pending_admin_review')
  LOOP
    PERFORM public.upsert_booking_service_tasks(v_booking.id);
  END LOOP;
END;
$$;
