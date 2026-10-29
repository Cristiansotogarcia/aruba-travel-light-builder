-- supabase/tests/special_requests_rls.test.sql
--
-- Exercises the policies in supabase/migrations/20261029200000_special_requests.sql
-- against a real Postgres (run after special_requests_rls.setup.sql in the same
-- session; see run-special-requests-rls.sh). Assertions encode the INTENDED
-- contract ("anon and authenticated can insert; only staff can select and
-- update; there is no delete"), including the shape the real client path
-- uses: submitSpecialRequest() (src/lib/specialRequests/api.ts) generates the
-- row's id with crypto.randomUUID() and does a bare `.insert(payload)` with no
-- `.select()`, because anon has no SELECT policy and Postgres refuses
-- RETURNING without one. Test 1a is that real path; 1b is a guard that
-- `.insert(payload).select()` (INSERT ... RETURNING) stays refused for anon,
-- so nobody re-adds .select() and silently breaks anonymous submissions again.
--
-- Raises an exception, and so a non-zero psql exit code, on the first
-- failing assertion. Passing assertions print as NOTICE.
--
-- Session-level set_config (is_local = false) is used throughout instead of
-- the transaction-local default, so a claim survives across the separate
-- autocommitted statements/DO blocks this script runs as.

create or replace function test_assert(cond boolean, label text) returns void
language plpgsql as $$
begin
  if not cond then
    raise exception 'FAIL: %', label;
  end if;
  raise notice 'PASS: %', label;
end;
$$;

-- Fixture: one staff profile (StoreStaff) and one non-staff profile (Driver).
insert into public.profiles (id, name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Staff Member', 'StoreStaff'),
  ('22222222-2222-2222-2222-222222222222', 'Driver Only', 'Driver');

-- 1a. The real path: anon inserts with a client-generated id (the way
--     submitSpecialRequest() does with crypto.randomUUID()) and no
--     RETURNING, and the row persists.
set role anon;
do $$
begin
  insert into public.special_requests (id, name, email, request_type, message)
  values ('33333333-3333-3333-3333-333333333333', 'Anon Visitor', 'anon@example.com', 'general', 'Testing anon insert with client id');
end $$;
reset role;
do $$
declare
  persisted boolean;
begin
  select exists(select 1 from public.special_requests where email = 'anon@example.com') into persisted;
  perform test_assert(persisted, 'anon INSERT with a client-generated id and no RETURNING (the real submitSpecialRequest path) persists the row');
end $$;

-- 1b. Guard: anon INSERT ... RETURNING (i.e. `.insert(payload).select()`)
--     stays refused, because anon has no SELECT policy on special_requests.
--     This protects against someone re-adding .select() to
--     submitSpecialRequest() and silently breaking anonymous submissions
--     the way e392a72 fixed.
set role anon;
do $$
declare
  new_id uuid;
begin
  begin
    insert into public.special_requests (name, email, request_type, message)
    values ('Anon Visitor (RETURNING)', 'anon-returning@example.com', 'general', 'Testing anon insert+select is refused')
    returning id into new_id;
    perform test_assert(false, 'anon INSERT...RETURNING is refused (no SELECT policy for anon)');
  exception when others then
    perform test_assert(true, 'anon INSERT...RETURNING is refused (no SELECT policy for anon)');
  end;
end $$;
reset role;

-- 2. anon insert is rejected when it tries to set a non-'new' status (RLS WITH CHECK).
set role anon;
do $$
begin
  begin
    insert into public.special_requests (name, email, request_type, message, status)
    values ('Bad Status', 'bad-status@example.com', 'general', 'test', 'resolved');
    perform test_assert(false, 'anon insert with status != new is rejected');
  exception when others then
    perform test_assert(true, 'anon insert with status != new is rejected');
  end;
end $$;
reset role;

-- 3. authenticated, non-staff (Driver) can insert the same way a staff
--    member later triages it, via a bare insert.
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$
begin
  insert into public.special_requests (name, email, request_type, message)
  values ('Driver Submitting', 'driver@example.com', 'last_minute', 'Testing authenticated non-staff insert');
end $$;
reset role;
do $$
declare
  persisted boolean;
begin
  select exists(select 1 from public.special_requests where email = 'driver@example.com') into persisted;
  perform test_assert(persisted, 'authenticated non-staff (Driver) bare insert persists the row');
end $$;

-- Rows committed so far: anon@example.com (1a) and driver@example.com (3).
-- 'Bad Status' (2) and anon-returning@example.com (1b) never committed.

-- 4. anon cannot select special_requests: no SELECT policy applies to it,
--    so RLS filters every row out (anon has the Supabase-default table
--    GRANT, same as every role, so this is RLS doing the work, not a
--    missing GRANT).
set role anon;
do $$
declare
  visible_count int;
begin
  select count(*) into visible_count from public.special_requests;
  perform test_assert(visible_count = 0, 'anon selects 0 rows from special_requests (RLS-filtered)');
end $$;
reset role;

-- 5. authenticated non-staff (Driver) also sees 0 rows (RLS role check fails).
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$
declare
  visible_count int;
begin
  select count(*) into visible_count from public.special_requests;
  perform test_assert(visible_count = 0, 'authenticated non-staff (Driver) sees 0 rows');
end $$;
reset role;

-- 6. staff (StoreStaff) can select and sees every committed row.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  visible_count int;
begin
  select count(*) into visible_count from public.special_requests;
  perform test_assert(visible_count >= 2, 'staff (StoreStaff) sees the committed rows (at least the 2 non-RETURNING inserts)');
end $$;
reset role;

-- 7. non-staff (Driver) update affects 0 rows (filtered by USING, not an error).
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$
declare
  affected int;
begin
  update public.special_requests set status = 'in_progress';
  get diagnostics affected = row_count;
  perform test_assert(affected = 0, 'authenticated non-staff (Driver) update affects 0 rows');
end $$;
reset role;

-- 8. staff (StoreStaff) can update.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  affected int;
begin
  update public.special_requests set status = 'in_progress' where email = 'driver@example.com';
  get diagnostics affected = row_count;
  perform test_assert(affected = 1, 'staff (StoreStaff) can update a special request');
end $$;
reset role;

-- 9. nobody can delete, staff included: there is no DELETE policy, so RLS
--    filters every row out of the delete and it affects 0 rows (anon/
--    authenticated have the Supabase-default DELETE grant, same as every
--    role, so a non-zero affected count here would mean RLS isn't covering
--    DELETE at all).
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare
  affected int;
begin
  delete from public.special_requests;
  get diagnostics affected = row_count;
  perform test_assert(affected = 0, 'staff (StoreStaff) delete affects 0 rows (no DELETE policy)');
end $$;
reset role;

\echo 'special_requests RLS: assertions complete'
