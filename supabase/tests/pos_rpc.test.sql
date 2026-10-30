-- supabase/tests/pos_rpc.test.sql
--
-- Exercises public.pos_create_sale (supabase/migrations/20261029203000_pos_phase1_counter_sale.sql,
-- PLANS/TLB_POS_PHASE1_CONTRACT.md, goal tlb-pos) against a real Postgres
-- (run after pos_fixture.setup.sql + the real migration + pos_price_booking_stub.sql
-- in the same session; see run-pos-tests.sh). Covers exactly the contract's
-- "Tests (Kev)" RPC list: role gate (Customer/Driver refused), a forged
-- price/total is ignored or refused, a stock conflict rolls back the booking
-- AND the payments, overpay is refused, a card without a reference is
-- refused, cash change is right, a partial payment gives partial, no payment
-- gives pending.
--
-- Raises an exception, and so a non-zero psql exit code, on the first
-- failing assertion. Passing assertions print as NOTICE.
--
-- Session-level set_config (is_local = false) is used throughout so a claim
-- survives across the separate autocommitted statements/DO blocks this
-- script runs as (same pattern as special_requests_rls.test.sql).

create or replace function test_assert(cond boolean, label text) returns void
language plpgsql as $$
begin
  if not cond then
    raise exception 'FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end;
$$;

-- Fixtures: StoreStaff (allowed), Customer and Driver (both refused).
insert into public.profiles (id, name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Staff Member', 'StoreStaff'),
  ('22222222-2222-2222-2222-222222222222', 'Walk-in Customer', 'Customer'),
  ('33333333-3333-3333-3333-333333333333', 'Driver Only', 'Driver');

-- One equipment row per scenario group, each with its own stock, so the
-- groups below don't interfere with each other's availability counts.
-- price_per_day 25, 2-night bookings throughout -> price_booking stub gives
-- 25 * quantity * 2 nights.
insert into public.equipment (id, name, price_per_day, category, stock_quantity) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Role gate item',    25, 'Beach', 5),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Pricing item',      25, 'Beach', 5),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Stock conflict item', 25, 'Beach', 1),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Payments item',     25, 'Beach', 5),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'Duplicate item row', 25, 'Beach', 5),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'Quantity guard row', 25, 'Beach', 5);

-- 2-night rental throughout: total = 25 * quantity * 2.
--
-- MF1 (Elby, mutant-proven): "is refused" checks set a flag INSIDE the
-- handled block and assert on the flag AFTER it. Calling
-- test_assert(false, ...) inside a block that has its own exception handler
-- lets that handler swallow the assertion's own FAIL -- and since the label
-- used to carry the expected code in parens, e.g. "...(NOT_AUTHORIZED)",
-- the raised 'FAIL: ...NOT_AUTHORIZED)' message itself satisfied the
-- `sqlerrm ilike '%NOT_AUTHORIZED%'` check in the exception branch, so a
-- guard that let the call through silently reported PASS. Labels below no
-- longer carry the code so a FAIL can never re-satisfy its own check.
-- 1. Role gate: Customer is refused.
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Role Test"}'::jsonb,
      '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000001","quantity":1}]'::jsonb,
      '[]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%NOT_AUTHORIZED%';
  end;
  perform test_assert(refused, 'Customer is refused by pos_create_sale');
end $$;
reset role;

-- 2. Role gate: Driver is refused.
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Role Test"}'::jsonb,
      '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000001","quantity":1}]'::jsonb,
      '[]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%NOT_AUTHORIZED%';
  end;
  perform test_assert(refused, 'Driver is refused by pos_create_sale');
end $$;
reset role;

do $$
declare
  staff_attempts int;
begin
  select count(*) into staff_attempts from public.bookings where customer_name = 'Role Test';
  perform test_assert(staff_attempts = 0, 'neither refused role left a booking behind');
end $$;

-- 3. A forged total on the booking is refused (PRICING_IS_SERVER_DERIVED).
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Forged Total","total_amount":1}'::jsonb,
      '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000002","quantity":1}]'::jsonb,
      '[]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%PRICING_IS_SERVER_DERIVED%';
  end;
  perform test_assert(refused, 'a forged booking total_amount is refused');
end $$;
reset role;

