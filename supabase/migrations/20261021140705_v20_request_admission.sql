-- Operational request counters only; no financial facts. Not deployed publicly.
begin;
create table btcsp_private.request_buckets (
 subject_hash text not null check(subject_hash ~ '^[a-f0-9]{64}$'),
 route text not null check(route in('/api/v20/state','/api/v20/prepare','/api/v20/commit')),
 window_start timestamptz not null,
 hits integer not null check(hits>0 and hits<=1000000),
 primary key(subject_hash,route,window_start)
);
create index btcsp_request_buckets_expiry on btcsp_private.request_buckets(window_start);
alter table btcsp_private.request_buckets enable row level security;
revoke all on btcsp_private.request_buckets from public,anon,authenticated;
grant select,insert,update,delete on btcsp_private.request_buckets to service_role;
comment on table btcsp_private.request_buckets is 'Short-lived HMAC request counters, never raw IPs or financial events.';
commit;
