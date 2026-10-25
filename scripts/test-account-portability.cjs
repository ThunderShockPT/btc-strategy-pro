'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const f=require('./helpers/server-fixture.cjs'),{setup}=require('./helpers/account-fixture.cjs'),Port=require('../backend/account-portability.cjs'),Collect=require('../account-portability-v20.js');
async function fixture(t){const x=await setup(t);await x.db.exec('create table public.project_snapshots(project_id uuid primary key,owner_id uuid,payload jsonb,version integer)');return x;}
test('authenticated account export covers all business sections, keeps exact decimal digits and never copies another owner',async t=>{
 const x=await fixture(t),before=await x.store.snapshot(f.TA,x.scope);
 await x.db.query('update public.projects set capital=12345678901234567890.123456789012345678 where id=$1',[f.P]);
 await x.db.query('insert into public.project_snapshots values($1,$2,$3,1)',[f.P,f.A,{test:'legacy snapshot'}]);
 await x.db.query("insert into public.btcsp_preference_versions(id,owner_id,version,preferences) values($1,$2,1,$3)",[f.uuid(50000),f.A,{theme:'midnight',label:'QA <script> is plain data'}]);
 const data=await x.workflow.exportAccount();assert.equal(data.format,Collect.FORMAT);
 assert(data.content.includes('12345678901234567890.123456789012345678'),'SQL decimal digits must survive without JSON number round trip');
 const file=JSON.parse(data.content);assert.equal(file.metadata.complete,true);assert.equal(file.metadata.automaticRestoreAllowed,false);assert.equal(file.sections.events.length,3);assert.equal(file.sections.snapshots[0].payload.test,'legacy snapshot');assert.equal(file.sections.preferences[0].preferences.theme,'midnight');
 assert(!data.content.includes(f.B));assert(!data.content.includes(f.PB));assert(!data.content.includes(f.TA));assert(!data.content.includes('not-used'),'Auth response metadata is not a source for authorization/export');
 assert.deepEqual(await x.store.snapshot(f.TA,x.scope),before);assert.deepEqual(x.requests.map(url=>new URL(url).pathname).filter(p=>!p.endsWith('/state')&&!p.endsWith('/portability')),[]);
});
test('large Unicode records are assembled in bounded pieces and read again only after a cursor advances',async t=>{
 const x=await fixture(t),payload={note:'coração 🐎 '.repeat(110000)};await x.db.query('insert into public.project_snapshots values($1,$2,$3,1)',[f.P,f.A,payload]);
 const api=Port.create({db:x.db,authenticate:x.auth.authenticate,authorizeTransaction:x.auth.assertSession,enabled:true});let pieces=0,max=0,progress=0;
 const data=await Collect.collect({read:async request=>{const r=await api.read(f.TA,x.scope,request);if(r.piece)pieces++;if(r.rows)max=Math.max(max,Buffer.byteLength(JSON.stringify(r)));return r;},onProgress:()=>progress++});
 assert(pieces>1);assert(max<1100000);assert.equal(JSON.parse(data.content).sections.snapshots[0].payload.note,payload.note);assert(progress<100,'progress is per page, never a quadratic redraw for each financial row');
});
test('changed records, corrupted pages, limits and invalid sections do not yield a complete download',async t=>{
 const x=await fixture(t),api=Port.create({db:x.db,authenticate:x.auth.authenticate,authorizeTransaction:x.auth.assertSession,enabled:true});
 await assert.rejects(api.read(f.TA,x.scope,{section:'auth.users'}),/INVALID_PORTABILITY_REQUEST/);
 await assert.rejects(api.read(f.TA,{...x.scope,ownerId:f.B},{section:'manifest'}),/VERIFIED_OWNER_SESSION_REQUIRED/);
 let changed=false;await assert.rejects(Collect.collect({read:async request=>{const p=await api.read(f.TA,x.scope,request);if(request.section==='projects'&&p.rows.length&&!changed){changed=true;await x.db.query('update public.projects set name=$1 where id=$2',['Changed during export',f.P]);}return p;}}),/ACCOUNT_EXPORT_CHANGED/);
 await assert.rejects(Collect.collect({read:async request=>{const p=await api.read(f.TA,x.scope,request);if(p.rows?.length)p.rows[0].data+=' ';return p;}}),/ACCOUNT_EXPORT_CHANGED/);
 await assert.rejects(Collect.collect({read:request=>api.read(f.TA,x.scope,request),limitBytes:20}),/ACCOUNT_EXPORT_TOO_LARGE/);
});
test('revocation and logout during pagination discard data before a download can be returned',async t=>{
 const x=await fixture(t);let seen=0;x.after(async url=>{if(url.endsWith('/portability')&&++seen===2)await x.db.query('delete from auth.sessions where id=$1',[f.SA]);});
 await assert.rejects(x.workflow.exportAccount(),e=>e.status===401);assert.equal(x.workflow.state().snapshot,null);
 const y=await fixture(t);let release,started;const gate=new Promise(r=>release=r),ready=new Promise(r=>started=r);y.after(async url=>{if(url.endsWith('/portability')){started();await gate;}});const pending=y.workflow.exportAccount();await ready;y.workflow.clearSession();release();await assert.rejects(pending,/SESSION_CHANGED/);assert.equal(y.workflow.state().portabilityProgress,null);
});
test('a financial wallet backup can be checked offline, but corruption or fabricated head metadata is rejected',async t=>{
 const x=await fixture(t),backup=await x.workflow.exportWallet(),Check=require('./check-wallet-backup.cjs'),before=await x.store.snapshot(f.TA,x.scope);
 assert.equal(Check.check(backup).status,'validated-offline-staging-only');assert.equal(Check.check(backup).scopeVerifiedAgainstAccount,false);
 const changed=structuredClone(backup);changed.envelope.payload.source.input.events[0].facts.amountUSD='999';assert.throws(()=>Check.check(changed),/DIGEST/);
 assert.throws(()=>Check.check({...backup,headHash:'f'.repeat(64)}),/BACKUP_HEAD_MISMATCH/);
 assert.throws(()=>Check.check({...backup,automaticRestoreAllowed:true}),/UNSUPPORTED_WALLET_BACKUP/);
 assert.deepEqual(await x.store.snapshot(f.TA,x.scope),before);
});
test('5000 movements are exported completely across bounded pages without changing their head', {timeout:60000},async t=>{
 const x=await fixture(t),Store=require('../backend/atomic-store.cjs'),Capacity=require('./helpers/real-auth-capacity-fixture.cjs'),scope={ownerId:f.A,projectId:f.uuid(51000),scenarioKey:'manual_long'},state=Capacity.state('large-12',scope,new Date().toISOString());
 await x.db.query("insert into public.projects(id,owner_id,name,capital,mode) values($1,$2,'QA 5000 portability',50000,'real')",[scope.projectId,scope.ownerId]);
 await Store.initialize(x.db,scope,state);const before=await x.db.query('select state_hash from btcsp_private.project_heads where project_id=$1',[scope.projectId]);
 const api=Port.create({db:x.db,authenticate:x.auth.authenticate,authorizeTransaction:x.auth.assertSession,enabled:true});let pages=0,maxBytes=0;
 const out=await Collect.collect({read:async request=>{const result=await api.read(f.TA,x.scope,request);pages++;maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(result)));return result;}});
 const file=JSON.parse(out.content);assert.equal(file.sections.events.filter(e=>e.project_id===scope.projectId).length,5000);assert.equal(file.sections.events.length,5003);assert(pages<60);assert(maxBytes<1200000);assert.deepEqual(await x.db.query('select state_hash from btcsp_private.project_heads where project_id=$1',[scope.projectId]),before);
});
