-- Transaction-only integration checks; all fixtures are rolled back.
begin;
insert into auth.users(id,email) values
 ('aaaaaaaa-1111-4111-8111-111111111111','hasta-test-a@example.invalid'),
 ('bbbbbbbb-2222-4222-8222-222222222222','hasta-test-b@example.invalid');
insert into public.readings(id,user_id,title,reading_text) values
 ('aaaaaaaa-3333-4333-8333-333333333333','aaaaaaaa-1111-4111-8111-111111111111','A test','{}'),
 ('bbbbbbbb-4444-4444-8444-444444444444','bbbbbbbb-2222-4222-8222-222222222222','B test','{}');
insert into public.payment_orders(id,user_id,plan,amount,credits) values
 ('test_hasta_order','aaaaaaaa-1111-4111-8111-111111111111','mystic',6000,5);
select public.fulfill_palm_order('test_hasta_order','test_hasta_payment');
select public.fulfill_palm_order('test_hasta_order','test_hasta_payment');
do $$ begin
 if (select credits from public.profiles where user_id='aaaaaaaa-1111-4111-8111-111111111111') <> 5 then raise exception 'Payment replay added credits twice'; end if;
end $$;
select public.save_paid_palm_reading('aaaaaaaa-5555-4555-8555-555555555555','aaaaaaaa-1111-4111-8111-111111111111','Paid test','{}','standard','Overall life path');
select public.save_paid_palm_reading('aaaaaaaa-5555-4555-8555-555555555555','aaaaaaaa-1111-4111-8111-111111111111','Paid test','{}','standard','Overall life path');
do $$ begin
 if (select credits from public.profiles where user_id='aaaaaaaa-1111-4111-8111-111111111111') <> 4 then raise exception 'Reading replay charged twice'; end if;
 begin
  perform public.save_paid_palm_reading('bbbbbbbb-6666-4666-8666-666666666666','bbbbbbbb-2222-4222-8222-222222222222','No credit','{}','standard','Overall life path');
  raise exception 'FAIL: zero credit allowed';
 exception when raise_exception then
  if SQLERRM = 'FAIL: zero credit allowed' then raise; end if;
 end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-1111-4111-8111-111111111111',true);
do $$ declare n integer; begin
 select count(*) into n from public.readings;
 if n <> 2 then raise exception 'Isolation failed: expected only user A reports'; end if;
 update public.readings set title='renamed' where id='aaaaaaaa-3333-4333-8333-333333333333';
 if not found then raise exception 'Own title update failed'; end if;
 update public.readings set title='forbidden' where id='bbbbbbbb-4444-4444-8444-444444444444';
 if found then raise exception 'Cross-user update allowed'; end if;
 delete from public.readings where id='bbbbbbbb-4444-4444-8444-444444444444';
 if found then raise exception 'Cross-user delete allowed'; end if;
 begin
  insert into public.readings(user_id,reading_text) values('bbbbbbbb-2222-4222-8222-222222222222','{}');
  raise exception 'Cross-user insert allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.profiles set credits=500;
  raise exception 'Client credit update allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.fulfill_palm_order('test_hasta_order','test_hasta_payment');
  raise exception 'Client payment RPC allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform 1 from public.readings;
  raise exception 'Anonymous read allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'PASS: ownership, anonymous access, credit protection, payment replay, and atomic reading charge' as result;

