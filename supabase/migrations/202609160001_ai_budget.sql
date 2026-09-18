-- A cumulative USD cap. No monthly reset; pending requests always count.
begin;
create table public.ai_budget (
  id boolean primary key default true check(id),
  limit_microusd bigint not null default 190000000 check(limit_microusd between 0 and 190000000),
  spent_microusd bigint not null default 0 check(spent_microusd >= 0),
  reserved_microusd bigint not null default 0 check(reserved_microusd >= 0),
  enabled boolean not null default true,
  expires_at timestamptz not null default '2026-12-14 00:00:00+00',
  check(spent_microusd + reserved_microusd <= limit_microusd)
);
insert into public.ai_budget(id) values(true);
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  reserved_microusd bigint not null default 1000000 check(reserved_microusd = 1000000),
  charged_microusd bigint check(charged_microusd between 0 and 1000000),
  prompt_tokens integer, completion_tokens integer,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
alter table public.ai_budget enable row level security;
alter table public.ai_usage enable row level security;
revoke all on public.ai_budget, public.ai_usage from public, anon, authenticated;
grant select on public.ai_budget, public.ai_usage to service_role;

create function public.reserve_ai_request() returns uuid
language plpgsql security definer set search_path = '' as $$
declare b public.ai_budget%rowtype; request_id uuid;
begin
  select * into b from public.ai_budget where id = true for update;
  if not found or not b.enabled or now() >= b.expires_at then
    raise exception 'AI_BUDGET_UNAVAILABLE';
  end if;
  if b.spent_microusd + b.reserved_microusd + 1000000 > b.limit_microusd then
    raise exception 'AI_BUDGET_EXHAUSTED';
  end if;
  insert into public.ai_usage default values returning id into request_id;
  update public.ai_budget set reserved_microusd = reserved_microusd + 1000000 where id = true;
  return request_id;
end $$;

create function public.settle_ai_request(p_id uuid, p_prompt_tokens integer, p_completion_tokens integer) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.ai_usage%rowtype; charge bigint;
begin
  -- Same lock ordering as reservation serializes parallel requests.
  perform 1 from public.ai_budget where id = true for update;
  select * into r from public.ai_usage where id = p_id for update;
  if not found then raise exception 'AI_REQUEST_NOT_FOUND'; end if;
  if r.settled_at is not null then return; end if;
  if p_prompt_tokens is null or p_completion_tokens is null or p_prompt_tokens < 0 or p_prompt_tokens > 1047576 or p_completion_tokens < 0 or p_completion_tokens > 3000 then
    raise exception 'AI_USAGE_INVALID';
  end if;
  -- GPT-4.1 mini Global Standard: $0.40/M input, $1.60/M output.
  -- Charge cached input at full rate and keep a 25% buffer.
  charge := ceil((p_prompt_tokens::numeric * 0.4 + p_completion_tokens::numeric * 1.6) * 1.25);
  if charge > r.reserved_microusd then raise exception 'AI_USAGE_EXCEEDS_RESERVATION'; end if;
  update public.ai_budget set reserved_microusd = reserved_microusd - r.reserved_microusd,
    spent_microusd = spent_microusd + charge where id = true;
  update public.ai_usage set charged_microusd = charge, prompt_tokens = p_prompt_tokens,
    completion_tokens = p_completion_tokens, settled_at = now() where id = p_id;
end $$;

create function public.pause_ai_budget() returns void
language sql security definer set search_path = '' as $$
  update public.ai_budget set enabled = false where id = true;
$$;
revoke all on function public.reserve_ai_request(), public.settle_ai_request(uuid,integer,integer), public.pause_ai_budget() from public, anon, authenticated;
grant execute on function public.reserve_ai_request(), public.settle_ai_request(uuid,integer,integer), public.pause_ai_budget() to service_role;
commit;
