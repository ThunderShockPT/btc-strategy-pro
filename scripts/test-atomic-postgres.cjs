'use strict';
// Real PostgreSQL only; deliberately fails if the explicit local QA service is absent.
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{Pool,Client}=require('pg');
const Store=require('../backend/atomic-store.cjs'),Core=require('../financial-engine.js'),f=require('./helpers/onboarding-fixture.cjs');
const endpoint=process.env.BTCSP_TEST_PG_URL;assert(endpoint,'BTCSP_TEST_PG_URL is required (isolated local QA service)');
const url=new URL(endpoint);assert(['127.0.0.1','localhost'].includes(url.hostname),'Tests may only use a local QA PostgreSQL service');
const database='btcsp_qa_'+require('node:crypto').randomBytes(8).toString('hex');
const uuid=n=>'00000000-0000-4000-a000-'+String(n).padStart(12,'0');
const scope={ownerId:uuid(2),projectId:uuid(1),scenarioKey:'demo_long'};
let admin,pool,db,api,gate=null;const pids=new Set();
const authenticate=async token=>token==='owner'?{id:scope.ownerId,email_confirmed_at:'2026-10-20T00:00:00Z',is_anonymous:false}:null;
const contextProvider=async(s,input)=>{if(gate)await gate();return {rules:input.rules,valuation:input.valuation};};
function barrier(){let count=0,release;const ready=new Promise(r=>release=r);return async()=>{count++;if(count===2)release();await ready;};}
const request=(n,revision)=>({workflow:'movement',command:{id:uuid(700+n),idempotencyKey:'native-deposit-'+n,expectedRevision:revision,kind:'capital_deposit',mode:'recorded',amountUSD:'100',currency:'USD',effectiveAt:f.existing().input.valuation.asOf,recordedAt:f.existing().input.valuation.asOf}});
const confirmation=(r,key)=>({headHash:r.headHash,reviewHash:r.reviewHash,idempotencyKey:key});
before(async()=>{
 admin=new Client({connectionString:endpoint});await admin.connect();await admin.query('create database '+database);
 url.pathname='/'+database;pool=new Pool({connectionString:url.toString(),max:4});
 db={transaction:async fn=>{const c=await pool.connect();try{pids.add(c.processID);await c.query('begin');await c.query("set local statement_timeout='10s'");const r=await fn(c);await c.query('commit');return r;}catch(e){await c.query('rollback');throw e;}finally{c.release();}}};
 await pool.query(`do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls;end if;end $$;
 create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;
 create table public.projects(id uuid primary key,owner_id uuid not null references auth.users(id),name text,capital numeric,unique(id,owner_id));
 alter table public.projects enable row level security;create policy own_projects on public.projects for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
 grant select,update on public.projects to service_role;
 create table public.project_snapshots(project_id uuid primary key,owner_id uuid,payload jsonb,version integer);`);
 await pool.query('insert into auth.users values($1),($2)',[scope.ownerId,uuid(90)]);await pool.query("insert into public.projects values($1,$2,'Native QA',2000)",[scope.projectId,scope.ownerId]);
 for(const name of fs.readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort())await pool.query(fs.readFileSync('supabase/migrations/'+name,'utf8'));
 const state={...f.existing(),planHistory:[],receipts:[]};state.plan.configuration.cycleInventory[0].entries[1].state='active';await Store.initialize(db,scope,state);
 api=Store.create({db,authenticate,contextProvider,enabled:true});
});
after(async()=>{if(pool)await pool.end();if(admin){try{await admin.query('drop database if exists '+database);}finally{await admin.end();}}});
const read=()=>db.transaction(tx=>Store.load(tx,scope));
test('native two-connection race accepts one command and rejects the stale contender',async()=>{
 const a=request(1,'3'),b=request(2,'3'),ra=await api.prepare('owner',scope,a),rb=await api.prepare('owner',scope,b);gate=barrier();let results;try{results=await Promise.allSettled([api.commit('owner',scope,a,confirmation(ra,'race-a')),api.commit('owner',scope,b,confirmation(rb,'race-b'))]);}finally{gate=null;}
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/CONCURRENT_PROJECT_CHANGE/);assert(pids.size>=2,'Independent backend connections must execute');
 const state=(await read()).state;assert.equal(state.input.events.length,4);assert.equal(Core.reconstruct(state.input).capital.netContributedUSD,'2100');
});
test('native simultaneous retries append a deposit once and replay the same receipt',async()=>{
 const c=request(3,'4'),r=await api.prepare('owner',scope,c),cf=confirmation(r,'retry-race');gate=barrier();let results;try{results=await Promise.all([api.commit('owner',scope,c,cf),api.commit('owner',scope,c,cf)]);}finally{gate=null;}
 assert.equal(results.filter(x=>x.replayed===true).length,1);assert.equal(results[0].stateHash,results[1].stateHash);assert.equal((await read()).state.input.events.length,5);
});
test('native fill and fee failure rolls back both events, plan, calculation and receipt',async()=>{
 const state=(await read()).state,command={workflow:'execution',command:{kind:'trade',mode:'recorded',type:'trade_buy',id:uuid(810),feeId:uuid(811),planId:uuid(812),idempotencyKey:'native-fill',expectedRevision:'5',fillStatus:'partial',quantityBTC:'0.0005',requestedQuantityBTC:'0.002',priceUSD:'100000',feeUSD:'0.025',cycle:'cycle-1',stage:2,effectiveAt:state.input.valuation.asOf,recordedAt:state.input.valuation.asOf}};
 const r=await api.prepare('owner',scope,command),before=(await pool.query('select count(*)::int n from public.btcsp_calculation_runs')).rows[0].n;
 await pool.query(`create function btcsp_private.fail_native() returns trigger language plpgsql as $$ begin raise exception 'NATIVE_ROLLBACK_PROBE';end $$;create trigger fail_native before insert on btcsp_private.command_receipts for each row execute function btcsp_private.fail_native();`);
 try{await assert.rejects(api.commit('owner',scope,command,confirmation(r,'native-fail')),/NATIVE_ROLLBACK_PROBE/);}finally{await pool.query('drop trigger fail_native on btcsp_private.command_receipts;drop function btcsp_private.fail_native()');}
 assert.deepEqual((await read()).state,state);assert.equal((await pool.query('select count(*)::int n from public.btcsp_calculation_runs')).rows[0].n,before);
 const result=await api.commit('owner',scope,command,confirmation(r,'native-fail'));assert.equal(result.eventsAppended.length,2);const saved=(await read()).state;assert.equal(saved.input.events[5].execution_metadata.unfilledQuantityBTC,'0.0015');assert.equal(saved.planHistory.length,1);
});
test('native RLS separates two SQL identities and denies anonymous reads',async()=>{
 await db.transaction(async c=>{await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[uuid(90)]);assert.equal((await c.query('select * from public.btcsp_financial_events')).rows.length,0);});
 await db.transaction(async c=>{await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[scope.ownerId]);assert.equal((await c.query('select * from public.btcsp_financial_events')).rows.length,7);});
 await assert.rejects(db.transaction(async c=>{await c.query('set local role anon');await c.query('select * from public.btcsp_financial_events');}),{code:'42501'});
});
test('native row lock really blocks a second session until commit',async()=>{
 const first=await pool.connect(),second=await pool.connect();assert.notEqual(first.processID,second.processID);
 try{await first.query('begin');await first.query('select * from btcsp_private.project_heads for update');await second.query('begin');await second.query("set local lock_timeout='100ms'");await assert.rejects(second.query('select * from btcsp_private.project_heads for update'),{code:'55P03'});await second.query('rollback');await first.query('commit');await second.query('select * from btcsp_private.project_heads for update');}finally{await first.query('rollback');await second.query('rollback');first.release();second.release();}
});
test('native API rechecks a revoked Auth session before the financial transaction',async()=>{
 const Auth=require('../backend/supabase-auth.cjs'),HTTP=require('../backend/http-api.cjs'),fixture=require('./helpers/server-fixture.cjs');
 await pool.query(`alter table auth.users add column email_confirmed_at timestamptz,add column deleted_at timestamptz,add column banned_until timestamptz;create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);update auth.users set email_confirmed_at='2026-10-20';`);
 await pool.query('insert into auth.sessions(id,user_id) values($1,$2)',[fixture.SA,scope.ownerId]);
 const auth=Auth.create({publishableKey:'native-publishable-fixture',now:fixture.now,fetchImpl:async()=>new Response(JSON.stringify(fixture.user(scope.ownerId)))});let revoke=false;
 const handler=HTTP.create({db,auth,admit:async()=>true,origins:['https://btc.example.test'],enabled:true,contextProvider:async(s,input)=>{if(revoke)await pool.query('delete from auth.sessions where id=$1',[fixture.SA]);return {rules:input.rules,valuation:input.valuation};}});
 const body={projectId:scope.projectId,scenarioKey:scope.scenarioKey,request:request(4,'7')};
 const call=(route,data)=>handler(new Request('https://api.example.test/api/v20/'+route,{method:'POST',headers:{origin:'https://btc.example.test','Content-Type':'application/json',Authorization:'Bearer '+fixture.TA},body:JSON.stringify(data)}),{remoteAddress:'127.0.0.1'});
 const prepared=await call('prepare',body);assert.equal(prepared.status,200);const proposal=(await prepared.json()).result;revoke=true;
 const result=await call('commit',{...body,confirmation:{headHash:proposal.headHash,reviewHash:proposal.reviewHash,idempotencyKey:'revoked-native-session'}});assert.equal(result.status,401);assert.equal((await read()).head.revision,'7');
});
test('native session guard holds a share lock against deletion during a transaction',async()=>{
 const Auth=require('../backend/supabase-auth.cjs'),fixture=require('./helpers/server-fixture.cjs');await pool.query('insert into auth.sessions(id,user_id) values($1,$2)',[fixture.SA,scope.ownerId]);
 const auth=Auth.create({publishableKey:'fixture',now:fixture.now,fetchImpl:async()=>new Response(JSON.stringify(fixture.user(scope.ownerId)))}),user=await auth.authenticate(fixture.TA);
 const first=await pool.connect(),second=await pool.connect();try{await first.query('begin');await auth.assertSession(first,user,scope);await second.query('begin');await second.query("set local lock_timeout='100ms'");await assert.rejects(second.query('delete from auth.sessions where id=$1',[fixture.SA]),{code:'55P03'});await second.query('rollback');await first.query('commit');}finally{await first.query('rollback');await second.query('rollback');first.release();second.release();}
});
