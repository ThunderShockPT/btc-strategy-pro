'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Runtime=require('../five-menu-integrated-runtime-v20.js');
const Session=require('../account-session-v20.js');
const F=require('./helpers/cycle-fixture.cjs');
const PROJECT=F.uuid(1),PROJECT_B=F.uuid(40),OWNER=F.uuid(2),OTHER=F.uuid(99);
const BASE='https://oftzqqjbwonngubihrsd.supabase.co',NOW=Date.parse('2026-10-20T23:42:00Z');
const unique=n=>'00000000-0000-4000-a000-'+String(n).padStart(12,'0');
function setup({qa=true,delay=null,allowWrite=false,offlineAfterCommit=false,wrongOwner=false,changeOwner=false}={}){
 let selected=null,expired=false,authChange=null,signouts=0,writes=0,reads=0,prepares=0,revision={ [PROJECT]:3,[PROJECT_B]:3},generation=300;
 const data=new Map();
 for(const [id,cash]of [[PROJECT,'2000'],[PROJECT_B,'3000']]){
  const input=F.input(cash),plan=F.plan();
  input.projectId=plan.projectId=id;input.ownerId=plan.ownerId=wrongOwner?OTHER:OWNER;
  input.events.push(F.event(2,'margin_add',{amountUSD:'500',currency:'USD',purpose:'initial'}),
   F.event(3,'trade_buy',{symbol:'PF_XBTUSD',executionStatus:'executed',quantityBTC:'0.01',priceUSD:'100000',cycle:'cycle-1'}));
  for(const e of input.events){e.project_id=id;e.owner_id=input.ownerId;}
  data.set(id,{input,plan});
 }
 let lastReview=null,commitCount=0;
 const session=()=>({user:{id:OWNER},access_token:'qa-fictitious-token',expires_at:4102444800});
 const supabase={auth:{
  getSession:async()=>({data:{session:expired?null:session()},error:null}),
  getUser:async()=>({data:{user:{id:changeOwner?OTHER:OWNER,email_confirmed_at:'2026-10-20T00:00:00Z',is_anonymous:false}},error:null}),
  onAuthStateChange:fn=>{authChange=fn;return {data:{subscription:{unsubscribe(){authChange=null;}}}};},
  signOut:async()=>{signouts++;expired=true;authChange?.('SIGNED_OUT',null);return {error:null};},
  signInWithPassword:async()=>({data:{session:session()},error:null})
 }};
 const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
 async function fetchImpl(url,options){
  assert.equal(options.credentials,'omit');assert.equal(options.method,'POST');
  assert.equal(options.headers.Authorization,'Bearer qa-fictitious-token');
  const path=url.split('/').at(-1),body=JSON.parse(options.body),projectId=body.projectId;
  if(path==='wallets')return json(200,{result:{wallets:[{projectId:PROJECT,title:'Demo QA A',scenarioKey:'manual_long',revision:'3'},
   {projectId:PROJECT_B,title:'Demo QA B',scenarioKey:'manual_long',revision:'3'}],nextCursor:null}});
  if(path==='state'){
   reads++;if(delay)await delay.promise;
   if(offlineAfterCommit&&commitCount)return json(503,{code:'API_UNAVAILABLE'});
   const state=structuredClone(data.get(projectId));assert(state);
   return json(200,{result:{state,revision:String(revision[projectId]),headHash:(projectId===PROJECT_B?'b':'a').repeat(64).replace(/.$/,'c')}});
  }
  if(path==='prepare'){
   prepares++;
   const command=body.request?.command;
   assert.equal(body.request?.workflow,'movement');
   assert.equal(command.mode,'recorded');
   lastReview={projectId,command,reviewHash:'review-'+prepares,expiresAt:'2026-10-21T00:30:00Z'};
   return json(200,{result:{reviewHash:lastReview.reviewHash,
     headHash:(projectId===PROJECT_B?'b':'a').repeat(64).replace(/.$/,'c'),
     expiresAt:lastReview.expiresAt,
     review:{type:'movement-review',status:'already-recorded',request:{mode:'recorded'},plannedMovement:null}}});
  }
  if(path==='commit'){
   writes++;
   if(!allowWrite)return json(403,{code:'POLICY_NOT_APPROVED'});
   assert.equal(projectId,lastReview.projectId);
   assert.equal(body.confirmation.reviewHash,lastReview.reviewHash);
   assert.equal(body.request.workflow,'movement');
   const cmd=body.request.command;
   const wallet=data.get(projectId);
   const e=F.event(wallet.input.events.length+1,cmd.kind,{amountUSD:cmd.amountUSD,currency:'USD',...(cmd.kind==='margin_add'?{purpose:'additional'}:{})});
   e.owner_id=OWNER;e.project_id=projectId;
   wallet.input.events.push(e);revision[projectId]++;commitCount++;
   return json(200,{result:{revision:String(revision[projectId]),replayed:false}});
  }
  throw Error('UNEXPECTED_FAKE_SERVER_ROUTE '+path);
 }
 const runtime=Runtime.create({supabase,supabaseURL:BASE,projectId:PROJECT,fetchImpl,
  sessionFactory:qa?Session.createPrivateTest:Session.create,clock:()=>new Date(NOW).toISOString(),
  now:()=>NOW,newId:()=>unique(++generation)});
 return {runtime,server:{setWrongOwner(){changeOwner=true;},emulateSignout(){expired=true;authChange?.('SIGNED_OUT',null);},
  reads:()=>reads,writes:()=>writes,prepares:()=>prepares,signouts:()=>signouts}};
}
async function loaded(opts={}){
 const x=setup(opts);await x.runtime.start();await x.runtime.listWallets();await x.runtime.selectWallet(PROJECT);return x;
}
test('default release configuration remains unavailable, no account traffic allowed',async()=>{
 const x=setup({qa:false});await assert.rejects(x.runtime.start(),/CLOUD_NOT_ENABLED/);
 assert.equal(x.server.reads(),0);assert.equal(x.runtime.state().financial,null);x.runtime.dispose();
});
test('real session, cloud client, authenticated ledger, journal and five menus converge on one revision',async()=>{
 const x=await loaded(),s=x.runtime.state();
 assert.equal(s.status,'ready');assert.equal(s.financial.cash,'1.400 USD');
 assert.equal(s.financial.margin,'500 USD');assert.equal(s.revision,'3');
 assert.equal(s.canTrade,false);assert.equal(s.canWriteDirectly,false);
 assert.equal(s.financialCloudApproved,false);x.runtime.dispose();
});
test('switch to second wallet replaces all V20 financial state rather than mixing them',async()=>{
 const x=await loaded();await x.runtime.selectWallet(PROJECT_B);
 const s=x.runtime.state();assert.equal(s.status,'ready');assert.equal(s.selectedProjectId,PROJECT_B);
 assert.equal(s.financial.cash,'2.400 USD');assert.equal(s.revision,'3');x.runtime.dispose();
});
test('manual refresh converges on same account+history without writing any record',async()=>{
 const x=await loaded();await x.runtime.refresh();assert.equal(x.runtime.state().financial.cash,'1.400 USD');
 assert.equal(x.server.writes(),0);assert.ok(x.server.reads()>=4);x.runtime.dispose();
});
test('preparing a cash movement requires it to be already recorded in Kraken/account',async()=>{
 const x=await loaded();await assert.rejects(x.runtime.prepare('movement',{
  kind:'capital_deposit',amountUSD:'50',alreadyRecorded:false,effectiveAt:'2026-10-20T23:40:00Z'
 }),/R53_ONLY_RECORDED_FACTS/);
 assert.equal(x.server.prepares(),0);x.runtime.dispose();
});
test('review prepares server-side but no commit until explicit approval',async()=>{
 const x=await loaded();const r=await x.runtime.prepare('movement',{
  kind:'capital_deposit',amountUSD:'50',alreadyRecorded:true,effectiveAt:'2026-10-20T23:40:00Z',note:'Depósito de teste'
 });
 assert.equal(r.reviewPending,true);assert.equal(x.server.prepares(),1);
 assert.equal(x.server.writes(),0);assert.equal(x.runtime.state().financial.cash,'1.400 USD');
 await assert.rejects(x.runtime.confirm({reviewHash:r.reviewHash,accepted:false}),/R55_EXPLICIT_CONFIRM_REQUIRED/);
 assert.equal(x.server.writes(),0);x.runtime.dispose();
});
test('wrong review token cannot commit to temporary QA backend',async()=>{
 const x=await loaded(),r=await x.runtime.prepare('movement',{
 kind:'capital_deposit',amountUSD:'50',alreadyRecorded:true,effectiveAt:'2026-10-20T23:40:00Z'});
 await assert.rejects(x.runtime.confirm({reviewHash:'wrong',accepted:true}),/R53_EXACT_REVIEW_REQUIRED/);
 assert.equal(x.server.writes(),0);assert.equal(r.reviewPending,true);x.runtime.dispose();
});
test('QA account API refuses commits while financially unapproved',async()=>{
 const x=await loaded({allowWrite:false}),r=await x.runtime.prepare('movement',{
 kind:'capital_deposit',amountUSD:'50',alreadyRecorded:true,effectiveAt:'2026-10-20T23:40:00Z'});
 await assert.rejects(x.runtime.confirm({reviewHash:r.reviewHash,accepted:true}));
 assert.equal(x.runtime.state().financial,null);assert.equal(x.server.writes(),1);x.runtime.dispose();
});
test('expired or unsafe owner authentication hides previous money',async()=>{
 const x=await loaded();x.server.setWrongOwner();
 await assert.rejects(x.runtime.refresh());
 assert.equal(x.runtime.state().financial,null);x.runtime.dispose();
});
test('logout in mid-session clears financial projections and selected wallet',async()=>{
 const x=await loaded();await x.runtime.signOut();
 assert.equal(x.runtime.state().financial,null);
 assert.notEqual(x.runtime.state().status,'ready');assert.equal(x.server.signouts(),1);x.runtime.dispose();
});
test('auth event SIGNED_OUT scrubs both account and journal while not performing server writes',async()=>{
 const x=await loaded();x.server.emulateSignout();
 assert.equal(x.runtime.state().financial,null);assert.equal(x.server.writes(),0);x.runtime.dispose();
});
test('wrong wallet ID rejected before any server state load or money exposure',async()=>{
 const x=await loaded(),prior=x.server.reads();
 await assert.rejects(x.runtime.selectWallet(OTHER),/R52_WALLET_NOT_IN_AUTHENTICATED_LIST/);
 assert.equal(x.server.reads(),prior);assert.equal(x.runtime.state().financial,null);x.runtime.dispose();
});
test('in-flight slow state response cannot restore a logged-out session',async()=>{
 let finish;const gate=new Promise(r=>finish=r);
 const x=setup({delay:{promise:gate}});
 const started=x.runtime.start();await started;await x.runtime.listWallets();
 const pending=x.runtime.selectWallet(PROJECT);
 for(let i=0;i<25&&!x.server.reads();i++)await new Promise(r=>setImmediate(r));
 assert.ok(x.server.reads()>0);
 const out=x.runtime.signOut();finish();await out;
 await assert.rejects(pending);assert.equal(x.runtime.state().financial,null);x.runtime.dispose();
});
test('no automatic financial policy approvals, trade execution or credentials are accessible',()=>{
 const x=setup();
 for(const method of ['trade','approvePolicy','insert','commitDirectly','marginTransfer','placeOrder'])
 assert.equal(x.runtime[method],undefined);
 assert.equal(x.runtime.state().financialCloudApproved,false);x.runtime.dispose();
});


test('B13.1 financial alerts are derived only from the same verified R5 journal revision',async()=>{
 const x=await loaded();
 const current=x.runtime.alerts();
 assert.equal(current.status,'ready');
 assert.equal(current.basis.projectId,PROJECT);
 assert.equal(current.basis.revision,'3');
 assert.ok(current.alerts.some(a=>a.code==='STALE_MARKET_OR_RULES'));
 assert.ok(current.alerts.every(a=>a.maySubmitOrders===false));
 await x.runtime.signOut();
 assert.equal(x.runtime.alerts().status,'reconciliation-required');
 assert.equal(x.runtime.alerts().basis,null);
 x.runtime.dispose();
});
test('B13.1 alerts never reuse wallet A risk after choosing wallet B',async()=>{
 const x=await loaded();
 const previous=x.runtime.alerts().basis;
 await x.runtime.selectWallet(PROJECT_B);
 assert.equal(x.runtime.alerts().status,'ready');
 assert.notEqual(x.runtime.alerts().basis.projectId,previous.projectId);
 assert.equal(x.runtime.alerts().basis.projectId,PROJECT_B);
 x.runtime.dispose();
});
