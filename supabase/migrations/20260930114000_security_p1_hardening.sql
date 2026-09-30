-- =====================================================================
-- SECURITY P1: close the anon/over-broad write paths found by the
-- 2026-09-30 live DB audit (RESEARCH/TLB_LIVE_DB_SECURITY_AUDIT_2026-09-30.md).
--
-- Verified against the live schema and the app code before writing:
--   - payment_records: the only client-side INSERT is the admin
--     BookingsList "confirm payment received" flow (staff screens). The
--     role set mirrors record_booking_payment's existing in-body guard.
--   - stock_movements: no client-side writes anywhere in src/; rows are
--     written by SECURITY DEFINER functions, which bypass RLS. The
--     anon-insertable policy has no legitimate caller.
--   - admin_notifications: checkout's client-side insert is wrapped in
--     try/catch (fails soft) AND the live AFTER INSERT trigger
--     trigger_new_reservation_notification already creates the
--     reservation notification server-side, so closing anon inserts
--     does not break public checkout. Staff inserts (useNotifications
--     createNotification) keep working via the new staff policy.
--   - component_visibility: "Allow authenticated users to update" let
--     ANY signed-in user rewrite admin UI permissions; the existing
--     SuperUser ALL policy remains the management path. Reads unchanged.
--   - user_temp_passwords: the own-row UPDATE had no WITH CHECK; the
--     only client write is ChangePasswordModal setting is_used=true on
--     the user's own row, which still passes.
--   - Function EXECUTE: checkout calls create_booking_with_items
--     (SECURITY DEFINER, verified live), so inner calls to
--     generate_pickup_code etc. run as the function owner and are
--     unaffected by these revokes. No edge function calls any function
--     revoked here (grep over supabase/functions). Functions with
--     client-side staff callers keep authenticated EXECUTE and rely on
--     in-body role guards; issue_booking_invoice was the only such
--     function without one, added below. get_or_assign_invoice_number,
--     record_booking_payment, create_credit_note, delete_booking_payment
--     and create_booking_as_staff already carry in-body role guards
--     (read from the live bodies).
--
-- equipment_sub_category (RLS off live) is deliberately NOT repeated
-- here: the existing repo migration 20260801160000 already enables RLS
-- and creates its policies, and is part of the same pending-apply batch.
--
-- Idempotent: safe to re-run.
-- =====================================================================

-- 1. payment_records: staff-only inserts --------------------------------
DROP POLICY IF EXISTS "System can insert payment records" ON public.payment_records;
CREATE POLICY "Staff can insert payment records" ON public.payment_records
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid()
  AND role IN ('Admin', 'SuperUser', 'Accounting', 'Booker')
));

-- 2. stock_movements: no client writes; definer functions bypass RLS ----
DROP POLICY IF EXISTS "System can insert stock movements" ON public.stock_movements;

-- 3. admin_notifications: staff-only inserts ----------------------------
-- Role set mirrors the table's existing SELECT/UPDATE policies.
DROP POLICY IF EXISTS "System can insert notifications" ON public.admin_notifications;
CREATE POLICY "Staff can insert notifications" ON public.admin_notifications
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid()
  AND role IN ('Admin', 'SuperUser', 'Booker')
));

-- 4. component_visibility: drop the any-authenticated UPDATE ------------
DROP POLICY IF EXISTS "Allow authenticated users to update component visibility" ON public.component_visibility;

