/* Report proof screenshots bucket (public read; authenticated upload) */
insert into storage.buckets (id, name, public)
values ('report-proofs', 'report-proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "Report proofs are publicly accessible" on storage.objects;
create policy "Report proofs are publicly accessible"
on storage.objects for select
using (bucket_id = 'report-proofs');

drop policy if exists "Authenticated users can upload report proofs" on storage.objects;
create policy "Authenticated users can upload report proofs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'report-proofs');
