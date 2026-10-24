'use strict';
// Scoped recovery of the EMPTY application schema captured before V20 deployment.
// Not an Auth, Storage, project configuration, or non-empty database backup.
const assert=require('node:assert/strict');
const qi=v=>'"'+String(v).replace(/"/g,'""')+'"',lit=v=>"'"+String(v).replace(/'/g,"''")+"'";
const table=v=>'public.'+qi(v.replace(/^public\./,''));
const role=v=>v==='PUBLIC'?'PUBLIC':qi(v);
function validate(s){
 assert.equal(s.format,'btcsp-empty-public-schema-1');assert.equal(s.project_ref,'oftzqqjbwonngubihrsd');
 assert.deepEqual(s.counts,{projects:0,auth_users:0,project_snapshots:0},'Only the captured empty schema is supported');
 assert.deepEqual(s.tables.map(t=>t.name).sort(),['project_snapshots','projects']);
 assert.deepEqual(s.functions.map(f=>f.name).sort(),['btcsp_delete_project_v1','btcsp_save_project_v1','btcsp_touch_updated_at']);
 assert(s.tables.every(t=>t.rls===true));
}
function roles(s){validate(s);return [...new Set(['anon','authenticated','service_role',...s.tables.map(t=>t.owner),...s.functions.map(f=>f.owner),...s.table_grants.map(g=>g.grantee),...s.function_grants.map(g=>g.grantee),...(s.schema_acl||[]).flatMap(g=>[g.owner,g.grantee]),...(s.default_acls||[]).flatMap(g=>[g.owner,g.grantee])])].filter(r=>r!=='PUBLIC');}
function restoreSQL(s){
 validate(s);const sql=['set search_path=public,pg_catalog;'];
 if(s.schema_acl?.length){sql.push('alter schema public owner to '+role(s.schema_acl[0].owner)+';');sql.push('revoke all on schema public from public,anon,authenticated,service_role,postgres;');for(const g of s.schema_acl)sql.push('grant '+g.privilege+' on schema public to '+role(g.grantee)+(g.grantable?' with grant option':'')+';');}
 for(const t of s.tables)sql.push('create table '+table(t.name)+' ('+t.columns.map(c=>qi(c.name)+' '+c.type+(c.default?' default '+c.default:'')+(c.not_null?' not null':'')).join(',')+');');
 for(const c of [...s.constraints].sort((a,b)=>(a.type==='f')-(b.type==='f')))sql.push('alter table '+table(c.table)+' add constraint '+qi(c.name)+' '+c.definition+';');
 for(const i of s.indexes||[])sql.push(i.definition+';');
 for(const f of s.functions){sql.push(f.definition+';');sql.push('alter function '+f.identity+' owner to '+role(f.owner)+';');sql.push('revoke all on function '+f.identity+' from public,anon,authenticated,service_role;');}
 for(const t of s.tables){sql.push('alter table '+table(t.name)+' owner to '+role(t.owner)+';');sql.push('alter table '+table(t.name)+' enable row level security;');if(t.force_rls)sql.push('alter table '+table(t.name)+' force row level security;');sql.push('revoke all on '+table(t.name)+' from public,anon,authenticated,service_role;');if(t.comment!==null)sql.push('comment on table '+table(t.name)+' is '+lit(t.comment)+';');}
 for(const p of s.policies)sql.push('create policy '+qi(p.policyname)+' on '+table(p.tablename)+' as '+p.permissive+' for '+p.cmd+' to '+p.roles.map(role).join(',')+(p.qual?' using ('+p.qual+')':'')+(p.with_check?' with check ('+p.with_check+')':'')+';');
 for(const t of s.triggers)sql.push(t.definition+';');
 for(const g of s.table_grants)sql.push('grant '+g.privilege_type+' on '+table(g.table_name)+' to '+role(g.grantee)+(g.is_grantable==='YES'?' with grant option':'')+';');
 for(const g of s.function_grants)sql.push('grant '+g.privilege+' on function '+g.identity+' to '+role(g.grantee)+(g.grantable?' with grant option':'')+';');
 const types={r:'tables',S:'sequences',f:'functions',T:'types',n:'schemas'};
 for(const group of new Map((s.default_acls||[]).map(g=>[JSON.stringify([g.owner,g.schema,g.object_type]),g])).values()){assert(types[group.object_type]);sql.push('alter default privileges for role '+role(group.owner)+(group.schema?' in schema '+qi(group.schema):'')+' revoke all on '+types[group.object_type]+' from '+['PUBLIC',...roles(s)].map(role).join(',')+';');}
 for(const g of s.default_acls||[]){assert(types[g.object_type]);sql.push('alter default privileges for role '+role(g.owner)+(g.schema?' in schema '+qi(g.schema):'')+' grant '+g.privilege+' on '+types[g.object_type]+' to '+role(g.grantee)+(g.grantable?' with grant option':'')+';');}
 return sql.join('\n');
}
module.exports={validate,roles,restoreSQL};
