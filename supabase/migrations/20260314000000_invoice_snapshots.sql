-- Invoice snapshots migration
-- Stores immutable invoice records generated from successful payments.

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1000;

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    payment_record_id UUID REFERENCES public.payment_records(id) ON DELETE SET NULL,
    invoice_number VARCHAR(32) NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT,
    rental_start_date DATE NOT NULL,
    rental_end_date DATE NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'AWG',
    items_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'paid',
    payment_processed_at TIMESTAMP WITH TIME ZONE,
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_payment_record_id
ON public.invoices(payment_record_id)
WHERE payment_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON public.invoices(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON public.invoices(customer_email);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invoices for their bookings" ON public.invoices;
CREATE POLICY "Users can view invoices for their bookings"
ON public.invoices
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.bookings
        WHERE bookings.id = invoices.booking_id
        AND (
            bookings.user_id = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('Admin', 'SuperUser', 'Booker')
            )
        )
    )
);

GRANT SELECT ON public.invoices TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_booking_invoice(
    p_booking_id UUID,
    p_payment_record_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.issue_booking_invoice(UUID, UUID) TO authenticated;
