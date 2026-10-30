-- POS Phase 2 (counter ops). Plan: PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md
-- lines 49-62 (Buzz Nest, goal tlb-pos). Adds:
--   1. get_pos_today_board(): the Today board data (Store Pickups / Store
--      Returns due, Deliveries / Collections out) for StoreStaff at the
--      counter. No RPC today gives StoreStaff a view across BOTH fulfillment
--      methods (get_depot_pickups is pickup-only and RLS on
--      booking_service_tasks/bookings does not list StoreStaff), so this is
--      a new, narrow RPC rather than a change to get_depot_pickups's existing
--      contract (Depot.tsx self-pickup board keeps behaving exactly as today).
--   2. extend_booking_rental(): no existing RPC extends a booking's end date,
--      so this is a new SECURITY DEFINER RPC. Stock locks/re-check are reused
--      verbatim from create_booking_as_staff / pos_create_sale (deterministic
--      equipment row lock, then an equipment_available_units re-check over the
--      WHOLE new range, excluding the booking's own hold via
--      p_exclude_booking_id). No client price or total is ever accepted.
--   3. create_credit_note role gate widened to add Booker/StoreStaff, the
--      same pattern phase 1 used to widen record_booking_payment, so counter
--      staff can issue the "refund via credit note" action the plan asks
--      for through the EXISTING RPC rather than a new one. Recreated
--      faithfully from 20260704120000_w5_invoicing_accounting.sql with ONLY
--      the role list changed.
--
-- Additive only: no existing migration is edited, RLS is left exactly as it
-- is otherwise.

-- ---------------------------------------------------------------------------
-- 1. get_pos_today_board(): all active bookings (both fulfillment methods)
--    with their outbound/return task completion flags. The "today" grouping
--    into the four buckets (Store Pickup / Store Return / Delivery /
--    Collection, per plan wording) is done client-side against this list
--    (src/lib/pos/todayBoard.ts), the same way Depot.tsx already fetches all
--    active pickups and filters/groups them in the browser rather than in
--    SQL — keeps the grouping unit-testable without a live date dependency.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pos_today_board()
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
        'booking_id',        b.id,
        'pickup_code',       b.pickup_code,
        'customer_name',     b.customer_name,
        'customer_phone',    b.customer_phone,
        'customer_email',    b.customer_email,
        'start_date',        b.start_date,
        'end_date',          b.end_date,
        'status',            b.status,
        'fulfillment_method', b.fulfillment_method,
        'total_amount',      b.total_amount,
        'items',             (
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
        -- outbound leg: Store Pickup hand-over (complete_depot_handover) or
        -- the driver's Delivery task; return leg: Store Return check-in
        -- (complete_depot_return) or the driver's Collection task. Both task
        -- rows always exist (trigger_upsert_booking_service_tasks upserts
        -- them on every booking insert/update), so a missing row only means
        -- "not completed yet".
        'outbound_done', COALESCE(ot.status, 'scheduled') = 'completed',
        'return_done',   COALESCE(rt.status, 'scheduled') = 'completed'
      )
      ORDER BY b.start_date, b.id
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.bookings b
  LEFT JOIN public.booking_service_tasks ot ON ot.booking_id = b.id AND ot.task_type = 'delivery'
  LEFT JOIN public.booking_service_tasks rt ON rt.booking_id = b.id AND rt.task_type = 'pickup'
  WHERE b.status IN ('confirmed', 'out_for_delivery', 'in_transit', 'delivered');

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pos_today_board() TO authenticated;
REVOKE ALL ON FUNCTION public.get_pos_today_board() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pos_today_board() FROM anon;

