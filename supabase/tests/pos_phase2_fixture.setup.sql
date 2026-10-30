-- supabase/tests/pos_phase2_fixture.setup.sql
--
-- Additional structural fixture for extend_booking_rental and
-- create_credit_note (supabase/migrations/20261029210000_pos_phase2_counter_ops.sql,
-- PR #109, goal tlb-pos), layered on top of pos_fixture.setup.sql (same
-- scoped-fixture convention; see that file's header). Run after
-- pos_fixture.setup.sql + the real phase 1 migration + pos_price_booking_stub.sql
-- and before the real phase 2 migration; see run-pos-phase2-tests.sh.
--
-- Supplies only what extend_booking_rental, create_credit_note and
-- get_pos_today_board touch that phase 1's fixture doesn't already have:
-- booking_audit_log (both RPCs write an audit row), credit_notes +
-- invoice_counters + next_document_number (create_credit_note), and a
-- minimal booking_service_tasks (get_pos_today_board's outbound_done/
-- return_done LEFT JOINs). Columns are a scoped subset of the real table
-- (20260315010000_delivery_operations_and_tracking.sql) - only id,
-- booking_id, task_type and status, which is all the RPC reads; the
-- refusal-path tests (Customer/Driver/anon) never reach this table at all
-- (the role check raises before the query runs), so this table only matters
-- for the staff-success case, where it is left empty - get_pos_today_board's
-- COALESCE(..., 'scheduled') default makes a missing task row equivalent to
-- "not completed yet".

-- Verbatim column shape from 20250122000001_enhance_booking_system.sql.
CREATE TABLE public.booking_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verbatim from 20260704120000_w5_invoicing_accounting.sql.
CREATE TABLE public.invoice_counters (
    counter_key TEXT NOT NULL,
    year INTEGER NOT NULL,
    last_value INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (counter_key, year)
);

CREATE OR REPLACE FUNCTION public.next_document_number(p_counter_key TEXT, p_year INTEGER)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    INSERT INTO public.invoice_counters AS c (counter_key, year, last_value)
    VALUES (p_counter_key, p_year, 1)
    ON CONFLICT (counter_key, year)
    DO UPDATE SET last_value = c.last_value + 1
    RETURNING last_value;
$$;

-- Verbatim column shape from 20260704120000_w5_invoicing_accounting.sql.
CREATE TABLE public.credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    credit_number VARCHAR(32) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Scoped subset of 20260315010000_delivery_operations_and_tracking.sql -
-- only the columns get_pos_today_board reads (id, booking_id, task_type,
-- status). See header note: left empty, only the staff-success case ever
-- queries it.
CREATE TABLE public.booking_service_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('delivery', 'pickup')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'en_route', 'arrived', 'completed', 'failed', 'cancelled')),
  CONSTRAINT booking_service_tasks_booking_task_unique UNIQUE (booking_id, task_type)
);
