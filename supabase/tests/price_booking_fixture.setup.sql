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

-- test_assert_refused(stmt, code): run stmt (a SELECT, e.g. one that calls
-- an RPC under test) and assert it raised an exception whose message
-- contains code. The call to stmt happens inside its own handled block;
-- test_assert only runs AFTER that block closes, with no handler left
-- watching it, so a wrongly-successful call cannot have its own raised
-- failure re-caught and misread as a pass (MF1, review finding, mutant-proven in
-- pos_rpc.test.sql: a label that carried the expected code let a
-- synthetic 'FAIL: ...CODE)' message satisfy the handler's own
-- `sqlerrm ilike '%CODE%'` check). Depends on test_assert, defined later in
-- each *.test.sql file - not resolved until this function actually runs, by
-- which point test_assert exists. See supabase/tests/README.md.
create or replace function test_assert_refused(stmt text, code text) returns void
language plpgsql as $$
declare
  refused boolean := false;
begin
  begin
    execute stmt;
  exception when others then
    refused := sqlerrm ilike '%' || code || '%';
  end;
  perform test_assert(refused, code || ' is refused');
end;
$$;
