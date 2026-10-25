'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const f=require('./helpers/cycle-fixture.cjs');
const Core=require('../financial-engine.js'),Risk=require('../position-risk.js');
const {nextBuyCapacity:capacity}=require('../architecture/next-buy-capacity.cjs');
const q=(input,overrides={})=>capacity({input,entryPriceUSD:'100000',targetNominalUSD:'200',
  stressFloorUSD:'80000',extraSafetyBufferUSD:'10',quoteCeilingNominalUSD:'10000',...overrides});
const opened=(capital='2000',margin='200')=>{
 const i=f.input(capital);
 i.events.push(f.event(2,'margin_add',{amountUSD:margin,currency:'USD',purpose:'initial'}),
  f.event(3,'trade_buy',{symbol:'PF_XBTUSD',executionStatus:'executed',quantityBTC:'0.01',priceUSD:'100000',cycle:'cycle-1'}));
 return i;
};
test('one headline reads the V20 spendable cash, not total initial deposit',()=>{
 const i=opened(),r=q(i,{entryPriceUSD:'97000'});
 const l=Core.reconstruct(i);
 assert.equal(r.reference.cashAvailableUSD,l.cash.spendableUSD);
 assert.equal(r.reference.isolatedMarginAlreadyAllocatedUSD,'200');
 assert.equal(r.reference.bookWalletUSD,'1800');
 assert.equal(r.reference.unrealizedPnLNowUSD,'0');
});
test('a decline does not subtract unrealized loss twice from isolated free wallet cash',()=>{
 const i=opened(),old=q(i,{entryPriceUSD:'97000'});
 i.valuation.markPriceUSD='97000';
 const updated=q(i,{entryPriceUSD:'97000'});
 assert.equal(updated.reference.bookWalletUSD,old.reference.bookWalletUSD);
 assert.equal(updated.reference.cashAvailableUSD,old.reference.cashAvailableUSD);
 assert.equal(updated.reference.unrealizedPnLNowUSD,'-30');
 assert.equal(updated.reference.isolatedEquityBeforeFutureBuyUSD,'170');
});
test('at future level, losses reduce isolated position equity even if wallet is unchanged',()=>{
 const i=opened();
 const x=q(i,{entryPriceUSD:'96000'});
 assert.equal(x.reference.unrealizedPnLAtFutureEntryUSD,'-40');
 assert.equal(x.reference.isolatedEquityBeforeFutureBuyUSD,'160');
 assert.equal(x.reference.bookWalletUSD,'1800');
});
test('margin breach before next buy blocks its affordability regardless of wallet balance',()=>{
 const i=opened();
 const r=q(i,{entryPriceUSD:'80001',stressFloorUSD:'70000'});
 assert.equal(r.status,'not-eligible-under-model');
 assert.ok(r.blockers.includes('EXISTING_POSITION_UNSAFE_BEFORE_NEXT_BUY'));
 assert.equal(r.maxAffordableEstimate,null);
 assert.ok(Number(r.reference.cashAvailableUSD)>1000);
});
test('explicit margin funding changes prospective feasibility; wallet transfer is real',()=>{
 const before=opened('2000','200');
 const after=opened('2000','300');
 const a=q(before,{entryPriceUSD:'90000'}),b=q(after,{entryPriceUSD:'90000'});
 assert.ok(Number(b.reference.isolatedEquityBeforeFutureBuyUSD)>Number(a.reference.isolatedEquityBeforeFutureBuyUSD));
 assert.ok(Number(b.reference.cashAvailableUSD)<Number(a.reference.cashAvailableUSD));
 assert.equal(a.reference.unrealizedPnLAtFutureEntryUSD,b.reference.unrealizedPnLAtFutureEntryUSD);
});
test('available maximum never permits more than recorded free cash after transfers, funding and fees',()=>{
 const i=f.input('500');
 const r=q(i,{entryPriceUSD:'100000',targetNominalUSD:'150',stressFloorUSD:'90000'});
 if(r.maxAffordableEstimate)assert.ok(Number(r.maxAffordableEstimate.cashUsedUSD)<=Number(r.reference.cashAvailableUSD));
 if(r.targetEstimate)assert.ok(Number(r.targetEstimate.nominalUSD)<=150);
 assert.equal(r.canApply,false);
});
test('pending funding reduces available buying capacity, not isolated assigned margin',()=>{
 const i=f.input('500');
 const a=q(i,{stressFloorUSD:'90000'}),b=q(i,{stressFloorUSD:'90000',fundingPendingDebitUSD:'100'});
 assert.ok(Number(b.reference.cashAvailableUSD)<Number(a.reference.cashAvailableUSD));
 assert.equal(b.reference.isolatedMarginAlreadyAllocatedUSD,a.reference.isolatedMarginAlreadyAllocatedUSD);
 assert.ok(Number(b.maxAffordableEstimate?.nominalUSD||0)<=Number(a.maxAffordableEstimate?.nominalUSD||0));
});
test('settled funding and trading fees reduce ledger wallet without double counting mark losses',()=>{
 const i=opened();
 i.events.push(f.event(4,'fee',{amountUSD:'1',currency:'USD',category:'other'}),f.event(5,'funding',{amountUSD:'2',currency:'USD',direction:'paid',settlementId:'test-r3-misc'}));
 const r=q(i,{entryPriceUSD:'97000'});
 assert.equal(r.reference.bookWalletUSD,'1797');
 assert.equal(r.reference.cashAvailableUSD,'1697');
});
test('a real purchase requires a positive minimum executable lot',()=>{
 const i=f.input('2000');
 const r=q(i,{targetNominalUSD:'1'});
 assert.equal(r.targetEstimate,null);
 assert.ok(r.blockers.includes('TARGET_BELOW_MINIMUM_LOT_OR_POSITION_LIMIT'));
});
test('underfunded cash blocks the planned order while providing a smaller possible amount',()=>{
 const i=f.input('190');
 const r=q(i,{stressFloorUSD:'80000',targetNominalUSD:'400'});
 assert.equal(r.status,'not-eligible-under-model');
 assert.ok(r.blockers.includes('INSUFFICIENT_CASH_FOR_TARGET_AND_FLOOR_STRESS'));
 assert.ok(!r.maxAffordableEstimate||Number(r.maxAffordableEstimate.nominalUSD)<Number(r.targetEstimate.nominalUSD));
});
test('funding reservation cannot be negative or numeric in place of decimal string',()=>{
 const i=f.input();
 assert.throws(()=>q(i,{fundingPendingDebitUSD:'-2'}),/INVALID_PREVIEW_DECIMAL/);
 assert.throws(()=>q(i,{targetNominalUSD:200}),/INVALID_PREVIEW_DECIMAL/);
});
test('planned price at or below the risk floor is never normalized into a buy',()=>{
 assert.throws(()=>q(f.input(),{entryPriceUSD:'80000'}),/ENTRY_AT_OR_BELOW_STRESS_FLOOR/);
});
test('stale price-side rules fail closed for a 25 October 2026 scenario',()=>{
 const i=f.input();i.valuation.asOf='2026-10-25T14:20:00Z';
 assert.throws(()=>q(i),e=>e.code==='RULES_OUT_OF_SCOPE_OR_STALE');
});
test('future invalid price tick and already passed levels are rejected',()=>{
 assert.throws(()=>q(f.input(),{entryPriceUSD:'99000.25'}),/INVALID_KRAKEN_PRICE_TICK/);
 const i=f.input();i.valuation.markPriceUSD='90000';
 assert.throws(()=>q(i),/ENTRY_ALREADY_PASSED_REVIEW_REQUIRED/);
});
test('low cash never becomes margin by implication',()=>{
 const i=opened('1000','200'),v=q(i,{entryPriceUSD:'96000',stressFloorUSD:'80000'});
 assert.equal(v.reference.isolatedMarginAlreadyAllocatedUSD,'200');
 assert.equal(v.reference.bookWalletUSD,'800');
 assert.equal(v.canApply,false);
 assert.equal(v.mayWriteLedger,false);
 assert.equal(v.mayCallExchange,false);
});
test('wallet and isolated margin remain conserved when existing position has unrealized loss',()=>{
 const i=opened(),x=q(i,{entryPriceUSD:'97000'});
 const l=Core.reconstruct(i);
 assert.equal(l.cash.bookCashTotalUSD,'2000');
 assert.equal(l.pnl.totalEquityUSD,'2000');
 assert.equal(x.reference.unrealizedPnLAtFutureEntryUSD,'-30');
});
