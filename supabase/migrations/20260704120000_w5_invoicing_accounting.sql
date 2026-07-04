-- W5: Invoicing & accounting depth
-- 1. Configurable turnover-tax display settings (BBO/BAZV/BAVP) - default 0 (no change until owner opts in).
-- 2. Sequential invoice numbers (INV-YYYY-NNNN) assigned idempotently per booking.
-- 3. Credit notes (CN-YYYY-NNNN) with validation + RLS for Accounting/Admin/SuperUser.

-- ---------------------------------------------------------------------------
-- 1) Tax settings (tax-INCLUSIVE display: totals charged to customers do not change;
--    the invoice view shows "includes X% tax: $Y" extracted from the total).
-- ---------------------------------------------------------------------------
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_active)
VALUES
  ('invoice_tax_rate_percent', '0', 'decimal',
   'Combined BBO/BAZV/BAVP turnover tax rate (%) shown on invoices. 0 hides the tax line. Display is tax-inclusive: the booking total is unchanged and the embedded tax is broken out.',
   true),
  ('invoice_tax_label', 'BBO/BAZV/BAVP', 'string',
   'Label used for the tax line on invoices.',
   true)
ON CONFLICT (setting_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Sequential document counters (per document kind, per year).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_counters (
    counter_key TEXT NOT NULL,
    year INTEGER NOT NULL,
    last_value INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (counter_key, year)
);

ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
-- No policies: counters are only touched inside SECURITY DEFINER functions.

-- Persist the assigned invoice number on the booking itself so the number is
-- stable for the booking's lifetime, independent of the invoices snapshot.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(32);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_invoice_number
ON public.bookings(invoice_number)
WHERE invoice_number IS NOT NULL;

-- Atomically increment and return the next counter value for (key, year).
-- Single-statement upsert => race-safe under concurrency.
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

REVOKE EXECUTE ON FUNCTION public.next_document_number(TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_document_number(TEXT, INTEGER) FROM anon, authenticated;

-- Idempotently return the booking's invoice number, assigning INV-YYYY-NNNN on
-- first call. If the payments subsystem already issued an invoice snapshot with
-- its own number for this booking, that number is adopted instead of minting a
-- second, competing one.
CREATE OR REPLACE FUNCTION public.get_or_assign_invoice_number(p_booking_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_number TEXT;
    v_snapshot_number TEXT;
BEGIN
    SELECT role::text INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role IS NULL OR v_role NOT IN ('Admin', 'SuperUser', 'Accounting', 'Booker') THEN
        RAISE EXCEPTION 'Not authorized to assign invoice numbers';
    END IF;

    -- Serialize per-booking so concurrent callers cannot double-assign.
    PERFORM pg_advisory_xact_lock(hashtextextended('invoice_number:' || p_booking_id::text, 0));

    SELECT invoice_number INTO v_number
    FROM public.bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking % not found', p_booking_id;
    END IF;

    IF v_number IS NOT NULL THEN
        RETURN v_number;
    END IF;

    -- Adopt an existing invoice-snapshot number rather than minting a rival.
    SELECT invoice_number INTO v_snapshot_number
    FROM public.invoices
    WHERE booking_id = p_booking_id
      AND COALESCE(TRIM(invoice_number), '') <> '';

    IF v_snapshot_number IS NOT NULL THEN
        v_number := v_snapshot_number;
    ELSE
        v_number := 'INV-' || EXTRACT(YEAR FROM NOW())::int || '-' ||
                    LPAD(public.next_document_number('invoice', EXTRACT(YEAR FROM NOW())::int)::text, 4, '0');
    END IF;

    UPDATE public.bookings
    SET invoice_number = v_number
    WHERE id = p_booking_id;

    RETURN v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_assign_invoice_number(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Credit notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    credit_number VARCHAR(32) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_booking_id ON public.credit_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_created_at ON public.credit_notes(created_at DESC);

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accounting roles can view credit notes" ON public.credit_notes;
CREATE POLICY "Accounting roles can view credit notes"
ON public.credit_notes
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Accounting', 'Admin', 'SuperUser')
    )
);
-- Writes happen only through the SECURITY DEFINER RPC below; no INSERT/UPDATE/DELETE policies.

GRANT SELECT ON public.credit_notes TO authenticated;

-- Issue a credit note against a booking. Validates the amount against the
-- booking total minus credits already issued (a booking can never be credited
-- past its total across multiple notes).
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
    IF v_role IS NULL OR v_role NOT IN ('Accounting', 'Admin', 'SuperUser') THEN
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

GRANT EXECUTE ON FUNCTION public.create_credit_note(UUID, DECIMAL, TEXT) TO authenticated;
