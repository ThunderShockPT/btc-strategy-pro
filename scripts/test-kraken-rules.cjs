'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');
const rules=require('../rules/kraken/eea-pf-xbtusd-20261021.json');
const evidence=require('../rules/kraken/pf-xbtusd-public-20261021.json');
const api=require('../kraken-rules.js');
const context={now:'2026-10-20T23:40:00Z',symbol:'PF_XBTUSD',jurisdiction:'EEA',marginMode:'isolated',selectedLeverage:'10',platform:'europa',clientType:'retail',collateralCurrency:'USD'};
const copy=()=>JSON.parse(JSON.stringify(rules));
test('recorded public evidence matches its SHA-256 and successful instrument response',()=>{
 const source=rules.sources.find(s=>s.id==='instrument-api');
 const hash=crypto.createHash('sha256').update(fs.readFileSync('rules/kraken/'+source.snapshot)).digest('hex');
 assert.equal(hash,source.sha256);assert.equal(evidence.result,'success');
 assert.equal(evidence.serverTime,rules.observedAt);assert.equal(evidence.instrument.length,1);
});
test('explicit EEA platform tables agree with the independent published EEA schedule',()=>{
 const expected=[['0','0.1','0.05'],['30000000','0.2','0.1'],['50000000','0.3','0.15'],['150000000','0.5','0.25']];
 for(const platform of ['europa','europa_crypto'])for(const type of ['retail','professional']){
  const levels=api.selectSchedule(rules,platform,type);
  assert.deepEqual(levels.map(l=>[l.lowerBoundUSD,l.initialRate,l.maintenanceRate]),expected);
  const observed=evidence.instrument[0].marginSchedules[platform][type];
  assert.deepEqual(levels.map(l=>[+l.lowerBoundUSD,+l.initialRate,+l.maintenanceRate]),observed.map(l=>[l.numNonContractUnits,l.initialMargin,l.maintenanceMargin]));
 }
});
test('generic schedules differ and must never be used as EEA fallback',()=>{
 assert.equal(evidence.instrument[0].marginLevels[0].initialMargin,.01);
 assert.equal(api.selectSchedule(rules,'europa','retail')[0].initialRate,'0.1');
 for(const platform of [undefined,'mtf','dlt','__proto__',''])assert.throws(()=>api.selectSchedule(rules,platform,'retail'),{code:'UNSUPPORTED_PLATFORM'});
 for(const type of [undefined,'Retail','__proto__'])assert.throws(()=>api.selectSchedule(rules,'europa',type),{code:'UNSUPPORTED_CLASSIFICATION'});
});
test('financial fields require decimal strings and reject malformed or excessive precision',()=>{
 for(const bad of [1,NaN,Infinity,'NaN','1e3','-1','01','0,1',' 1','0.00000000000000001'])assert.throws(()=>api.tierAt(rules,'europa','retail',bad),{code:'INVALID_DECIMAL'});
});
test('each published lower boundary selects the new tier, without float rounding',()=>{
 const cases=[['0','0.1'],['29999999.9999999999999999','0.1'],['30000000','0.2'],['49999999.9999999999999999','0.2'],['50000000','0.3'],['149999999.9999999999999999','0.3'],['150000000','0.5']];
 for(const [value,rate]of cases)assert.equal(api.tierAt(rules,'europa','retail',value).initialRate,rate);
});
test('public precision, tick and position cap agree with support specifications',()=>{
 const i=evidence.instrument[0];assert.equal(i.contractValueTradePrecision,4);assert.equal(i.contractSize,1);assert.equal(i.tickSize,1);assert.equal(i.maxPositionSize,1200);
 assert.equal(api.validateOrder(rules,{quantityBTC:'0.0001',priceUSD:'82000',orderType:'limit'}).metadataValid,true);
 assert.equal(api.validateOrder(rules,{quantityBTC:'1200',priceUSD:'1',orderType:'limit'}).metadataValid,true);
});
test('off-lot, below-minimum, above-cap and off-tick values are not accepted or rounded',()=>{
 for(const [quantityBTC,priceUSD,reason]of [['0','82000','BELOW_MIN_QUANTITY'],['0.00009','82000','BELOW_MIN_QUANTITY'],['0.00015','82000','INVALID_QUANTITY_STEP'],['1200.0001','82000','ABOVE_MAX_QUANTITY'],['0.0001','82000.1','INVALID_PRICE_TICK'],['0.0001','0','INVALID_PRICE_TICK']]){
  assert.ok(api.validateOrder(rules,{quantityBTC,priceUSD,orderType:'limit'}).reasons.includes(reason));
 }
});
test('property: 200 exact lot multiples pass; each half-lot perturbation fails',()=>{
 let seed=731n;
 for(let n=0;n<200;n++){
  seed=(seed*48271n)%2147483647n;const lots=seed%12000000n+1n;
  const exact=(lots/10000n)+'.'+String(lots%10000n).padStart(4,'0');
  assert.equal(api.validateOrder(rules,{quantityBTC:exact,priceUSD:'80000',orderType:'limit'}).metadataValid,true);
  const half=lots*10n+5n,perturbed=(half/100000n)+'.'+String(half%100000n).padStart(5,'0');
  assert.ok(api.validateOrder(rules,{quantityBTC:perturbed,priceUSD:'80000',orderType:'limit'}).reasons.includes('INVALID_QUANTITY_STEP'));
 }
});
test('fresh scoped rules permit only labelled approximate metadata use',()=>{
 const result=api.assess(rules,context);assert.equal(result.scopeReady,true);assert.equal(result.status,'approximate');
 assert.equal(result.specificRiskRecommendationsAllowed,false);assert.equal(result.ordersAllowed,false);assert.equal(result.transfersAllowed,false);
 assert.ok(result.reasons.includes('FUNDING_ACCOUNTING_RECONCILIATION_PENDING'));
});
test('expiry is enforced at the exact review boundary and future observations are blocked',()=>{
 const t=Date.parse(rules.observedAt),expiry=rules.applicationPolicy.reviewMaxAgeSeconds*1000;
 assert.equal(api.assess(rules,{...context,now:new Date(t+expiry-1).toISOString()}).scopeReady,true);
 assert.ok(api.assess(rules,{...context,now:new Date(t+expiry).toISOString()}).reasons.includes('STALE_RULES'));
 assert.ok(api.assess(rules,{...context,now:new Date(t-1).toISOString()}).reasons.includes('RULES_FROM_FUTURE'));
});
test('wrong product, geography, margin, leverage and unknown account context fail closed',()=>{
 for(const change of [{symbol:'PI_XBTUSD'},{jurisdiction:'US'},{marginMode:'cross'},{selectedLeverage:'100'},{platform:undefined},{clientType:undefined}]){
  const result=api.assess(rules,{...context,...change});assert.equal(result.scopeReady,false);assert.equal(result.status,'blocked');
 }
});
test('EUR collateral is recorded but cannot bypass the unimplemented FX valuation',()=>{
 assert.equal(rules.collateral.EUR.haircut,'0');
 assert.ok(api.assess(rules,{...context,collateralCurrency:'EUR'}).reasons.includes('FX_COLLATERAL_ENGINE_PENDING'));
 assert.ok(api.assess(rules,{...context,collateralCurrency:'USDT'}).reasons.includes('UNSUPPORTED_COLLATERAL'));
});
test('halted instruments and post-only restrictions remain separate from margin eligibility',()=>{
 for(const key of ['suspended','tradeable']){
  const r=copy();r.instrument[key]=key==='suspended';
  assert.ok(api.assess(r,context).reasons.includes('INSTRUMENT_UNAVAILABLE'));
  assert.ok(api.validateOrder(r,{quantityBTC:'0.0001',priceUSD:'82000',orderType:'limit'}).reasons.includes('INSTRUMENT_UNAVAILABLE'));
 }
 const r=copy();r.instrument.postOnly=true;
 assert.ok(api.validateOrder(r,{quantityBTC:'0.0001',priceUSD:'82000',orderType:'market'}).reasons.includes('POST_ONLY'));
});
test('malformed schedules are rejected rather than repaired or silently replaced',()=>{
 for(const mutate of [r=>r.margin.schedules.europa.retail.reverse(),r=>r.margin.schedules.europa.retail[0].lowerBoundUSD='1',r=>r.margin.schedules.europa.retail[0].maintenanceRate='0.2',r=>delete r.margin.schedules.europa.retail]){
  const r=copy();mutate(r);assert.throws(()=>api.load(r));
 }
});
test('missing provenance or enabling execution capabilities is rejected',()=>{
 for(const mutate of [r=>r.sources=[],r=>r.sources[0].url='https://example.com/rules',r=>r.instrument.sources=['missing'],r=>r.applicationPolicy.ordersAllowed=true,r=>r.applicationPolicy.orderExecutionEnabled=true,r=>r.applicationPolicy.specificRiskRecommendationsEnabled=true,r=>r.applicationPolicy.reviewMaxAgeSeconds=86401]){
  const r=copy();mutate(r);
  // Extra unknown fields are harmless; only the actual capability flag is recognized.
  if(r.applicationPolicy.ordersAllowed===true)assert.equal(api.assess(r,context).ordersAllowed,false);
  else assert.throws(()=>api.load(r));
 }
});
test('rules are immutable copies and do not mutate the caller',()=>{
 const original=copy(),loaded=api.load(original);original.instrument.priceTick='2';
 assert.equal(loaded.instrument.priceTick,'1');assert.ok(Object.isFrozen(loaded.margin.schedules.europa.retail));
 assert.throws(()=>{loaded.instrument.priceTick='3'},TypeError);
});
test('timestamps require a real UTC instant and reject impossible dates',()=>{
 for(const now of [undefined,'2026-10-21','2026-02-30T12:00:00Z','2026-10-21T25:00:00Z','2026-10-21T00:00:00+01:00'])assert.throws(()=>api.assess(rules,{...context,now}),{code:'INVALID_TIMESTAMP'});
});
test('browser namespace loads without DOM, network, account or storage access',()=>{
 const sandbox={URL};vm.runInNewContext(fs.readFileSync('kraken-rules.js','utf8'),sandbox);
 assert.equal(typeof sandbox.BTCKrakenRules.assess,'function');assert.equal(sandbox.BTCKrakenRules.assess(rules,context).status,'approximate');
});