-- 5. user_temp_passwords: own-row UPDATE gets a WITH CHECK --------------
DROP POLICY IF EXISTS "Users can update their own temp password" ON public.user_temp_passwords; -- ggignore
CREATE POLICY "Users can update their own temp password" ON public.user_temp_passwords -- ggignore
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. issue_booking_invoice: add the staff guard the other money
--    functions already have. Body is the live definition (read
--    2026-09-30) plus the guard block; nothing else changed.
--    auth.uid() IS NULL = trusted server-side context (service role),
--    same convention as the existing guards and triggers.
CREATE OR REPLACE FUNCTION public.issue_booking_invoice(p_booking_id uuid, p_payment_record_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_existing_invoice_id UUID;
    v_booking public.bookings%ROWTYPE;
    v_payment public.payment_records%ROWTYPE;
    v_line_items JSONB := '[]'::jsonb;
    v_items_total DECIMAL(10,2) := 0;
    v_delivery_fee DECIMAL(10,2) := 0;
    v_invoice_id UUID;
    v_invoice_number VARCHAR(32);
BEGIN
    IF auth.uid() IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role::text IN ('Admin', 'SuperUser', 'Accounting', 'Booker')
    ) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    SELECT id
    INTO v_existing_invoice_id
    FROM public.invoices
    WHERE booking_id = p_booking_id;

    IF v_existing_invoice_id IS NOT NULL THEN
        RETURN v_existing_invoice_id;
    END IF;

    SELECT *
    INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking % not found', p_booking_id;
    END IF;

    IF p_payment_record_id IS NOT NULL THEN
        SELECT *
        INTO v_payment
        FROM public.payment_records
        WHERE id = p_payment_record_id
        AND booking_id = p_booking_id;
    ELSE
        SELECT *
        INTO v_payment
        FROM public.payment_records
        WHERE booking_id = p_booking_id
        AND status IN ('paid', 'completed')
        ORDER BY COALESCE(processed_at, created_at) DESC, created_at DESC
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paid payment record not found for booking %', p_booking_id;
    END IF;

    SELECT
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'equipment_id', equipment_id,
                    'equipment_name', equipment_name,
                    'quantity', quantity,
                    'equipment_price', equipment_price,
                    'subtotal', subtotal
                )
                ORDER BY equipment_name, id
            ),
            '[]'::jsonb
        ),
        COALESCE(SUM(subtotal), 0)
    INTO v_line_items, v_items_total
    FROM public.booking_items
    WHERE booking_id = p_booking_id;

    v_delivery_fee := GREATEST(COALESCE(v_booking.total_amount, 0) - COALESCE(v_items_total, 0), 0);
    v_invoice_number := 'TLA-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0');

    INSERT INTO public.invoices (
        booking_id,
        payment_record_id,
        invoice_number,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        rental_start_date,
        rental_end_date,
        currency_code,
        items_total,
        delivery_fee,
        total_amount,
        payment_status,
        payment_processed_at,
        line_items,
        metadata,
        issued_at
    ) VALUES (
        v_booking.id,
        v_payment.id,
        v_invoice_number,
        v_booking.customer_name,
        v_booking.customer_email,
        v_booking.customer_phone,
        v_booking.customer_address,
        v_booking.start_date::date,
        v_booking.end_date::date,
        COALESCE(v_payment.currency_code, v_payment.currency, 'AWG'),
        COALESCE(v_items_total, 0),
        COALESCE(v_delivery_fee, 0),
        v_booking.total_amount,
        CASE
            WHEN v_payment.status IN ('paid', 'completed') THEN 'paid'
            ELSE v_payment.status
        END,
        COALESCE(v_payment.processed_at, NOW()),
        v_line_items,
        jsonb_build_object(
            'payment_record_id', v_payment.id,
            'payment_method', v_payment.payment_method,
            'card_last_four', v_payment.card_last_four,
            'gross_amount', COALESCE(v_payment.gross_amount, v_payment.amount),
            'processor_fee_amount', v_payment.processor_fee_amount,
            'net_amount', v_payment.net_amount,
            'statement_reference', v_payment.statement_reference,
            'stripe_payment_intent_id', v_payment.stripe_payment_intent_id,
            'stripe_session_id', v_payment.stripe_session_id
        ),
        COALESCE(v_payment.processed_at, NOW())
    )
    RETURNING id INTO v_invoice_id;

    RETURN v_invoice_id;
END;
$function$;

-- 7. EXECUTE hygiene ----------------------------------------------------
-- 7a. No client callers at all (grep over src/): nothing outside the
--     database needs to call these. service_role is re-granted so any
--     server-side job keeps working; the owner (postgres) is unaffected.
REVOKE EXECUTE ON FUNCTION public.issue_delivery_slip(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_delivery_slip(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_temp_passwords() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_temp_passwords() TO service_role;
REVOKE EXECUTE ON FUNCTION public.expire_holds() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_holds() TO service_role;
REVOKE EXECUTE ON FUNCTION public.upsert_booking_service_tasks(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_booking_service_tasks(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.generate_pickup_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_pickup_code() TO service_role;

-- 7b. Staff-called from the client (must keep authenticated EXECUTE;
--     each has an in-body role guard): close only the anon door.
REVOKE EXECUTE ON FUNCTION public.issue_booking_invoice(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_booking_payment(uuid, numeric, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_credit_note(uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_booking_payment(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_booking_as_staff(jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_or_assign_invoice_number(uuid) FROM anon;
-- NOTE: revoking anon alone does not close PUBLIC-inherited EXECUTE, so
-- also revoke PUBLIC and restore the two roles that legitimately call:
REVOKE EXECUTE ON FUNCTION public.issue_booking_invoice(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_booking_invoice(uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.record_booking_payment(uuid, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_booking_payment(uuid, numeric, text, text, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.create_credit_note(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_credit_note(uuid, numeric, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.delete_booking_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_booking_payment(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.create_booking_as_staff(jsonb, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking_as_staff(jsonb, jsonb, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_or_assign_invoice_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_assign_invoice_number(uuid) TO authenticated, service_role;

-- Trigger functions (handle_new_user, create_new_reservation_notification,
-- trigger_upsert_booking_service_tasks, update_delivery_slot_counter,
-- create_booking_audit_log) are RETURNS trigger and cannot be invoked
-- through PostgREST at all; their EXECUTE grants are unreachable and are
-- left alone to keep this file reviewable.
