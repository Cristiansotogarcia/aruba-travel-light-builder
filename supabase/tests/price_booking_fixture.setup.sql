-- supabase/tests/price_booking_fixture.setup.sql
--
-- Minimal schema stub so public.price_booking
-- (supabase/migrations/20261030130000_price_booking.sql, goal tlb-pos) can be
-- exercised against a real Postgres instance (see run-price-booking-tests.sh),
-- without pulling the full local Supabase stack. price_booking is
-- SECURITY INVOKER with SET search_path = '' and reads only
-- public.equipment.price_per_day / price_per_week; it calls no auth.*
-- function and touches no other table, so this fixture is smaller than
-- pos_fixture.setup.sql.
--
-- price_per_day is left nullable here (unlike the real
-- 20250704000000_create_equipment_table.sql's NOT NULL DEFAULT 0) so the
-- UNPRICED_EQUIPMENT branch, which a real row governed by that NOT NULL can
-- never actually hit, can still be exercised directly - the same kind of
-- documented, test-only liberty as pos_price_booking_stub.sql's header.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

-- Supabase projects grant anon/authenticated/service_role ALL privileges on
-- every public table by default and rely on RLS, or here on the function's
-- own REVOKE/GRANT, to restrict access - same convention as
-- special_requests_rls.setup.sql / pos_fixture.setup.sql.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  price_per_day numeric,
  price_per_week numeric
);

-- run-price-booking-tests.sh concatenates the real
-- ../migrations/20261030130000_price_booking.sql onto this file before
-- piping it to psql, so the function and its REVOKE/GRANT lines under test
-- are the actual migration, not a copy of it.
