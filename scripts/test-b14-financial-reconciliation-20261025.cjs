'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('decimal.js'),Core=require('../financial-engine.js'),
 Risk=require('../position-risk.js'),A=require('../architecture/b14-financial-reconciliation.cjs'),
 F=require('./helpers/cycle-fixture.cjs');
const event=(id,kind,facts)=>F.event(id,kind,facts);
function opened({capital='2000',margin='200',quantity='0.01',entry='100000',mark='97000'}={}){
 const i=F.input(capital);i.valuation.markPriceUSD=mark;
 i.events.push(event(2,'margin_add',{amountUSD:margin,currency:'USD',purpose:'initial'}),
  event(3,'trade_buy',{symbol:'PF_XBTUSD',quantityBTC:quantity,priceUSD:entry,executionStatus:'executed',cycle:'cycle-1'}));
 return i;
}
function verified(i){
 const prev=JSON.stringify(i),r=A.audit(i);
 assert.equal(r.status,'model-arithmetic-consistent',JSON.stringify(r.checks.filter(x=>!x.pass)));
 assert.ok(r.checks.length>=17);
 assert.ok(r.checks.every(x=>x.pass));
 assert.equal(r.officialKrakenLiquidation,false);
 assert.equal(r.financialRecommendation,false);
 assert.equal(r.ordersAllowed,false);
 assert.equal(r.accountConnection,false);
 assert.equal(JSON.stringify(i),prev);
 return r;
}
test('B14.2: 2,000 wallet - 200 isolated - 100 reserved = 1,700 free; 30 PnL loss stays isolated',()=>{
 const r=verified(opened());
 assert.equal(r.summary.walletUSD,'1800');assert.equal(r.summary.freeCashUSD,'1700');
 assert.equal(r.summary.unrealizedPnLUSD,'-30');
 assert.equal(r.summary.isolatedMarginUSD,'200');
 assert.equal(r.summary.maintenanceUSD,'50');
 assert.equal(r.summary.maintenanceBufferUSD,'120');
 assert.equal(r.summary.estimatedMaintenanceBoundaryUSD,'85000');
});
test('B14.2: a lower mark reduces isolated equity, not the same general wallet twice',()=>{
 const p=verified(opened({mark:'97000'})),q=verified(opened({mark:'90000'}));
 assert.equal(p.summary.walletUSD,q.summary.walletUSD);
 assert.equal(p.summary.freeCashUSD,q.summary.freeCashUSD);
 assert.equal(q.summary.unrealizedPnLUSD,'-100');
 assert.equal(q.summary.maintenanceBufferUSD,'50');
});
test('B14.2: trading fee and paid funding each debit free wallet, not isolated margin',()=>{
 const i=opened();i.events.push(event(4,'fee',{amountUSD:'0.5',currency:'USD',category:'trading',tradeEventId:i.events[2].id}));
 i.events.push(event(5,'funding',{amountUSD:'2.5',currency:'USD',direction:'paid',settlementId:'b142-period-1'}));
 const r=verified(i);
 assert.equal(r.summary.walletUSD,'1797');assert.equal(r.summary.freeCashUSD,'1697');
 assert.equal(r.summary.feesPaidUSD,'0.5');assert.equal(r.summary.settledFundingNetUSD,'-2.5');
 assert.equal(r.summary.isolatedMarginUSD,'200');
});
test('B14.2: received funding adds to wallet once and does not change maintenance',()=>{
 const i=opened();i.events.push(event(4,'funding',{amountUSD:'1.75',currency:'USD',direction:'received',settlementId:'b142-credit'}));
 const r=verified(i);assert.equal(r.summary.walletUSD,'1801.75');
 assert.equal(r.summary.freeCashUSD,'1701.75');assert.equal(r.summary.maintenanceUSD,'50');
});
test('B14.2: adding margin is a transfer from wallet, not newly created cash',()=>{
 const i=opened();i.events.push(event(4,'margin_add',{amountUSD:'100',currency:'USD',purpose:'additional'}));
 const r=verified(i);assert.equal(r.summary.walletUSD,'1700');
 assert.equal(r.summary.isolatedMarginUSD,'300');assert.equal(r.summary.freeCashUSD,'1600');
 assert.equal(r.summary.estimatedMaintenanceBoundaryUSD,'75000');
});
test('B14.2: partial exit 0.005 BTC realizes +5 USD to wallet, proportional basis left',()=>{
 const i=opened();i.events.push(event(4,'trade_sell',{symbol:'PF_XBTUSD',quantityBTC:'0.005',priceUSD:'101000',
  executionStatus:'executed',cycle:'cycle-1',pnlDestination:'wallet'}));
 const r=verified(i);
 assert.equal(r.summary.positionQuantityBTC,'0.005');assert.equal(r.summary.remainingBasisUSD,'500');
 assert.equal(r.summary.realizedPnLUSD,'5');assert.equal(r.summary.walletUSD,'1805');
 assert.equal(r.summary.unrealizedPnLUSD,'-15');assert.equal(r.summary.maintenanceUSD,'25');
});
test('B14.2: realized loss into isolated margin does not debit wallet again',()=>{
 const i=opened();i.events.push(event(4,'trade_sell',{symbol:'PF_XBTUSD',quantityBTC:'0.005',priceUSD:'95000',
  executionStatus:'executed',cycle:'cycle-1',pnlDestination:'isolated'}));
 const r=verified(i);assert.equal(r.summary.walletUSD,'1800');
 assert.equal(r.summary.isolatedMarginUSD,'175');
 assert.equal(r.summary.realizedPnLUSD,'-25');
});
test('B14.2: second executed buy recalculates average basis and maintenance',()=>{
 const i=opened({margin:'300',entry:'100000',mark:'90000'});
 i.events.push(event(4,'trade_buy',{symbol:'PF_XBTUSD',quantityBTC:'0.005',priceUSD:'90000',
  executionStatus:'executed',cycle:'cycle-2'}));
 const r=verified(i);
 assert.equal(r.summary.positionQuantityBTC,'0.015');
 assert.equal(r.summary.remainingBasisUSD,'1450');
 assert.equal(r.summary.maintenanceUSD,'72.5');
 assert.equal(r.summary.unrealizedPnLUSD,'-100');
});
test('B14.2: maintenance boundary with repeating decimals is compared at engine precision',()=>{
 const i=opened({margin:'300',entry:'100000',mark:'97000'});
 i.events.push(event(4,'trade_buy',{symbol:'PF_XBTUSD',quantityBTC:'0.005',priceUSD:'90000',
  executionStatus:'executed',cycle:'cycle-2'}));
 const r=verified(i);assert.ok(r.checks.some(x=>x.name==='model-maintenance-boundary-usd'&&x.pass));
});
test('B14.2: other processing fees debit wallet and reduce account equity',()=>{
 const i=opened();i.events.push(event(4,'fee',{amountUSD:'1.25',currency:'USD',category:'other'}));
 const r=verified(i);assert.equal(r.summary.feesPaidUSD,'1.25');
 assert.equal(r.summary.walletUSD,'1798.75');
});
test('B14.2: reservations are not transferred margin or double-subtracted loss',()=>{
 const i=opened();i.reservations={ordersUSD:'150',marginUSD:'100',protectedUSD:'100'};
 const r=verified(i);assert.equal(r.summary.walletUSD,'1800');
 assert.equal(r.summary.freeCashUSD,'1450');
 assert.equal(r.summary.isolatedMarginUSD,'200');
});
test('B14.2: varied mark paths reconcile without changing financial journal',()=>{
 for(const mark of ['60000','85000','94999','97000','100000','120000']){
  const i=opened({mark}),r=verified(i);assert.equal(r.summary.walletUSD,'1800');
 }
});
test('B14.2: stale Oct20 rule data may be used for bookkeeping, never for risk confirmation',()=>{
 const i=opened();i.valuation.asOf='2026-10-25T20:45:00Z';i.bookkeepingOnly=true;
 const r=A.audit(i);assert.equal(r.status,'blocked-unverified-rules');assert.equal(r.ordersAllowed,false);
 assert.equal(r.checks.length,0);
 assert.throws(()=>Risk.estimate(i),{code:'RISK_RULES_UNAVAILABLE'});
});
test('B14.2: frozen synthetic rules cannot be relabelled as current market reconciliation',()=>{
 const i=opened();i.valuation.asOf='2026-10-25T20:45:00Z';i.ruleScenario={mode:'frozen-rules-synthetic',referenceAt:F.now};
 const r=A.audit(i);assert.equal(r.status,'blocked-unverified-rules');assert.equal(r.financialRecommendation,false);
});
test('B14.2: independently calculated tier boundaries agree with original published EEA tiers',()=>{
 const rules=F.input().rules;
 for(const [amount,initial,mm] of [['1000','100','50'],['30000000','6000000','3000000'],
  ['50000000','15000000','7500000'],['150000000','75000000','37500000']]){
  const got=Core.marginRequirements({basisUSD:amount,rules,platform:'europa',clientType:'retail'});
  assert.equal(got.initialUSD,initial);assert.equal(got.maintenanceUSD,mm);
 }
});
test('B14.2: manual model maintenance-price estimate is not exchange liquidation or executable order',()=>{
 const i=opened(),r=verified(i),p=Risk.estimate(i);
 assert.equal(p.officialKrakenPrice,false);assert.equal(p.guaranteedProtection,false);
 assert.ok(r.riskFlags.includes('PARTIAL_LIQUIDATION_AND_FEES_NOT_MODELED'));
 assert.equal(r.summary.estimatedMaintenanceBoundaryUSD,'85000');
});
