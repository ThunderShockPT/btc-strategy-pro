'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Journal=require('../five-menu-journal-v20.js');
const Account=require('../account-workflow-v20.js');
const Core=require('../financial-engine.js');
const fixture=require('./helpers/onboarding-fixture.cjs');
const F=require('./helpers/cycle-fixture.cjs');
const id=n=>'00000000-0000-4000-a000-'+String(n).padStart(12,'0');
const NOW=Date.parse('2026-10-21T00:00:00Z');
function harness({expiresAt='2026-10-21T00:02:00Z',onPrepare=null,onCommit=null,failRead=false}={}){
 const stored=fixture.existing();let seq=3200,prepares=0,commits=0,reads=0,pending=false,lastRequest=null,review=null,phase='idle',failNextRead=failRead;
 const client={
   state:()=>({projectId:stored.input.projectId,scenarioKey:stored.input.scenarioKey,
     status:phase,hasPending:pending,hasUncertainCalculationStart:false,calculation:null}),
   read:async()=>{reads++;if(failNextRead)throw Error('CLOUD_OFFLINE');phase='synced';
     return {state:structuredClone(stored),revision:String(stored.input.events.length),
       headHash:'a'.repeat(64)};},
   prepare:async request=>{prepares++;lastRequest=structuredClone(request);if(onPrepare)await onPrepare({stored,client,request});
     review={reviewHash:'review-'+prepares,expiresAt,review:request.workflow==='movement'?
       {type:'movement-review',status:'already-recorded',request:{mode:'recorded'},plannedMovement:null}:
       {type:'execution-review',canConfirm:true,blocking:null,command:{kind:request.command.kind,mode:'recorded'},removedPlanLinks:0,restoredPlanLinks:0}};
     return structuredClone(review);},
   confirm:async({reviewHash})=>{if(reviewHash!==review.reviewHash)throw Error('WRONG_REVIEW');
     commits++;
     if(onCommit)await onCommit({stored,client,request:lastRequest});
     else if(lastRequest.workflow==='movement'){
       const k=lastRequest.command.kind;const amountUSD=lastRequest.command.amountUSD;
       stored.input.events.push(F.event(stored.input.events.length+1,k,{amountUSD,currency:'USD',...(k==='margin_add'?{purpose:'additional'}:{})}));
       const e=stored.input.events.at(-1);e.scenario_key='demo_long';e.origin='demo';
     }
     phase='refresh-required';return {revision:String(stored.input.events.length),replayed:false};},
   retry:async()=>{pending=false;phase='refresh-required';return {replayed:true,revision:String(stored.input.events.length)};},
   startCalculation:async()=>{throw Error('NO_CALCULATION_IN_TEST')},
   clearSession:()=>{phase='signed-out';pending=false;},
   listWallets:async()=>({wallets:[],nextCursor:null}),
   selectWallet:async(next)=>{stored.input.projectId=stored.plan.projectId=next;phase='wallet-selected';}
 };
 const workflow=Account.create({client,newId:()=>id(++seq),now:()=>NOW});
 const facade=Journal.create({workflow,now:()=>NOW});
 const record=(kind='capital_deposit',amountUSD='50')=>({kind,amountUSD,alreadyRecorded:true,effectiveAt:'2026-10-20T23:40:00Z',purpose:'additional',note:'Registo QA'});
 const trade=()=>({kind:'trade',type:'trade_buy',cycle:'cycle-2',stage:0,quantityBTC:'0.0005',requestedQuantityBTC:'0.0005',priceUSD:'100000',feeUSD:'0.025',fillStatus:'filled',alreadyRecorded:true,effectiveAt:'2026-10-20T23:40:00Z'});
 const correction=()=>({kind:'correction',targetEventId:stored.input.events[2].id,action:'void',reason:'Compra duplicada teste',includeLinkedFees:true,alreadyRecorded:true});
 return {stored,client,workflow,facade,record,trade,correction,
   prepares:()=>prepares,commits:()=>commits,reads:()=>reads,setOffline:v=>failNextRead=v,setPending:v=>pending=v};
}
async function ready(options){const h=harness(options);await h.facade.load();return h;}
test('real V20 AccountWorkflow is used: load provides journal, no writes',async()=>{
 const h=await ready();const s=h.facade.state();assert.equal(s.historyCount,3);
 assert.equal(s.revision,'3');assert.equal(s.reviewPending,false);
 assert.equal(h.commits(),0);assert.equal(h.prepares(),0);assert.equal(s.canWriteDirectly,false);
});
test('preparing a deposit shows server review without mutating cash',async()=>{
 const h=await ready();const original=Core.reconstruct(h.stored.input).cash.walletUSD;
 const p=await h.facade.prepare('movement',h.record());
 assert.equal(p.reviewPending,true);assert.equal(p.reviewHash,'review-1');
 assert.equal(h.prepares(),1);assert.equal(h.commits(),0);
 assert.equal(Core.reconstruct(h.stored.input).cash.walletUSD,original);
});
test('without an explicit acceptance nothing is committed',async()=>{
 const h=await ready(),p=await h.facade.prepare('movement',h.record());
 await assert.rejects(h.facade.confirm({reviewHash:p.reviewHash,accepted:false}),/R53_EXPLICIT_ACCEPTANCE_REQUIRED/);
 assert.equal(h.commits(),0);
});
test('an incorrect or changed reviewHash cannot commit',async()=>{
 const h=await ready(),p=await h.facade.prepare('movement',h.record());
 await assert.rejects(h.facade.confirm({reviewHash:'wrong',accepted:true}),/R53_EXACT_REVIEW_REQUIRED/);
 assert.equal(h.commits(),0);assert.equal(p.reviewHash,'review-1');
});
test('accepted deposit commits once and reloads V20 journal',async()=>{
 const h=await ready(),p=await h.facade.prepare('movement',h.record('capital_deposit','50'));
 const result=await h.facade.confirm({reviewHash:p.reviewHash,accepted:true});
 assert.equal(result.fresh,true);assert.equal(h.commits(),1);
 assert.equal(result.status.revision,'4');assert.equal(result.status.historyCount,4);
 assert.equal(Core.reconstruct(h.stored.input).cash.walletUSD,'1550');
});
test('margin add changes isolated balance and spends wallet only once',async()=>{
 const h=await ready(),p=await h.facade.prepare('movement',h.record('margin_add','100'));
 const result=await h.facade.confirm({reviewHash:p.reviewHash,accepted:true});
 const balance=Core.reconstruct(h.stored.input);
 assert.equal(result.fresh,true);assert.equal(balance.cash.walletUSD,'1400');
 assert.equal(balance.cash.isolatedMarginUSD,'600');
});
test('cannot record planned movements pretending they already occurred',async()=>{
 const h=await ready();await assert.rejects(h.facade.prepare('movement',{...h.record(),alreadyRecorded:false}),/R53_ONLY_RECORDED_FACTS/);
 assert.equal(h.prepares(),0);assert.equal(h.commits(),0);
});
test('trade preparation goes through the genuine V20 execution branch with no direct order',async()=>{
 const h=await ready(),p=await h.facade.prepare('execution',h.trade());
 assert.equal(h.prepares(),1);assert.equal(h.commits(),0);
 assert.equal(p.reviewPending,true);assert.equal(p.reviewedOperation,'trade');
 assert.equal(h.stored.input.events.length,3);
});
test('correction requires a real reason and remains append-only during preview',async()=>{
 const h=await ready();
 await assert.rejects(h.facade.prepare('execution',{...h.correction(),reason:'x'}),/R53_CORRECTION_REASON_REQUIRED/);
 assert.equal(h.prepares(),0);
 const p=await h.facade.prepare('execution',h.correction());
 assert.equal(p.reviewedOperation,'correction');assert.equal(h.stored.input.events.length,3);
 assert.equal(h.commits(),0);
});
test('expiry of a server review prevents confirmation',async()=>{
 const h=await ready({expiresAt:'2026-10-20T23:59:00Z'});
 await assert.rejects(h.facade.prepare('movement',h.record()),/R53_REVIEW_EXPIRED/);
 assert.equal(h.commits(),0);
});
test('loading a fresh revision invalidates an outstanding review token',async()=>{
 const h=await ready();await h.facade.prepare('movement',h.record());
 h.stored.input.events.push(F.event(4,'fee',{amountUSD:'1',currency:'USD',category:'other'}));
 const e=h.stored.input.events.at(-1);e.scenario_key='demo_long';e.origin='demo';
 await h.facade.load();
 await assert.rejects(h.facade.confirm({reviewHash:'review-1',accepted:true}),/R53_EXACT_REVIEW_REQUIRED/);
 assert.equal(h.commits(),0);
});
test('logout while reviewing makes the old token impossible to apply',async()=>{
 const h=await ready(),p=await h.facade.prepare('movement',h.record());
 h.facade.clear();const state=h.facade.state();
 assert.equal(state.historyCount,0);assert.equal(state.reviewPending,false);
 await assert.rejects(h.facade.confirm({reviewHash:p.reviewHash,accepted:true}),/R53_EXACT_REVIEW_REQUIRED/);
 assert.equal(h.commits(),0);
});
test('client rejected post-commit refresh never labels a stale cash balance as current',async()=>{
 const h=await ready();
 const p=await h.facade.prepare('movement',h.record());
 h.setOffline(true);
 const result=await h.facade.confirm({reviewHash:p.reviewHash,accepted:true});
 assert.equal(result.fresh,false);assert.equal(result.refreshRequired,true);
 assert.equal(h.commits(),1);assert.equal(result.status.revision,null);
});
test('a pending uncertain command refuses a fresh draft',async()=>{
 const h=await ready();h.setPending(true);
 await assert.rejects(h.facade.prepare('movement',h.record()),/R53_FRESH_SNAPSHOT_REQUIRED/);
 assert.equal(h.prepares(),0);
});
test('only existing workflow confirmed receipt can advance visible history',async()=>{
 const h=await ready(),initial=h.facade.state().historyCount;
 const p=await h.facade.prepare('movement',h.record());
 assert.equal(h.facade.state().historyCount,initial);
 await h.facade.confirm({reviewHash:p.reviewHash,accepted:true});
 assert.equal(h.facade.state().historyCount,initial+1);
});
test('adapter exposes neither direct ledger writes nor financial policy approval',()=>{
 const h=harness();
 for(const name of ['persist','upsert','placeOrder','writeLedger','approvePolicy','executeTrade'])assert.equal(typeof h.facade[name],'undefined');
 assert.equal(typeof h.facade.confirm,'function');h.facade.dispose();
});
