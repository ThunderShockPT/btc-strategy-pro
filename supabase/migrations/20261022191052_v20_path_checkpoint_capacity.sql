-- Prepared only. Preserve facts, deadlines, RLS and immutable job origins.
begin;
alter table btcsp_private.calculation_jobs drop constraint calculation_jobs_sequence_check;
alter table btcsp_private.calculation_jobs add constraint calculation_jobs_sequence_check check(sequence between 0 and 10000);
alter table btcsp_private.calculation_jobs drop constraint calculation_jobs_attempts_check;
alter table btcsp_private.calculation_jobs add constraint calculation_jobs_attempts_check check(attempts between 0 and 10100 and attempts>=sequence);
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='btcsp_private.calculation_jobs'::regclass and contype='c' and position('unitsCompleted' in pg_get_constraintdef(oid))>0 loop
  execute format('alter table btcsp_private.calculation_jobs drop constraint %I',c.conname);
 end loop;
end $$;
alter table btcsp_private.calculation_jobs add constraint calculation_jobs_units_check check(envelope->'payload'->'search'->>'unitsCompleted' is not null and (envelope->'payload'->'search'->>'unitsCompleted')::integer between 0 and 10000);
alter table btcsp_private.request_buckets drop constraint request_buckets_route_check;
alter table btcsp_private.request_buckets add constraint request_buckets_route_check check(route in('/api/v20/state','/api/v20/prepare','/api/v20/commit','/api/v20/calculations/advance'));
commit;
