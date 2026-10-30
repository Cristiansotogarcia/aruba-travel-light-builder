-- supabase/tests/special_requests_rls.setup.sql
--
-- Minimal schema stub so the policies in
-- supabase/migrations/20261029200000_special_requests.sql can be exercised
-- against a real Postgres instance (see run-special-requests-rls.sh), without
-- pulling the full local Supabase stack. Mirrors just the pieces those
-- policies actually touch:
--   - auth.uid(), reading the same session setting Supabase's Postgres sets
--     from the request JWT.
--   - public.app_role and public.profiles, from
--     supabase/migrations/20240618120000_init_tables.sql plus the StoreStaff
--     value from 20260604000002_w2_storestaff_role.sql.
--   - the anon / authenticated roles PostgREST connects as.

create schema if not exists auth;

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create role anon nologin;
create role authenticated nologin;

-- Supabase projects grant anon/authenticated ALL privileges on every public
-- table by default (set once at project bootstrap, outside of tracked
-- migrations) and rely on RLS alone to restrict access. Replicate that here
-- so this test exercises the same layer the real project does: RLS, not an
-- incidental table-level GRANT a migration happened to add.
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;

create type public.app_role as enum ('SuperUser', 'Admin', 'Booker', 'Driver');
alter type public.app_role add value 'StoreStaff';

create table public.profiles (
  id uuid primary key,
  name text not null,
  role public.app_role not null default 'Booker',
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  needs_password_change boolean default false,
  is_deactivated boolean default false
);

-- run-special-requests-rls.sh concatenates the real
-- ../migrations/20261029200000_special_requests.sql onto this file before
-- piping it to psql, so the policies under test are the actual migration,
-- not a copy of it.
