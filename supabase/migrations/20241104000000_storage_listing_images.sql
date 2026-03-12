/* Listing photos bucket (public read; authenticated upload) */
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

/* Anyone can view listing images (public bucket) */
create policy "Listing images are publicly accessible"
on storage.objects for select
using (bucket_id = 'listing-images');

/* Authenticated users can upload listing images */
create policy "Authenticated users can upload listing images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'listing-images');
