-- supabase/tests/pos_fixture.setup.sql
--
-- Structural fixture for pos_create_sale (PLANS/TLB_POS_PHASE1_CONTRACT.md,
-- goal tlb-pos), run against a throwaway vanilla Postgres (postgres:16-alpine)
-- via run-pos-tests.sh. Same convention as
-- scripts/tests/split-fulfillment/bootstrap.sql: an explicitly limited
-- structural fixture, not a production dump or a full migration replay. A
-- full replay of all 75 migrations in filename order was tried and abandoned
-- (see run-pos-tests.sh header) - this repo's migration filenames are not
-- reliably chronological (e.g. 20250122000001_enhance_booking_system.sql
-- ALTERs public.equipment, which the migration folder's own
-- 20250704000000_create_equipment_table.sql only creates later), so a
-- literal replay in filename order fails on real, pre-existing ordering
-- inconsistencies that have nothing to do with pos_create_sale.
--
-- Supplies only the FINAL-state tables/columns/functions pos_create_sale,
-- record_booking_payment, equipment_available_units and
-- generate_pickup_code actually touch: auth.uid() (same shim as
-- special_requests_rls.setup.sql), app_role enum (all 7 values, collapsed
-- from init + 3 later ALTER TYPE ADD VALUE migrations), profiles, equipment,
-- equipment_category, system_settings, bookings, booking_items and
-- booking_payments (pre-POS shape; the POS-only columns - card method,
-- tendered, change_due, channel - are added by the REAL
-- 20261029203000_pos_phase1_counter_sale.sql migration, concatenated after
-- this file by run-pos-tests.sh, not duplicated here). It intentionally
-- omits every unrelated table/policy (accounting, delivery ops, blog,
-- special_requests, etc).
--
-- equipment_available_units and generate_pickup_code are copied verbatim
-- from their real, final-state source migrations
-- (20260601000003_w1_fix_pending_hold_semantics.sql and
-- 20260604000000_w2_pickup_schema.sql) so the RPC is exercised against its
-- actual dependencies, not a re-implementation.
--
-- recompute_booking_payment_status (20260707120000_auto_confirm_on_paid.sql,
-- the latest of its 3 definitions) is also copied verbatim. Its 'paid'
-- branch calls public.ensure_ledger_invoice_snapshot(), which this fixture
-- does not define; that call is wrapped in the real function's own
-- `EXCEPTION WHEN OTHERS` and only logs a WARNING, so it is harmless here.
-- Its auto-confirm branch only fires when the booking's CURRENT status is
-- 'pending'; pos_create_sale always inserts bookings as 'confirmed', so that
-- branch (and its booking_audit_log insert) never executes in these tests
-- and booking_audit_log is correctly omitted.

create schema if not exists auth;

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.email() returns text
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.email', true), '')
$$;

create or replace function auth.role() returns text
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- Collapsed from init_tables.sql's 4 original values plus the 3 later
-- ALTER TYPE ... ADD VALUE migrations (Accounting, StoreStaff, Customer).
CREATE TYPE public.app_role AS ENUM (
  'SuperUser', 'Admin', 'Booker', 'Driver', 'Accounting', 'StoreStaff', 'Customer'
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'Booker',
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  needs_password_change boolean DEFAULT false,
  is_deactivated boolean DEFAULT false
);

-- supabase/migrations/20260313000000_accounting_fields.sql (final shape).
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_active)
VALUES ('turnaround_buffer_days', '0', 'number', 'Global fallback equipment turnaround buffer', TRUE);

-- supabase/migrations/20250627202800_add_category_to_equipment.sql (final shape).
CREATE TABLE public.equipment_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- supabase/migrations/20260601000000_w1_inventory_availability.sql adds this.
ALTER TABLE public.equipment_category
  ADD COLUMN turnaround_buffer_days INTEGER;

-- supabase/migrations/20250704000000_create_equipment_table.sql plus the
-- category_id column from 20250627202800 and reserved_quantity/
-- low_stock_threshold from 20250122000001 (neither of the latter two is read
-- by pos_create_sale/equipment_available_units; included only because
-- real-world rows carry them, harmless NULLs here).
CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_per_day numeric NOT NULL DEFAULT 0,
  category text NOT NULL,
  category_id UUID REFERENCES public.equipment_category(id) ON DELETE SET NULL,
  images text[] DEFAULT '{}',
  stock_quantity integer NOT NULL DEFAULT 0,
  reserved_quantity integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  availability boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  image_url text,
  availability_status text DEFAULT 'Available',
  featured boolean NOT NULL DEFAULT false
);

