-- BTC Strategy Pro V20 · pós-34 · AUDITORIA APENAS LEITURA (26/10/2026)
-- Consulta de metadados; não consulta saldos, tokens, dados pessoais nem altera tabelas.
-- Executar somente com acesso autorizado no SQL Editor Supabase.
-- BLOQUEADO: não executar INSERT, UPDATE, DELETE, ALTER, CREATE, DROP.
-- RLS e políticas
select n.nspname as schema_name,c.relname as table_name,
       c.relrowsecurity as rls_enabled,c.relforcerowsecurity as force_rls,
       count(p.oid)::int as policies
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
left join pg_policy p on p.polrelid=c.oid
where c.relkind='r' and n.nspname in ('public','btcsp_private')
group by n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity
order by schema_name,table_name;

-- Papel e condição de propriedade: inspecionar USING/WITH CHECK, nunca executar alterações.
select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname in ('public','btcsp_private')
order by schemaname,tablename,policyname;

-- Permissões dos clientes anon e authenticated.
select table_schema,table_name,grantee,
       string_agg(privilege_type,', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema in ('public','btcsp_private')
  and grantee in ('anon','authenticated')
group by table_schema,table_name,grantee
order by table_schema,table_name,grantee;

-- Confirmar que o schema privado não tem USAGE no lado cliente.
select n.nspname as schema_name,
       has_schema_privilege('anon',n.oid,'USAGE') as anon_usage,
       has_schema_privilege('authenticated',n.oid,'USAGE') as authenticated_usage
from pg_namespace n
where n.nspname in ('public','btcsp_private');

-- Detectar views em schemas expostos, e SECURITY DEFINER/RPC executável.
select n.nspname as schema_name,c.relname as view_name,
       ('security_invoker=true'=any(coalesce(c.reloptions,array[]::text[]))) as security_invoker
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='v' and n.nspname in ('public','btcsp_private');
select n.nspname as schema_name,p.proname as function_name,
       p.prosecdef as security_definer,
       has_function_privilege('anon',p.oid,'EXECUTE') as anonymous_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','btcsp_private') order by schema_name,function_name;
