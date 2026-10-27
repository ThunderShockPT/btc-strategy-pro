'use strict';
/* B14.1 independent documentation-vs-archived-rules guard.
 * Official EEA references were reviewed 25 Oct 2026; this fixture is NOT live
 * exchange verification and MUST remain stale for present-day decisions. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const Kraken=require('../kraken-rules.js');
const rules=require('../rules/kraken/eea-pf-xbtusd-20261021.json');
const archived=require('../rules/kraken/pf-xbtusd-public-20261021.json');
const context=()=>({now:'2026-10-25T20:45:00Z',symbol:'PF_XBTUSD',jurisdiction:'EEA',
 marginMode:'isolated',selectedLeverage:'10',platform:'europa',clientType:'retail',collateralCurrency:'USD'});
test('B14.1 EEA-only schedule matches 7 October 2026 Kraken documentation',()=>{
 const expected=[['0','0.1','0.05'],['30000000','0.2','0.1'],['50000000','0.3','0.15'],['150000000','0.5','0.25']];
 for(const platform of ['europa','europa_crypto'])for(const type of ['retail','professional'])
  assert.deepEqual(Kraken.selectSchedule(rules,platform,type).map(x=>[x.lowerBoundUSD,x.initialRate,x.maintenanceRate]),expected);
});
test('B14.1 do not use generic high-leverage PF_XBTUSD margin levels in EEA',()=>{
 assert.equal(archived.instrument[0].marginLevels[0].initialMargin,0.01);
 assert.equal(Kraken.tierAt(rules,'europa','retail','1000').initialRate,'0.1');
 assert.notEqual(Number(rules.margin.schedules.europa.retail[0].initialRate),archived.instrument[0].marginLevels[0].initialMargin);
});
test('B14.1 EEA PF_XBTUSD documented min lot tick cap and 10x ceiling',()=>{
 assert.equal(rules.symbol,'PF_XBTUSD');assert.equal(rules.product,'linear-multi-m-perpetual');
 assert.equal(rules.instrument.minQuantity,'0.0001');assert.equal(rules.instrument.quantityStep,'0.0001');
 assert.equal(rules.instrument.priceTick,'1');assert.equal(rules.instrument.maxQuantity,'1200');
 assert.equal(rules.selectedLeverage,'10');
});
test('B14.1 funding 8-hour coefficient & hourly 0.5 percent maximum are only archived evidence',()=>{
 assert.equal(rules.funding.coefficient,'8');assert.equal(rules.funding.observedMaxRelativeHourlyRate,'0.005');
 assert.equal(rules.funding.accrual,'continuous');
 assert.equal(rules.funding.settlement,'hour-end-or-net-position-change');
 assert.equal(rules.funding.settledIsolatedDebit,'general-wallet');
 assert.equal(rules.funding.accountingStatus,'needs-public-example-validation');
});
test('B14.1 headline EEA entry fees are illustrative, not account-specific',()=>{
 assert.equal(rules.fees.exampleMakerRate,'0.0002');assert.equal(rules.fees.exampleTakerRate,'0.0005');
 assert.equal(rules.fees.currency,'USD');assert.equal(rules.fees.manualFeeRateRequired,true);
});
test('B14.1 EUR haircut of zero is not license to bypass FX conversion and settlement',()=>{
 assert.equal(rules.collateral.EUR.haircut,'0');
 const result=Kraken.assess(rules,{...context(),collateralCurrency:'EUR'});
 assert.equal(result.scopeReady,false);
 assert.ok(result.reasons.includes('FX_COLLATERAL_ENGINE_PENDING'));
});
test('B14.1 20 October archived snapshot is stale on 25 October and blocks scope',()=>{
 const result=Kraken.assess(rules,context());
 assert.equal(result.status,'blocked');assert.equal(result.scopeReady,false);
 assert.ok(result.reasons.includes('STALE_RULES'));
 assert.equal(result.specificRiskRecommendationsAllowed,false);
 assert.equal(result.ordersAllowed,false);assert.equal(result.transfersAllowed,false);
});
test('B14.1 margin liquidation and funding reconciliations remain blockers',()=>{
 const missing=rules.limitations.map(x=>x.code);
 for(const code of ['MARGIN_RECONCILIATION_PENDING','FUNDING_ACCOUNTING_RECONCILIATION_PENDING',
  'LIQUIDATION_EXECUTION_UNVALIDATED','MANUAL_FEES_REQUIRED'])
  assert.ok(missing.includes(code));
 assert.equal(rules.applicationPolicy.orderExecutionEnabled,false);
});
