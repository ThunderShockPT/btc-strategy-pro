-- Private logged operational jobs; prepared only, not applied to production.
begin;
create table btcsp_private.calculation_jobs (
 id uuid primary key,
 project_id uuid not null,
 owner_id uuid not null,
 scenario_key text not null check(scenario_key in('manual_long','demo_long')),
 idempotency_key text not null check(length(idempotency_key) between 1 and 128),
 basis_hash text not null check(basis_hash ~ '^[a-f0-9]{64}$'),
 envelope jsonb not null check(jsonb_typeof(envelope)='object' and octet_length(envelope::text)<=10000000),
 sequence integer not null default 0 check(sequence between 0 and 1000),
 version bigint not null default 0 check(version>=0),
 status text not null check(status in('queued','running','completed','blocked','cancelled')),
 error_code text check(error_code ~ '^[A-Z0-9_]{1,80}$'),
 lease_id uuid,
 lease_until timestamptz,
 attempts integer not null default 0 check(attempts between 0 and 100),
 expires_at timestamptz not null,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 foreign key(project_id,owner_id) references public.projects(id,owner_id) on delete restrict,
 unique(owner_id,project_id,scenario_key,idempotency_key),
 check((status='running' and lease_id is not null and lease_until is not null) or (status<>'running' and lease_id is null and lease_until is null)),
 check(lease_until is null or lease_until<=expires_at),
 check(envelope->>'mac' is not null and envelope->>'mac' ~ '^[a-f0-9]{64}$'),
 check(envelope->'payload'->>'version' is not null and envelope->'payload'->>'version'='v20-calculation-checkpoint-12d3.1'),
 check(envelope->'payload'->'scope' is not null and envelope->'payload'->'scope' @> jsonb_build_object('ownerId',owner_id::text,'projectId',project_id::text,'scenarioKey',scenario_key)),
 check(envelope->'payload'->>'headHash' is not null and envelope->'payload'->>'headHash'=basis_hash),
 check(envelope->'payload'->>'sequence' is not null and (envelope->'payload'->>'sequence')::integer=sequence),
 check(envelope->'payload'->>'expiresAt' is not null and (envelope->'payload'->>'expiresAt')::timestamptz=expires_at),
 check(envelope->'payload'->>'createdAt' is not null and (envelope->'payload'->>'createdAt')::timestamptz<expires_at and expires_at<=(envelope->'payload'->>'createdAt')::timestamptz+interval '60 seconds'),
 check(envelope->'payload'->>'engineBuild' is not null and envelope->'payload'->>'engineBuild' ~ '^[a-f0-9]{64}$'),
 check(envelope->'payload'->'search'->>'unitsCompleted' is not null and (envelope->'payload'->'search'->>'unitsCompleted')::integer between 0 and 1000),
 check(envelope->'payload'->'search'->'done' is not null and jsonb_typeof(envelope->'payload'->'search'->'done')='boolean'),
 check(status<>'completed' or (envelope->'payload'->'search'->>'done' is not null and envelope->'payload'->'search'->>'done'='true'))
);
create index btcsp_calculation_jobs_owner_expiry on btcsp_private.calculation_jobs(owner_id,expires_at);
create index btcsp_calculation_jobs_pending on btcsp_private.calculation_jobs(status,lease_until,expires_at) where status in('queued','running');
alter table btcsp_private.calculation_jobs enable row level security;
revoke all on btcsp_private.calculation_jobs from public,anon,authenticated;
grant select,insert,update on btcsp_private.calculation_jobs to service_role;
create function btcsp_private.reject_calculation_job_rebase() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if row(new.id,new.owner_id,new.project_id,new.scenario_key,new.idempotency_key,new.basis_hash,new.expires_at,new.created_at)
  is distinct from row(old.id,old.owner_id,old.project_id,old.scenario_key,old.idempotency_key,old.basis_hash,old.expires_at,old.created_at)
  or new.envelope->'payload'->>'createdAt' is distinct from old.envelope->'payload'->>'createdAt'
  or new.envelope->'payload'->>'engineBuild' is distinct from old.envelope->'payload'->>'engineBuild'
 then raise exception 'CALCULATION_JOB_BASIS_IMMUTABLE';end if;
 return new;
end;
$$;
revoke all on function btcsp_private.reject_calculation_job_rebase() from public,anon,authenticated;
grant execute on function btcsp_private.reject_calculation_job_rebase() to service_role;
create trigger btcsp_calculation_job_basis before update on btcsp_private.calculation_jobs
 for each row execute function btcsp_private.reject_calculation_job_rebase();
comment on table btcsp_private.calculation_jobs is 'Private resumable calculations with expiring leases; no account tokens, signing keys, financial facts or automatic plan application.';
commit;