-- ---------------------------------------------------------------------------
-- 2. extend_booking_rental(): push a booking's end_date out, re-checking
--    stock and repricing server-side. No p_items/p_total/p_price parameter
--    exists on this function at all, so there is no shape for a client price
--    to even be sent in.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.extend_booking_rental(
  p_booking_id uuid,
  p_new_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_role     public.app_role;
  v_booking  public.bookings%ROWTYPE;
  v_item     RECORD;
  v_available int;
  v_conflicts jsonb := '[]'::jsonb;
  v_items     jsonb;
  v_priced    jsonb;
  v_new_total numeric;
  v_old_total numeric;
  v_additional numeric;
  v_payment_status text;
BEGIN
  -- Role gate: same four roles as pos_create_sale / create_booking_as_staff.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('Admin', 'SuperUser', 'Booker', 'StoreStaff') THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: extend_booking_rental requires Admin, SuperUser, Booker or StoreStaff';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  IF v_booking.status IN ('cancelled', 'rejected', 'expired', 'completed', 'undeliverable') THEN
    RAISE EXCEPTION 'BOOKING_NOT_EXTENDABLE: booking % is %', p_booking_id, v_booking.status;
  END IF;

  IF p_new_end_date IS NULL OR p_new_end_date <= v_booking.end_date THEN
    RAISE EXCEPTION 'INVALID_EXTENSION: new end date must be after the current end date (%)', v_booking.end_date;
  END IF;

  -- Serialize concurrent extensions/bookings for the same equipment via row
  -- locks in a deterministic order (reused from create_booking_as_staff),
  -- then re-check availability over the WHOLE new range, excluding this
  -- booking's own hold so it never conflicts with itself.
  PERFORM 1
  FROM public.equipment e
  WHERE e.id IN (
    SELECT bi.equipment_id::uuid FROM public.booking_items bi WHERE bi.booking_id = p_booking_id
  )
  ORDER BY e.id
  FOR UPDATE;

  FOR v_item IN
    SELECT bi.equipment_id::uuid AS equipment_id, bi.quantity AS quantity
    FROM public.booking_items bi
    WHERE bi.booking_id = p_booking_id
  LOOP
    v_available := public.equipment_available_units(
      v_item.equipment_id, v_booking.start_date, p_new_end_date, p_booking_id);
    IF v_available < v_item.quantity THEN
      v_conflicts := v_conflicts || jsonb_build_object(
        'equipment_id', v_item.equipment_id,
        'requested', v_item.quantity,
        'available', v_available);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_conflicts) > 0 THEN
    RAISE EXCEPTION 'AVAILABILITY_CONFLICT: %', v_conflicts::text;
  END IF;

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('equipment_id', bi.equipment_id, 'quantity', bi.quantity)),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.booking_items bi
  WHERE bi.booking_id = p_booking_id;

  v_old_total := v_booking.total_amount;

  -- -------------------------------------------------------------------
  -- Priced by the shared seam public.price_booking
  -- (20261030130000_price_booking.sql). This is the ONE place
  -- extend_booking_rental reads a total; no pricing formula is duplicated here.
  v_priced := public.price_booking(
    jsonb_build_object(
      'start_date', v_booking.start_date,
      'end_date', p_new_end_date,
      'delivery_slot', v_booking.delivery_slot,
      'pickup_slot', v_booking.pickup_slot,
      'fulfillment_method', v_booking.fulfillment_method
    ),
    v_items
  );
  v_new_total := (v_priced->>'total')::numeric;
  -- -------------------------------------------------------------------
  IF v_new_total IS NULL THEN
    RAISE EXCEPTION 'PRICING_UNAVAILABLE: price_booking did not return a total';
  END IF;

  -- A longer rental can reprice lower (4 days daily + delivery fee costs more
  -- than a 5-day weekly rate). Extending never lowers what the booking costs:
  -- the total stays where it is and nothing extra is charged
  -- and the stored total is never lowered.
  v_new_total := GREATEST(v_new_total, v_old_total);

  v_additional := ROUND(v_new_total - v_old_total, 2);

  UPDATE public.bookings
  SET end_date = p_new_end_date,
      total_amount = v_new_total,
      updated_at = now()
  WHERE id = p_booking_id;

  -- trigger_upsert_booking_service_tasks (fired by the end_date UPDATE above)
  -- re-syncs the pickup/return task's scheduled_for window on its own.
  v_payment_status := public.recompute_booking_payment_status(p_booking_id);

  INSERT INTO public.booking_audit_log (
    booking_id, user_id, action, old_status, new_status, notes, metadata
  ) VALUES (
    p_booking_id, v_uid, 'RENTAL_EXTENDED', v_booking.status, v_booking.status,
    format('Extended from %s to %s', v_booking.end_date, p_new_end_date),
    jsonb_build_object(
      'old_end_date', v_booking.end_date,
      'new_end_date', p_new_end_date,
      'old_total', v_old_total,
      'new_total', v_new_total,
      'additional_amount', v_additional
    )
  );

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'old_end_date', v_booking.end_date,
    'new_end_date', p_new_end_date,
    'old_total', v_old_total,
    'new_total', v_new_total,
    'additional_amount', v_additional,
    'payment_status', v_payment_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.extend_booking_rental(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.extend_booking_rental(uuid, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.extend_booking_rental(uuid, date) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. create_credit_note: widen the role gate to Booker/StoreStaff so the
--    counter can issue the plan's "refund via credit note" action through
--    the EXISTING RPC. Recreated faithfully from
--    20260704120000_w5_invoicing_accounting.sql with ONLY the role list
--    changed; amount/reason validation and the per-booking advisory lock are
--    untouched. The credit_notes SELECT RLS policy (Accounting/Admin/
--    SuperUser) is left as-is — counter staff issue notes through this RPC
--    and read its jsonb return, they don't need to list the table.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_credit_note(
    p_booking_id UUID,
    p_amount DECIMAL,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_booking_total DECIMAL(10,2);
    v_already_credited DECIMAL(10,2);
    v_credit_number VARCHAR(32);
    v_note public.credit_notes%ROWTYPE;
BEGIN
    SELECT role::text INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role IS NULL OR v_role NOT IN ('Accounting', 'Admin', 'SuperUser', 'Booker', 'StoreStaff') THEN
        RAISE EXCEPTION 'Not authorized to issue credit notes';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Credit note amount must be greater than zero';
    END IF;

    IF COALESCE(TRIM(p_reason), '') = '' THEN
        RAISE EXCEPTION 'Credit note reason is required';
    END IF;

    -- Serialize per booking so concurrent notes cannot jointly exceed the total.
    PERFORM pg_advisory_xact_lock(hashtextextended('credit_note:' || p_booking_id::text, 0));

    SELECT total_amount INTO v_booking_total
    FROM public.bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking % not found', p_booking_id;
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_already_credited
    FROM public.credit_notes
    WHERE booking_id = p_booking_id;

    IF p_amount > v_booking_total - v_already_credited THEN
        RAISE EXCEPTION 'Credit note amount % exceeds remaining creditable amount % for booking %',
            ROUND(p_amount, 2), ROUND(GREATEST(v_booking_total - v_already_credited, 0), 2), p_booking_id
            USING ERRCODE = 'check_violation';
    END IF;

    v_credit_number := 'CN-' || EXTRACT(YEAR FROM NOW())::int || '-' ||
                       LPAD(public.next_document_number('credit_note', EXTRACT(YEAR FROM NOW())::int)::text, 4, '0');

    INSERT INTO public.credit_notes (booking_id, credit_number, amount, reason, created_by)
    VALUES (p_booking_id, v_credit_number, ROUND(p_amount, 2), TRIM(p_reason), auth.uid())
    RETURNING * INTO v_note;

    RETURN jsonb_build_object(
        'id', v_note.id,
        'booking_id', v_note.booking_id,
        'credit_number', v_note.credit_number,
        'amount', v_note.amount,
        'reason', v_note.reason,
        'created_by', v_note.created_by,
        'created_at', v_note.created_at
    );
END;
$$;

-- Grant unchanged (already authenticated-only); restated for clarity.
REVOKE ALL ON FUNCTION public.create_credit_note(UUID, DECIMAL, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_credit_note(UUID, DECIMAL, TEXT) TO authenticated;