-- 4. A forged item price is refused the same way.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Forged Item Price"}'::jsonb,
      '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000002","quantity":1,"unit_price":1}]'::jsonb,
      '[]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%PRICING_IS_SERVER_DERIVED%';
  end;
  perform test_assert(refused, 'a forged item unit_price is refused');
end $$;
reset role;

do $$
declare
  forged_attempts int;
begin
  select count(*) into forged_attempts
  from public.bookings where customer_name in ('Forged Total', 'Forged Item Price');
  perform test_assert(forged_attempts = 0, 'no booking was created from either forged-price attempt');
end $$;

-- 5. Stock conflict: the item has 1 unit of stock. Sell it to one customer,
--    then try to sell 1 more unit to a second customer for the overlapping
--    dates; the conflict is refused and the second sale leaves no trace.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
begin
  perform public.pos_create_sale(
    '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"First Buyer"}'::jsonb,
    '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000003","quantity":1}]'::jsonb,
    '[{"amount":50,"method":"cash","tendered":50}]'::jsonb
  );
end $$;
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Second Buyer (conflict)"}'::jsonb,
      '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000003","quantity":1}]'::jsonb,
      '[{"amount":50,"method":"cash","tendered":50}]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%AVAILABILITY_CONFLICT%';
  end;
  perform test_assert(refused, 'a stock conflict is refused');
end $$;
reset role;
do $$
declare
  conflict_booking_count int;
  conflict_payment_count int;
begin
  select count(*) into conflict_booking_count from public.bookings where customer_name = 'Second Buyer (conflict)';
  select count(*) into conflict_payment_count
  from public.booking_payments bp join public.bookings b on b.id = bp.booking_id
  where b.customer_name = 'Second Buyer (conflict)';
  perform test_assert(conflict_booking_count = 0, 'a stock conflict rolls back the booking (no row persists)');
  perform test_assert(conflict_payment_count = 0, 'a stock conflict rolls back the payments (no row persists)');
end $$;

-- 6. A payment failure AFTER the booking+items insert (overpay, detected
--    mid-payments-loop) rolls back the whole transaction, booking included -
--    proving pos_create_sale's single-transaction contract, not just that
--    the payments loop itself stopped.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Overpay Buyer"}'::jsonb,
      '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000004","quantity":1}]'::jsonb,
      '[{"amount":1000,"method":"cash","tendered":1000}]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%OVERPAY%';
  end;
  perform test_assert(refused, 'overpay (sum of payments exceeds total) is refused');
end $$;
reset role;
do $$
declare
  overpay_booking_count int;
begin
  select count(*) into overpay_booking_count from public.bookings where customer_name = 'Overpay Buyer';
  perform test_assert(overpay_booking_count = 0, 'an overpay refusal rolls back the booking too (inserted earlier in the same call)');
end $$;

-- 7. Card payment without a reference is refused.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Card No Reference"}'::jsonb,
      '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000004","quantity":1}]'::jsonb,
      '[{"amount":50,"method":"card"}]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%CARD_REFERENCE_REQUIRED%';
  end;
  perform test_assert(refused, 'a card payment without a reference is refused');
end $$;
reset role;

-- 8. Cash change is computed right: total 50, tendered 70 -> change_due 20,
--    returned both by the RPC and persisted on the payment row.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  v_result jsonb;
  v_booking_id uuid;
  v_change_due numeric;
begin
  v_result := public.pos_create_sale(
    '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Cash Change Buyer"}'::jsonb,
    '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000004","quantity":1}]'::jsonb,
    '[{"amount":50,"method":"cash","tendered":70}]'::jsonb
  );
  perform test_assert((v_result->>'total')::numeric = 50, 'cash change: total is 50 (25 x 1 x 2 nights)');
  perform test_assert((v_result->>'change_due')::numeric = 20, 'cash change: RPC returns change_due 20 (70 tendered - 50 amount)');
  perform test_assert(v_result->>'payment_status' = 'paid', 'cash change: fully paid in one cash payment -> payment_status paid');

  v_booking_id := (v_result->>'booking_id')::uuid;
  select change_due into v_change_due from public.booking_payments where booking_id = v_booking_id;
  perform test_assert(v_change_due = 20, 'cash change: the persisted booking_payments row also has change_due 20');
end $$;
reset role;

