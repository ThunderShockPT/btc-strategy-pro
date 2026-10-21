-- Prepared server context only; financial facts remain in their existing journal.
begin;
create table btcsp_private.command_reviews (
 project_id uuid not null,
 owner_id uuid not null,
 scenario_key text not null check(scenario_key in ('manual_long','demo_long')),
 review_hash text not null check(review_hash ~ '^[a-f0-9]{64}$'),
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 basis_hash text not null check(basis_hash ~ '^[a-f0-9]{64}$'),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=10000000),
 expires_at timestamptz not null,
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(project_id,owner_id,scenario_key,review_hash),
 foreign key(project_id,owner_id) references public.projects(id,owner_id) on delete restrict,
 check(expires_at>recorded_at and expires_at<=recorded_at+interval '60 seconds'),
 check(payload->'result'->>'reviewHash' is not null and payload->'result'->>'reviewHash'=review_hash),
 check(payload->'result'->>'headHash' is not null and payload->'result'->>'headHash'=basis_hash),
 check(payload->'result'->>'expiresAt' is not null and (payload->'result'->>'expiresAt')::timestamptz=expires_at),
 check(payload->'state'->'input'->>'ownerId' is not null and payload->'state'->'input'->>'ownerId'=owner_id::text),
 check(payload->'state'->'input'->>'projectId' is not null and payload->'state'->'input'->>'projectId'=project_id::text),
 check(payload->'state'->'input'->>'scenarioKey' is not null and payload->'state'->'input'->>'scenarioKey'=scenario_key)
);
create index btcsp_command_reviews_owner_expiry on btcsp_private.command_reviews(owner_id,expires_at);
alter table btcsp_private.command_reviews enable row level security;
revoke all on btcsp_private.command_reviews from public,anon,authenticated;
grant select,insert,delete on btcsp_private.command_reviews to service_role;
create trigger btcsp_command_review_immutable before update on btcsp_private.command_reviews
 for each row execute function btcsp_private.reject_financial_mutation();
commit;
