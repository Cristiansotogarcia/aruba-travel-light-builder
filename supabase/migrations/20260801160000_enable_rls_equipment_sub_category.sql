-- Enable RLS on equipment_sub_category (the only table found with RLS off on live prod,
-- 2026-08-01 audit). Low risk: contents are public catalog data. Mirror exactly how
-- equipment_category is handled (see 20260627202800_add_category_to_equipment.sql):
-- admins/superusers manage all rows, everyone can read.
-- Idempotent: safe to re-run.

alter table public.equipment_sub_category enable row level security;

drop policy if exists "Admins can manage all equipment sub categories" on public.equipment_sub_category;
drop policy if exists "Public can view all equipment sub categories" on public.equipment_sub_category;

-- Policy for Admins/SuperUsers to manage sub categories
create policy "Admins can manage all equipment sub categories"
on public.equipment_sub_category
for all
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and role in ('Admin', 'SuperUser')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and role in ('Admin', 'SuperUser')
  )
);

-- Policy for public to view sub categories
create policy "Public can view all equipment sub categories"
on public.equipment_sub_category
for select
using (true);
