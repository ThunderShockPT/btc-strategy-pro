'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Alert=require('../financial-alerts-v20.js');
const id='00000000-0000-4000-a000-000000000001',hash='a'.repeat(64);
function fixture(){
 const a={authenticated:true,connected:true,phase:'bookkeeping-only',selectedProjectId:id,projection:{
   shared:{ownerScoped:true,projectId:id,revision:'3',headHash:hash,quoteCurrent:false,rulesCurrent:false},
   financial:{freeCashUSD:'1700',walletUSD:'1800',isolatedMarginUSD:'200',positionQuantityBTC:'0.01',unrealizedPnLUSD:'-30'}
 }};
 const j={source:'V20_AUTHENTICATED_EVENT_JOURNAL',selectedProjectId:id,revision:'3',sourceHeadHash:hash,
  needsReconciliation:false,phase:'ready',reviewPending:false};
 const basis={projectId:id,revision:'3',headHash:hash};
 const capacity={status:'not-eligible-under-model',canApply:false,mayCallExchange:false,officialKrakenBuyingPower:false,
  blockers:['INSUFFICIENT_CASH_FOR_TARGET_AND_FLOOR_STRESS']};
 return {a,j,basis,capacity};
}
const run=(mutate,extra={})=>{const f=fixture();mutate?.(f);return Alert.evaluate({account:f.a,journal:f.j,...extra(f)});};
const codes=r=>r.alerts.map(x=>x.code);
test('signed-out user sees no financial risk values or personalized buying alerts',()=>{
 const a=Alert.evaluate({});assert.equal(a.status,'reconciliation-required');assert.deepEqual(codes(a),['REVIEW_ACCOUNT_SYNC']);
 assert.equal(a.basis,null);assert.equal(a.canPush,false);
});
test('validated V20 account has only stale-data notice by default',()=>{
 const r=run();assert.equal(r.status,'ready');assert.deepEqual(codes(r),['STALE_MARKET_OR_RULES']);
 assert.equal(r.counts.warning,1);assert.equal(r.canTrade,false);
});
test('with both quote and rules fresh there are no invented alarms',()=>{
 const r=run(f=>{f.a.projection.shared.rulesCurrent=true;f.a.projection.shared.quoteCurrent=true;});
 assert.equal(r.alerts.length,0);
});
test('zero free cash is an accounting warning, not a guaranteed liquidation event',()=>{
 const r=run(f=>{f.a.projection.financial.freeCashUSD='0';});
 assert.ok(codes(r).includes('NO_FREE_CASH'));assert.ok(!codes(r).includes('MAINTENANCE_REACHED_IN_MODEL'));
});
test('BTC price decline does not automatically remove cash or create a fabricated alert',()=>{
 const r=run(f=>{f.a.projection.financial.unrealizedPnLUSD='-30';});
 assert.ok(!codes(r).includes('NO_FREE_CASH'));assert.ok(!codes(r).includes('MAINTENANCE_REACHED_IN_MODEL'));
});
test('pending server review is info requiring user approval',()=>{
 const r=run(f=>{f.j.reviewPending=true;});
 assert.ok(codes(r).includes('PENDING_EXPLICIT_REVIEW'));assert.equal(r.counts.info,1);
});
test('insufficient nominal buying power is conditional warning with matching authenticated revision',()=>{
 const r=run(null,f=>({capacity:f.capacity,capacityBasis:f.basis}));
 assert.ok(codes(r).includes('NEXT_BUY_NOT_FUNDED'));assert.equal(r.counts.warning,2);
});
test('maintenance before next scheduled buy receives higher priority than cash issue',()=>{
 const r=run(f=>{f.capacity.blockers.push('EXISTING_POSITION_UNSAFE_BEFORE_NEXT_BUY');},f=>({capacity:f.capacity,capacityBasis:f.basis}));
 assert.equal(r.alerts[0].code,'EXISTING_MARGIN_AT_RISK');
 assert.equal(r.alerts[0].severity,'critical');assert.equal(r.counts.critical,1);
});
test('never declare the actual Kraken liquidation or auto-transfer after model margin stress',()=>{
 const r=run(f=>{f.capacity.blockers=['EXISTING_POSITION_UNSAFE_BEFORE_NEXT_BUY'];},f=>({capacity:f.capacity,capacityBasis:f.basis}));
 assert.match(r.alerts[0].message,/Na simulação/);
 assert.equal(r.canTrade,false);assert.equal(r.hasFinancialAdvice,false);
});
test('foreign or stale capacity snapshot ignored, emits mismatch only',()=>{
 const r=run(null,f=>({capacity:f.capacity,capacityBasis:{...f.basis,revision:'2'}}));
 assert.ok(codes(r).includes('CAPACITY_REQUIRES_RECALCULATION'));
 assert.ok(!codes(r).includes('NEXT_BUY_NOT_FUNDED'));
});
test('risk engine result cannot certify a maintenance alert without verified basis and source',()=>{
 const r=run(null,f=>({risk:{maintenanceReached:true,source:'EXTERNAL_ESTIMATE'},riskBasis:f.basis}));
 assert.ok(!codes(r).includes('MAINTENANCE_REACHED_IN_MODEL'));
});
test('V20 model explicitly reaching maintenance generates warning only for the same state revision',()=>{
 const r=run(null,f=>({risk:{maintenanceReached:true,source:'V20_VERIFIED_MODEL'},riskBasis:f.basis}));
 assert.ok(codes(r).includes('MAINTENANCE_REACHED_IN_MODEL'));
 const mismatch=run(null,f=>({risk:{maintenanceReached:true,source:'V20_VERIFIED_MODEL'},riskBasis:{...f.basis,headHash:'f'.repeat(64)}}));
 assert.ok(codes(mismatch).includes('RISK_REQUIRES_RECALCULATION'));
 assert.ok(!codes(mismatch).includes('MAINTENANCE_REACHED_IN_MODEL'));
});
test('plan with invalid minimum BTC lot triggers review instead of suggestion to buy',()=>{
 const r=run(f=>{f.capacity.blockers=['TARGET_BELOW_MINIMUM_LOT_OR_POSITION_LIMIT'];},f=>({capacity:f.capacity,capacityBasis:f.basis}));
 assert.ok(codes(r).includes('NEXT_BUY_INVALID_LOT'));assert.equal(r.canTrade,false);
});
test('never trust capacity objects purporting to submit actual Kraken orders',()=>{
 const r=run(f=>{f.capacity.canApply=true;},f=>({capacity:f.capacity,capacityBasis:f.basis}));
 assert.ok(codes(r).includes('CAPACITY_SOURCE_NOT_VERIFIED'));assert.ok(!codes(r).includes('NEXT_BUY_NOT_FUNDED'));
});
test('switching wallet invalidates all personal warnings even with old cache provided',()=>{
 const r=run(f=>{f.a.selectedProjectId='00000000-0000-4000-a000-000000000005';},f=>({capacity:f.capacity,capacityBasis:f.basis}));
 assert.deepEqual(codes(r),['REVIEW_ACCOUNT_SYNC']);assert.equal(r.basis,null);
});
test('journal revision and head hash must both match account before showing warnings',()=>{
 for(const field of ['revision','sourceHeadHash']){
  const r=run(f=>{f.j[field]='b'.repeat(64)});
  assert.equal(r.status,'reconciliation-required');assert.deepEqual(codes(r),['REVIEW_ACCOUNT_SYNC']);
 }
});
test('uncertain financial commit never uses prior account numbers to raise risk',()=>{
 const r=run(f=>{f.j.needsReconciliation=true;f.j.phase='commit-uncertain';},f=>({capacity:f.capacity,capacityBasis:f.basis}));
 assert.deepEqual(codes(r),['REVIEW_ACCOUNT_SYNC']);
});
test('generated alert collection and labels cannot be mutated by caller',()=>{
 const r=run();assert.equal(Object.isFrozen(r),true);assert.equal(Object.isFrozen(r.alerts),true);
 assert.throws(()=>{r.alerts[0].title='Changed';},TypeError);
});
test('not a real notification service and no push/order methods exposed',()=>{
 assert.deepEqual(Object.keys(Alert),['evaluate']);const r=run();
 assert.equal(r.canPush,false);assert.equal(r.canWrite,false);
 assert.ok(r.alerts.every(a=>a.notificationType==='in-app-only'&&a.maySubmitOrders===false));
});
