'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Unified=require('../unified-five-menus-v20.js');
const ID='00000000-0000-4000-a000-000000000001',ID2='00000000-0000-4000-a000-000000000002',HASH='a'.repeat(64),HASH2='b'.repeat(64);
const snapshot=()=>({authenticated:true,connected:true,phase:'bookkeeping-only',selectedProjectId:ID,projection:{
 shared:{ownerScoped:true,projectId:ID,revision:'3',headHash:HASH,valuationAsOf:'2026-10-20T23:40:00Z',quoteCurrent:false,rulesCurrent:false},
 plan:{version:'2',profile:'balanced',riskFloorUSD:'60000'},
 financial:{walletUSD:'1800',freeCashUSD:'1700',isolatedMarginUSD:'200',protectedCashUSD:'100',
 positionQuantityBTC:'0.0100',unrealizedPnLUSD:'-30',isolatedEquityUSD:'170'}}});
const journal=()=>({source:'V20_AUTHENTICATED_EVENT_JOURNAL',selectedProjectId:ID,revision:'3',sourceHeadHash:HASH,phase:'ready',needsReconciliation:false,historyCount:1,
 history:[{original:{event_type:'margin_add'},state:{active:true,record:{event_type:'margin_add',effective_at:'2026-10-20T23:30:00Z',facts:{amountUSD:'200'}}}}]});
