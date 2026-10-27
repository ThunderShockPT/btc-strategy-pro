'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Guide=require('../guided-tutorial-v20.js');
const Wallet=require('../wallet-onboarding.js');
const official=Wallet.tutorial();
const p=Guide.plan();
test('canonical original V20 six topics reused in exact original order and version',()=>{
 assert.equal(p.topicCount,8);assert.equal(p.sourceTutorialVersion,official.version);
 assert.deepEqual(p.topics.slice(0,6).map(x=>x.id),official.topics.map(x=>x.id));
 assert.ok(p.topics.slice(0,6).every(x=>x.kind==='original-versioned'));
});
test('two additional owner-requested lessons do not change official six-topic receipt',()=>{
 assert.deepEqual(p.topics.slice(6).map(x=>x.id),['future-buying-power','alerts-and-reviews']);
 assert.equal(p.receiptUntouched,true);assert.equal(p.financialApproval,false);
 assert.equal(p.termsStatus,'beta-review-pending');
 assert.equal(Wallet.tutorial().topics.length,6);
});
test('read-only topic structures are deeply frozen',()=>{
 assert.ok(Object.isFrozen(p));assert.ok(Object.isFrozen(p.topics));
 assert.ok(Object.isFrozen(p.topics[0]));assert.ok(Object.isFrozen(p.topics[7]));
 assert.throws(()=>{p.topics[0].summary='falso';},TypeError);
});
test('missing old topic cannot silently replace acceptance protocol',()=>{
 assert.throws(()=>Guide.plan({version:'old',topics:[{}]}),e=>e.code==='B132_ORIGINAL_SIX_TOPICS_REQUIRED');
});
test('duplicate topic IDs rejected in imported catalog',()=>{
 const c=Wallet.tutorial(), topics=c.topics.map(x=>({...x}));
 topics[5].id=topics[0].id;
 assert.throws(()=>Guide.plan({...c,topics}),e=>e.code==='B132_INVALID_V20_TOPIC');
});
test('empty original topic explanations rejected',()=>{
 const c=Wallet.tutorial(),topics=c.topics.map(x=>({...x}));
 topics[4].example='';
 assert.throws(()=>Guide.plan({...c,topics}),e=>e.code==='B132_INVALID_V20_TOPIC');
});
test('1000 nominal cycle shows exact 20/30/50, not initial wallet allocation',()=>{
 const v=Guide.example();assert.equal(v.buy20USD,'200,00');assert.equal(v.buy30USD,'300,00');assert.equal(v.buy50USD,'500,00');
 assert.equal(v.mayTrade,false);assert.equal(v.receiptStored,false);
});
test('cash after transfer and reserve is 1700; no subtraction of floating BTC loss',()=>{
 const v=Guide.example();assert.equal(v.freeCashUSD,'1.700,00');
 assert.equal(v.unrealizedPnLUSD,'−30,00');assert.equal(v.isolatedEquityUSD,'170,00');
});
test('mark falling 100k to 95k updates isolated PnL but not free cash',()=>{
 const v=Guide.example({btcMarkUSD:'95000'});
 assert.equal(v.freeCashUSD,'1.700,00');assert.equal(v.unrealizedPnLUSD,'−50,00');
 assert.equal(v.isolatedEquityUSD,'150,00');
});
test('a rising BTC mark produces positive unrealized PnL without adding it to free cash',()=>{
 const v=Guide.example({btcMarkUSD:'105000'});
 assert.equal(v.unrealizedPnLUSD,'50,00');assert.equal(v.freeCashUSD,'1.700,00');
});
test('fees paid and increased isolated margin reduce cash, not BTC mark directly',()=>{
 const v=Guide.example({marginTransferredUSD:'300',paidCostsUSD:'50'});
 assert.equal(v.freeCashUSD,'1.550,00');assert.equal(v.isolatedEquityUSD,'270,00');
});
test('nominal ladder amount changes with cycle, no leverage multiplier',()=>{
 const v=Guide.example({cycleNominalUSD:'2500'});
 assert.equal(v.buy20USD,'500,00');assert.equal(v.buy30USD,'750,00');assert.equal(v.buy50USD,'1.250,00');
});
test('six-decimal quantity and integer price use exact BigInt arithmetic',()=>{
 const v=Guide.example({btcBought:'0.000123',btcEntryUSD:'100000',btcMarkUSD:'90000'});
 assert.equal(v.unrealizedPnLUSD,'−1,23');
});
test('fees and reserves cannot silently create cash or liquidations',()=>{
 const v=Guide.example({capitalUSD:'200',marginTransferredUSD:'200',reserveUSD:'100'});
 assert.equal(v.freeCashUSD,'−100,00');assert.equal(v.freeCashNegative,true);
 assert.equal(v.liquidationVerified,false);assert.equal(v.buyingPowerOfficial,false);
});
test('reject negative, scientific, JSON, oversized inputs',()=>{
 for(const value of ['-3','1e9','NaN','Infinity','1.2222222',5,null,'0001',{}]){
  assert.throws(()=>Guide.example({capitalUSD:value}),e=>e.code==='B132_INVALID_EXAMPLE_VALUE');
 }
});
test('reject nonsensical zero purchase values',()=>{
 for(const patch of [{capitalUSD:'0'},{cycleNominalUSD:'0'},{btcBought:'0'},{btcEntryUSD:'0'},{btcMarkUSD:'0'}]){
  assert.throws(()=>Guide.example(patch),e=>e.code==='B132_INVALID_EXAMPLE_VALUE');
 }
});
test('returns immutable safe simulation metadata with no actions or receipts',()=>{
 const r=Guide.example();assert.ok(Object.isFrozen(r));
 assert.equal(r.exampleOnly,true);assert.equal(r.mayTrade,false);
 assert.ok(!Object.hasOwn(r,'save'));assert.ok(!Object.hasOwn(r,'submit'));
});
test('all eight lesson identifiers are unique and every lesson explains risk',()=>{
 assert.equal(new Set(p.topics.map(x=>x.id)).size,8);
 assert.ok(p.topics.every(x=>typeof x.reminder==='string'&&x.reminder.length>45));
});
