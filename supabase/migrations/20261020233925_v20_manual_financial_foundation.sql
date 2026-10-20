-- V20 Block 2: additive foundation, NOT deployed to the hosted project.
-- Assumes existing public.projects has UNIQUE(id, owner_id), as audited.
-- Client writes remain disabled until deterministic command validation exists.
begin;

create schema if not exists btcsp_private;
revoke all on schema btcsp_private from public, anon, authenticated;

create function btcsp_private.reject_financial_mutation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'BTCSP_APPEND_ONLY' using errcode = '55000';
end;
$$;
revoke all on function btcsp_private.reject_financial_mutation() from public, anon, authenticated;

create table public.btcsp_legacy_imports (
  id uuid primary key,
  project_id uuid not null,
  owner_id uuid not null,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  source_format text not null default 'v1' check (source_format = 'v1'),
  original_payload jsonb not null check (jsonb_typeof(original_payload) = 'object' and octet_length(original_payload::text) <= 2000000),
  status text not null default 'staged' check (status = 'staged'),
  recorded_at timestamptz not null default now(),
  unique (id, project_id, owner_id),
  unique (project_id, owner_id, source_hash),
  foreign key (project_id, owner_id) references public.projects(id, owner_id) on delete restrict
);

create table public.btcsp_plan_versions (
  id uuid primary key,
  project_id uuid not null,
  owner_id uuid not null,
  version bigint not null check (version > 0),
  basis_revision bigint not null check (basis_revision >= 0),
  scenario_key text not null check (scenario_key in ('manual_long','demo_long','legacy_descida','legacy_subida')),
  profile text not null check (profile in ('safe','balanced','risky')),
  reference_price_usd numeric not null check (reference_price_usd > 0 and reference_price_usd < 1e20::numeric and scale(reference_price_usd) <= 18),
  reference_at timestamptz not null,
  protection_floor_usd numeric not null check (protection_floor_usd > 0 and protection_floor_usd < reference_price_usd and scale(protection_floor_usd) <= 18),
  rule_version text not null check (char_length(rule_version) between 1 and 200),
  configuration jsonb not null check (jsonb_typeof(configuration) = 'object' and octet_length(configuration::text) <= 500000),
  recorded_at timestamptz not null default now(),
  unique (id, project_id, owner_id, scenario_key),
  unique (project_id, owner_id, version),
  foreign key (project_id, owner_id) references public.projects(id, owner_id) on delete restrict
);

create table public.btcsp_financial_events (
  id uuid primary key,
  project_id uuid not null,
  owner_id uuid not null,
  revision bigint not null check (revision > 0),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 128),
  event_type text not null check (event_type in (
    'opening_balance','capital_deposit','capital_withdrawal','margin_add','margin_remove',
    'trade_buy','trade_sell','fee','funding','correction','void','reversal','plan_activated')),
  scenario_key text not null check (scenario_key in ('manual_long','demo_long','legacy_descida','legacy_subida')),
  origin text not null check (origin in ('manual','demo','legacy_demo')),
  effective_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  facts jsonb not null check (jsonb_typeof(facts) = 'object' and octet_length(facts::text) <= 64000),
  target_event_id uuid,
  target_plan_id uuid,
  import_id uuid,
  correction_reason text,
  schema_version integer not null default 1 check (schema_version = 1),
  unique (id, project_id, owner_id, scenario_key),
  unique (project_id, owner_id, revision),
  unique (project_id, owner_id, idempotency_key),
  check (target_event_id is null or target_event_id <> id),
  check ((event_type in ('correction','void','reversal') and target_event_id is not null
          and correction_reason is not null and char_length(btrim(correction_reason)) between 3 and 1000)
         or (event_type not in ('correction','void','reversal') and target_event_id is null and correction_reason is null)),
  check ((event_type = 'plan_activated' and target_plan_id is not null)
         or (event_type <> 'plan_activated' and target_plan_id is null)),
  foreign key (project_id, owner_id) references public.projects(id, owner_id) on delete restrict,
  foreign key (target_event_id, project_id, owner_id, scenario_key) references public.btcsp_financial_events(id, project_id, owner_id, scenario_key) on delete restrict,
  foreign key (target_plan_id, project_id, owner_id, scenario_key) references public.btcsp_plan_versions(id, project_id, owner_id, scenario_key) on delete restrict,
  foreign key (import_id, project_id, owner_id) references public.btcsp_legacy_imports(id, project_id, owner_id) on delete restrict
);
create index btcsp_events_owner_chronology on public.btcsp_financial_events(owner_id, project_id, scenario_key, effective_at, revision);

create table public.btcsp_calculation_runs (
  id uuid primary key,
  project_id uuid not null,
  owner_id uuid not null,
  basis_revision bigint not null check (basis_revision >= 0),
  engine_version text not null check (char_length(engine_version) between 1 and 200),
  rule_version text not null check (char_length(rule_version) between 1 and 200),
  result_kind text not null check (result_kind in ('synthetic','backtest','manual-position-estimate')),
  assumptions jsonb not null check (jsonb_typeof(assumptions) = 'object' and octet_length(assumptions::text) <= 500000),
  results jsonb not null check (jsonb_typeof(results) = 'object' and octet_length(results::text) <= 1000000),
  recorded_at timestamptz not null default now(),
  foreign key (project_id, owner_id) references public.projects(id, owner_id) on delete restrict
);
create index btcsp_calculations_owner_revision on public.btcsp_calculation_runs(owner_id, project_id, basis_revision);

create table public.btcsp_preference_versions (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete restrict,
  version bigint not null check (version > 0),
  preferences jsonb not null check (jsonb_typeof(preferences) = 'object' and octet_length(preferences::text) <= 64000),
  recorded_at timestamptz not null default now(),
  unique (owner_id, version)
);

-- Immutable fact/config versions. Deletion for privacy requires a separate,
-- audited privileged process; ordinary project deletion must not cascade history.
do $$
declare tbl text;
begin
  foreach tbl in array array['btcsp_legacy_imports','btcsp_plan_versions','btcsp_financial_events','btcsp_calculation_runs','btcsp_preference_versions'] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('create policy btcsp_select_own on public.%I for select to authenticated using (owner_id = (select auth.uid()))', tbl);
    execute format('revoke all on table public.%I from public, anon, authenticated', tbl);
    execute format('grant select on table public.%I to authenticated', tbl);
    execute format('create trigger btcsp_append_only before update or delete on public.%I for each row execute function btcsp_private.reject_financial_mutation()', tbl);
  end loop;
end;
$$;

comment on table public.btcsp_financial_events is 'Manual V20 event storage foundation; no client writes or financial command API enabled in Block 2.';
comment on table public.btcsp_calculation_runs is 'Derived, versioned results; never the source of financial facts.';
comment on table public.btcsp_legacy_imports is 'Original V1 payload retained unchanged; staged imports do not activate real positions or infer isolated margin.';
commit;
