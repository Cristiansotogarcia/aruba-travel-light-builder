-- 20260707120000_auto_confirm_on_paid.sql
--
-- BUG: A wizard-created order with status='pending' (awaiting payment) stays
-- 'pending' forever after being fully paid through the booking_payments ledger.
-- recompute_booking_payment_status() flips payment_status to 'paid' but never
-- transitions bookings.status, so trigger_upsert_booking_service_tasks (which
-- only fires AFTER UPDATE OF status) never runs and no delivery/pickup service
-- tasks are created. The order never reaches "Ready to Assign".
--
-- FIX: extend recompute_booking_payment_status() so that, after computing the
-- new payment_status, a booking whose current status is exactly 'pending' and
-- whose payment just became fully 'paid' is auto-advanced to 'confirmed'. That
-- status UPDATE fires the existing task-upsert trigger and materialises the two
-- service tasks (delivery + pickup).
--
-- Constraints preserved:
--   * ONE-WAY only. status is written *only* when the new payment_status='paid'
--     AND current status='pending'. Deleting a payment later (paid -> partial)
--     recomputes to 'partial', never enters this branch, and therefore never
--     downgrades a 'confirmed' booking.
--   * Only 'pending' transitions. 'pending_admin_review' still goes through human
--     review; 'cancelled'/'rejected'/'expired' are unreachable here because
--     record_booking_payment() already guards them with BOOKING_NOT_PAYABLE.
--   * The 20260704140000 ledger->invoice snapshot behaviour is retained verbatim.
--   * hold_expires_at is left untouched (stays NULL for wizard orders).
--   * A dedicated booking_audit_log row records the auto-confirmation, actor =
--     auth.uid() of the payment recorder (mirrors existing audit-insert patterns).

CREATE OR REPLACE FUNCTION public.recompute_booking_payment_status(p_booking_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_total          numeric;
  v_paid           numeric;
  v_status         text;
  v_booking_status text;
BEGIN
  SELECT total_amount, status
  INTO v_total, v_booking_status
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.booking_payments
  WHERE booking_id = p_booking_id;

  -- Mirrors src/lib/payments.ts derivePaymentStatus():
  --   paid    when sum >= total (total > 0)
  --   partial when 0 < sum < total
  --   pending otherwise (leaves 'pending')
  IF v_paid <= 0 THEN
    v_status := 'pending';
  ELSIF v_total > 0 AND v_paid >= (v_total - 0.005) THEN
    v_status := 'paid';
  ELSE
    v_status := 'partial';
  END IF;

  UPDATE public.bookings
  SET payment_status = v_status,
      updated_at     = now()
  WHERE id = p_booking_id;

  -- Fully paid via the ledger -> make sure the invoice snapshot exists so
  -- /invoice/<booking_id> works. Snapshot failure must never block payment
  -- recording, so it is contained.
  IF v_status = 'paid' THEN
    BEGIN
      PERFORM public.ensure_ledger_invoice_snapshot(p_booking_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ledger invoice snapshot failed for booking %: %', p_booking_id, SQLERRM;
    END;
  END IF;

  -- Auto-confirm: a wizard order awaiting payment (status='pending') that has
  -- just been paid in full advances to 'confirmed'. This is the ONLY place the
  -- function writes bookings.status, and it is strictly one-way (pending->
  -- confirmed on paid). It never fires for 'pending_admin_review' or any other
  -- status, and it never runs when v_status is 'partial'/'pending' (e.g. after
  -- a payment is deleted), so a confirmed booking is never downgraded.
  IF v_status = 'paid' AND v_booking_status = 'pending' THEN
    -- hold_expires_at intentionally left as-is (NULL for wizard orders).
    -- This UPDATE OF status fires trigger_upsert_booking_service_tasks, which
    -- creates the delivery + pickup service tasks.
    UPDATE public.bookings
    SET status     = 'confirmed',
        updated_at = now()
    WHERE id = p_booking_id;

    -- Dedicated audit trail for the automatic confirmation. Actor is the user
    -- who recorded the payment (auth.uid()); guest/system contexts have a NULL
    -- uid, which the column allows.
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
      'AUTO_CONFIRM_ON_PAID',
      'pending',
      'confirmed',
      'Booking auto-confirmed after full payment recorded via ledger.',
      jsonb_build_object(
        'reason', 'payment_status_paid',
        'total_amount', v_total,
        'amount_paid', v_paid
      )
    );
  END IF;

  RETURN v_status;
END;
$function$;
