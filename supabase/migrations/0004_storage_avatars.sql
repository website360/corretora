-- ============================================================================
-- Storage bucket for avatars / logos (public read, authenticated write).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Public can read avatars; authenticated users can upload/replace/remove.
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars authenticated insert" on storage.objects;
create policy "avatars authenticated insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "avatars authenticated update" on storage.objects;
create policy "avatars authenticated update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');

drop policy if exists "avatars authenticated delete" on storage.objects;
create policy "avatars authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars');
