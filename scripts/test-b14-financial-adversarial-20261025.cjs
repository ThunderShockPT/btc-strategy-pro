'use strict';
/* BTC Strategy Pro — B14.3 adversarial financial QA.
   All inputs synthetic, anchored to archived 20 Oct 2026 rules;
   no live-account access, Kraken operations, price recommendations or release.
 */
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('decimal.js');
const F=require('./helpers/cycle-fixture.cjs');
const Core=require('../financial-engine.js'),Risk=require('../position-risk.js'),
 Temporal=require('../temporal-simulator.js'),Cycles=require('../cycle-planner.js'),
 Reconcile=require('../architecture/b14-financial-reconciliation.cjs');
const at='2026-10-20T23:41:00Z',future='2026-10-20T23:42:00Z',H=3600000;
const iso=hours=>new Date(Date.parse(F.now)+hours*H).toISOString();
const event=(n,kind,facts,when=at)=>({...F.event(n,kind,facts),effective_at:when,recorded_at:when});
function opened({capital='2000',margin='100',mark='100000',quantity='0.01'}={}){
 const i=F.input(capital);i.valuation.markPriceUSD=mark;
 i.events.push(F.event(2,'margin_add',{amountUSD:margin,currency:'USD',purpose:'initial'}),
   F.event(3,'trade_buy',{symbol:'PF_XBTUSD',executionStatus:'executed',
     quantityBTC:quantity,priceUSD:'100000',cycle:'cycle-1'}));
 return i;
}
const step=(mark,actions=[],extra={})=>({at,markPriceUSD:mark,transition:'continuous',actions,...extra});
const filled=events=>({outcome:'filled',events});
const later=(mark,actions=[])=>({at:future,markPriceUSD:mark,transition:'continuous',actions});
const plan=(input=F.input(),p=F.plan(),opts={})=>Cycles.generate(input,p,{...F.policy(),maxCycles:1,...opts});
function req(hours=1,rate='0',steps=[]){
 return {scenarioId:'b143-adverse',until:iso(hours),rulePolicy:'freeze-verified-at-start',
   openingAccruedFundingNetUSD:'0',fundingPeriods:[{
    start:F.now,end:iso(hours),absoluteRateUSDPerBTCHour:rate,source:'B14.3 SYNTHETIC'}],steps};
}
const timeStep=(hours,price='100000',actions=[],extra={})=>
 ({at:iso(hours),markPriceUSD:price,transition:'continuous',actions,...extra});
const buy=(quantity='0.01',extra={})=>({kind:'buy',outcome:'filled',requestedQuantityBTC:quantity,
 filledQuantityBTC:quantity,referencePriceUSD:'100000',spreadBps:'0',slippageBps:'0',
 feeRate:'0',feeRole:'taker',cycle:'cycle-1',...extra});
const sell=(q='0.005',extra={})=>({kind:'sell',outcome:'filled',
 requestedQuantityBTC:q,filledQuantityBTC:q,referencePriceUSD:'100000',
 spreadBps:'0',slippageBps:'0',feeRate:'0',feeRole:'maker',
 allocations:[{cycle:'cycle-1',quantityBTC:q}],pnlDestination:'wallet',...extra});
function safety(r){assert.equal(r.ordersExecuted,false);assert.equal(r.probabilitiesProvided,false);}
function snapshot(i){return JSON.stringify(i);}

