-- supabase/tests/pos_phase3_rpc.test.sql
--
-- Exercises public.pos_open_drawer, public.pos_close_drawer and
-- public.pos_end_of_day_report (contract: tlb/TLB_POS_PHASE3_CONTRACT.md,
-- goal tlb-pos) against a real Postgres (run after pos_fixture.setup.sql +
-- the real phase 1 migration + pos_price_booking_stub.sql +
-- pos_phase2_fixture.setup.sql + the real phase 2 migration + the real
-- phase 3 migration, 20261029220000_pos_phase3_close_out.sql, in the same
-- session; see run-pos-phase3-tests.sh).
--
-- Written against the contract before the real migration exists on this
-- branch (Claudy, travellight 2026-10-29 23:37: "You can write the RPC tests
-- from the contract's Tests section now, on your phase 2 harness. The
-- function names, error codes and return keys in the contract are fixed.").
-- This file will not run until 20261029220000_pos_phase3_close_out.sql lands.
--
-- The four named error codes (DRAWER_ALREADY_OPEN, INVALID_FLOAT,
-- DRAWER_NOT_OPEN, VARIANCE_NOTE_REQUIRED) are contract-fixed and asserted
-- literally via test_assert_refused(stmt, code) (pos_fixture.setup.sql;
-- see supabase/tests/README.md) - never a hand-rolled begin/exception block
-- that calls test_assert(false, label) with the code echoed in the label,
-- the MF1 self-confirming shape (Elby, mutant-proven, third strike after
-- pos_rpc.test.sql and price_booking.test.sql). The role-gate refusal text
-- is NOT one of those fixed codes, so test_assert_not_authorized() below
-- accepts either convention already used in this migration family
-- ('NOT_AUTHORIZED: ...' from extend_booking_rental/pos_create_sale, or
-- 'Not authorized...' from create_credit_note) rather than pinning to one.
--
-- Section A (drawer lifecycle) runs pos_open_drawer/pos_close_drawer live and
-- reads opened_at back from the row so "before/after opened_at" comparisons
-- never depend on wall-clock timing. Section B (end-of-day report) is built
-- entirely from direct fixture rows dated to a fixed Aruba day (2026-11-02),
-- independent of Section A's live timestamps, so the report assertions are
-- deterministic regardless of when this file is actually run.
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

create or replace function test_assert_not_authorized(msg text, label text) returns void
language plpgsql as $$
begin
  perform test_assert(msg ilike '%not_authorized%' or msg ilike '%not authorized%', label);
end;
$$;

create or replace function test_by_method(p_report jsonb, p_method text) returns jsonb
language sql as $$
  select elem from jsonb_array_elements(p_report->'by_method') elem
  where elem->>'method' = p_method
  limit 1;
$$;

create or replace function test_by_staff(p_report jsonb, p_staff_id uuid) returns jsonb
language sql as $$
  select elem from jsonb_array_elements(p_report->'by_staff') elem
  where elem->>'staff_id' = p_staff_id::text
  limit 1;
$$;

-- Fixtures shared by both sections: two StoreStaff (drawer lifecycle +
-- report attribution), one Accounting (allowed by the report, refused by
-- open/close - the one role-list difference the contract draws between
-- them), Customer and Driver (refused by all three RPCs).
insert into public.profiles (id, name, role) values
  ('44444444-4444-4444-4444-444444444441', 'Staff One', 'StoreStaff'),
  ('55555555-5555-5555-5555-555555555552', 'Staff Two', 'StoreStaff'),
  ('88888888-8888-8888-8888-888888888885', 'Accounting Staff', 'Accounting'),
  ('66666666-6666-6666-6666-666666666663', 'Walk-in Customer', 'Customer'),
  ('77777777-7777-7777-7777-777777777774', 'Driver Only', 'Driver');

-- =====================================================================
-- SECTION A: drawer lifecycle (pos_open_drawer / pos_close_drawer), live.
-- =====================================================================

-- 1. Role gate: Customer and Driver are refused by pos_open_drawer.
set role authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666663', false);
do $$
begin
  begin
    perform public.pos_open_drawer(100, null);
    perform test_assert(false, 'Customer is refused by pos_open_drawer');
  exception when others then
    perform test_assert_not_authorized(sqlerrm, 'Customer is refused by pos_open_drawer');
  end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777774', false);
do $$
begin
  begin
    perform public.pos_open_drawer(100, null);
    perform test_assert(false, 'Driver is refused by pos_open_drawer');
  exception when others then
    perform test_assert_not_authorized(sqlerrm, 'Driver is refused by pos_open_drawer');
  end;
end $$;
reset role;

-- 2. Role gate: Accounting is refused by pos_open_drawer too - the contract
--    gives the report RPC a wider role list (adds Accounting) than open/close,
--    so this is not the same check as 1 above; it fails if a future edit
--    accidentally widens open/close's role list to match the report's.
set role authenticated;
select set_config('request.jwt.claim.sub', '88888888-8888-8888-8888-888888888885', false);
do $$
begin
  begin
    perform public.pos_open_drawer(100, null);
    perform test_assert(false, 'Accounting is refused by pos_open_drawer (report-only role)');
  exception when others then
    perform test_assert_not_authorized(sqlerrm, 'Accounting is refused by pos_open_drawer (report-only role)');
  end;
end $$;
reset role;

do $$
begin
  perform test_assert(
    (select count(*) from public.pos_cash_sessions) = 0,
    'no refused open attempt created a drawer session');
end $$;

-- 3. INVALID_FLOAT: a negative or NULL opening float is refused for an
--    otherwise-authorized StoreStaff caller.
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444441', false);
do $$
begin
  perform test_assert_refused($sql$select public.pos_open_drawer(-1, null)$sql$, 'INVALID_FLOAT');
end $$;
do $$
begin
  perform test_assert_refused($sql$select public.pos_open_drawer(null, null)$sql$, 'INVALID_FLOAT');
end $$;
reset role;

do $$
begin
  perform test_assert(
    (select count(*) from public.pos_cash_sessions) = 0,
    'no invalid-float attempt created a drawer session');
end $$;

-- 3b. NO_OPEN_DRAWER: the booking_payments trigger
--     (trg_booking_payments_pos_cash_needs_open_drawer) refuses a pos-channel
--     cash payment while no drawer is open; card, other and office-channel
--     payments are unaffected (contract: "Refuse POS cash payments while no
--     cash drawer is open").
--
-- MUST-FIX (Elby, mutant-proven): the insert attempt and the "is refused"
-- assertion used to share one begin/exception block. Mutating the trigger
-- condition to IF FALSE let the insert through for real, but the very next
-- statement in that same block, test_assert(false, label-with-code), raised
-- its own FAIL and was caught by the SAME exception handler - and plpgsql's
-- implicit savepoint rollback for a caught exception undoes every statement
-- since that block's BEGIN, including the insert that just succeeded. So
-- the leaked row vanished before the later "left no row behind" count ran,
-- and BOTH assertions passed on a broken trigger.
--
-- Fixed shape: the insert attempt lives in its own block that never itself
-- raises (it only sets a flag), so it commits exactly what really happened;
-- the flag is handed to the next statement via a GUC (plpgsql variables
-- don't survive across top-level statements); the refusal assertion and the
-- row-count assertion are each their own statement after it, so neither can
-- roll back what the insert attempt actually did.
do $$
declare
  refused boolean := false;
begin
  insert into public.bookings (id, customer_name, customer_email, customer_phone, customer_address, start_date, end_date, total_amount, status, fulfillment_method)
  values ('cccccccc-0000-0000-0000-000000000001', 'No Drawer Cash Attempt', 'no-drawer-cash@example.com', '0000', 'n/a', '2026-11-01', '2026-11-02', 30, 'confirmed', 'pickup');
  begin
    insert into public.booking_payments (booking_id, amount, method, channel, recorded_by)
    values ('cccccccc-0000-0000-0000-000000000001', 30, 'cash', 'pos', '44444444-4444-4444-4444-444444444441');
  exception when others then
    refused := sqlerrm ilike '%NO_OPEN_DRAWER%';
  end;
  perform set_config('app.no_open_drawer_refused', refused::text, false);
end $$;

do $$
begin
  perform test_assert(current_setting('app.no_open_drawer_refused')::boolean,
    'a pos cash payment is refused while no drawer is open');
end $$;

do $$
begin
  perform test_assert(
    (select count(*) from public.booking_payments where booking_id = 'cccccccc-0000-0000-0000-000000000001') = 0,
    'the refused no-drawer pos cash payment left no row behind');
end $$;

do $$
begin
  insert into public.bookings (id, customer_name, customer_email, customer_phone, customer_address, start_date, end_date, total_amount, status, fulfillment_method) values
    ('cccccccc-0000-0000-0000-000000000002', 'No Drawer Card',   'no-drawer-card@example.com',   '0000', 'n/a', '2026-11-01', '2026-11-02', 30, 'confirmed', 'pickup'),
    ('cccccccc-0000-0000-0000-000000000003', 'No Drawer Other',  'no-drawer-other@example.com',  '0000', 'n/a', '2026-11-01', '2026-11-02', 30, 'confirmed', 'pickup'),
    ('cccccccc-0000-0000-0000-000000000004', 'No Drawer Office', 'no-drawer-office@example.com', '0000', 'n/a', '2026-11-01', '2026-11-02', 30, 'confirmed', 'pickup');

  insert into public.booking_payments (booking_id, amount, method, reference, channel, recorded_by)
  values ('cccccccc-0000-0000-0000-000000000002', 30, 'card', 'CARD-REF-NO-DRAWER', 'pos', '44444444-4444-4444-4444-444444444441');
  insert into public.booking_payments (booking_id, amount, method, channel, recorded_by)
  values ('cccccccc-0000-0000-0000-000000000003', 30, 'other', 'pos', '44444444-4444-4444-4444-444444444441');
  insert into public.booking_payments (booking_id, amount, method, channel, recorded_by)
  values ('cccccccc-0000-0000-0000-000000000004', 30, 'cash', 'office', '44444444-4444-4444-4444-444444444441');

  perform test_assert(
    (select count(*) from public.booking_payments where booking_id in (
      'cccccccc-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000004')) = 3,
    'a pos card payment, a pos other payment and an office cash payment are all unaffected by NO_OPEN_DRAWER');
end $$;

-- 4. Open the real drawer (StoreStaff, float 100), checking the return shape.
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444441', false);
do $$
declare
  v_result jsonb;
begin
  v_result := public.pos_open_drawer(100, 'Opening float for shift');
  perform test_assert(v_result->>'session_id' is not null, 'pos_open_drawer returns a session_id');
  perform test_assert((v_result->>'opening_float')::numeric = 100, 'pos_open_drawer returns the opening_float');
  perform test_assert(v_result->>'opened_at' is not null, 'pos_open_drawer returns opened_at');
end $$;

-- 5. DRAWER_ALREADY_OPEN: a second open while one is already open is refused.
do $$
begin
  perform test_assert_refused($sql$select public.pos_open_drawer(50, null)$sql$, 'DRAWER_ALREADY_OPEN');
end $$;
reset role;

do $$
begin
  perform test_assert(
    (select count(*) from public.pos_cash_sessions where status = 'open') = 1,
    'exactly one open drawer session exists after the refused second open');
end $$;

-- 6. Role gate: Customer and Driver are refused by pos_close_drawer too,
--    against the real open session, and the session is left untouched.
set role authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666663', false);
do $$
declare
  v_session_id uuid;
begin
  select id into v_session_id from public.pos_cash_sessions where status = 'open';
  begin
    perform public.pos_close_drawer(v_session_id, 100, null);
    perform test_assert(false, 'Customer is refused by pos_close_drawer');
  exception when others then
    perform test_assert_not_authorized(sqlerrm, 'Customer is refused by pos_close_drawer');
  end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777774', false);
do $$
declare
  v_session_id uuid;
begin
  select id into v_session_id from public.pos_cash_sessions where status = 'open';
  begin
    perform public.pos_close_drawer(v_session_id, 100, null);
    perform test_assert(false, 'Driver is refused by pos_close_drawer');
  exception when others then
    perform test_assert_not_authorized(sqlerrm, 'Driver is refused by pos_close_drawer');
  end;
end $$;
reset role;

do $$
begin
  perform test_assert(
    (select status from public.pos_cash_sessions where opened_by = '44444444-4444-4444-4444-444444444441') = 'open',
    'the open session is untouched by the refused close attempts');
end $$;

-- 7. Fixture: a pos cash payment made BEFORE opened_at, a pos cash payment
--    made AFTER opened_at, a pos card payment AFTER opened_at and an office
--    (non-pos-channel) cash payment AFTER opened_at. Timestamps are computed
--    from the session's own opened_at (read back from the row, not a literal)
--    so this never depends on wall-clock timing. Only the post-open pos cash
--    payment (40) should ever count toward cash_sales.
do $$
declare
  v_opened_at timestamptz;
begin
  select opened_at into v_opened_at from public.pos_cash_sessions where opened_by = '44444444-4444-4444-4444-444444444441';

  insert into public.bookings (id, customer_name, customer_email, customer_phone, customer_address, start_date, end_date, total_amount, status, fulfillment_method)
  values ('eeeeeeee-0000-0000-0000-000000000001', 'Pre-Open Cash Sale', 'pre-open@example.com', '0000', 'n/a', '2026-11-01', '2026-11-02', 20, 'confirmed', 'pickup');
  insert into public.booking_payments (booking_id, amount, method, channel, recorded_by, created_at)
  values ('eeeeeeee-0000-0000-0000-000000000001', 20, 'cash', 'pos', '44444444-4444-4444-4444-444444444441', v_opened_at - interval '1 hour');

  insert into public.bookings (id, customer_name, customer_email, customer_phone, customer_address, start_date, end_date, total_amount, status, fulfillment_method)
  values ('eeeeeeee-0000-0000-0000-000000000002', 'Post-Open Pos Cash Sale', 'post-open-cash@example.com', '0000', 'n/a', '2026-11-01', '2026-11-02', 40, 'confirmed', 'pickup');
  insert into public.booking_payments (booking_id, amount, method, channel, recorded_by, created_at)
  values ('eeeeeeee-0000-0000-0000-000000000002', 40, 'cash', 'pos', '44444444-4444-4444-4444-444444444441', v_opened_at + interval '1 millisecond');

  insert into public.bookings (id, customer_name, customer_email, customer_phone, customer_address, start_date, end_date, total_amount, status, fulfillment_method)
  values ('eeeeeeee-0000-0000-0000-000000000003', 'Post-Open Pos Card Sale', 'post-open-card@example.com', '0000', 'n/a', '2026-11-01', '2026-11-02', 60, 'confirmed', 'pickup');
  insert into public.booking_payments (booking_id, amount, method, reference, channel, recorded_by, created_at)
  values ('eeeeeeee-0000-0000-0000-000000000003', 60, 'card', 'CARD-REF-1', 'pos', '44444444-4444-4444-4444-444444444441', v_opened_at + interval '1 millisecond');

  insert into public.bookings (id, customer_name, customer_email, customer_phone, customer_address, start_date, end_date, total_amount, status, fulfillment_method)
  values ('eeeeeeee-0000-0000-0000-000000000004', 'Office Cash Payment', 'office-cash@example.com', '0000', 'n/a', '2026-11-01', '2026-11-02', 15, 'confirmed', 'pickup');
  insert into public.booking_payments (booking_id, amount, method, channel, recorded_by, created_at)
  values ('eeeeeeee-0000-0000-0000-000000000004', 15, 'cash', 'office', '44444444-4444-4444-4444-444444444441', v_opened_at + interval '1 millisecond');
end $$;

-- 8. VARIANCE_NOTE_REQUIRED: a non-zero variance (expected 140, counted 150)
--    without a note is refused, and the session is left untouched.
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444441', false);
do $$
declare
  v_session_id uuid;
begin
  select id into v_session_id from public.pos_cash_sessions where status = 'open';
  perform test_assert_refused(
    format('select public.pos_close_drawer(%L, 150, null)', v_session_id),
    'VARIANCE_NOTE_REQUIRED');
end $$;
reset role;

do $$
begin
  perform test_assert(
    (select status from public.pos_cash_sessions where opened_by = '44444444-4444-4444-4444-444444444441') = 'open',
    'the open session is untouched by the refused no-note close attempt');
end $$;

-- 9. The same non-zero variance WITH a note is accepted: expected_cash is
--    opening_float (100) + pos cash sales after opened_at only (40) = 140;
--    the pre-open cash (20), the pos card sale (60) and the office cash (15)
--    are all excluded.
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444441', false);
do $$
declare
  v_session_id uuid;
  v_result jsonb;
begin
  select id into v_session_id from public.pos_cash_sessions where status = 'open';
  v_result := public.pos_close_drawer(v_session_id, 150, 'Till over by 10, pending recount');
  perform test_assert(v_result->>'status' = 'closed', 'a non-zero variance WITH a note closes the drawer');
  perform test_assert((v_result->>'cash_sales')::numeric = 40, 'cash_sales counts only the post-open pos cash payment (40)');
  perform test_assert((v_result->>'expected_cash')::numeric = 140, 'expected_cash = opening_float (100) + cash_sales (40)');
  perform test_assert((v_result->>'counted_cash')::numeric = 150, 'counted_cash reflects the amount counted');
  perform test_assert((v_result->>'variance')::numeric = 10, 'variance = counted_cash (150) - expected_cash (140)');
  perform test_assert(v_result->>'close_note' = 'Till over by 10, pending recount', 'close_note persists the note');
end $$;
reset role;

-- 10. DRAWER_NOT_OPEN: closing an already-closed session (by its own id) is
--     refused.
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444441', false);
do $$
declare
  v_session_id uuid;
begin
  select id into v_session_id from public.pos_cash_sessions where opened_by = '44444444-4444-4444-4444-444444444441';
  perform test_assert_refused(
    format('select public.pos_close_drawer(%L, 150, %L)', v_session_id, 'Till over by 10, pending recount'),
    'DRAWER_NOT_OPEN');
end $$;
reset role;

-- 11. A fresh open is allowed now that the previous session is closed (the
--     "at most one open row" rule is per-row, not permanent), and a zero
--     variance needs no note at all.
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444441', false);
do $$
declare
  v_open jsonb;
  v_session_id uuid;
  v_result jsonb;
begin
  v_open := public.pos_open_drawer(50, null);
  v_session_id := (v_open->>'session_id')::uuid;
  v_result := public.pos_close_drawer(v_session_id, 50, null);
  perform test_assert(v_result->>'status' = 'closed', 'a zero-variance close with no note succeeds');
  perform test_assert((v_result->>'variance')::numeric = 0, 'zero variance is computed correctly (counted 50 = expected 50, no sales)');
  perform test_assert(v_result->>'close_note' is null, 'no note was required or stored for a zero variance');
end $$;
reset role;

-- 12. Role gate: Customer and Driver are refused by pos_end_of_day_report;
--     Accounting, excluded from open/close, IS allowed by the report (the
--     one role-list difference the contract draws between the two groups).
set role authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666663', false);
do $$
begin
  begin
    perform public.pos_end_of_day_report('2030-01-01');
    perform test_assert(false, 'Customer is refused by pos_end_of_day_report');
  exception when others then
    perform test_assert_not_authorized(sqlerrm, 'Customer is refused by pos_end_of_day_report');
  end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777774', false);
do $$
begin
  begin
    perform public.pos_end_of_day_report('2030-01-01');
    perform test_assert(false, 'Driver is refused by pos_end_of_day_report');
  exception when others then
    perform test_assert_not_authorized(sqlerrm, 'Driver is refused by pos_end_of_day_report');
  end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '88888888-8888-8888-8888-888888888885', false);
do $$
declare
  v_result jsonb;
begin
  v_result := public.pos_end_of_day_report('2030-01-01');
  perform test_assert(v_result->>'date' = '2030-01-01', 'Accounting IS allowed by pos_end_of_day_report and gets an empty day back');
  perform test_assert(jsonb_array_length(v_result->'by_method') = 0, 'an activity-free day reports an empty by_method array');
  perform test_assert(jsonb_array_length(v_result->'by_staff') = 0, 'an activity-free day reports an empty by_staff array (no staff with no activity is listed)');
end $$;
reset role;

-- =====================================================================
-- SECTION B: pos_end_of_day_report, fixed Aruba day 2026-11-02, built
-- entirely from direct fixture rows so results never depend on when this
-- file is actually run.
--
-- Staff One: a pos cash sale (40) and a pos card sale (60) on 2026-11-02,
-- plus a credit note (5) on 2026-11-02 and a credit note (999) on 2026-11-01
-- that must NOT count toward the 2026-11-02 report.
-- Staff Two: a pos "other" sale (25) on 2026-11-02, a pos cash sale (10) at
-- 2026-11-03 02:00 UTC - the contract's own boundary example, which is
-- 2026-11-02 22:00 America/Aruba (UTC-4, no DST) and so belongs to the
-- 2026-11-02 report, not 2026-11-03 - and one RENTAL_EXTENDED audit row on
-- 2026-11-02.
-- Cross-day/cross-channel exclusions: a pos cash sale (999) at 2026-11-02
-- 03:00 UTC is 2026-11-01 23:00 Aruba, so it must NOT land on 2026-11-02; an
-- office-channel cash payment (500) on 2026-11-02 must not count at all
-- (totals/by_method/by_staff are pos-channel only); an extension dated
-- 2026-11-01 must not count toward 2026-11-02's extensions_count.
-- Accounting Staff has zero activity on 2026-11-02 and must not be listed.
-- =====================================================================

insert into public.bookings (id, customer_name, customer_email, customer_phone, customer_address, start_date, end_date, total_amount, status, fulfillment_method) values
  ('dddddddd-0000-0000-0000-000000000001', 'Report Staff One Cash',      'r1@example.com', '0000', 'n/a', '2026-11-02', '2026-11-03', 40,  'confirmed', 'pickup'),
  ('dddddddd-0000-0000-0000-000000000002', 'Report Staff One Card',      'r2@example.com', '0000', 'n/a', '2026-11-02', '2026-11-03', 60,  'confirmed', 'pickup'),
  ('dddddddd-0000-0000-0000-000000000003', 'Report Staff Two Other',     'r3@example.com', '0000', 'n/a', '2026-11-02', '2026-11-03', 25,  'confirmed', 'pickup'),
  ('dddddddd-0000-0000-0000-000000000004', 'Report Staff Two Boundary',  'r4@example.com', '0000', 'n/a', '2026-11-02', '2026-11-03', 10,  'confirmed', 'pickup'),
  ('dddddddd-0000-0000-0000-000000000005', 'Report Prior-Day Excluded',  'r5@example.com', '0000', 'n/a', '2026-11-01', '2026-11-02', 999, 'confirmed', 'pickup'),
  ('dddddddd-0000-0000-0000-000000000006', 'Report Office Excluded',     'r6@example.com', '0000', 'n/a', '2026-11-02', '2026-11-03', 500, 'confirmed', 'pickup'),
  ('dddddddd-0000-0000-0000-000000000007', 'Report Prior-Day Credit',    'r7@example.com', '0000', 'n/a', '2026-11-01', '2026-11-02', 999, 'confirmed', 'pickup');

-- These are historical rows for the report, not counter payments taken now,
-- so the NO_OPEN_DRAWER guard is off while they are written.
alter table public.booking_payments disable trigger trg_booking_payments_pos_cash_needs_open_drawer;

insert into public.booking_payments (booking_id, amount, method, channel, recorded_by, created_at) values
  ('dddddddd-0000-0000-0000-000000000001', 40,  'cash',  'pos',    '44444444-4444-4444-4444-444444444441', '2026-11-02 15:00:00+00'),
  ('dddddddd-0000-0000-0000-000000000003', 25,  'other', 'pos',    '55555555-5555-5555-5555-555555555552', '2026-11-02 17:00:00+00'),
  ('dddddddd-0000-0000-0000-000000000004', 10,  'cash',  'pos',    '55555555-5555-5555-5555-555555555552', '2026-11-03 02:00:00+00'),
  ('dddddddd-0000-0000-0000-000000000005', 999, 'cash',  'pos',    '44444444-4444-4444-4444-444444444441', '2026-11-02 03:00:00+00'),
  ('dddddddd-0000-0000-0000-000000000006', 500, 'cash',  'office', '44444444-4444-4444-4444-444444444441', '2026-11-02 15:30:00+00');

insert into public.booking_payments (booking_id, amount, method, reference, channel, recorded_by, created_at) values
  ('dddddddd-0000-0000-0000-000000000002', 60, 'card', 'CARD-REF-REPORT', 'pos', '44444444-4444-4444-4444-444444444441', '2026-11-02 16:00:00+00');

alter table public.booking_payments enable trigger trg_booking_payments_pos_cash_needs_open_drawer;

insert into public.credit_notes (booking_id, credit_number, amount, reason, created_by, created_at) values
  ('dddddddd-0000-0000-0000-000000000001', 'CN-2026-TEST01', 5,   'Partial refund, Staff One, 2026-11-02', '44444444-4444-4444-4444-444444444441', '2026-11-02 15:10:00+00'),
  ('dddddddd-0000-0000-0000-000000000007', 'CN-2026-TEST02', 999, 'Prior-day credit, must not count',      '44444444-4444-4444-4444-444444444441', '2026-11-01 10:00:00+00');

insert into public.booking_audit_log (booking_id, user_id, action, notes, created_at) values
  ('dddddddd-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555552', 'RENTAL_EXTENDED', 'Extended, Staff Two, 2026-11-02',      '2026-11-02 18:00:00+00'),
  ('dddddddd-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444441', 'RENTAL_EXTENDED', 'Prior-day extension, must not count',  '2026-11-01 09:00:00+00');

insert into public.pos_cash_sessions (id, status, opened_by, opened_at, opening_float, closed_by, closed_at, cash_sales, expected_cash, counted_cash, variance, close_note) values
  ('ffffffff-0000-0000-0000-000000000001', 'closed', '44444444-4444-4444-4444-444444444441', '2026-11-02 14:00:00+00', 100, '44444444-4444-4444-4444-444444444441', '2026-11-02 19:00:00+00', 50, 150, 150, 0, null),
  ('ffffffff-0000-0000-0000-000000000002', 'closed', '55555555-5555-5555-5555-555555555552', '2026-11-01 10:00:00+00', 80,  '55555555-5555-5555-5555-555555555552', '2026-11-01 18:00:00+00', 20, 100, 100, 0, null);

set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444441', false);
do $$
declare
  v_report jsonb;
  v_cash jsonb;
  v_card jsonb;
  v_other jsonb;
  v_staff1 jsonb;
  v_staff2 jsonb;
begin
  v_report := public.pos_end_of_day_report('2026-11-02');

  perform test_assert(v_report->>'date' = '2026-11-02', 'report date echoes the requested day');

  v_cash := test_by_method(v_report, 'cash');
  perform test_assert(v_cash is not null, 'by_method has a cash entry');
  perform test_assert((v_cash->>'count')::int = 2, 'cash count is 2 (Staff One 40 + Staff Two boundary 10; prior-day 999 and office 500 excluded)');
  perform test_assert((v_cash->>'total')::numeric = 50, 'cash total is 50 (40 + 10)');

  v_card := test_by_method(v_report, 'card');
  perform test_assert(v_card is not null, 'by_method has a card entry');
  perform test_assert((v_card->>'count')::int = 1, 'card count is 1');
  perform test_assert((v_card->>'total')::numeric = 60, 'card total is 60');

  v_other := test_by_method(v_report, 'other');
  perform test_assert(v_other is not null, 'by_method has an other entry');
  perform test_assert((v_other->>'count')::int = 1, 'other count is 1');
  perform test_assert((v_other->>'total')::numeric = 25, 'other total is 25');

  v_staff1 := test_by_staff(v_report, '44444444-4444-4444-4444-444444444441');
  perform test_assert(v_staff1 is not null, 'by_staff has Staff One');
  perform test_assert(v_staff1->>'staff_name' = 'Staff One', 'Staff One staff_name is correct');
  perform test_assert((v_staff1->>'sales_count')::int = 2, 'Staff One sales_count is 2 (cash 40 + card 60; prior-day and office excluded)');
  perform test_assert((v_staff1->>'cash')::numeric = 40, 'Staff One cash is 40');
  perform test_assert((v_staff1->>'card')::numeric = 60, 'Staff One card is 60');
  perform test_assert((v_staff1->>'other')::numeric = 0, 'Staff One other is 0');
  perform test_assert((v_staff1->>'credit_notes_count')::int = 1, 'Staff One credit_notes_count is 1 (prior-day 999 excluded)');
  perform test_assert((v_staff1->>'credit_notes_total')::numeric = 5, 'Staff One credit_notes_total is 5 (prior-day 999 excluded)');
  perform test_assert((v_staff1->>'extensions_count')::int = 0, 'Staff One extensions_count is 0 (their extension was on 2026-11-01)');

  v_staff2 := test_by_staff(v_report, '55555555-5555-5555-5555-555555555552');
  perform test_assert(v_staff2 is not null, 'by_staff has Staff Two');
  perform test_assert((v_staff2->>'sales_count')::int = 2, 'Staff Two sales_count is 2 (other 25 + boundary cash 10)');
  perform test_assert((v_staff2->>'cash')::numeric = 10, 'Staff Two cash is 10 (the 2026-11-03 02:00 UTC payment, which is 2026-11-02 22:00 Aruba)');
  perform test_assert((v_staff2->>'card')::numeric = 0, 'Staff Two card is 0');
  perform test_assert((v_staff2->>'other')::numeric = 25, 'Staff Two other is 25');
  perform test_assert((v_staff2->>'extensions_count')::int = 1, 'Staff Two extensions_count is 1');

  perform test_assert(test_by_staff(v_report, '88888888-8888-8888-8888-888888888885') is null, 'Accounting Staff has no 2026-11-02 activity and is not listed');

  perform test_assert((v_report->'totals'->>'payments')::numeric = 135, 'totals.payments is 135 (50 cash + 60 card + 25 other; office 500 and prior-day 999 excluded)');
  perform test_assert((v_report->'totals'->>'credit_notes')::numeric = 5, 'totals.credit_notes is 5 (prior-day 999 excluded)');

  perform test_assert(jsonb_array_length(v_report->'sessions') = 1, 'sessions lists exactly the one pos_cash_sessions row opened on 2026-11-02 (the 2026-11-01 session is excluded)');
  perform test_assert((v_report->'sessions'->0->>'id') = 'ffffffff-0000-0000-0000-000000000001', 'the listed session is the one opened on 2026-11-02');
end $$;
reset role;

\echo 'pos_open_drawer / pos_close_drawer / pos_end_of_day_report RPC: assertions complete'
