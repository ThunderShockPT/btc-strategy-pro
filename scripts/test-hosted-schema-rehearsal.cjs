'use strict';
// Native disposable loopback PostgreSQL in CI; local PGlite dry-runs are labelled. Never connects to the hosted DB.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{Client}=require('pg');
const Backup=require('./qa/empty-public-schema.cjs'),snapshot=require('../docs/qa/V20_12G_PUBLIC_SCHEMA_BEFORE_20261024.json');
const endpoint=process.env.BTCSP_TEST_PG_URL,url=endpoint?new URL(endpoint):null;if(url)assert(['127.0.0.1','localhost'].includes(url.hostname),'Only disposable loopback QA allowed');
const id=n=>'00000000-0000-4000-a000-'+String(n).padStart(12,'0');
test('captured hosted V19 schema restores, migrates with real default ACLs, preserves legacy RPCs and rolls back isolated DDL',async t=>{
 let admin,db,pglite;const dbName='btcsp_schema_qa_'+crypto.randomBytes(8).toString('hex');
 if(endpoint){admin=new Client({connectionString:endpoint});await admin.connect();}else{pglite=await require('@electric-sql/pglite').PGlite.create();admin={query:async(sql,args)=>{const r=await pglite.query(sql,args);return {...r,rowCount:r.rows?.length??r.affectedRows};}};}
 t.after(async()=>{if(pglite){await pglite.close();return;}if(db)await db.end();try{await admin.query('drop database if exists '+dbName);}finally{await admin.end();}});
 for(const r of Backup.roles(snapshot))if(!(await admin.query('select 1 from pg_roles where rolname=$1',[r])).rowCount)await admin.query('create role "'+r.replace(/"/g,'""')+'" '+(r==='service_role'?'bypassrls':'nologin'));
 if(endpoint){await admin.query('create database '+dbName);url.pathname='/'+dbName;db=new Client({connectionString:url.toString()});await db.connect();}else{db={query:async(sql,args)=>{if(!args&&sql.split(';').length>2){await pglite.exec(sql);return {rows:[],rowCount:0};}const r=await pglite.query(sql,args);return {...r,rowCount:r.rows?.length??r.affectedRows};}};}
 // Only Auth dependency stubs. No production identity data or SMTP is copied.
 await db.query("create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,service_role;");
 await db.query(Backup.restoreSQL(snapshot));
 const before=(await db.query("select conname,pg_get_constraintdef(oid,true) definition from pg_constraint where contype<>'n' and connamespace='public'::regnamespace order by conname")).rows;
 assert.equal(before.length,snapshot.constraints.length);assert.equal((await db.query("select * from pg_policies where schemaname='public'")).rowCount,8);
 // A rollback rehearsal applies ALL source migrations inside one outer transaction.
 const files=fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort(),sources=files.map(f=>fs.readFileSync('supabase/migrations/'+f,'utf8'));
 const combined=sources.map(s=>s.replace(/^begin;\s*$/gmi,'').replace(/^commit;\s*$/gmi,'')).join('\n');
 await db.query('begin');await db.query(combined);assert.equal((await db.query("select * from information_schema.tables where table_schema='btcsp_private' and table_type='BASE TABLE'")).rowCount,6);await db.query('rollback');
 assert.equal((await db.query("select * from pg_namespace where nspname='btcsp_private'")).rowCount,0);
 for(const sql of sources)await db.query(sql);
 assert.deepEqual((await db.query("select conname,pg_get_constraintdef(oid,true) definition from pg_constraint where contype<>'n' and connamespace='public'::regnamespace and conrelid in('public.projects'::regclass,'public.project_snapshots'::regclass) order by conname")).rows,before);
 const tables=(await db.query("select n.nspname schema,c.relname name,c.relrowsecurity rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in('public','btcsp_private') order by 1,2")).rows;
 assert.equal(tables.length,14);assert(tables.every(x=>x.rls));
 for(const t of tables.filter(t=>t.name.startsWith('btcsp_')||t.schema==='btcsp_private'))for(const who of ['anon','authenticated']){
  const access=(await db.query("select has_table_privilege($1,$2,'INSERT') ins,has_table_privilege($1,$2,'UPDATE') upd,has_table_privilege($1,$2,'DELETE') del",[who,t.schema+'.'+t.name])).rows[0];assert.deepEqual(access,{ins:false,upd:false,del:false},who+' cannot write '+t.name);
 }
 // Actual restored V19 functions still accept owned snapshots after V20 DDL.
 await db.query('insert into auth.users values($1),($2)',[id(1),id(2)]);
 await db.query('begin');await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id(1)]);
 const saved=(await db.query("select * from public.btcsp_save_project_v1($1,'Recovery QA','demo',2000,false,'{}',null,null)",[id(3)])).rows[0];assert.equal(saved.snapshot_version,1);
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id(2)]);assert.equal((await db.query('select * from public.projects')).rowCount,0);assert.equal((await db.query('select * from public.project_snapshots')).rowCount,0);await db.query('rollback');
 assert.equal((await db.query('select * from public.projects')).rowCount,0);
 assert.equal((await db.query("select * from pg_trigger where not tgisinternal and tgrelid in('public.projects'::regclass,'public.project_snapshots'::regclass)")).rowCount,2);
 // Exercise V20 against the REAL legacy columns/checks, not a simplified projects table.
 const Wallet=require('../backend/wallet-store.cjs'),Store=require('../backend/atomic-store.cjs'),Core=require('../financial-engine.js'),Setup=require('../wallet-onboarding.js'),fixture=require('./helpers/onboarding-fixture.cjs');
 const database={transaction:async fn=>{await db.query('begin');try{const value=await fn(db);await db.query('commit');return value;}catch(e){await db.query('rollback');throw e;}}},scope={ownerId:id(1),projectId:id(4),scenarioKey:'demo_long'},now=()=>fixture.context().now;
 const wallet=Wallet.create({db:database,authenticate:async()=>({id:scope.ownerId,email_confirmed_at:'2026-10-01',is_anonymous:false}),authorizeTransaction:async(tx,user)=>{assert.equal((await tx.query('select id from auth.users where id=$1',[user.id])).rowCount,1);},setupContextProvider:async()=>{const c=fixture.context();c.baseCyclePolicy.maxCycles=1;return Object.fromEntries(['now','rules','valuation','market','baseCyclePolicy'].map(k=>[k,c[k]]));},now,enabled:true});
 const request={workflow:'wallet-create',command:{mode:'recorded',reviewId:id(5),openingEventId:id(6),planId:id(7),receiptId:id(8),setup:fixture.request()}};
 const invalid=structuredClone(request);invalid.command.setup.capitalUSD='1';await assert.rejects(wallet.prepare('qa-only',scope,invalid),/INVALID_WALLET_CAPITAL/);
 const proposal=await wallet.prepare('qa-only',scope,request),tutorial=Setup.tutorial(),confirmation={headHash:proposal.headHash,reviewHash:proposal.reviewHash,idempotencyKey:'schema-native-wallet',tutorialAcknowledgment:{tutorialVersion:tutorial.version,completedTopicIds:tutorial.topics.map(t=>t.id),understoodRisk:true,termsVersion:tutorial.termsVersion,privacyVersion:tutorial.privacyVersion,acceptedAt:now()}};
 await wallet.commit('qa-only',scope,request,confirmation);assert.equal((await wallet.commit('qa-only',scope,request,confirmation)).replayed,true);
 const state=await database.transaction(async tx=>(await Store.load(tx,scope)).state),ledger=Core.reconstruct(state.input);assert.equal(ledger.capital.netContributedUSD,'2000');assert.equal(ledger.position.quantityBTC,'0');assert.equal((await db.query('select count(*)::int n from public.projects')).rows[0].n,1);assert.equal((await db.query('select count(*)::int n from public.project_snapshots')).rows[0].n,0);
 await db.query('begin');await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id(2)]);assert.equal((await db.query('select * from public.btcsp_financial_events')).rowCount,0);await db.query('rollback');
 console.log(JSON.stringify({kind:'empty-hosted-public-schema-rehearsal',adapter:endpoint?'native-postgres':'pglite',postgres:(await db.query('show server_version')).rows[0].server_version,snapshotSHA256:crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),migrations:files.map((name,n)=>({name,sha256:crypto.createHash('sha256').update(sources[n]).digest('hex')})),tables:tables.length,legacyRPC:true,legacyRLS:true,transactionRollback:true,excludes:['auth-restore','non-empty-data-restore','smtp','hosted-runtime-approval']}));
});