-- Pre-POS bookings shape: init_tables.sql plus every later ADD COLUMN this
-- RPC chain (pos_create_sale, equipment_available_units,
-- generate_pickup_code, recompute_booking_payment_status) actually reads or
-- writes. The CHECK constraint is the final one from
-- 20260601000000_w1_inventory_availability.sql.
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  room_number text,
  customer_comment text,
  delivery_slot VARCHAR(20) CHECK (delivery_slot IN ('morning', 'afternoon')),
  pickup_slot TEXT CHECK (pickup_slot IN ('morning', 'afternoon')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'pending_admin_review', 'confirmed', 'out_for_delivery', 'in_transit',
      'delivered', 'completed', 'cancelled', 'rejected', 'undeliverable', 'expired'
    )),
  payment_status VARCHAR(50) DEFAULT 'pending',
  total_amount numeric NOT NULL,
  hold_expires_at TIMESTAMPTZ,
  fulfillment_method TEXT NOT NULL DEFAULT 'delivery'
    CHECK (fulfillment_method IN ('delivery', 'pickup')),
  pickup_code TEXT,
  assigned_to uuid REFERENCES public.profiles(id),
  delivery_failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_bookings_pickup_code
  ON public.bookings(pickup_code) WHERE pickup_code IS NOT NULL;

-- booking_items.equipment_id is TEXT, not uuid: equipment_available_units
-- (20260601000003) compares it with `bi.equipment_id = p_equipment_id::text`,
-- matching the real post-20250819032516_fix_booking_items_fk.sql shape.
CREATE TABLE public.booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  equipment_id text,
  equipment_name text NOT NULL,
  equipment_price numeric NOT NULL,
  quantity integer NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Pre-POS booking_payments shape (20260704110000_create_booking_payments.sql).
-- The POS-only columns/constraints (card method, tendered, change_due,
-- channel) are added by the real pos_phase1 migration, concatenated next by
-- run-pos-tests.sh.
CREATE TABLE public.booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL CHECK (method IN ('bank_transfer', 'cash', 'payment_link', 'other')),
  reference text,
  note text,
  recorded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Verbatim from supabase/migrations/20260601000003_w1_fix_pending_hold_semantics.sql
-- (the final of its 2 CREATE OR REPLACE definitions).
CREATE OR REPLACE FUNCTION public.equipment_available_units(
  p_equipment_id uuid,
  p_start date,
  p_end date,
  p_exclude_booking_id uuid DEFAULT NULL
)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH cfg AS (
    SELECT
      COALESCE(
        (SELECT ec.turnaround_buffer_days
           FROM public.equipment e
           LEFT JOIN public.equipment_category ec ON ec.id = e.category_id
          WHERE e.id = p_equipment_id),
        (SELECT setting_value::int FROM public.system_settings
          WHERE setting_key = 'turnaround_buffer_days' AND is_active),
        0
      ) AS buffer_days,
      COALESCE((SELECT stock_quantity FROM public.equipment WHERE id = p_equipment_id), 0) AS stock
  ),
  days AS (
    SELECT gs::date AS day
    FROM cfg,
    LATERAL generate_series(p_start, (p_end + (cfg.buffer_days || ' days')::interval)::date, interval '1 day') gs
  ),
  committed AS (
    SELECT b.start_date, b.end_date, bi.quantity
    FROM public.bookings b
    JOIN public.booking_items bi ON bi.booking_id = b.id
    WHERE bi.equipment_id = p_equipment_id::text
      AND (p_exclude_booking_id IS NULL OR b.id <> p_exclude_booking_id)
      AND b.status IN ('pending', 'pending_admin_review', 'confirmed', 'out_for_delivery', 'in_transit', 'delivered')
      AND (b.status <> 'pending_admin_review' OR b.hold_expires_at IS NULL OR b.hold_expires_at > now())
  ),
  per_day AS (
    SELECT d.day, COALESCE(SUM(c.quantity), 0) AS committed_qty
    FROM days d
    LEFT JOIN committed c
      ON d.day BETWEEN c.start_date AND (c.end_date + ((SELECT buffer_days FROM cfg) || ' days')::interval)::date
    GROUP BY d.day
  )
  SELECT GREATEST(0, (SELECT stock FROM cfg) - COALESCE(MAX(committed_qty), 0))::int
  FROM per_day;
$$;

-- Verbatim from supabase/migrations/20260604000000_w2_pickup_schema.sql.
CREATE OR REPLACE FUNCTION public.generate_pickup_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_i int;
BEGIN
  LOOP
    v_code := 'TLA-';
    FOR v_i IN 1..4 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE pickup_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

-- Verbatim from supabase/migrations/20260707120000_auto_confirm_on_paid.sql
-- (the latest of its 3 CREATE OR REPLACE definitions). See header note on
-- why its ensure_ledger_invoice_snapshot call and auto-confirm branch are
-- both inert in these tests.
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

  IF v_status = 'paid' THEN
    BEGIN
      PERFORM public.ensure_ledger_invoice_snapshot(p_booking_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ledger invoice snapshot failed for booking %: %', p_booking_id, SQLERRM;
    END;
  END IF;

  IF v_status = 'paid' AND v_booking_status = 'pending' THEN
    UPDATE public.bookings
    SET status     = 'confirmed',
        updated_at = now()
    WHERE id = p_booking_id;

    INSERT INTO public.booking_audit_log (
      booking_id, user_id, action, old_status, new_status, notes, metadata
    ) VALUES (
      p_booking_id, auth.uid(), 'AUTO_CONFIRM_ON_PAID', 'pending', 'confirmed',
      'Booking auto-confirmed after full payment recorded via ledger.',
      jsonb_build_object('reason', 'payment_status_paid', 'total_amount', v_total, 'amount_paid', v_paid)
    );
  END IF;

  RETURN v_status;
END;
$function$;