function setup(){
let a=snapshot(),j=journal(),aa=null,jj=null,readA=0,readJ=0,confirms=0;
const bridge={state:()=>structuredClone(a),subscribe:fn=>{aa=fn;fn();return()=>{aa=null;}},refresh:async()=>{readA++;}};
const book={state:()=>structuredClone(j),subscribe:fn=>{jj=fn;fn();return()=>{jj=null;}},load:async()=>{readJ++;},
confirm:async o=>{confirms++;j.revision='4';j.sourceHeadHash=HASH2;j.historyCount=2;j.history.push({original:{event_type:'fee'},state:{active:true,record:{event_type:'fee',facts:{amountUSD:'2'},effective_at:'2026-10-20T23:40:00Z'}}});jj?.();return {fresh:true,receipt:{id:'mock'}};}};
const api=Unified.create({bridge,journal:book});
return {api,bridge,book,
 setA:v=>{a=v;aa?.();},setJ:v=>{j=v;jj?.();},
 getA:()=>structuredClone(a),getJ:()=>structuredClone(j),
 counts:()=>({readA,readJ,confirms})};
}
test('same owner/project revision and fingerprint unlock exactly one V20 source for all five screens',()=>{
const x=Unified.project(snapshot(),journal());assert.equal(x.status,'ready');assert.equal(x.source,'V20_AUTHENTICATED_SHARED_SNAPSHOT');
assert.deepEqual(Object.keys(x.menu),['inicio','estrategias','mercado','risco','conta','registos']);
assert.equal(x.menu.inicio.main,'1.700 USD');assert.equal(x.values.margin,'200 USD');
assert.equal(x.menu.conta.description,'Revisão 3 · saldo 1.800 USD');
assert.equal(x.history[0].amount,'200 USD');assert.equal(x.canTrade,false);
});
test('BTC price loss remains negative and never debits free cash twice',()=>{
const x=Unified.project(snapshot(),journal());assert.equal(x.values.pnl,'−30 USD');
assert.equal(x.values.cash,'1.700 USD');assert.equal(x.values.equity,'170 USD');
});
test('stale quotes and rules are labelled unsafe, with no false buying power',()=>{
const x=Unified.project(snapshot(),journal());assert.match(x.menu.mercado.main,/desatualizadas/i);
assert.match(x.menu.risco.description,/sem garantia/i);
assert.equal(x.canWrite,false);assert.equal(x.canTrade,false);
});
test('wallet swap with old journal is masked in every menu, not just on Home',()=>{
const a=snapshot();a.selectedProjectId=ID2;a.projection.shared.projectId=ID2;
const x=Unified.project(a,journal());assert.equal(x.status,'revision-mismatch');
assert.equal(x.menu,null);assert.equal(x.values,null);assert.equal(x.history.length,0);
});
test('revision mismatch, even on one increment, clears all values',()=>{
const a=snapshot();a.projection.shared.revision='4';const x=Unified.project(a,journal());
assert.equal(x.status,'revision-mismatch');assert.equal(x.menu,null);
});
test('head hash mismatch with matching project and revision is still forbidden',()=>{
const a=snapshot();a.projection.shared.headHash=HASH2;assert.equal(Unified.project(a,journal()).status,'revision-mismatch');
});
test('anonymous/signed-out/closed cloud adapter never shows Demo values as authenticated',()=>{
for(const patch of [{authenticated:false},{phase:'signed-out'},{connected:false},{projection:null}]){
 const x=Unified.project({...snapshot(),...patch},journal());
 assert.equal(x.status,'locked');assert.equal(x.values,null);
}});
test('server ownership proof cannot be removed by a local UI flag',()=>{
const a=snapshot();a.projection.shared.ownerScoped=false;assert.equal(Unified.project(a,journal()).status,'locked');
});
test('pending or uncertain journal confirmation cannot display verified financial balances',()=>{
const x=journal();x.needsReconciliation=true;assert.equal(Unified.project(snapshot(),x).status,'revision-mismatch');
const y=journal();y.phase='commit-uncertain';assert.equal(Unified.project(snapshot(),y).status,'revision-mismatch');
});
test('no user-controlled HTML is parsed from server journal facts',()=>{
const j=journal();j.history[0].state.record.event_type='<img onerror=alert(1)>';j.history[0].state.record.facts.amountUSD='<script>';
const x=Unified.project(snapshot(),j);
assert.equal(x.history[0].type,'<img onerror=alert(1)>');
assert.equal(x.history[0].amount,'—');
});
test('inconsistent or negative cash data blocks full presentation',()=>{
for(const val of ['foo','-1','Infinity','1e9','0.1.2']){
 const a=snapshot();a.projection.financial.freeCashUSD=val;
 assert.equal(Unified.project(a,journal()).status,'invalid-financial-data');
}});
test('signed PnL permits negative and fractional 24-decimal precision',()=>{
const a=snapshot();a.projection.financial.unrealizedPnLUSD='-0.000000000000000000000001';
assert.equal(Unified.project(a,journal()).status,'ready');
});
test('mode demo is default, account mode can be selected with no writes',()=>{
const h=setup();assert.equal(h.api.state().mode,'demo');
h.api.selectMode('account');assert.equal(h.api.state().status,'ready');
assert.equal(h.api.state().canTrade,false);assert.equal(h.api.state().canWriteDirectly,false);
h.api.dispose();
});
test('live wallet switch invalidates last verified account values on same callback',()=>{
const h=setup();h.api.selectMode('account');
const a=h.getA();a.selectedProjectId=ID2;a.projection.shared.projectId=ID2;
h.setA(a);assert.equal(h.api.state().status,'revision-mismatch');
assert.equal(h.api.state().values,null);h.api.dispose();
});
test('server journal updates first then stale account projection becomes masked before refresh',()=>{
const h=setup();h.api.selectMode('account');
const j=h.getJ();j.revision='4';j.sourceHeadHash=HASH2;h.setJ(j);
assert.equal(h.api.state().status,'revision-mismatch');h.api.dispose();
});
test('simultaneous server reads cannot assemble money from different revisions',async()=>{
const h=setup();const j=h.getJ();j.revision='4';h.setJ(j);
const result=await h.api.refresh();assert.equal(result.status,'revision-mismatch');
assert.deepEqual(h.counts(),{readA:1,readJ:1,confirms:0});h.api.dispose();
});
test('R5.4 adapter requires exact explicit human acceptance before delegating confirmation',async()=>{
const h=setup();await assert.rejects(h.api.confirm({reviewHash:'h',accepted:false}),/R54_EXPLICIT_ACCEPTANCE_REQUIRED/);
assert.equal(h.counts().confirms,0);h.api.dispose();
});
test('receipt is not equivalent to fresh cash: new journal revision remains blocked until both synchronized',async()=>{
const h=setup();const result=await h.api.confirm({reviewHash:'mock-reviewed',accepted:true});
assert.equal(result.fresh,true);assert.equal(h.counts().readA,1);assert.equal(h.counts().confirms,1);
assert.equal(h.api.state().status,'revision-mismatch');h.api.dispose();
});
test('after both authenticated revisions converge the one source reappears',()=>{
const h=setup();h.api.selectMode('account');
const j=h.getJ();j.revision='4';j.sourceHeadHash=HASH2;h.setJ(j);
const a=h.getA();a.projection.shared.revision='4';a.projection.shared.headHash=HASH2;
a.projection.financial.freeCashUSD='1500';h.setA(a);
assert.equal(h.api.state().values.cash,'1.500 USD');assert.equal(h.api.state().revision,'4');h.api.dispose();
});
test('logout immediately clears all user values even without browser DOM',()=>{
const h=setup();h.api.selectMode('account');h.setA({authenticated:false,connected:false,phase:'signed-out',projection:null});
assert.equal(h.api.state().values,null);h.api.dispose();
});
test('controller has no direct trade, deposit or wallet write primitive',()=>{
const h=setup();for(const method of ['placeOrder','approvePolicy','save','insertEvent','deposit','submitTrade'])assert.equal(h.api[method],undefined);
assert.equal(h.api.state().canWriteDirectly,false);h.api.dispose();
});
test('formatting validates decimal text and does not interpret scientific notation',()=>{
assert.equal(Unified.format('12345.34000001'),'12.345,34000001 USD');
assert.equal(Unified.format('-2.50'),'−2,50 USD');
assert.equal(Unified.format('1e10'),'—');
});
