begin;
alter table public.profiles add column if not exists couple_credits integer not null default 0 check(couple_credits >= 0);
alter table public.payment_orders drop constraint payment_orders_plan_check;
alter table public.payment_orders add constraint payment_orders_plan_check check(plan in ('deepdive','couple','mystic'));
create or replace function public.fulfill_palm_order(p_order_id text,p_payment_id text) returns integer
language plpgsql security definer set search_path='' as $$
declare o public.payment_orders%rowtype; balance integer;
begin
 select * into o from public.payment_orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 if o.fulfilled_at is not null then
   if o.payment_id<>p_payment_id then raise exception 'Order already fulfilled by another payment'; end if;
 else
   insert into public.profiles(user_id) values(o.user_id) on conflict do nothing;
   if o.plan='couple' then
     update public.profiles set couple_credits=couple_credits+o.credits where user_id=o.user_id;
   else
     update public.profiles set credits=credits+o.credits where user_id=o.user_id;
   end if;
   update public.payment_orders set payment_id=p_payment_id,fulfilled_at=now() where id=p_order_id;
 end if;
 select credits into balance from public.profiles where user_id=o.user_id;
 return balance;
end $$;
create or replace function public.save_paid_palm_reading(p_id uuid,p_user_id uuid,p_title text,p_reading_text text,p_mode text,p_main_focus text) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where user_id=p_user_id for update;
 if exists(select 1 from public.readings where id=p_id and user_id=p_user_id) then return p_id; end if;
 if p_main_focus='Couple compatibility' then
   update public.profiles set couple_credits=couple_credits-1 where user_id=p_user_id and couple_credits>=1;
 else
   update public.profiles set credits=credits-1 where user_id=p_user_id and credits>=1;
 end if;
 if not found then raise exception 'No matching reading credit available'; end if;
 insert into public.readings(id,user_id,title,reading_text,mode,main_focus) values(p_id,p_user_id,p_title,p_reading_text,p_mode,p_main_focus);
 return p_id;
end $$;
revoke all on function public.fulfill_palm_order(text,text) from public,anon,authenticated;
revoke all on function public.save_paid_palm_reading(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.fulfill_palm_order(text,text) to service_role;
grant execute on function public.save_paid_palm_reading(uuid,uuid,text,text,text,text) to service_role;
commit;
