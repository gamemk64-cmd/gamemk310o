-- Облачная синхронизация библиотеки. Supabase → SQL Editor → вставь всё → Run.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create table if not exists public.user_tracks (
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null,
  meta jsonb not null default '{}',
  file_path text,
  cover_path text,
  updated_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
alter table public.user_data enable row level security;
alter table public.user_tracks enable row level security;
drop policy if exists user_data_own on public.user_data;
create policy user_data_own on public.user_data for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists user_tracks_own on public.user_tracks;
create policy user_tracks_own on public.user_tracks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- приватное хранилище для mp3/обложек (50 МБ на файл — лимит бесплатного плана)
insert into storage.buckets (id, name, public, file_size_limit)
values ('tracks', 'tracks', false, 52428800) on conflict (id) do nothing;
drop policy if exists mp_user_files on storage.objects;
create policy mp_user_files on storage.objects for all to authenticated
  using (bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'tracks' and (storage.foldername(name))[1] = auth.uid()::text);
