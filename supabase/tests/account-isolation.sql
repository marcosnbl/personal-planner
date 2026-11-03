-- Development/staging only. Run AFTER the migration using SQL Editor (admin).
-- The transaction is rolled back, including the temporary test users.
begin;
select set_config('test.account_a',gen_random_uuid()::text,true);
select set_config('test.account_b',gen_random_uuid()::text,true);
insert into auth.users(id,email) values
 (current_setting('test.account_a')::uuid,'qa-a-'||current_setting('test.account_a')||'@example.invalid'),
 (current_setting('test.account_b')::uuid,'qa-b-'||current_setting('test.account_b')||'@example.invalid');
create function pg_temp.assert_true(ok boolean, description text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',description; end if; end; $$;
create function pg_temp.expect_error(query text, expected text) returns void language plpgsql as $$
begin
 begin execute query;
 exception when others then
  if position(expected in SQLERRM)>0 then return; end if;
  raise;
 end;
 raise exception 'Expected error containing %',expected;
end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.account_a'),true);
select public.save_training_document(current_setting('test.account_a')::uuid,0,'{"version":2,"workouts":[],"templates":[]}'::jsonb);
select pg_temp.assert_true((select count(*)=1 from public.training_documents),'A reads own document');
select pg_temp.expect_error(format('select public.save_training_document(%L::uuid,0,%L::jsonb)',current_setting('test.account_a'),'{"version":2,"workouts":[],"templates":[]}'),'SYNC_CONFLICT');
select set_config('request.jwt.claim.sub',current_setting('test.account_b'),true);
select pg_temp.assert_true((select count(*)=0 from public.training_documents),'B cannot read A');
select pg_temp.expect_error(format('select public.save_training_document(%L::uuid,1,%L::jsonb)',current_setting('test.account_a'),'{"version":2,"workouts":[],"templates":[]}'),'ACCOUNT_MISMATCH');
select pg_temp.expect_error('update public.training_documents set revision=100','permission denied');
select public.save_training_document(current_setting('test.account_b')::uuid,0,'{"version":2,"workouts":[],"templates":[]}'::jsonb);
select pg_temp.assert_true((select count(*)=1 from public.training_documents),'B only reads own document');
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.expect_error('select * from public.training_documents','permission denied');
select pg_temp.expect_error(format('select public.save_training_document(%L::uuid,0,%L::jsonb)',current_setting('test.account_a'),'{"version":2,"workouts":[],"templates":[]}'),'permission denied');
reset role;
rollback;
