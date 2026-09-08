-- 009 — Bucket privado + RLS Storage + retenção LGPD
-- Torna analysis-photos privado e restringe a dono + profissionais
-- Requer bucket criado (setup_complete.sql)

-- 1) Tornar bucket não-público
update storage.buckets set public = false where id = 'analysis-photos';

-- 2) Policies para storage.objects (se não existirem)
drop policy if exists "Users can read own photos" on storage.objects;
create policy "Users can read own photos"
on storage.objects for select to authenticated
using (bucket_id = 'analysis-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload own photos" on storage.objects;
create policy "Users can upload own photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'analysis-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own photos" on storage.objects;
create policy "Users can delete own photos"
on storage.objects for delete to authenticated
using (bucket_id = 'analysis-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Professionals can read all photos" on storage.objects;
create policy "Professionals can read all photos"
on storage.objects for select to authenticated
using (bucket_id = 'analysis-photos' and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('professional','admin')));

-- avatars (perfil)
update storage.buckets set public = false where id = 'avatars';
drop policy if exists "Users can manage own avatar" on storage.objects;
create policy "Users can manage own avatar"
on storage.objects for all to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
