-- Compartilha a foto atual do perfil com pessoas autenticadas no fórum.
insert into storage.buckets (id, name, public)
values ('forum-images', 'forum-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Forum images are publicly readable" on storage.objects;
create policy "Forum images are publicly readable"
  on storage.objects for select using (bucket_id = 'forum-images');

drop policy if exists "Forum users upload own images" on storage.objects;
create policy "Forum users upload own images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'forum-images' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.forum_profile_photos (
  user_id uuid primary key references auth.users (id) on delete cascade,
  photo_url text,
  updated_at timestamptz not null default now()
);

alter table public.forum_profile_photos enable row level security;
revoke all on public.forum_profile_photos from public, anon, authenticated;
grant select, insert, update on public.forum_profile_photos to authenticated;

drop policy if exists "Forum members read profile photos" on public.forum_profile_photos;
create policy "Forum members read profile photos"
  on public.forum_profile_photos for select to authenticated
  using (true);

drop policy if exists "Users add own forum profile photo" on public.forum_profile_photos;
create policy "Users add own forum profile photo"
  on public.forum_profile_photos for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own forum profile photo" on public.forum_profile_photos;
create policy "Users update own forum profile photo"
  on public.forum_profile_photos for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
