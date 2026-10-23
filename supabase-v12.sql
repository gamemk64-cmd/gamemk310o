-- v12: раздел «Люди». Выполни один раз: Supabase → SQL Editor → вставить → Run.

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nick       text not null check (char_length(nick) between 2 and 24),
  share      boolean not null default false,
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_nick_lower on public.profiles (lower(nick));

create table if not exists public.shared_tracks (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  tkey       text not null,
  title      text not null,
  artist     text,
  album      text,
  dur        integer,
  curl       text,
  kind       text not null check (kind in ('yt','web','local')),
  payload    jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, tkey)
);
create index if not exists shared_tracks_user on public.shared_tracks (user_id, created_at desc);

create table if not exists public.track_likes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  track_id   bigint not null references public.shared_tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

alter table public.profiles      enable row level security;
alter table public.shared_tracks enable row level security;
alter table public.track_likes   enable row level security;

-- профили: видны вошедшим пользователям, если человек открыл музыку (или это он сам)
drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_write  on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_read   on public.profiles for select to authenticated using (share = true or id = auth.uid());
create policy profiles_write  on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- песни: читать можно у тех, кто открыл музыку; менять — только свои
drop policy if exists tracks_read   on public.shared_tracks;
drop policy if exists tracks_write  on public.shared_tracks;
drop policy if exists tracks_update on public.shared_tracks;
drop policy if exists tracks_delete on public.shared_tracks;
create policy tracks_read   on public.shared_tracks for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = user_id and p.share = true));
create policy tracks_write  on public.shared_tracks for insert to authenticated with check (user_id = auth.uid());
create policy tracks_update on public.shared_tracks for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tracks_delete on public.shared_tracks for delete to authenticated using (user_id = auth.uid());

-- лайки: счётчик видят все вошедшие, ставить и снимать — только свои
drop policy if exists likes_read   on public.track_likes;
drop policy if exists likes_write  on public.track_likes;
drop policy if exists likes_delete on public.track_likes;
create policy likes_read   on public.track_likes for select to authenticated using (true);
create policy likes_write  on public.track_likes for insert to authenticated with check (user_id = auth.uid());
create policy likes_delete on public.track_likes for delete to authenticated using (user_id = auth.uid());