test('B14.3 01 — continuous 100k→94k crosses 95k before any late 500 margin and BTC buy',()=>{
 const i=opened(),before=snapshot(i),r=Risk.simulate(i,{steps:[
  step('94000',[filled([event(4,'margin_add',{amountUSD:'500',currency:'USD',purpose:'additional'}),
    event(5,'trade_buy',{symbol:'PF_XBTUSD',quantityBTC:'0.001',priceUSD:'94000',cycle:'cycle-2',
     executionStatus:'executed'})])])]});
 assert.equal(r.firstFailure.reason,'MAINTENANCE_REACHED_BEFORE_ACTIONS');
 assert.equal(r.firstRiskEvent.boundary.estimatedPriceUSD,'95000');
 assert.equal(r.projectedLedger.position.quantityBTC,'0.01');
 assert.equal(r.projectedLedger.cash.isolatedMarginUSD,'100');
 assert.equal(r.ledgerChanged,false);assert.equal(r.ordersExecuted,false);
 assert.equal(snapshot(i),before);
});
test('B14.3 02 — explicit gap records 70k arrival but never invents liquidation execution',()=>{
 const i=opened(),r=Risk.simulate(i,{steps:[step('70000',[],{transition:'gap'})]});
 assert.equal(r.firstRiskEvent.arrivalMarkUSD,'70000');
 assert.equal(r.firstRiskEvent.executionPriceUSD,null);
 assert.equal(r.firstRiskEvent.transition,'gap');assert.equal(r.ordersExecuted,false);
});
test('B14.3 03 — timely added margin saves a later step; failed transfer does not',()=>{
 const i=opened();
 const good=Risk.simulate(i,{steps:[step('97000',[filled([event(4,'margin_add',
  {amountUSD:'100',currency:'USD',purpose:'additional'})])]),later('94000')]});
 const bad=Risk.simulate(i,{steps:[step('97000',[{outcome:'failed'}]),later('94000')]});
 assert.equal(good.firstRiskEvent,null);assert.equal(good.finalRisk.estimatedPriceUSD,'85000');
 assert.equal(bad.firstRiskEvent.index,1);assert.equal(bad.projectedLedger.cash.isolatedMarginUSD,'100');
});
test('B14.3 04 — a future 500 capital deposit is not a past isolated margin transfer',()=>{
 const i=opened(),base=Risk.estimate(i).estimatedPriceUSD;
 const r=Risk.simulate(i,{steps:[
  step('100000',[filled([event(4,'capital_deposit',{amountUSD:'500',currency:'USD'})])]),
  later('94000')]});
 assert.equal(base,'95000');assert.equal(r.firstRiskEvent.index,1);
 assert.equal(r.projectedLedger.capital.netContributedUSD,'2500');
 assert.equal(r.finalRisk.marginUSD,'100');
});
test('B14.3 05 — a failed multi-event action is atomic (no phantom deposit)',()=>{
 const i=opened(),r=Risk.simulate(i,{steps:[step('99000',[filled([
  event(4,'capital_deposit',{amountUSD:'10',currency:'USD'}),
  event(5,'margin_add',{amountUSD:'2000',currency:'USD',purpose:'additional'})])])]});
 assert.equal(r.status,'stopped-at-first-failure');
 assert.equal(r.projectedLedger.capital.netContributedUSD,'2000');
 assert.equal(r.projectedLedger.cash.isolatedMarginUSD,'100');
});
test('B14.3 06 — explicit partial-liquidation fill charges declared liquidation fee',()=>{
 const s=event(4,'trade_sell',{symbol:'PF_XBTUSD',executionStatus:'executed',
  quantityBTC:'0.003',priceUSD:'94000',cycle:'cycle-1',pnlDestination:'isolated'});
 const fee=event(5,'fee',{amountUSD:'1',currency:'USD',category:'liquidation'});
 const i=opened(),r=Risk.simulate(i,{steps:[step('94000',[],{liquidationFill:{events:[s,fee]}})]});
 assert.equal(r.projectedLedger.position.quantityBTC,'0.007');
 assert.equal(r.projectedLedger.cash.isolatedMarginUSD,'82');
 assert.equal(r.projectedLedger.cash.walletUSD,'1899');
 assert.equal(r.projectedLedger.pnl.feesPaidUSD,'1');
 assert.equal(r.status,'completed-declared-path');assert.equal(r.ordersExecuted,false);
});
test('B14.3 07 — too small an explicit partial-liquidation fill remains unsafe',()=>{
 const s=event(4,'trade_sell',{symbol:'PF_XBTUSD',executionStatus:'executed',
  quantityBTC:'0.0001',priceUSD:'94000',cycle:'cycle-1',pnlDestination:'isolated'});
 const r=Risk.simulate(opened(),{steps:[step('94000',[],{liquidationFill:{events:[s]}})]});
 assert.equal(r.firstFailure.reason,'MAINTENANCE_REMAINS_AFTER_PARTIAL_FILL');
 assert.equal(r.projectedLedger.position.quantityBTC,'0.0099');
});
test('B14.3 08 — unsolicited liquidation fills are rejected',()=>{
 assert.throws(()=>Risk.simulate(opened(),{steps:[
  step('100000',[],{liquidationFill:{events:[]}})]}),{code:'UNTRIGGERED_LIQUIDATION_FILL'});
});
test('B14.3 09 — inverse 80k floor shows 150 additional margin as conditional, not a transfer',()=>{
 const r=Risk.inverse(opened(),{floorUSD:'80000'});
 assert.equal(r.additionalMarginUSD,'150');assert.equal(r.requiredTotalMarginUSD,'250');
 assert.equal(r.projectedAfterExplicitTransfer.estimatedPriceUSD,'80000');
 assert.equal(r.transferPerformed,false);assert.equal(r.protectionGuaranteed,false);
});
test('B14.3 10 — at current maintenance, planned future top-up cannot revive position',()=>{
 const r=Risk.inverse(opened({mark:'95000'}),{floorUSD:'80000'});
 assert.equal(r.status,'too-late-under-current-scenario');
 assert.equal(r.transferPerformed,false);
});
test('B14.3 11 — collateral reservations may exceed wallet but cannot create margin capacity',()=>{
 const i=opened();i.reservations={ordersUSD:'2000',marginUSD:'1',protectedUSD:'1'};
 assert.equal(Risk.inverse(i,{floorUSD:'80000',useReservedMargin:true}).availableForMarginUSD,'0');
 assert.equal(Core.reconstruct(i).cash.reservationStatus,'unfunded');
});
test('B14.3 12 — planner unfilled orders never create nominal position or real trades',()=>{
 const r=plan(),miss=r.stress.find(x=>x.name==='missedOrders');
 assert.equal(miss.finalPosition.quantityBTC,'0');
 assert.equal(r.ordersExecuted,false);assert.equal(r.transfersPerformed,false);
 assert.equal(r.protectionGuaranteed,false);
});
test('B14.3 13 — planner gap only fills permitted entry, never skipped reinforcements',()=>{
 const g=plan().stress.find(x=>x.name==='gap');
 assert.equal(g.finalPosition.quantityBTC,'0.002');
 assert.equal(g.finalRisk.markPriceUSD,'80000');
 assert.equal(g.maintenanceSurvived,true);
});
test('B14.3 14 — planner partial orders charge only executed quantity and fee',()=>{
 const r=plan(),part=r.stress.find(x=>x.name==='partialFills');
 assert.equal(part.finalPosition.quantityBTC,'0.005');
 assert.equal(part.finalPnL.feesPaidUSD,'0.24675');
 assert.ok(new D(part.finalPnL.feesPaidUSD).lt(r.selected.openingFeesUSD));
});
test('B14.3 15 — pending funding is not settled or deducted twice from isolated margin',()=>{
 const i=opened({capital:'2000',margin:'1000'}),r=Temporal.simulate(i,req(0.1,'1'));
 assert.equal(r.funding.paidAccruedUSD,'0.001');
 assert.equal(r.funding.settledNetUSD,'0');
 assert.equal(r.final.ledger.pnl.fundingNetUSD,'0');
 assert.equal(r.final.accruedUnsettledNetUSD,'-0.001');
 assert.equal(r.final.ledger.cash.walletUSD,'1000');
 assert.equal(r.final.fundingAdjustedAvailableUSD,'999.999');safety(r);
});
test('B14.3 16 — positive accrued funding cannot fund a withdrawal before settlement',()=>{
 const i=opened({capital:'1000',margin:'1000'});
 const r=Temporal.simulate(i,req(0.1,'-100',[timeStep(0.1,'100000',[
  {kind:'capital_withdrawal',outcome:'filled',amountUSD:'0.01'}])]));
 assert.equal(r.firstFailure.code,'INSUFFICIENT_WALLET');
 assert.equal(r.final.ledger.cash.walletUSD,'0');
 assert.equal(r.final.accruedUnsettledNetUSD,'0.1');
 assert.equal(r.final.fundingAdjustedAvailableUSD,'0');safety(r);
});
test('B14.3 17 — general-wallet funding exhaustion occurs before future deposit or buy',()=>{
 const i=opened({capital:'1000.01',margin:'1000'}),r=Temporal.simulate(i,
  req(2,'10',[timeStep(1,'100000',[
   {kind:'capital_deposit',outcome:'filled',amountUSD:'500'},buy()])]));
 assert.equal(r.firstFailure.code,'GENERAL_WALLET_FUNDING_EXHAUSTED');
 assert.equal(r.simulatedUntil,iso(0.1));
 assert.equal(r.final.ledger.capital.addedUSD,'0');
 assert.equal(r.final.ledger.position.quantityBTC,'0.01');
 assert.equal(r.final.ledger.cash.isolatedMarginUSD,'1000');safety(r);
});
test('B14.3 18 — maintenance happens before a future trade at a gap mark',()=>{
 const i=opened({capital:'2000',margin:'100'});
 const r=Temporal.simulate(i,req(1,'0',[
  timeStep(1,'90000',[sell('0.01')],{transition:'gap'})]));
 assert.equal(r.firstFailure.code,'MAINTENANCE_REACHED_BEFORE_ACTIONS');
 assert.equal(r.final.ledger.position.quantityBTC,'0.01');
 assert.equal(r.final.ledger.pnl.realizedGrossUSD,'0');safety(r);
});
test('B14.3 19 — actual partial buy pays only partial nominal commission',()=>{
 const i=opened({margin:'1000'}),r=Temporal.simulate(i,req(0.1,'0',[
  timeStep(0.1,'100000',[buy('0.01',{outcome:'partial',
   filledQuantityBTC:'0.002',referencePriceUSD:'99900',spreadBps:'10',
   slippageBps:'10',feeRate:'0.001'})])]));
 assert.equal(r.final.ledger.position.quantityBTC,'0.012');
 assert.equal(r.actions.find(x=>x.kind==='buy').quote.feeUSD,'0.2001');
 assert.equal(r.final.ledger.pnl.feesPaidUSD,'0.2001');
 assert.equal(r.final.ledger.valuation.markPriceUSD,'100000');safety(r);
});
test('B14.3 20 — insufficient fee cash invalidates buy as one atomic movement',()=>{
 const i=opened({capital:'1000',margin:'1000'});
 const r=Temporal.simulate(i,req(0.1,'0',[timeStep(0.1,'100000',[
  buy('0.001',{feeRate:'0.0005'})])]));
 assert.equal(r.firstFailure.code,'INSUFFICIENT_WALLET');
 assert.equal(r.final.ledger.position.quantityBTC,'0.01');
 assert.equal(r.final.ledger.pnl.feesPaidUSD,'0');safety(r);
});
test('B14.3 21 — stale archived rules block financial calculation even with bookkeeping enabled',()=>{
 const i=opened();i.valuation.asOf='2026-10-25T21:00:00Z';i.bookkeepingOnly=true;
 assert.equal(Reconcile.audit(i).status,'blocked-unverified-rules');
 assert.throws(()=>Risk.estimate(i),{code:'RISK_RULES_UNAVAILABLE'});
 assert.throws(()=>Cycles.generate(i,F.plan(),F.policy()),{code:'CURRENT_RULES_REQUIRED'});
});
test('B14.3 22 — synthetic frozen rules must never be mistaken for live risk certification',()=>{
 const i=opened();i.valuation.asOf='2026-10-25T21:00:00Z';
 i.ruleScenario={mode:'frozen-rules-synthetic',referenceAt:F.now};
 const x=Reconcile.audit(i);
 assert.equal(x.status,'blocked-unverified-rules');
 assert.equal(x.financialRecommendation,false);
 assert.equal(x.ordersAllowed,false);
});
test('B14.3 23 — deterministic multi-mark audit never changes past cash due to unrealized PnL',()=>{
 const marks=['60000','70000','85000','94999','100000','110000','120000'];
 const base=opened({margin:'200'}),prior=snapshot(base);
 const results=marks.map(mark=>{
  const i=opened({margin:'200',mark});const r=Reconcile.audit(i);
  assert.equal(r.status,'model-arithmetic-consistent');
  assert.equal(r.summary.walletUSD,'1800');
  assert.equal(r.summary.freeCashUSD,'1700');
  assert.equal(r.summary.isolatedMarginUSD,'200');return r.summary;
 });
 assert.ok(new D(results[0].unrealizedPnLUSD).lt(results.at(-1).unrealizedPnLUSD));
 assert.equal(snapshot(base),prior);
});
test('B14.3 24 — no public liquidation price, implied profit probability or brokerage orders',()=>{
 const r=Risk.estimate(opened());
 assert.equal(r.officialKrakenPrice,false);
 assert.equal(r.guaranteedProtection,false);
 assert.equal(r.recommendationsAllowed,false);
 const simulation=Temporal.simulate(opened({margin:'1000'}),req(0.1,'0'));
 safety(simulation);
 assert.equal(typeof Temporal.placeOrder,'undefined');
 assert.equal(typeof Risk.placeOrder,'undefined');
});
