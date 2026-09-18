begin;
do $$
declare r uuid; before_spent bigint; before_reserved bigint; denied boolean := false;
begin
 select spent_microusd,reserved_microusd into before_spent,before_reserved from public.ai_budget where id;
 r := public.reserve_ai_request();
 if (select reserved_microusd from public.ai_budget where id) <> before_reserved+1000000 then raise exception 'reservation missing'; end if;
 perform public.settle_ai_request(r,1000,1000);
 if (select spent_microusd from public.ai_budget where id) <> before_spent+2500 then raise exception 'cost mismatch'; end if;
 perform public.settle_ai_request(r,1000,1000);
 if (select spent_microusd from public.ai_budget where id) <> before_spent+2500 then raise exception 'duplicate settlement'; end if;
 update public.ai_budget set spent_microusd=189000000,reserved_microusd=0 where id;
 r := public.reserve_ai_request();
 begin perform public.reserve_ai_request(); exception when others then
   if sqlerrm <> 'AI_BUDGET_EXHAUSTED' then raise; end if; denied := true;
 end;
 if not denied then raise exception 'cap bypass'; end if;
 if (select spent_microusd+reserved_microusd from public.ai_budget where id) <> 190000000 then raise exception 'cap mismatch'; end if;
 perform public.pause_ai_budget();
 denied := false;
 begin perform public.reserve_ai_request(); exception when others then
   if sqlerrm <> 'AI_BUDGET_UNAVAILABLE' then raise; end if; denied := true;
 end;
 if not denied then raise exception 'pause bypass'; end if;
end $$;
set local role authenticated;
do $$ begin
 begin perform public.reserve_ai_request(); raise exception 'client reservation allowed'; exception when insufficient_privilege then null; end;
 begin perform public.settle_ai_request(gen_random_uuid(),0,0); raise exception 'client settlement allowed'; exception when insufficient_privilege then null; end;
 begin update public.ai_budget set spent_microusd=0; raise exception 'client budget update allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select limit_microusd/1000000.0 as cap_usd,spent_microusd,reserved_microusd,enabled from public.ai_budget;
