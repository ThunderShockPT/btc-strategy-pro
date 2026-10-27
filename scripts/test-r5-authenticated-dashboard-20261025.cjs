'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Dashboard=require('../authenticated-dashboard-v20.js');
const Core=require('../financial-engine.js');
const fixture=require('./helpers/onboarding-fixture.cjs');
const F=require('./helpers/cycle-fixture.cjs');
const sha='a'.repeat(64),owner=F.uuid(2),other=F.uuid(99),project=F.uuid(1);
function setup({status='synced',scenarioKey='demo_long',ownerId=owner,planOwner=owner,projectId=project,
 userId=owner,verified=true,anonymous=false,revision='3',headHash=sha,now='2026-10-25T15:15:00Z',snapshot=null,slow=null,hasPending=false}={}){
 const s=snapshot||fixture.existing();
 s.input.ownerId=ownerId;s.plan.ownerId=planOwner;
 const payload={state:s,revision,headHash};let stopped=0,readCalls=0,authCalls=0;
 const client={read:async()=>{readCalls++;if(slow)await slow.promise;return structuredClone(payload);},
  state:()=>({projectId,scenarioKey,status,hasPending,hasReview:false}),clearSession:()=>{stopped++;}};
 const dashboard=Dashboard.create({client,getVerifiedOwner:async()=>{authCalls++;return {id:userId,emailConfirmed:verified,isAnonymous:anonymous};},clock:()=>now});
 return {dashboard,payload,client,stopped:()=>stopped,readCalls:()=>readCalls,authCalls:()=>authCalls};
}
const reject=(run,code)=>assert.rejects(run,e=>e.code===code);
test('authenticated V20 ledger has exact correct cash, margin and position',async()=>{
 const {dashboard}=setup(),r=await dashboard.read();
 assert.equal(r.financial.walletUSD,'1500');assert.equal(r.financial.freeCashUSD,'1400');assert.equal(r.financial.isolatedMarginUSD,'500');
 assert.equal(r.financial.positionQuantityBTC,'0.01');assert.equal(r.financial.unrealizedPnLUSD,'0');
 assert.equal(r.shared.revision,'3');assert.equal(r.status,'authenticated-bookkeeping-only');
});
test('five menus consume same owner, revision and head hash',async()=>{const x=setup(),r=await x.dashboard.read();
 assert.deepEqual(Object.keys(r.menus),['inicio','estrategias','mercado','risco','conta']);
 assert.equal(r.menus.inicio.cashUSD,r.financial.freeCashUSD);
 assert.equal(r.menus.estrategias.planVersion,r.shared.planVersion);
 assert.equal(r.menus.conta.revision,r.shared.revision);
 assert.equal(r.shared.headHash,sha);
});
test('ledger truth is not changed by a synthetic future BTC price',async()=>{const x=setup(),r=await x.dashboard.read();
 assert.equal(r.financial.freeCashUSD,'1400');
 assert.equal(r.financial.buyingPowerOfficialUSD,null);
 assert.equal(r.financial.canAffordFuturePurchase,null);
 assert.equal(r.shared.riskAdmissible,false);
});
test('existing journal and plan never mutated by read projection',async()=>{const s=fixture.existing(),before=structuredClone(s),x=setup({snapshot:s});await x.dashboard.read();assert.deepEqual(s,before);});
test('reject forged owner or mismatched project before showing any money',async()=>{
 for(const patch of [{ownerId:other},{projectId:other},{planOwner:other}]){
  const x=setup(patch);await assert.rejects(x.dashboard.read(),/R5_OWNER_SCOPE_MISMATCH|R5_PLAN_SCOPE_MISMATCH/);
  assert.equal(x.dashboard.peek().hasVerifiedData,false);
 }
});
test('reject anonymous/unverified/absent authentication without reading server state',async()=>{
 for(const patch of [{verified:false},{anonymous:true},{userId:null}]){const x=setup(patch);await reject(x.dashboard.read(),'R5_VERIFIED_USER_REQUIRED');assert.equal(x.readCalls(),0);}
});
test('rejected server response has no stale user financial data',async()=>{
 const x=setup();await x.dashboard.read();x.payload.state.plan.ownerId=other; // break server snapshot
 await reject(x.dashboard.read(),'R5_PLAN_SCOPE_MISMATCH');assert.equal(x.dashboard.peek().data,null);
});
test('server revision and fingerprint are mandatory',async()=>{
 for(const patch of [{revision:'unexpected'},{headHash:'abc'}]){
  const x=setup(patch);await reject(x.dashboard.read(),'R5_SERVER_SNAPSHOT_INVALID');
 }
});
test('pending uncertain user writes block private projection as synchronized',async()=>{const x=setup({hasPending:true});await reject(x.dashboard.read(),'R5_CLOUD_NOT_READY');});
test('a signed-out session discards the projection and clears private client',async()=>{
 const x=setup();await x.dashboard.read();x.dashboard.clear();
 assert.equal(x.dashboard.peek().phase,'signed-out');assert.equal(x.dashboard.peek().data,null);assert.equal(x.stopped(),1);
});
test('late backend read cannot resurrect signed-out data',async()=>{
 let release,started;const promise=new Promise(r=>release=r),seen=new Promise(r=>started=r);
 const s=setup({slow:{promise}});
 const load=s.dashboard.read(); // verification awaits promise -> allow async
 for(let i=0;i<8&&!s.readCalls();i++)await Promise.resolve();
 assert.equal(s.readCalls(),1);s.dashboard.clear();release();
 await reject(load,'R5_SESSION_CHANGED');assert.equal(s.dashboard.peek().data,null);
});
test('second simultaneous request is refused rather than racing',async()=>{
 let release;const promise=new Promise(r=>release=r),s=setup({slow:{promise}});
 const one=s.dashboard.read();for(let i=0;i<10&&!s.readCalls();i++)await Promise.resolve();
 await reject(s.dashboard.read(),'R5_READ_ALREADY_RUNNING');release();await one;
});
test('the Supabase verifier uses getUser rather than mutable metadata or local-only getSession',async()=>{
 let calls=0;
 const verify=Dashboard.verifiedOwnerFromSupabase({auth:{getUser:async()=>{calls++;return {data:{user:{id:owner,email_confirmed_at:'2026-10-20T00:00:00Z',is_anonymous:false,raw_user_meta_data:{role:'admin'}}}};},getSession:()=>{throw Error('must not use local-only identity');}}});
 assert.deepEqual(await verify(),{id:owner,emailConfirmed:true,isAnonymous:false});assert.equal(calls,1);
});
test('valid but stale quote and stale Kraken rules never unlock live buying power',async()=>{
 const r=await setup().dashboard.read();assert.equal(r.shared.quoteCurrent,false);assert.equal(r.shared.rulesCurrent,false);
 assert.equal(r.shared.riskAdmissible,false);assert.equal(r.status,'authenticated-bookkeeping-only');
 assert.equal(r.menus.mercado.quoteCurrent,false);assert.equal(r.menus.risco.calcApproved,false);
});
test('caller modifications to returned projection cannot change private cached copy',async()=>{
 const x=setup(),v=await x.dashboard.read();v.financial.freeCashUSD='9999';
 assert.equal(x.dashboard.peek().data.financial.freeCashUSD,'1400');
});
test('reject invalid snapshot values and do not show partial financial state',async()=>{
 const x=setup();x.payload.state.input.events[0].facts.amountUSD='INVALID';
 await assert.rejects(x.dashboard.read());assert.equal(x.dashboard.peek().data,null);
});
test('cash comes from ledger fee and margin events not demo cards',async()=>{
 const s=fixture.existing();s.input.events.push(F.event(4,'fee',{amountUSD:'10',currency:'USD',category:'other'}));
 s.input.events.at(-1).scenario_key='demo_long';s.input.events.at(-1).origin='demo';
 const x=setup({snapshot:s}),r=await x.dashboard.read();assert.equal(r.financial.freeCashUSD,'1390');assert.equal(r.financial.isolatedMarginUSD,'500');
});
test('no write/trading methods on the public adapter',()=>{assert.deepEqual(Object.keys(Dashboard).sort(),['create','verifiedOwnerFromSupabase'].sort());});
