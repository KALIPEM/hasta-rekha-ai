begin;

alter table public.readings
  add column if not exists hands_read integer not null default 1
  check (hands_read between 1 and 4);

drop function if exists public.save_paid_palm_reading(uuid,uuid,text,text,text,text);
create function public.save_paid_palm_reading(
  p_id uuid,
  p_user_id uuid,
  p_title text,
  p_reading_text text,
  p_mode text,
  p_main_focus text,
  p_hands_read integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if p_hands_read < 1 or p_hands_read > 4 then raise exception 'Invalid hand count'; end if;
  perform 1 from public.profiles where user_id = p_user_id for update;
  if exists(select 1 from public.readings where id = p_id and user_id = p_user_id) then return p_id; end if;
  if p_main_focus = 'Couple compatibility' then
    update public.profiles set couple_credits = couple_credits - 1 where user_id = p_user_id and couple_credits >= 1;
  else
    update public.profiles set credits = credits - 1 where user_id = p_user_id and credits >= 1;
  end if;
  if not found then raise exception 'No matching reading credit available'; end if;
  insert into public.readings(id,user_id,title,reading_text,mode,main_focus,hands_read)
    values(p_id,p_user_id,p_title,p_reading_text,p_mode,p_main_focus,p_hands_read);
  return p_id;
end $$;

revoke all on function public.save_paid_palm_reading(uuid,uuid,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.save_paid_palm_reading(uuid,uuid,text,text,text,text,integer) to service_role;

create or replace function public.get_total_hands_read() returns bigint
language sql security definer set search_path = '' as $$
  select coalesce(sum(hands_read), 0)::bigint from public.readings;
$$;
revoke all on function public.get_total_hands_read() from public,anon,authenticated;
grant execute on function public.get_total_hands_read() to anon,authenticated;

commit;
