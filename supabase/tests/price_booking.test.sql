-- supabase/tests/price_booking.test.sql
--
-- Exercises public.price_booking (supabase/migrations/20261030130000_price_booking.sql,
-- goal tlb-pos, PR #112) against a real Postgres (run after
-- price_booking_fixture.setup.sql + the real migration; see
-- run-price-booking-tests.sh).
--
-- Section 1 is the shared case table in price_booking_parity_cases.json -
-- the exact same cases src/lib/pricing/bookingTotals.parity.test.ts runs
-- through computeBookingTotals - spliced into this session by
-- run-price-booking-tests.sh as the app.price_booking_parity_cases GUC, so
-- the SQL port and the TS original can never silently drift apart. It
-- covers every rule branch in the migration header: 1-4/5-7/8+ day tiers
-- (both remainder bands), weekly-rate null/0 fallback, the morning/afternoon
-- +1 slot rule (and its three non-adding combinations), the
-- Sunday/under-5/5+/pickup delivery-fee rules, a missing fulfillment_method
-- defaulting to delivery, and several lines summed.
--
-- Sections 2-4 cover what the shared cases can't: client-supplied
-- total/price_per_day/subtotal being ignored, the refusal paths (each
-- asserted on its error code via test_assert_refused(stmt, code) -
-- price_booking_fixture.setup.sql, see supabase/tests/README.md - never a
-- hand-rolled begin/exception block with the code echoed in the label, the
-- MF1 self-confirming shape, review finding, mutant-proven), and the
-- service_role-only EXECUTE grant.
--
-- Raises an exception, and so a non-zero psql exit code, on the first
-- failing assertion. Passing assertions print as NOTICE.

create or replace function test_assert(cond boolean, label text) returns void
language plpgsql as $$
begin
  if not cond then
    raise exception 'FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end;
$$;

-- 1. Shared case table: parity with computeBookingTotals + full rule coverage.
do $$
declare
  v_cases jsonb := current_setting('app.price_booking_parity_cases')::jsonb;
  v_case jsonb;
  v_item jsonb;
  v_items jsonb;
  v_equip_id uuid;
  v_result jsonb;
begin
  for v_case in select * from jsonb_array_elements(v_cases) loop
    v_items := '[]'::jsonb;
    for v_item in select * from jsonb_array_elements(v_case->'items') loop
      insert into public.equipment (price_per_day, price_per_week)
      values ((v_item->>'price_per_day')::numeric, (v_item->>'price_per_week')::numeric)
      returning id into v_equip_id;
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'equipment_id', v_equip_id,
        'quantity', (v_item->>'quantity')::int
      ));
    end loop;

    v_result := public.price_booking(
      jsonb_build_object(
        'start_date', v_case->>'startDate',
        'end_date', v_case->>'endDate',
        'delivery_slot', v_case->>'deliverySlot',
        'pickup_slot', v_case->>'pickupSlot',
        'fulfillment_method', v_case->>'fulfillmentMethod'
      ),
      v_items
    );

    perform test_assert((v_result->>'days')::int = (v_case->>'expectedDays')::int,
      format('%s: days is %s', v_case->>'id', v_case->>'expectedDays'));
    perform test_assert((v_result->>'equipment_total')::numeric = (v_case->>'expectedEquipmentTotal')::numeric,
      format('%s: equipment_total is %s', v_case->>'id', v_case->>'expectedEquipmentTotal'));
    perform test_assert((v_result->>'delivery_fee')::numeric = (v_case->>'expectedDeliveryFee')::numeric,
      format('%s: delivery_fee is %s', v_case->>'id', v_case->>'expectedDeliveryFee'));
    perform test_assert((v_result->>'total')::numeric = (v_case->>'expectedTotal')::numeric,
      format('%s: total matches computeBookingTotals (%s)', v_case->>'id', v_case->>'expectedTotal'));
  end loop;
end $$;

-- 2. Client-supplied total/price_per_day/subtotal are ignored; only
--    public.equipment and the real rules decide the price.
do $$
declare
  v_equip_id uuid;
  v_result jsonb;
begin
  insert into public.equipment (price_per_day, price_per_week)
  values (10, null)
  returning id into v_equip_id;

  v_result := public.price_booking(
    jsonb_build_object(
      'start_date', '2026-11-02', 'end_date', '2026-11-05',
      'fulfillment_method', 'pickup', 'total', 999999
    ),
    jsonb_build_array(jsonb_build_object(
      'equipment_id', v_equip_id, 'quantity', 1,
      'price_per_day', 1, 'subtotal', 1
    ))
  );
  perform test_assert((v_result->>'total')::numeric = 30,
    'client-supplied total/price_per_day/subtotal keys are ignored (real price: 30)');
