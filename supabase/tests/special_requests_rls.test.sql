-- supabase/tests/special_requests_rls.test.sql
--
-- Exercises the policies in supabase/migrations/20261029200000_special_requests.sql
-- against a real Postgres (run after special_requests_rls.setup.sql in the same
-- session; see run-special-requests-rls.sh). Assertions encode the INTENDED
-- contract ("anon and authenticated can insert; only staff can select and
-- update; there is no delete"), including the shape the real client path
-- uses: supabase-js's `.insert(payload).select().single()` compiles to an
-- `INSERT ... RETURNING *`, which under RLS additionally requires the
-- inserting role to have a SELECT policy covering the new row — that is
-- deliberately tested here too (tests 1a/1b), not just a bare INSERT.
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

-- 1a. anon can insert AND get the row back the way the real client does:
--     supabase-js's submitSpecialRequest() does
--     `.insert(payload).select().single()`, i.e. INSERT ... RETURNING *.
--     Under RLS this additionally requires a SELECT policy covering the
--     inserting role, which special_requests does not have for anon.
set role anon;
do $$
declare
  new_id uuid;
begin
  begin
    insert into public.special_requests (name, email, request_type, message)
    values ('Anon Visitor', 'anon@example.com', 'general', 'Testing anon insert+select')
    returning id into new_id;
    perform test_assert(new_id is not null,
      'anon INSERT...RETURNING (the real insert().select() path) succeeds and persists the row');
  exception when others then
    raise warning 'anon INSERT...RETURNING failed: % (%)', sqlerrm, sqlstate;
    perform test_assert(false,
      'anon INSERT...RETURNING (the real insert().select() path) succeeds and persists the row');
  end;
end $$;
reset role;

-- 1b. Lower-level check, isolating the WITH CHECK validation itself from the
--     1a RETURNING/SELECT-policy interaction: a bare INSERT with no
--     RETURNING, as anon, does persist a row.
set role anon;
do $$
begin
  insert into public.special_requests (name, email, request_type, message)
  values ('Anon Visitor (bare insert)', 'anon-bare@example.com', 'general', 'Testing anon bare insert');
end $$;
reset role;
do $$
declare
  persisted boolean;
begin
  select exists(select 1 from public.special_requests where email = 'anon-bare@example.com') into persisted;
  perform test_assert(persisted, 'a bare anon INSERT (no RETURNING) persists the row');
end $$;

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

-- Rows committed so far: anon-bare@example.com, driver@example.com, and
-- (once 1a is fixed) anon@example.com. 'Bad Status' never committed.

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
