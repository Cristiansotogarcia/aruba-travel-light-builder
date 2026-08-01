-- Security hardening applied to production 2026-08-01.
-- 1) Remove permissive "allow all" policies on bookings/booking_items: combined with RLS
--    they granted anon full read/write/delete on both tables (June 2026 audit critical).
-- 2) Restrict Driver/Booker profile visibility to authenticated users: the policies were
--    created without a role restriction, exposing staff id/name/email/role to anon.
-- Idempotent: safe to re-run and safe on databases where these policies never existed.

drop policy if exists "Allow all operations on bookings" on public.bookings;
drop policy if exists "Allow all operations on booking_items" on public.booking_items;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'Profiles: Authenticated users can view Driver profiles'
  ) then
    alter policy "Profiles: Authenticated users can view Driver profiles"
      on public.profiles to authenticated;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'Profiles: Authenticated users can view Booker profiles'
  ) then
    alter policy "Profiles: Authenticated users can view Booker profiles"
      on public.profiles to authenticated;
  end if;
end $$;