end $$;

-- 3. Refusals, each asserted on its error code via test_assert_refused
--    (price_booking_fixture.setup.sql; see supabase/tests/README.md) - never
--    a hand-rolled begin/exception block that calls test_assert(false, label)
--    with the code echoed in the label, the MF1 self-confirming shape
--    (review finding, mutant-proven, third strike after pos_rpc.test.sql).
do $$
begin
  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-02', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', gen_random_uuid(), 'quantity', 1)))$sql$,
    'INVALID_DATES');

  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-05', 'end_date', '2026-11-02', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', gen_random_uuid(), 'quantity', 1)))$sql$,
    'INVALID_DATES');

  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', 'not-a-date', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', gen_random_uuid(), 'quantity', 1)))$sql$,
    'INVALID_DATES');

  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'delivery_slot', 'evening', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', gen_random_uuid(), 'quantity', 1)))$sql$,
    'INVALID_SLOT');

  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'pickup_slot', 'evening', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', gen_random_uuid(), 'quantity', 1)))$sql$,
    'INVALID_SLOT');

  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'mail'), jsonb_build_array(jsonb_build_object('equipment_id', gen_random_uuid(), 'quantity', 1)))$sql$,
    'INVALID_FULFILLMENT');

  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'), '[]'::jsonb)$sql$,
    'INVALID_ITEMS');

  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', gen_random_uuid())))$sql$,
    'INVALID_ITEMS');

  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', gen_random_uuid(), 'quantity', 0)))$sql$,
    'INVALID_ITEMS');

  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', gen_random_uuid(), 'quantity', 1.5)))$sql$,
    'INVALID_ITEMS');

  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', gen_random_uuid(), 'quantity', '2')))$sql$,
    'INVALID_ITEMS');

  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', gen_random_uuid(), 'quantity', 1)))$sql$,
    'UNKNOWN_EQUIPMENT');
end $$;

do $$
declare
  v_unpriced_id uuid;
  v_zero_priced_id uuid;
begin
  insert into public.equipment (price_per_day, price_per_week) values (null, null) returning id into v_unpriced_id;
  insert into public.equipment (price_per_day, price_per_week) values (0, null) returning id into v_zero_priced_id;

  perform test_assert_refused(
    format($sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', %L::uuid, 'quantity', 1)))$sql$, v_unpriced_id),
    'UNPRICED_EQUIPMENT');

  -- price_per_day NOT NULL DEFAULT 0 on the real table (c66e439): a row
  -- saved without a price reads as 0, not null, so this case - not just the
  -- null one - is the one a real production row can actually hit.
  perform test_assert_refused(
    format($sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', %L::uuid, 'quantity', 1)))$sql$, v_zero_priced_id),
    'UNPRICED_EQUIPMENT');
end $$;

-- 4. Only service_role may execute price_booking; anon and authenticated
--    are refused by Postgres itself (the migration's REVOKE/GRANT), not by
--    any in-function check.
do $$
declare
  v_equip_id uuid;
begin
  insert into public.equipment (price_per_day, price_per_week) values (10, null) returning id into v_equip_id;
  perform set_config('app.price_booking_perm_equip_id', v_equip_id::text, false);
end $$;

set role anon;
do $$
begin
  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', current_setting('app.price_booking_perm_equip_id')::uuid, 'quantity', 1)))$sql$,
    'permission denied');
end $$;
reset role;

set role authenticated;
do $$
begin
  perform test_assert_refused(
    $sql$select public.price_booking(jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'), jsonb_build_array(jsonb_build_object('equipment_id', current_setting('app.price_booking_perm_equip_id')::uuid, 'quantity', 1)))$sql$,
    'permission denied');
end $$;
reset role;

set role service_role;
do $$
declare
  v_result jsonb;
begin
  v_result := public.price_booking(
    jsonb_build_object('start_date', '2026-11-02', 'end_date', '2026-11-05', 'fulfillment_method', 'pickup'),
    jsonb_build_array(jsonb_build_object('equipment_id', current_setting('app.price_booking_perm_equip_id')::uuid, 'quantity', 1))
  );
  perform test_assert((v_result->>'total')::numeric = 30, 'service_role can call price_booking and gets the real total (30)');
end $$;
reset role;

select 'price_booking: assertions complete' as result;
