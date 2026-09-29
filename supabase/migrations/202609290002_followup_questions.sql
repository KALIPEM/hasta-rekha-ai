begin;

alter table public.profiles add column if not exists question_credits integer not null default 0 check (question_credits >= 0);
alter table public.readings add column if not exists image_paths text[] not null default '{}';
alter table public.readings add column if not exists followup_questions_used integer not null default 0 check (followup_questions_used between 0 and 3);

alter table public.payment_orders drop constraint if exists payment_orders_plan_check;
alter table public.payment_orders add constraint payment_orders_plan_check check(plan in ('deepdive','couple','mystic','questions'));

insert into storage.buckets (id, name, public)
values ('palm-images', 'palm-images', false)
on conflict (id) do update set public = false;

create or replace function public.fulfill_palm_order(p_order_id text, p_payment_id text) returns integer
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
  insert into public.profiles(user_id) values(o.user_id) on conflict(user_id) do nothing;
  if o.plan = 'couple' then
    update public.profiles set couple_credits = couple_credits + o.credits where user_id = o.user_id;
  elsif o.plan = 'questions' then
    update public.profiles set question_credits = question_credits + o.credits where user_id = o.user_id;
  else
    update public.profiles set credits = credits + o.credits where user_id = o.user_id;
  end if;
  update public.payment_orders set payment_id = p_payment_id, fulfilled_at = now() where id = p_order_id;
  select credits into balance from public.profiles where user_id = o.user_id;
  return balance;
end $$;

drop function if exists public.save_paid_palm_reading(uuid,uuid,text,text,text,text,integer);
drop function if exists public.save_paid_palm_reading(uuid,uuid,text,text,text,text);
create function public.save_paid_palm_reading(
  p_id uuid, p_user_id uuid, p_title text, p_reading_text text, p_mode text, p_main_focus text,
  p_hands_read integer, p_image_paths text[] default '{}'
) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.profiles where user_id = p_user_id for update;
  if exists(select 1 from public.readings where id = p_id and user_id = p_user_id) then return p_id; end if;
  if p_main_focus = 'Couple compatibility' then
    update public.profiles set couple_credits = couple_credits - 1 where user_id = p_user_id and couple_credits >= 1;
  else
    update public.profiles set credits = credits - 1 where user_id = p_user_id and credits >= 1;
  end if;
  if not found then raise exception 'No matching reading credit available'; end if;
  insert into public.readings(id,user_id,title,reading_text,mode,main_focus,image_paths)
    values(p_id,p_user_id,p_title,p_reading_text,p_mode,p_main_focus,coalesce(p_image_paths,'{}'));
  return p_id;
end $$;

revoke all on function public.fulfill_palm_order(text,text) from public, anon, authenticated;
grant execute on function public.fulfill_palm_order(text,text) to service_role;
revoke all on function public.save_paid_palm_reading(uuid,uuid,text,text,text,text,integer,text[]) from public, anon, authenticated;
grant execute on function public.save_paid_palm_reading(uuid,uuid,text,text,text,text,integer,text[]) to service_role;

create or replace function public.consume_reading_followup(p_reading_id uuid, p_user_id uuid)
returns table(free_remaining integer, paid_remaining integer, used_paid boolean)
language plpgsql security definer set search_path = '' as $$
declare r public.readings%rowtype; p public.profiles%rowtype;
begin
  select * into r from public.readings where id = p_reading_id and user_id = p_user_id for update;
  if not found then raise exception 'Reading not found'; end if;
  insert into public.profiles(user_id) values(p_user_id) on conflict(user_id) do nothing;
  select * into p from public.profiles where user_id = p_user_id for update;
  if r.followup_questions_used < 3 then
    update public.readings set followup_questions_used = followup_questions_used + 1 where id = p_reading_id;
    return query select 3 - r.followup_questions_used - 1, p.question_credits, false;
  elsif p.question_credits > 0 then
    update public.profiles set question_credits = question_credits - 1 where user_id = p_user_id;
    return query select 0, p.question_credits - 1, true;
  else
    raise exception 'No follow-up questions remaining';
  end if;
end $$;
revoke all on function public.consume_reading_followup(uuid,uuid) from public, anon, authenticated;
grant execute on function public.consume_reading_followup(uuid,uuid) to service_role;
commit;
