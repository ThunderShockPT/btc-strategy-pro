'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Bridge=require('../account-five-menu-bridge-v20.js');
const Session=require('../account-session-v20.js');
const F=require('./helpers/cycle-fixture.cjs');
const owner=F.uuid(2),project=F.uuid(1),projectB=F.uuid(40),other=F.uuid(99),stamp='2026-10-25T16:18:00Z';
const source='https://oftzqqjbwonngubihrsd.supabase.co';
const planned=(id,capital='2000',who=owner)=>{
 const input=F.input(capital),plan=F.plan();
 input.projectId=plan.projectId=id;input.ownerId=plan.ownerId=who;
 for(const e of input.events){e.project_id=id;e.owner_id=who;}
 input.events.push(F.event(2,'margin_add',{amountUSD:'500',currency:'USD',purpose:'initial'}),F.event(3,'trade_buy',{symbol:'PF_XBTUSD',executionStatus:'executed',quantityBTC:'0.01',priceUSD:'100000',cycle:'cycle-1'}));
 for(const e of input.events){e.project_id=id;e.owner_id=who;}
 return {input,plan};
};
function setup({privateSession=true,delayState=null,rejectWallets=false,rejectState=false,wrongScope=false}={}){
 let actualOwner=owner,expired=false,authEvent=null,logoutCalls=0,requests=[],ownerValidated=true;
 const walletRows=[{projectId:project,scenarioKey:'manual_long',title:'Carteira Principal',revision:'3'},
 {projectId:projectB,scenarioKey:'manual_long',title:'Carteira Secundária',revision:'3'}];
 const session=()=>({user:{id:owner},access_token:'access-token-fixture',expires_at:4102444800});
 const auth={
  getSession:async()=>({data:{session:expired?null:session()},error:null}),
  getUser:async()=>({data:{user:{id:actualOwner,email_confirmed_at:ownerValidated?'2026-10-20T00:00:00Z':null,is_anonymous:false}},error:null}),
  onAuthStateChange:cb=>{authEvent=cb;return {data:{subscription:{unsubscribe(){authEvent=null;}}}};},
  signOut:async()=>{logoutCalls++;expired=true;authEvent?.('SIGNED_OUT',null);return {error:null};}
 };
 const supabase={auth};
 async function fakeFetch(url,opts){
  assert.equal(opts.method,'POST');assert.equal(opts.credentials,'omit');assert.equal(opts.cache,'no-store');
  assert.equal(opts.headers.Authorization,'Bearer access-token-fixture');assert.ok(!url.endsWith('/commit')&&!url.endsWith('/prepare'),'NO_WRITES');
  requests.push({url,body:JSON.parse(opts.body)});
  const body=JSON.parse(opts.body);
  if(url.endsWith('/wallets')){
   return new Response(JSON.stringify(rejectWallets?{code:'BAD_WALLETS'}:{result:{wallets:walletRows,nextCursor:null}}),{status:rejectWallets?500:200});
  }
  assert.ok(url.endsWith('/state'));
  if(delayState)await delayState.promise;
  if(rejectState)return new Response(JSON.stringify({code:'CLOUD_NOT_READY'}),{status:503});
  let state=planned(body.projectId,body.projectId===projectB?'3000':'2000',wrongScope?other:owner);
  return new Response(JSON.stringify({result:{state,revision:'3',headHash:'a'.repeat(64)}}),{status:200});
 }
 const bridge=Bridge.create({supabase,supabaseURL:source,projectId:project,fetchImpl:fakeFetch,
   sessionFactory:privateSession?Session.createPrivateTest:Session.create,clock:()=>stamp});
 return {bridge,auth,requests,events:()=>authEvent,logoutCalls:()=>logoutCalls,
   setOwner:v=>{actualOwner=v;},setVerified:v=>{ownerValidated=v;}};
}
const fails=(p,code)=>assert.rejects(p,e=>e?.code===code||e?.message===code);
async function ready(x=setup()){await x.bridge.start();return x;}
async function loaded(x=setup()){await ready(x);await x.bridge.listWallets();await x.bridge.selectWallet(project);return x;}
test('ordinary app cannot turn on financialCloudApproved: false',async()=>{
 const x=setup({privateSession:false});await fails(x.bridge.start(),'CLOUD_NOT_ENABLED');
 assert.equal(x.bridge.state().projection,null);assert.equal(x.requests.length,0);x.bridge.dispose();
});
test('private QA composes REAL AccountSession V20 and lists only server wallets',async()=>{
 const x=await ready();const wallets=await x.bridge.listWallets();
 assert.equal(wallets.length,2);assert.equal(wallets[0].title,'Carteira Principal');
 assert.equal(x.bridge.state().projection,null);assert.equal(x.bridge.state().phase,'wallet-selection-required');
 assert.equal(x.requests[0].body.scenarioKey,'manual_long');x.bridge.dispose();
});
test('verified login + wallet selection yields one ledger source for the five menus',async()=>{
 const x=await loaded(),v=x.bridge.state();
 assert.equal(v.projection.financial.walletUSD,'1500');assert.equal(v.projection.financial.freeCashUSD,'1400');
 assert.equal(v.projection.financial.isolatedMarginUSD,'500');assert.equal(v.projection.financial.positionQuantityBTC,'0.01');
 assert.deepEqual(Object.keys(v.projection.menus),['inicio','estrategias','mercado','risco','conta']);
 assert.equal(v.projection.menus.inicio.cashUSD,v.projection.financial.freeCashUSD);
 assert.equal(v.selectedProjectId,project);assert.equal(v.canWrite,false);assert.equal(v.canTrade,false);
 x.bridge.dispose();
});
test('no real-time price or live buying power can be invented by R5.2',async()=>{
 const x=await loaded(),p=x.bridge.state().projection;
 assert.equal(p.status,'authenticated-bookkeeping-only');assert.equal(p.shared.rulesCurrent,false);
 assert.equal(p.financial.buyingPowerOfficialUSD,null);assert.equal(p.shared.riskAdmissible,false);x.bridge.dispose();
});
test('changing selected wallet destroys old projection before loading the new one',async()=>{
 const x=await loaded();assert.equal(x.bridge.state().projection.financial.freeCashUSD,'1400');
 const switched=await x.bridge.selectWallet(projectB);assert.equal(switched.financial.freeCashUSD,'2400');
 assert.equal(x.bridge.state().selectedProjectId,projectB);assert.equal(x.bridge.state().projection.financial.freeCashUSD,'2400');x.bridge.dispose();
});
test('arbitrary project ID cannot be selected unless returned by authenticated list',async()=>{
 const x=await loaded();await fails(x.bridge.selectWallet(other),'R52_WALLET_NOT_IN_AUTHENTICATED_LIST');
 assert.equal(x.requests.filter(r=>r.url.endsWith('/state')).length,1);x.bridge.dispose();
});
test('sign-out erases private data and does not trigger background saving',async()=>{
 const x=await loaded();const stateBefore=x.bridge.state().projection;await x.bridge.signOut();
 assert.equal(x.bridge.state().projection,null);assert.equal(x.bridge.state().connected,false);
 assert.equal(x.bridge.state().authenticated,false);assert.equal(x.logoutCalls(),1);
 assert.ok(stateBefore.financial.freeCashUSD==='1400');x.bridge.dispose();
});
test('unexpected Supabase SIGNED_OUT event removes the projection immediately',async()=>{
 const x=await loaded();x.events()?.('SIGNED_OUT',null);
 assert.equal(x.bridge.state().projection,null);assert.equal(x.bridge.state().selectedProjectId,null);
 x.bridge.dispose();
});
test('wrong owner returned by backend cannot display funds',async()=>{
 const x=await ready(setup({wrongScope:true}));await x.bridge.listWallets();
 await assert.rejects(x.bridge.selectWallet(project),/R5_OWNER_SCOPE_MISMATCH/);
 assert.equal(x.bridge.state().projection,null);x.bridge.dispose();
});
test('an unverified user cannot establish the session',async()=>{
 const x=setup();x.setVerified(false);await x.bridge.start();
 assert.equal(x.bridge.state().projection,null);assert.equal(x.bridge.state().connected,false);
 assert.equal(x.requests.length,0);x.bridge.dispose();
});
test('switching Supabase user before a refresh prevents old user projection',async()=>{
 const x=await loaded();x.setOwner(other);
 await assert.rejects(x.bridge.refresh());
 assert.equal(x.bridge.state().projection,null);x.bridge.dispose();
});
test('backend read failure fails closed and clears prior values',async()=>{
 const x=await loaded(setup({rejectState:false})); // recreate as live backend failure using auth change
 x.setVerified(false);await assert.rejects(x.bridge.refresh());
 assert.equal(x.bridge.state().projection,null);x.bridge.dispose();
});
test('failed authenticated wallet enumeration shows zero financial values',async()=>{
 const x=await ready(setup({rejectWallets:true}));await assert.rejects(x.bridge.listWallets());
 assert.equal(x.bridge.state().projection,null);assert.equal(x.bridge.state().phase,'blocked');x.bridge.dispose();
});
test('logout during an in-flight financial response cannot restore old user data',async()=>{
 let release,hit,resolveHit;const gate=new Promise(r=>release=r),seen=new Promise(r=>resolveHit=r);
 const delay={promise:gate};const x=await ready(setup({delayState:delay}));await x.bridge.listWallets();
 const pending=x.bridge.selectWallet(project);
 for(let i=0;i<35&&!x.requests.some(r=>r.url.endsWith('/state'));i++)await new Promise(r=>setImmediate(r));
 assert.ok(x.requests.some(r=>r.url.endsWith('/state')));
 await x.bridge.signOut();release();
 await assert.rejects(pending);assert.equal(x.bridge.state().projection,null);x.bridge.dispose();
});
test('refresh only uses /state and account list only /wallets; never writes or trades',async()=>{
 const x=await loaded();await x.bridge.refresh();
 const paths=new Set(x.requests.map(r=>new URL(r.url).pathname.split('/').at(-1)));
 assert.deepEqual([...paths].sort(),['state','wallets']);x.bridge.dispose();
});
test('subscription receives a clone so it cannot mutate private shared ledger',async()=>{
 const x=await loaded();const off=x.bridge.subscribe(state=>{if(state.projection)state.projection.financial.freeCashUSD='99999';});
 assert.equal(x.bridge.state().projection.financial.freeCashUSD,'1400');off();x.bridge.dispose();
});
test('adapter exposes read-only control, no credential storage or financial commit function',()=>{
 const x=setup();
 for(const method of ['commit','confirm','prepare','executeTrade','submitOrder'])assert.equal(Object.hasOwn(x.bridge,method),false);
 assert.equal(Object.hasOwn(x.bridge,'token'),false);
 x.bridge.dispose();
});
