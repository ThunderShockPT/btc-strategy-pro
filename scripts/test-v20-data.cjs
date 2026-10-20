'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {prepareProject}=require('../legacy-migration.js');
const uuid=n=>'00000000-0000-4000-a000-'+String(n).padStart(12,'0');
const A=uuid(1),B=uuid(2),P=uuid(10),PB=uuid(11),P2=uuid(12);
let db;
const tables=['btcsp_legacy_imports','btcsp_plan_versions','btcsp_financial_events','btcsp_calculation_runs','btcsp_preference_versions'];
const oldSnapshot={schema:1,ledger:{ledger:[{id:'old1',seq:1,kind:'buy',side:'descida',cycle:'A',usd:197,price:82038,fee:.0985,date:'2026-10-20T07:15:00.000Z',voided:false,seed:true},{id:'old2',seq:2,kind:'buy',side:'subida',cycle:'A',usd:500,price:82000,fee:.25,date:'2026-10-20T07:16:00.000Z',voided:true}],audit:[{action:'correção',before:{usd:500},after:{usd:50}}],seq:2},risk:{margin:1500},settings:{amounts:[200,300,500]}};
const legacy=()=>({id:P,name:'Existing project',mode:'real',capital:2000,snapshot:structuredClone(oldSnapshot)});
before(async()=>{
 db=await PGlite.create();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;
 create table public.projects(id uuid primary key,owner_id uuid not null references auth.users(id),name text,capital numeric,unique(id,owner_id));
 create table public.project_snapshots(project_id uuid primary key,owner_id uuid,payload jsonb,version integer,foreign key(project_id,owner_id) references public.projects(id,owner_id));`);
 await db.query('insert into auth.users values ($1),($2)',[A,B]);
 await db.query("insert into public.projects values ($1,$2,'A',2000),($3,$4,'B',2000),($5,$2,'A2',2000)",[P,A,PB,B,P2]);
 await db.query('insert into public.project_snapshots values ($1,$2,$3,1)',[P,A,oldSnapshot]);
 const files=fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('_v20_manual_financial_foundation.sql'));
 assert.equal(files.length,1);await db.exec(fs.readFileSync('supabase/migrations/'+files[0],'utf8'));
});
after(async()=>{await db?.close()});
async function asUser(role,id,fn){
 assert.ok(['authenticated','anon'].includes(role));
 await db.exec('set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
 try{return await fn()}finally{await db.exec('reset role')}
}
async function event({id=uuid(100),project=P,owner=A,revision=1,key='initial',type='capital_deposit',scenario='manual_long',target=null,reason=null}={}){
 return db.query(`insert into public.btcsp_financial_events(id,project_id,owner_id,revision,idempotency_key,event_type,scenario_key,origin,effective_at,facts,target_event_id,correction_reason)
 values($1,$2,$3,$4,$5,$6,$7,'manual','2026-10-21T00:00:00Z','{"amount":"500","currency":"USD","location":"project_cash"}',$8,$9)`,[id,project,owner,revision,key,type,scenario,target,reason]);
}
test('additive migration preserves legacy snapshot and project capital exactly',async()=>{
 const row=(await db.query('select payload,version from public.project_snapshots where project_id=$1',[P])).rows[0];
 assert.deepEqual(row.payload,oldSnapshot);assert.equal(row.version,1);
 assert.equal((await db.query('select capital::text from public.projects where id=$1',[P])).rows[0].capital,'2000');
});
test('all five new tables have RLS; no privileged definer functions are introduced',async()=>{
 const rows=(await db.query("select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname=any($1)",[tables])).rows;
 assert.equal(rows.length,5);assert.ok(rows.every(r=>r.relrowsecurity));
 assert.equal((await db.query("select count(*)::int as n from pg_proc where pronamespace='btcsp_private'::regnamespace and prosecdef")).rows[0].n,0);
});
test('same-project ownership foreign keys reject forged owner even for privileged staging',async()=>{
 await assert.rejects(event({owner:B}),{code:'23503'});await event();
 await event({id:uuid(101),project:PB,owner:B,key:'b'});
});
test('RLS separates two SQL identities and unknown/empty sessions',async()=>{
 for(const [id,expected]of [[A,1],[B,1],['',0]])await asUser('authenticated',id,async()=>{
  const rows=(await db.query('select owner_id from public.btcsp_financial_events')).rows;
  assert.equal(rows.length,expected);assert.ok(rows.every(r=>r.owner_id===id));
 });
});
test('anonymous role cannot read private financial tables',async()=>{
 for(const table of tables)await asUser('anon','',()=>assert.rejects(db.query('select * from public.'+table),{code:'42501'}));
});
test('ordinary authenticated clients have no financial INSERT/UPDATE/DELETE grants',async()=>{
 const rows=(await db.query("select table_name,privilege_type from information_schema.role_table_grants where grantee='authenticated' and table_name=any($1)",[tables])).rows;
 assert.equal(rows.length,5);assert.ok(rows.every(r=>r.privilege_type==='SELECT'));
 await asUser('authenticated',A,()=>assert.rejects(event({id:uuid(102),revision:2,key:'attempt'}),{code:'42501'}));
 await asUser('authenticated',A,()=>assert.rejects(db.query('delete from public.btcsp_financial_events'),{code:'42501'}));
});
test('append-only trigger rejects UPDATE and DELETE even by the staging owner',async()=>{
 await assert.rejects(db.query("update public.btcsp_financial_events set facts='{}' where id=$1",[uuid(100)]),{code:'55000'});
 await assert.rejects(db.query('delete from public.btcsp_financial_events where id=$1',[uuid(100)]),{code:'55000'});
});
test('duplicate revision and duplicate idempotency key cannot create repeated deposits',async()=>{
 await assert.rejects(event({id:uuid(103),revision:1,key:'different'}),{code:'23505'});
 await assert.rejects(event({id:uuid(104),revision:2,key:'initial'}),{code:'23505'});
});
test('correction references require the same project, owner and scenario',async()=>{
 await assert.rejects(event({id:uuid(105),revision:2,key:'cross-owner',type:'correction',target:uuid(101),reason:'wrong amount'}),{code:'23503'});
 await assert.rejects(event({id:uuid(106),project:P2,revision:1,key:'cross-project',type:'void',target:uuid(100),reason:'duplicate'}),{code:'23503'});
 await assert.rejects(event({id:uuid(107),revision:2,key:'cross-scenario',scenario:'demo_long',type:'void',target:uuid(100),reason:'duplicate'}),{code:'23503'});
 await assert.rejects(event({id:uuid(108),revision:2,key:'no-reason',type:'void',target:uuid(100)}),{code:'23514'});
 await event({id:uuid(109),revision:2,key:'correct',type:'correction',target:uuid(100),reason:'Correct amount from 500 to 50'});
 assert.equal((await db.query('select count(*)::int as n from public.btcsp_financial_events where project_id=$1',[P])).rows[0].n,2);
});
test('failed atomic batch leaves no partial event',async()=>{
 await assert.rejects(db.transaction(async tx=>{
  await tx.query("insert into public.btcsp_preference_versions values($1,$2,1,'{}',now())",[uuid(201),A]);
  await tx.query("insert into public.btcsp_preference_versions values($1,$2,1,'{}',now())",[uuid(202),A]);
 }),{code:'23505'});
 assert.equal((await db.query('select count(*)::int as n from public.btcsp_preference_versions')).rows[0].n,0);
});
test('project deletion cannot silently cascade financial history',async()=>{
 await assert.rejects(db.query('delete from public.projects where id=$1',[PB]),{code:'23001'});
});
test('legacy preparation is deterministic, owner-scoped and does not mutate inputs',async()=>{
 const p=legacy(),before=structuredClone(p),a=await prepareProject(p,{ownerId:A}),b=await prepareProject(p,{ownerId:A});
 assert.deepEqual(p,before);assert.deepEqual(a,b);assert.equal(a.status,'staged');assert.equal(a.automaticActivationAllowed,false);
 assert.equal(a.manualOpeningBalance,null);assert.notEqual((await prepareProject(p,{ownerId:B})).importId,a.importId);
 const reversed=Object.fromEntries(Object.entries(p).reverse());assert.equal((await prepareProject(reversed,{ownerId:A})).sourceHash,a.sourceHash);
});
test('legacy alternatives, voids and original audit remain separate and intact',async()=>{
 const result=await prepareProject(legacy(),{ownerId:A});assert.deepEqual(result.original.snapshot,oldSnapshot);
 assert.deepEqual(result.candidates.map(r=>r.scenarioKey),['legacy_descida','legacy_subida']);
 assert.equal(result.candidates[1].voided,true);assert.ok(result.candidates.every(r=>r.reviewRequired&&r.source==='legacy_demo'));
 assert.equal(result.candidates[0].facts.quantityBTC,null);
});
test('malformed legacy data fail preparation before any storage or conversion',async()=>{
 for(const mutate of [p=>p.snapshot.schema=2,p=>p.snapshot.ledger.ledger.push({...p.snapshot.ledger.ledger[0]}),p=>p.snapshot.ledger.ledger[0].price=NaN,p=>p.snapshot.ledger.ledger[0].date='invalid',p=>p.snapshot.ledger.ledger[0].side='actual']){
  const p=legacy();mutate(p);await assert.rejects(prepareProject(p,{ownerId:A}));
 }
});
test('staged import deduplicates by source and preserves original payload',async()=>{
 const r=await prepareProject(legacy(),{ownerId:A});
 await db.query('insert into public.btcsp_legacy_imports(id,project_id,owner_id,source_hash,original_payload) values($1,$2,$3,$4,$5)',[r.importId,P,A,r.sourceHash,r.original]);
 await assert.rejects(db.query('insert into public.btcsp_legacy_imports(id,project_id,owner_id,source_hash,original_payload) values($1,$2,$3,$4,$5)',[uuid(300),P,A,r.sourceHash,r.original]),{code:'23505'});
 assert.deepEqual((await db.query('select original_payload from public.btcsp_legacy_imports')).rows[0].original_payload,r.original);
});
test('RLS also isolates stored plans, imports, preferences and derived calculations',async()=>{
 for(const [owner,project,n]of [[A,P,400],[B,PB,500]]){
  if(owner===B)await db.query("insert into public.btcsp_legacy_imports(id,project_id,owner_id,source_hash,original_payload) values($1,$2,$3,$4,'{}')",[uuid(n),project,owner,'b'.repeat(64)]);
  await db.query("insert into public.btcsp_plan_versions(id,project_id,owner_id,version,basis_revision,scenario_key,profile,reference_price_usd,reference_at,protection_floor_usd,rule_version,configuration) values($1,$2,$3,1,0,'manual_long','balanced',100000,now(),80000,'test','{}')",[uuid(n+1),project,owner]);
  await db.query("insert into public.btcsp_preference_versions(id,owner_id,version,preferences) values($1,$2,1,'{}')",[uuid(n+2),owner]);
  await db.query("insert into public.btcsp_calculation_runs(id,project_id,owner_id,basis_revision,engine_version,rule_version,result_kind,assumptions,results) values($1,$2,$3,0,'test','test','synthetic','{}','{}')",[uuid(n+3),project,owner]);
 }
 for(const owner of [A,B])for(const table of tables)await asUser('authenticated',owner,async()=>{
  const rows=(await db.query('select owner_id from public.'+table)).rows;assert.ok(rows.length>0);assert.ok(rows.every(r=>r.owner_id===owner));
 });
});
test('plan prices reject negative floors, NaN and hidden precision rounding',async()=>{
 const sql="insert into public.btcsp_plan_versions(id,project_id,owner_id,version,basis_revision,scenario_key,profile,reference_price_usd,reference_at,protection_floor_usd,rule_version,configuration) values($1,$2,$3,2,0,'manual_long','balanced',$4,now(),$5,'test','{}')";
 for(const [ref,floor]of [['100000','-1'],['100000','100000'],['NaN','1'],['100000','80000.1234567890123456789']])await assert.rejects(db.query(sql,[uuid(600),P,A,ref,floor]),{code:'23514'});
 await db.query(sql,[uuid(601),P,A,'100000.123456789012345678','80000.123456789012345678']);
 assert.equal((await db.query('select protection_floor_usd::text as p from public.btcsp_plan_versions where id=$1',[uuid(601)])).rows[0].p,'80000.123456789012345678');
});
test('database export and restore preserve snapshots, events, RLS and append-only triggers',async()=>{
 const archive=await db.dumpDataDir(),restored=await PGlite.create({loadDataDir:archive});
 try{
  assert.deepEqual((await restored.query('select payload from public.project_snapshots')).rows[0].payload,oldSnapshot);
  assert.equal((await restored.query('select count(*)::int as n from public.btcsp_financial_events')).rows[0].n,3);
  assert.equal((await restored.query("select relrowsecurity from pg_class where relname='btcsp_financial_events'")).rows[0].relrowsecurity,true);
  await assert.rejects(restored.query('delete from public.btcsp_financial_events'),{code:'55000'});
 }finally{await restored.close()}
});
