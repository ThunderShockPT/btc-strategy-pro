'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Read=require('../backend/account-read-model.cjs'),fixture=require('./helpers/account-ui-fixture.cjs');
test('account cards project 1000 capital, explicit 100 margin and a 200 nominal buy without changing source facts or floor',()=>{
 const x=fixture.state(),before=structuredClone(x.state),r=Read.evaluate(x.state,{context:x.dashboard.inputContext,now:()=>x.dashboard.asOf});
 assert.equal(r.ledger.capital.netContributedUSD,'1000');assert.equal(r.ledger.cash.walletUSD,'900');assert.equal(r.ledger.cash.isolatedMarginUSD,'100');assert.equal(r.ledger.position.acquisitionNotionalUSD,'200');assert.equal(r.ledger.position.quantityBTC,'0.002');assert.equal(r.cycles[0].entries[0].pendingNominalUSD,'0');assert.equal(r.cycles[0].entries[1].allocatedNominalUSD,'300');assert.equal(r.financialFactsChanged,false);assert.equal(r.planApplied,false);assert.deepEqual(x.state,before);assert.equal(r.plan.protectionFloorUSD,before.plan.protectionFloorUSD);
});
test('new public valuation changes unrealized PnL while preserving wallet cash, actual margin and the reference floor',()=>{
 const x=fixture.state(),context=structuredClone(x.dashboard.inputContext);context.valuation.markPriceUSD='110000';const r=Read.evaluate(x.state,{context,now:()=>x.dashboard.asOf});assert.equal(r.ledger.pnl.unrealizedGrossUSD,'20');assert.equal(r.ledger.cash.walletUSD,'900');assert.equal(r.ledger.cash.isolatedMarginUSD,'100');assert.equal(r.ledger.capital.netContributedUSD,'1000');assert.equal(r.plan.protectionFloorUSD,'80000');
});
test('source failure leaves the ledger readable and withholds current liquidation instead of using a last or spot price',async()=>{
 const x=fixture.state(),before=JSON.stringify(x.state),r=await Read.create(x.state,{scope:{},contextProvider:async()=>{throw Error('PUBLIC_MARKET_UNAVAILABLE');},now:()=>new Date(Date.parse(x.dashboard.asOf)+61000).toISOString()});assert.equal(r.fresh,false);assert.equal(r.risk,null);assert.equal(r.unavailableCode,'PUBLIC_MARKET_UNAVAILABLE');assert.equal(r.ledger.capital.netContributedUSD,'1000');assert.equal(JSON.stringify(x.state),before);
});
test('private local calculations are read-only and cannot use Demo confirmation paths',async()=>{
 const App=require('../previews/app-workflows.js'),x=require('./helpers/account-ui-fixture.cjs').state(),payload={...x.state,accountReadOnly:true,nominalUSD:'200',priceUSD:'100000'},before=structuredClone(x.state);
 const sized=await App.dispatch('trade-size',payload);assert.equal(sized.quantityBTC,'0.002');assert.deepEqual(x.state,before);
 for(const method of ['execution-prepare','execution-confirm','movement-confirm','snapshot'])await assert.rejects(App.dispatch(method,payload),/ACCOUNT_WRITE_REQUIRES_SERVER_REVIEW/);
 await assert.rejects(App.dispatch('trade-size',{...payload,accountReadOnly:false}),/DEMO_HISTORY_REQUIRED/);
});