-- 9. A partial payment gives payment_status partial.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  v_result jsonb;
begin
  v_result := public.pos_create_sale(
    '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Partial Payer"}'::jsonb,
    '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000004","quantity":1}]'::jsonb,
    '[{"amount":20,"method":"cash","tendered":20}]'::jsonb
  );
  perform test_assert((v_result->>'total')::numeric = 50, 'partial payment: total is still 50');
  perform test_assert((v_result->>'paid')::numeric = 20, 'partial payment: paid is 20');
  perform test_assert(v_result->>'payment_status' = 'partial', 'partial payment (20 of 50) -> payment_status partial');
end $$;
reset role;

-- 10. No payment gives payment_status pending ("Pay later").
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  v_result jsonb;
begin
  v_result := public.pos_create_sale(
    '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Pay Later"}'::jsonb,
    '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000004","quantity":1}]'::jsonb,
    '[]'::jsonb
  );
  perform test_assert((v_result->>'paid')::numeric = 0, 'no payment: paid is 0');
  perform test_assert(v_result->>'payment_status' = 'pending', 'no payment ("Pay later") -> payment_status pending');
end $$;
reset role;

-- 11. DUPLICATE_ITEM: the same equipment on two lines (3 + 3) against stock
--     of 5 is refused, even though each line alone is within stock, and
--     leaves no booking behind.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Duplicate Line Buyer"}'::jsonb,
      '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000005","quantity":3},{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000005","quantity":3}]'::jsonb,
      '[]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%DUPLICATE_ITEM%';
  end;
  perform test_assert(refused, 'two lines of the same equipment (3 + 3 on stock 5) is refused');
end $$;
reset role;
do $$
declare
  duplicate_booking_count int;
begin
  select count(*) into duplicate_booking_count
  from public.bookings where customer_name = 'Duplicate Line Buyer';
  perform test_assert(duplicate_booking_count = 0, 'a DUPLICATE_ITEM refusal leaves no booking behind');
end $$;

-- 12. INVALID_QUANTITY: a missing quantity, a missing equipment_id, a
--     quantity of 0 and a quantity of -2 are all refused, and none persists
--     a booking.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Missing Quantity Buyer"}'::jsonb,
      '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000006"}]'::jsonb,
      '[]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%INVALID_QUANTITY%';
  end;
  perform test_assert(refused, 'an item with no quantity is refused');
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Missing Equipment Id Buyer"}'::jsonb,
      '[{"quantity":1}]'::jsonb,
      '[]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%INVALID_QUANTITY%';
  end;
  perform test_assert(refused, 'an item with no equipment_id is refused');
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Zero Quantity Buyer"}'::jsonb,
      '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000006","quantity":0}]'::jsonb,
      '[]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%INVALID_QUANTITY%';
  end;
  perform test_assert(refused, 'an item with quantity 0 is refused');
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.pos_create_sale(
      '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Negative Quantity Buyer"}'::jsonb,
      '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000006","quantity":-2}]'::jsonb,
      '[]'::jsonb
    );
  exception when others then
    refused := sqlerrm ilike '%INVALID_QUANTITY%';
  end;
  perform test_assert(refused, 'an item with quantity -2 is refused');
end $$;
reset role;

-- A qty 5 line (within the row's stock of 5) is still accepted, proving the
-- guard above rejects only non-positive/missing quantities, not the row.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
begin
  perform public.pos_create_sale(
    '{"start_date":"2026-11-02","end_date":"2026-11-04","fulfillment_method":"pickup","customer_name":"Valid Quantity Buyer"}'::jsonb,
    '[{"equipment_id":"aaaaaaaa-0000-0000-0000-000000000006","quantity":5}]'::jsonb,
    '[]'::jsonb
  );
end $$;
reset role;

do $$
declare
  invalid_qty_booking_count int;
  valid_qty_booking_count int;
begin
  select count(*) into invalid_qty_booking_count
  from public.bookings
  where customer_name in (
    'Missing Quantity Buyer', 'Missing Equipment Id Buyer',
    'Zero Quantity Buyer', 'Negative Quantity Buyer'
  );
  perform test_assert(invalid_qty_booking_count = 0, 'none of the four INVALID_QUANTITY attempts left a booking behind');

  select count(*) into valid_qty_booking_count
  from public.bookings where customer_name = 'Valid Quantity Buyer';
  perform test_assert(valid_qty_booking_count = 1, 'a qty 5 line (within stock) is still accepted');
end $$;

\echo 'pos_create_sale RPC: assertions complete'
