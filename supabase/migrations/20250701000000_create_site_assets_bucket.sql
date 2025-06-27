-- Create bucket for storing site assets
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

-- Ensure row level security policies for the bucket
create policy "Site assets read" on storage.objects
  for select using (bucket_id = 'site-assets');

create policy "Site assets write" on storage.objects
  for all using (
    bucket_id = 'site-assets' and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin','SuperUser'))
  );
