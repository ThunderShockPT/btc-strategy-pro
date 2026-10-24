-- Block 12B. Additive, tested locally only. Requires Block 2 foundation.
begin;
alter table public.btcsp_financial_events add column event_envelope jsonb;
alter table public.btcsp_plan_versions add column plan_envelope jsonb;
-- Existing rows remain unchanged. A missing envelope requires reconciliation,
-- not fabrication of metadata; the backend refuses to load such a stream.
create function btcsp_private.validate_source_envelope() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if tg_table_name = 'btcsp_financial_events' then
  if new.event_envelope is null or jsonb_typeof(new.event_envelope) <> 'object'
    or octet_length(new.event_envelope::text) > 128000
    or not (new.event_envelope @> jsonb_build_object(
      'id',new.id::text,'project_id',new.project_id::text,'owner_id',new.owner_id::text,
      'scenario_key',new.scenario_key,'revision',new.revision::text,
      'event_type',new.event_type,'idempotency_key',new.idempotency_key,
      'origin',new.origin,'schema_version',new.schema_version,'facts',new.facts))
    or (new.event_envelope->'facts') is distinct from new.facts
    or (new.event_envelope->>'effective_at')::timestamptz is distinct from new.effective_at
    or (new.event_envelope->>'recorded_at')::timestamptz is distinct from new.recorded_at
    or (new.event_envelope->>'target_event_id') is distinct from new.target_event_id::text
    or (new.event_envelope->>'target_plan_id') is distinct from new.target_plan_id::text
    or (new.event_envelope->>'import_id') is distinct from new.import_id::text
    or (new.event_envelope->>'correction_reason') is distinct from new.correction_reason then
   raise exception 'BTCSP_EVENT_ENVELOPE_MISMATCH' using errcode='23514';
  end if;
 else
  if new.plan_envelope is null or jsonb_typeof(new.plan_envelope) <> 'object'
    or octet_length(new.plan_envelope::text) > 600000
    or not (new.plan_envelope @> jsonb_build_object(
      'id',new.id::text,'projectId',new.project_id::text,'ownerId',new.owner_id::text,
      'scenarioKey',new.scenario_key,'version',new.version::text,'profile',new.profile,
      'configuration',new.configuration))
    or (new.plan_envelope->'configuration') is distinct from new.configuration
    or (new.plan_envelope->>'referencePriceUSD')::numeric is distinct from new.reference_price_usd
    or (new.plan_envelope->>'protectionFloorUSD')::numeric is distinct from new.protection_floor_usd
    or (new.plan_envelope->>'referenceAt')::timestamptz is distinct from new.reference_at then
   raise exception 'BTCSP_PLAN_ENVELOPE_MISMATCH' using errcode='23514';
  end if;
 end if;
 return new;
end; $$;
revoke all on function btcsp_private.validate_source_envelope() from public,anon,authenticated;
create trigger btcsp_event_envelope before insert on public.btcsp_financial_events
 for each row execute function btcsp_private.validate_source_envelope();
create trigger btcsp_plan_envelope before insert on public.btcsp_plan_versions
 for each row execute function btcsp_private.validate_source_envelope();

create table btcsp_private.project_heads (
 project_id uuid not null,
 owner_id uuid not null,
 scenario_key text not null check(scenario_key in('manual_long','demo_long')),
 revision bigint not null check(revision > 0),
 generation bigint not null check(generation > 0),
 state_hash text not null check(state_hash ~ '^[a-f0-9]{64}$'),
 active_plan_id uuid not null,
 event_order jsonb not null check(jsonb_typeof(event_order)='array' and jsonb_array_length(event_order)<=10000),
 history_order jsonb not null check(jsonb_typeof(history_order)='array' and jsonb_array_length(history_order)<=10000),
 input_context jsonb not null check(jsonb_typeof(input_context)='object' and octet_length(input_context::text)<=2000000),
 extras jsonb not null check(jsonb_typeof(extras)='object' and octet_length(extras::text)<=2000000),
 primary key(project_id,owner_id),
 unique(project_id,owner_id,scenario_key),
 foreign key(project_id,owner_id) references public.projects(id,owner_id) on delete restrict,
 foreign key(active_plan_id,project_id,owner_id,scenario_key)
  references public.btcsp_plan_versions(id,project_id,owner_id,scenario_key) on delete restrict
);
create table btcsp_private.command_receipts (
 project_id uuid not null,
 owner_id uuid not null,
 scenario_key text not null,
 idempotency_key text not null check(char_length(idempotency_key) between 1 and 128),
 command_hash text not null check(command_hash ~ '^[a-f0-9]{64}$'),
 result jsonb not null check(jsonb_typeof(result)='object' and octet_length(result::text)<=64000),
 recorded_at timestamptz not null default now(),
 primary key(project_id,owner_id,idempotency_key),
 foreign key(project_id,owner_id,scenario_key)
  references btcsp_private.project_heads(project_id,owner_id,scenario_key) on delete restrict
);
alter table btcsp_private.project_heads enable row level security;
alter table btcsp_private.command_receipts enable row level security;
revoke all on btcsp_private.project_heads,btcsp_private.command_receipts from public,anon,authenticated;
create trigger btcsp_append_only before update or delete on btcsp_private.command_receipts
 for each row execute function btcsp_private.reject_financial_mutation();
-- Dedicated backend connection only. No definer function or client-write RPC.
grant usage on schema btcsp_private to service_role;
grant select,insert,update on btcsp_private.project_heads to service_role;
grant select,insert on btcsp_private.command_receipts to service_role;
grant select,insert on public.btcsp_financial_events,public.btcsp_plan_versions,public.btcsp_calculation_runs to service_role;
commit;
