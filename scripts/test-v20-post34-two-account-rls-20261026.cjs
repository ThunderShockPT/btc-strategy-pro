'use strict';
// Isolated PGlite fixture reproducing *observed* public RLS policy shapes.
// No network, live Supabase credentials, real users or data mutations.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const A='00000000-0000-4000-a000-000000000101',B='00000000-0000-4000-a000-000000000102';
const PA='00000000-0000-4000-a000-000000000201',PB='00000000-0000-4000-a000-000000000202';
const E1='00000000-0000-4000-a000-000000000301',E2='00000000-0000-4000-a000-000000000302';
const objects=[
 'create role authenticated','create role anon','create schema auth',
 "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$",
 'create table public.projects(id uuid primary key,owner_id uuid not null, label text)',
 'create table public.project_snapshots(id uuid primary key,project_id uuid not null,owner_id uuid not null,payload text)',
 'create table public.btcsp_financial_events(id uuid primary key,project_id uuid not null,owner_id uuid not null,amount_usd integer not null)',
 'create schema btcsp_private','create table btcsp_private.project_heads(project_id uuid,owner_id uuid,revision bigint)',
 'revoke all on schema btcsp_private from public,anon,authenticated',
 'alter table public.projects enable row level security',
 'alter table public.project_snapshots enable row level security',
 'alter table public.btcsp_financial_events enable row level security',
 'alter table btcsp_private.project_heads enable row level security',
 'grant usage on schema public to authenticated',
 'grant select,insert,update,delete on public.projects,public.project_snapshots to authenticated',
 'grant select on public.btcsp_financial_events to authenticated',
 'create policy projects_select_own on public.projects for select to authenticated using(owner_id=(select auth.uid()))',
 'create policy projects_insert_own on public.projects for insert to authenticated with check(owner_id=(select auth.uid()))',
 'create policy projects_update_own on public.projects for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()))',
 'create policy projects_delete_own on public.projects for delete to authenticated using(owner_id=(select auth.uid()))',
 "create policy snapshots_select_own on public.project_snapshots for select to authenticated using(owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())))",
 "create policy snapshots_insert_own on public.project_snapshots for insert to authenticated with check(owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())))",
 "create policy snapshots_update_own on public.project_snapshots for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())))",
 'create policy snapshots_delete_own on public.project_snapshots for delete to authenticated using(owner_id=(select auth.uid()))',
 'create policy btcsp_select_own on public.btcsp_financial_events for select to authenticated using(owner_id=(select auth.uid()))'
];
async function setup(t){
 const db=await PGlite.create();t.after(()=>db.close());
 for(const ddl of objects)await db.exec(ddl);
 await db.query('insert into public.projects values ($1,$2,$3),($4,$5,$6)',[PA,A,'account-a',PB,B,'account-b']);
 await db.query('insert into public.project_snapshots values ($1,$2,$3,$4),($5,$6,$7,$8)',[E1,PA,A,'snap-a',E2,PB,B,'snap-b']);
 await db.query('insert into public.btcsp_financial_events values ($1,$2,$3,$4),($5,$6,$7,$8)',[E1,PA,A,150,E2,PB,B,250]);
 await db.query('insert into btcsp_private.project_heads values ($1,$2,$3),($4,$5,$6)',[PA,A,3,PB,B,4]);
 return db;
}
async function as(db,owner,sql,params=[]){return db.transaction(async tx=>{
 await tx.exec('set local role authenticated');
 await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);
 return tx.query(sql,params);
});}
async function asAnon(db,sql){return db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query(sql);});}
test('P1.4 two owners can only select their own project, snapshot and financial ledger',async t=>{
 const db=await setup(t);
 for(const [owner,pid,amount] of [[A,PA,150],[B,PB,250]]){
  for(const table of ['projects','project_snapshots','btcsp_financial_events']){
   const rows=(await as(db,owner,'select * from public.'+table)).rows;
   assert.equal(rows.length,1,table+' '+owner);
   assert.equal((table==='projects'?rows[0].id:rows[0].project_id),pid);
   if(table==='btcsp_financial_events')assert.equal(rows[0].amount_usd,amount);
  }
 }
});
test('P1.4 account B cannot read, update or delete A scoped resources',async t=>{
 const db=await setup(t);
 assert.equal((await as(db,B,'select * from public.projects where id=$1',[PA])).rows.length,0);
 assert.equal((await as(db,B,'select * from public.project_snapshots where project_id=$1',[PA])).rows.length,0);
 assert.equal((await as(db,B,'select * from public.btcsp_financial_events where project_id=$1',[PA])).rows.length,0);
 assert.equal((await as(db,B,'update public.projects set label=$1 where id=$2 returning id',['hijack',PA])).rows.length,0);
 assert.equal((await as(db,B,'delete from public.project_snapshots where project_id=$1 returning id',[PA])).rows.length,0);
 assert.equal((await as(db,A,'select label from public.projects where id=$1',[PA])).rows[0].label,'account-a');
});
test('P1.4 deny forged owner INSERT, UPDATE reassignment and cross-project snapshot',async t=>{
 const db=await setup(t),newId='00000000-0000-4000-a000-000000000203';
 await assert.rejects(as(db,A,'insert into public.projects values ($1,$2,$3)',[newId,B,'forged']),/policy|permission|row-level security/i);
 await assert.rejects(as(db,A,'update public.projects set owner_id=$1 where id=$2',[B,PA]),/policy|permission|row-level security/i);
 await assert.rejects(as(db,B,'insert into public.project_snapshots values($1,$2,$3,$4)',[
  '00000000-0000-4000-a000-000000000304',PA,B,'foreign']),/policy|permission|row-level security/i);
 assert.equal((await as(db,A,'select owner_id from public.projects where id=$1',[PA])).rows[0].owner_id,A);
});
test('P1.4 deny direct client financial mutation; preserved balance',async t=>{
 const db=await setup(t);
 const commands=[
  ['insert into public.btcsp_financial_events values ($1,$2,$3,$4)',[
    '00000000-0000-4000-a000-000000000305',PA,A,999]],
  ['update public.btcsp_financial_events set amount_usd=999 where owner_id=$1',[A]],
  ['delete from public.btcsp_financial_events where owner_id=$1',[A]]
 ];
 for(const [sql,params] of commands)await assert.rejects(as(db,A,sql,params),/permission|denied/i);
 assert.equal((await as(db,A,'select amount_usd from public.btcsp_financial_events')).rows[0].amount_usd,150);
});
test('P1.4 anonymous client has no SELECT access on any reviewed public table',async t=>{
 const db=await setup(t);
 for(const table of ['projects','project_snapshots','btcsp_financial_events'])
  await assert.rejects(asAnon(db,'select * from public.'+table),/permission|denied/i);
});
test('P1.4 no direct access to btcsp_private even as a verified test owner',async t=>{
 const db=await setup(t);
 for(const id of [A,B])
  await assert.rejects(as(db,id,'select * from btcsp_private.project_heads'),/permission|denied/i);
});
test('P1.4 fixture genuinely enables PostgreSQL row-level security, with fake UUIDs only',async t=>{
 const db=await setup(t);
 const r=await db.query("select relname,relrowsecurity from pg_class where relname in ('projects','project_snapshots','btcsp_financial_events','project_heads')");
 assert.equal(r.rows.length,4);assert.ok(r.rows.every(x=>x.relrowsecurity));
 assert.equal((await db.query("select has_schema_privilege('authenticated','btcsp_private','usage') value")).rows[0].value,false);
 assert.notEqual(A,B);assert.notEqual(PA,PB);
});
