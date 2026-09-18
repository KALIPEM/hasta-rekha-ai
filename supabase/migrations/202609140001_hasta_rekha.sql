-- Hasta Rekha: private reports and server-owned payment credits.
begin;
create table public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My palm reading' check (char_length(title) between 1 and 100),
  reading_text text not null check (char_length(reading_text) between 1 and 60000),
  mode text not null default 'standard' check (mode in ('standard','roast')),
  main_focus text not null default 'Overall life path' check (char_length(main_focus) <= 100),
  created_at timestamptz not null default now()
);
create index readings_user_created_idx on public.readings(user_id, created_at desc);
alter table public.readings enable row level security;
revoke all on public.readings from anon, authenticated;
grant select, insert, delete on public.readings to authenticated;
grant update(title) on public.readings to authenticated;
grant all on public.readings to service_role;
create policy readings_select_own on public.readings for select to authenticated using ((select auth.uid()) = user_id);
create policy readings_insert_own on public.readings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy readings_update_own on public.readings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy readings_delete_own on public.readings for delete to authenticated using ((select auth.uid()) = user_id);
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0 check (credits >= 0)
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create table public.payment_orders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('mystic','deepdive')),
  amount integer not null check (amount > 0),
  credits integer not null check (credits in (1,5)),
  currency text not null default 'INR' check (currency = 'INR'),
  payment_id text unique,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now()
);
create index payment_orders_user_idx on public.payment_orders(user_id);
alter table public.payment_orders enable row level security;
revoke all on public.payment_orders from anon, authenticated;
grant all on public.payment_orders to service_role;
create function public.fulfill_palm_order(p_order_id text, p_payment_id text) returns integer
language plpgsql security definer set search_path = '' as $$
declare o public.payment_orders%rowtype; balance integer;
begin
  select * into o from public.payment_orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.fulfilled_at is not null then
    if o.payment_id <> p_payment_id then raise exception 'Order already fulfilled by another payment'; end if;
    select credits into balance from public.profiles where user_id = o.user_id;
    return balance;
  end if;
  insert into public.profiles(user_id, credits) values(o.user_id, o.credits)
    on conflict(user_id) do update set credits = public.profiles.credits + excluded.credits
    returning credits into balance;
  update public.payment_orders set payment_id = p_payment_id, fulfilled_at = now() where id = p_order_id;
  return balance;
end $$;
revoke all on function public.fulfill_palm_order(text,text) from public, anon, authenticated;
grant execute on function public.fulfill_palm_order(text,text) to service_role;
create function public.save_paid_palm_reading(p_id uuid, p_user_id uuid, p_title text, p_reading_text text, p_mode text, p_main_focus text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.profiles where user_id = p_user_id for update;
  if exists(select 1 from public.readings where id = p_id and user_id = p_user_id) then return p_id; end if;
  update public.profiles set credits = credits - 1 where user_id = p_user_id and credits >= 1;
  if not found then raise exception 'No reading credits available'; end if;
  insert into public.readings(id,user_id,title,reading_text,mode,main_focus)
    values(p_id,p_user_id,p_title,p_reading_text,p_mode,p_main_focus);
  return p_id;
end $$;
revoke all on function public.save_paid_palm_reading(uuid,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.save_paid_palm_reading(uuid,uuid,text,text,text,text) to service_role;
commit;

