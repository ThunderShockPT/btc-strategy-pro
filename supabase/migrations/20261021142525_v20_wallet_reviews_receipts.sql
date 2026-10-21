-- Staged wallet reviews and immutable acknowledgments; not applied to production.
begin;
create table btcsp_private.wallet_reviews (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete restrict,
 project_id uuid not null,
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=2000000),
 expires_at timestamptz not null default (now()+interval '60 seconds'),
 recorded_at timestamptz not null default now()
);
create index btcsp_wallet_reviews_expiry on btcsp_private.wallet_reviews(expires_at);
alter table btcsp_private.wallet_reviews enable row level security;
revoke all on btcsp_private.wallet_reviews from public,anon,authenticated;
grant select,insert,delete on btcsp_private.wallet_reviews to service_role;
create table public.btcsp_tutorial_receipts (
 id uuid primary key,
 owner_id uuid not null,
 project_id uuid not null,
 recorded_at timestamptz not null,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=64000),
 foreign key(project_id,owner_id) references public.projects(id,owner_id) on delete restrict,
 check(payload @> jsonb_build_object('id',id::text,'ownerId',owner_id::text,'projectId',project_id::text)),
 check(payload->>'sourceMode' is not null and payload->>'sourceMode' in('manual','demo-preview')),
 check(payload->>'recordedAt' is not null and (payload->>'recordedAt')::timestamptz=recorded_at)
);
alter table public.btcsp_tutorial_receipts enable row level security;
revoke all on public.btcsp_tutorial_receipts from public,anon,authenticated;
grant select on public.btcsp_tutorial_receipts to authenticated;
grant select,insert on public.btcsp_tutorial_receipts to service_role;
grant select,insert,update on public.projects to service_role;
create policy btcsp_select_own on public.btcsp_tutorial_receipts for select to authenticated using(owner_id=(select auth.uid()));
create trigger btcsp_append_only before update or delete on public.btcsp_tutorial_receipts
 for each row execute function btcsp_private.reject_financial_mutation();
commit;
