-- Магазин косметики + монеты. Выполни один раз: Supabase → SQL Editor → вставить → Run.
-- Баланс и покупки меняются ТОЛЬКО через функции ниже (клиент напрямую писать в таблицы не может).
-- Админ (выдача монет) определяется на сервере по email из токена — подделать в браузере нельзя.

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins   bigint not null default 0 check (coins >= 0)
);
create table if not exists public.shop_items (
  id     text primary key,
  kind   text not null check (kind in ('frame','banner','hat','fx')),
  name   text not null,
  descr  text,
  price  integer not null check (price >= 0),
  data   jsonb not null default '{}',
  active boolean not null default true,
  sort   integer not null default 0
);
create table if not exists public.inventory (
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_id    text not null references public.shop_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create table if not exists public.profile_cosmetics (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  frame      text, banner text, hat text, fx text,
  updated_at timestamptz not null default now()
);
create table if not exists public.coin_log (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  delta      bigint not null,
  reason     text,
  by_user    uuid,
  created_at timestamptz not null default now()
);

alter table public.wallets          enable row level security;
alter table public.shop_items       enable row level security;
alter table public.inventory        enable row level security;
alter table public.profile_cosmetics enable row level security;
alter table public.coin_log         enable row level security;

drop policy if exists wallets_read on public.wallets;
drop policy if exists items_read   on public.shop_items;
drop policy if exists inv_read     on public.inventory;
drop policy if exists cos_read     on public.profile_cosmetics;
drop policy if exists log_read     on public.coin_log;
create policy wallets_read on public.wallets          for select to authenticated using (user_id = auth.uid());
create policy items_read   on public.shop_items       for select to authenticated using (active);
create policy inv_read     on public.inventory        for select to authenticated using (user_id = auth.uid());
create policy cos_read     on public.profile_cosmetics for select to authenticated using (true);   -- чужую косметику видят все
create policy log_read     on public.coin_log         for select to authenticated using (user_id = auth.uid());
-- политик на insert/update/delete нет → прямые записи с клиента запрещены

-- ---------- админ ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'gamemk64@gmail.com'
$$;

-- ---------- кошелёк ----------
create or replace function public.my_wallet() returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if auth.uid() is null then raise exception 'no_session'; end if;
  insert into wallets(user_id) values (auth.uid()) on conflict do nothing;
  select coins into v from wallets where user_id = auth.uid();
  return v;
end $$;

-- ---------- покупка ----------
create or replace function public.buy_item(p_item text) returns bigint
language plpgsql security definer set search_path = public as $$
declare it shop_items; bal bigint;
begin
  if auth.uid() is null then raise exception 'no_session'; end if;
  select * into it from shop_items where id = p_item and active;
  if not found then raise exception 'no_item'; end if;
  if exists (select 1 from inventory where user_id = auth.uid() and item_id = p_item) then raise exception 'owned'; end if;
  insert into wallets(user_id) values (auth.uid()) on conflict do nothing;
  select coins into bal from wallets where user_id = auth.uid() for update;
  if bal < it.price then raise exception 'no_coins'; end if;
  update wallets set coins = coins - it.price where user_id = auth.uid();
  insert into inventory(user_id, item_id) values (auth.uid(), p_item);
  insert into coin_log(user_id, delta, reason) values (auth.uid(), -it.price, 'buy:' || p_item);
  return bal - it.price;
end $$;

-- ---------- надеть / снять (p_item = null → снять) ----------
create or replace function public.equip_item(p_kind text, p_item text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'no_session'; end if;
  if p_kind not in ('frame','banner','hat','fx') then raise exception 'bad_kind'; end if;
  if p_item is not null and not exists (
    select 1 from inventory i join shop_items s on s.id = i.item_id
    where i.user_id = auth.uid() and i.item_id = p_item and s.kind = p_kind
  ) then raise exception 'not_owned'; end if;
  insert into profile_cosmetics(user_id) values (auth.uid()) on conflict do nothing;
  update profile_cosmetics set
    frame  = case when p_kind = 'frame'  then p_item else frame  end,
    banner = case when p_kind = 'banner' then p_item else banner end,
    hat    = case when p_kind = 'hat'    then p_item else hat    end,
    fx     = case when p_kind = 'fx'     then p_item else fx     end,
    updated_at = now()
  where user_id = auth.uid();
end $$;

-- ---------- только админ ----------
create or replace function public.admin_users(p_q text) returns table(id uuid, nick text, coins bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_admin'; end if;
  return query
    select p.id, p.nick, coalesce(w.coins, 0)
    from profiles p left join wallets w on w.user_id = p.id
    where p_q is null or p_q = '' or p.nick ilike '%' || replace(replace(replace(p_q, '\', '\\'), '%', '\%'), '_', '\_') || '%'
    order by p.nick limit 30;
end $$;

create or replace function public.admin_grant(p_user uuid, p_amount bigint, p_note text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if not is_admin() then raise exception 'not_admin'; end if;
  if p_amount = 0 or abs(p_amount) > 1000000 then raise exception 'bad_amount'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'no_user'; end if;
  insert into wallets(user_id) values (p_user) on conflict do nothing;
  update wallets set coins = coins + p_amount where user_id = p_user returning coins into v;
  insert into coin_log(user_id, delta, reason, by_user) values (p_user, p_amount, coalesce(p_note, 'admin'), auth.uid());
  return v;
exception when check_violation then raise exception 'no_coins';
end $$;

revoke all on function public.is_admin(), public.my_wallet(), public.buy_item(text), public.equip_item(text,text),
  public.admin_users(text), public.admin_grant(uuid,bigint,text) from public, anon;
grant execute on function public.is_admin(), public.my_wallet(), public.buy_item(text), public.equip_item(text,text),
  public.admin_users(text), public.admin_grant(uuid,bigint,text) to authenticated;

-- ---------- товары (можно добавлять свои) ----------
insert into public.shop_items (id, kind, name, descr, price, data, sort) values
 ('fr_gold',   'frame',  'Золотое кольцо',   'Мерцающая золотая рамка',        50,  '{"c1":"#f2b84b","c2":"#fff2c2"}', 10),
 ('fr_neon',   'frame',  'Неон',             'Переливающийся неон',            80,  '{"c1":"#00f0ff","c2":"#ff2bd6"}', 11),
 ('fr_blood',  'frame',  'Кровавая луна',    'Тёмно-красная пульсация',        120, '{"c1":"#8b0000","c2":"#ff3b3b"}', 12),
 ('bn_black',  'banner', 'Чёрный вайб',      'Глубокий чёрно-фиолетовый фон',  60,  '{"c1":"#050505","c2":"#1a0b2e","c3":"#2b2b2b"}', 20),
 ('bn_hallow', 'banner', 'Хэллоуин',         'Оранжево-чёрный закат',          100, '{"c1":"#120800","c2":"#ff7a00","c3":"#2a0a3a"}', 21),
 ('bn_ny',     'banner', 'Новый год',        'Холодный зимний фон',            100, '{"c1":"#06203f","c2":"#1e6fd9","c3":"#c8e6ff"}', 22),
 ('bn_kaizo',  'banner', 'Казайс-стиль',     'Кислотный градиент',             150, '{"c1":"#ff00aa","c2":"#00ffd0","c3":"#fff200"}', 23),
 ('ht_santa',  'hat',    'Шапка Деда Мороза','Новогодняя шапка на аватарке',   70,  '{"emoji":"🎅"}', 30),
 ('ht_witch',  'hat',    'Ведьмина шляпа',   'Для Хэллоуина',                  70,  '{"emoji":"🧙"}', 31),
 ('ht_crown',  'hat',    'Корона',           'Королевский вид',                200, '{"emoji":"👑"}', 32),
 ('fx_snow',   'fx',     'Снегопад',         'Снег на всём сайте',             120, '{"emoji":"❄","count":22}', 40),
 ('fx_pumpkin','fx',     'Тыквы',            'Падающие тыквы',                 120, '{"emoji":"🎃","count":14}', 41),
 ('fx_notes',  'fx',     'Ноты',             'Летящие вверх ноты',             90,  '{"emoji":"♪","count":20,"rise":true}', 42),
 ('fx_bats',   'fx',     'Летучие мыши',     'Тёмный вайб',                    130, '{"emoji":"🦇","count":12,"rise":true}', 43)
on conflict (id) do nothing;
