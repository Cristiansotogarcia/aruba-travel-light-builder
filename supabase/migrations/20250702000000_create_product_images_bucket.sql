-- Create bucket for storing product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Row level security policies for product images
create policy "Product images read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "Product images write" on storage.objects
  for all using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('Admin','SuperUser')
    )
  );
