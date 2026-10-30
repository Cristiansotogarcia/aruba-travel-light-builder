-- supabase/tests/pos_phase2_rpc.test.sql
--
-- Exercises public.extend_booking_rental and public.create_credit_note
-- (supabase/migrations/20261029210000_pos_phase2_counter_ops.sql, PR #109,
-- goal tlb-pos) against a real Postgres (run after pos_fixture.setup.sql +
-- the real phase 1 migration + pos_price_booking_stub.sql +
-- pos_phase2_fixture.setup.sql + the real phase 2 migration in the same
-- session; see run-pos-phase2-tests.sh). Covers exactly what Claudy asked
-- for #109: role gates, extend-with-no-stock rolls back, a refund over
-- what's creditable is refused, and get_pos_today_board's role gate
-- (Customer, Driver and anon refused; staff gets an answer).
--
-- Raises an exception, and so a non-zero psql exit code, on the first
-- failing assertion. Passing assertions print as NOTICE.
--
-- MF1 (Elby, mutant-proven, same bug as PR #108's pos_rpc.test.sql): "is
-- refused" checks set a flag INSIDE the handled block and assert on the
-- flag AFTER it. Calling test_assert(false, ...) inside a block that has
-- its own exception handler lets that handler swallow the assertion's own
-- FAIL, and a label that carries the expected code in parens lets the
-- raised 'FAIL: ...CODE)' message re-satisfy the handler's own
-- `sqlerrm ilike '%CODE%'` check, so a guard that let the call through
-- silently reported PASS.

create or replace function test_assert(cond boolean, label text) returns void
language plpgsql as $$
begin
  if not cond then
    raise exception 'FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end;
$$;

-- Fixtures: StoreStaff (allowed by both RPCs), Customer and Driver (refused
-- by both). Note: this migration's create_credit_note ALSO allows Booker,
-- same as extend_booking_rental and pos_create_sale - not separately
-- re-tested here, phase 1's role-gate tests already cover the
-- Admin/SuperUser/Booker/StoreStaff shape against the identical pattern.
insert into public.profiles (id, name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Staff Member', 'StoreStaff'),
  ('22222222-2222-2222-2222-222222222222', 'Walk-in Customer', 'Customer'),
  ('33333333-3333-3333-3333-333333333333', 'Driver Only', 'Driver');

insert into public.equipment (id, name, price_per_day, category, stock_quantity) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Extend role-gate item', 25, 'Beach', 5),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Credit note item',      25, 'Beach', 5);

-- Seed one real booking (via the real pos_create_sale) to extend-role-gate
-- test against.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
begin
  perform public.pos_create_sale(
    '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Extend Role Gate Target"}'::jsonb,
    '[{"equipment_id":"bbbbbbbb-0000-0000-0000-000000000001","quantity":1}]'::jsonb,
    '[]'::jsonb
  );
end $$;
reset role;

-- 1. Role gate: Customer is refused by extend_booking_rental.
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$
declare
  v_booking_id uuid;
  refused boolean := false;
begin
  select id into v_booking_id from public.bookings where customer_name = 'Extend Role Gate Target';
  begin
    perform public.extend_booking_rental(v_booking_id, '2026-11-06');
  exception when others then
    refused := sqlerrm ilike '%NOT_AUTHORIZED%';
  end;
  perform test_assert(refused, 'Customer is refused by extend_booking_rental');
end $$;
reset role;

-- 2. Role gate: Driver is refused by extend_booking_rental.
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$
declare
  v_booking_id uuid;
  refused boolean := false;
begin
  select id into v_booking_id from public.bookings where customer_name = 'Extend Role Gate Target';
  begin
    perform public.extend_booking_rental(v_booking_id, '2026-11-06');
  exception when others then
    refused := sqlerrm ilike '%NOT_AUTHORIZED%';
  end;
  perform test_assert(refused, 'Driver is refused by extend_booking_rental');
end $$;
reset role;

do $$
declare
  v_end_date date;
begin
  select end_date into v_end_date from public.bookings where customer_name = 'Extend Role Gate Target';
  perform test_assert(v_end_date = '2026-11-04', 'neither refused extend attempt changed the booking end date');
end $$;

-- 3. Role gate: Customer is refused by create_credit_note.
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$
declare
  v_booking_id uuid;
  refused boolean := false;
begin
  select id into v_booking_id from public.bookings where customer_name = 'Extend Role Gate Target';
  begin
    perform public.create_credit_note(v_booking_id, 10, 'test');
  exception when others then
    refused := sqlerrm ilike '%not authorized%';
  end;
  perform test_assert(refused, 'Customer is refused by create_credit_note');
end $$;
reset role;

-- 4. Role gate: Driver is refused by create_credit_note.
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$
declare
  v_booking_id uuid;
  refused boolean := false;
begin
  select id into v_booking_id from public.bookings where customer_name = 'Extend Role Gate Target';
  begin
    perform public.create_credit_note(v_booking_id, 10, 'test');
  exception when others then
    refused := sqlerrm ilike '%not authorized%';
  end;
  perform test_assert(refused, 'Driver is refused by create_credit_note');
end $$;
reset role;

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.credit_notes cn
    join public.bookings b on b.id = cn.booking_id
    where b.customer_name = 'Extend Role Gate Target';
  perform test_assert(v_count = 0, 'neither refused credit-note attempt created a row');
end $$;

-- 5. A conflict-free extend succeeds and reprices through price_booking.
--    Before 20261029210000 was fixed this crashed for every booking with
--    items ("operator does not exist: uuid = text": booking_items.equipment_id
--    is text, equipment.id is uuid), found by this suite. Stub pricing is
--    price_per_day x quantity x nights, so 1 night at 25 becomes 3 nights at 75.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
begin
  perform public.pos_create_sale(
    '{"start_date":"2026-11-20","end_date":"2026-11-21","fulfillment_method":"pickup","customer_name":"Extend Clean Target"}'::jsonb,
    '[{"equipment_id":"bbbbbbbb-0000-0000-0000-000000000001","quantity":1}]'::jsonb,
    '[]'::jsonb
  );
end $$;
do $$
declare
  v_booking_id uuid;
  v_result jsonb;
begin
  select id into v_booking_id from public.bookings where customer_name = 'Extend Clean Target';
  v_result := public.extend_booking_rental(v_booking_id, '2026-11-23');
  perform test_assert((v_result->>'additional_amount')::numeric = 50, 'a clean extend returns the repriced difference (75 - 25 = 50)');
end $$;
reset role;
do $$
declare
  v_end_date date;
  v_total numeric;
  v_audit int;
begin
  select end_date, total_amount into v_end_date, v_total from public.bookings where customer_name = 'Extend Clean Target';
  perform test_assert(v_end_date = '2026-11-23', 'a clean extend moves end_date');
  perform test_assert(v_total = 75, 'a clean extend stores the repriced total');
  select count(*) into v_audit from public.booking_audit_log l join public.bookings b on b.id = l.booking_id
    where b.customer_name = 'Extend Clean Target' and l.action = 'RENTAL_EXTENDED';
  perform test_assert(v_audit = 1, 'a clean extend writes one RENTAL_EXTENDED audit row');
end $$;

-- 6. Extend with no stock rolls back. One unit of item 02; booking A holds it
--    11-10..11-12, booking B holds it 11-13..11-15. Extending A to 11-14
--    must raise AVAILABILITY_CONFLICT and leave A's end_date and total alone.
insert into public.equipment (id, name, price_per_day, category, stock_quantity) values
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Single unit item', 25, 'Beach', 1);
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
begin
  perform public.pos_create_sale(
    '{"start_date":"2026-11-10","end_date":"2026-11-12","fulfillment_method":"pickup","customer_name":"Extend Conflict A"}'::jsonb,
    '[{"equipment_id":"bbbbbbbb-0000-0000-0000-000000000002","quantity":1}]'::jsonb,
    '[]'::jsonb
  );
  perform public.pos_create_sale(
    '{"start_date":"2026-11-13","end_date":"2026-11-15","fulfillment_method":"pickup","customer_name":"Extend Conflict B"}'::jsonb,
    '[{"equipment_id":"bbbbbbbb-0000-0000-0000-000000000002","quantity":1}]'::jsonb,
    '[]'::jsonb
  );
end $$;
do $$
declare
  v_booking_id uuid;
  refused boolean := false;
  v_sqlerrm text;
begin
  select id into v_booking_id from public.bookings where customer_name = 'Extend Conflict A';
  begin
    perform public.extend_booking_rental(v_booking_id, '2026-11-14');
  exception when others then
    v_sqlerrm := sqlerrm;
    refused := v_sqlerrm like 'AVAILABILITY_CONFLICT%';
  end;
  perform test_assert(refused, 'an extend into a fully booked range raises AVAILABILITY_CONFLICT (got: ' || coalesce(v_sqlerrm, 'no error') || ')');
end $$;
reset role;
do $$
declare
  v_end_date date;
  v_total numeric;
begin
  select end_date, total_amount into v_end_date, v_total from public.bookings where customer_name = 'Extend Conflict A';
  perform test_assert(v_end_date = '2026-11-12', 'the refused extend leaves end_date untouched');
  perform test_assert(v_total = 50, 'the refused extend leaves total_amount untouched');
end $$;

-- 7. A refund (credit note) within the booking's total is accepted.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
begin
  perform public.pos_create_sale(
    '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Credit Note Target"}'::jsonb,
    '[{"equipment_id":"bbbbbbbb-0000-0000-0000-000000000003","quantity":1}]'::jsonb,
    '[]'::jsonb
  );
end $$;
do $$
declare
  v_booking_id uuid;
  v_result jsonb;
begin
  select id into v_booking_id from public.bookings where customer_name = 'Credit Note Target';
  v_result := public.create_credit_note(v_booking_id, 20, 'Partial refund, within total');
  perform test_assert((v_result->>'amount')::numeric = 20, 'a credit note within the booking total (20 of 50) is accepted');
end $$;

-- 8. A second credit note that, combined with the first, would exceed the
--    booking total (50) is refused - over what the booking is worth to
--    credit back, not just over the single request.
do $$
declare
  v_booking_id uuid;
  refused boolean := false;
begin
  select id into v_booking_id from public.bookings where customer_name = 'Credit Note Target';
  begin
    perform public.create_credit_note(v_booking_id, 40, 'Second refund, pushes cumulative over total');
  exception when others then
    refused := sqlerrm ilike '%exceeds remaining creditable amount%';
  end;
  perform test_assert(refused, 'a credit note that would push cumulative credits over the booking total is refused');
end $$;
reset role;
do $$
declare
  v_count int;
  v_sum numeric;
begin
  select count(*), coalesce(sum(amount), 0) into v_count, v_sum
  from public.credit_notes cn join public.bookings b on b.id = cn.booking_id
  where b.customer_name = 'Credit Note Target';
  perform test_assert(v_count = 1, 'only the accepted credit note persists, the refused one left no row');
  perform test_assert(v_sum = 20, 'persisted credit total is still exactly 20');
end $$;

-- 9. get_pos_today_board role gate (MF4): Customer and Driver are refused
--    with the function's own 'Not authorized' message; anon never reaches
--    the function body at all (no EXECUTE grant), so Postgres itself
--    refuses with insufficient_privilege. None of the three needs
--    booking_service_tasks to exist - the role check raises before the
--    query that joins it ever runs.
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.get_pos_today_board();
  exception when others then
    refused := sqlerrm ilike '%not authorized%';
  end;
  perform test_assert(refused, 'Customer is refused by get_pos_today_board');
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.get_pos_today_board();
  exception when others then
    refused := sqlerrm ilike '%not authorized%';
  end;
  perform test_assert(refused, 'Driver is refused by get_pos_today_board');
end $$;
reset role;

set role anon;
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.get_pos_today_board();
  exception when insufficient_privilege then
    refused := true;
  end;
  perform test_assert(refused, 'anon is refused by get_pos_today_board (no EXECUTE grant)');
end $$;
reset role;

-- 10. Staff gets an answer: a jsonb array, containing the one active
--     booking seeded for the role-gate tests above (still 'confirmed'),
--     with no booking_service_tasks row so both done flags default false.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  v_result jsonb;
  v_booking_id uuid;
  v_entry jsonb;
begin
  v_result := public.get_pos_today_board();
  perform test_assert(jsonb_typeof(v_result) = 'array', 'staff gets a jsonb array back from get_pos_today_board');

  select id into v_booking_id from public.bookings where customer_name = 'Extend Role Gate Target';
  select e into v_entry from jsonb_array_elements(v_result) e where (e->>'booking_id')::uuid = v_booking_id;
  perform test_assert(v_entry is not null, 'the seeded confirmed booking appears on the board');
  perform test_assert(v_entry->>'outbound_done' = 'false', 'with no service-task row, outbound_done defaults false');
  perform test_assert(v_entry->>'return_done' = 'false', 'with no service-task row, return_done defaults false');
end $$;
reset role;

\echo 'extend_booking_rental / create_credit_note / get_pos_today_board RPC: assertions complete'
