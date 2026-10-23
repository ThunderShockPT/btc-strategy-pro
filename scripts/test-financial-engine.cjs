'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Decimal=require('decimal.js');
const engine=require('../financial-engine.js'),rules=require('../rules/kraken/eea-pf-xbtusd-20261021.json');
const UUID=n=>'00000000-0000-4000-a000-'+String(n).padStart(12,'0');
const projectId=UUID(1),ownerId=UUID(2),at='2026-10-20T23:35:00Z';
function diary(){
 const events=[];
 function add(type,facts,extra={}){const n=events.length+1;const e={id:UUID(100+n),project_id:projectId,owner_id:ownerId,scenario_key:'manual_long',origin:'manual',schema_version:1,revision:String(n),idempotency_key:'event-'+n,event_type:type,effective_at:at,recorded_at:at,facts,...extra};events.push(e);return e;}
 const cash=(type,amount,extra={})=>add(type,{amountUSD:amount,currency:'USD',...extra});
 const buy=(quantityBTC,priceUSD,cycle='cycle-1')=>add('trade_buy',{symbol:'PF_XBTUSD',executionStatus:'executed',quantityBTC,priceUSD,cycle});
 const sell=(quantityBTC,priceUSD,extra={cycle:'cycle-1'})=>add('trade_sell',{symbol:'PF_XBTUSD',executionStatus:'executed',quantityBTC,priceUSD,pnlDestination:'wallet',...extra});
 return {events,add,cash,buy,sell,open:(amount='2000')=>cash('opening_balance',amount),margin:(amount='100')=>cash('margin_add',amount,{purpose:'initial'})};
}
function run(d,extra={}){return engine.reconstruct({projectId,ownerId,scenarioKey:'manual_long',platform:'europa',clientType:'retail',rules,valuation:{kind:'synthetic',source:'independent-test-scenario',markPriceUSD:'100000',asOf:'2026-10-20T23:40:00Z'},events:d.events,...extra});}
function basic(){const d=diary();d.open();d.margin();d.buy('0.01','100000');return d;}
test('capital range reconstructs without fabricating positions or margin',()=>{
 for(const amount of ['100','200','500','2000','10000','50000']){const d=diary();d.open(amount);const r=run(d);assert.equal(r.cash.walletUSD,amount);assert.equal(r.cash.isolatedMarginUSD,'0');assert.equal(r.position.quantityBTC,'0');assert.equal(r.position.averageEntryUSD,null);assert.equal(r.margin.estimatedLiquidationUSD,null);}
});
test('20/30/50 executions use a common position and do not consume spot purchase cash',()=>{
 const d=diary();d.open();d.margin();
 for(const q of ['0.002','0.003','0.005']){const e=d.buy(q,'100000');d.add('fee',{amountUSD:new Decimal(q).mul('100000').mul('0.0005').toFixed(),currency:'USD',category:'trading',tradeEventId:e.id});}
 const r=run(d,{valuation:{kind:'synthetic',source:'test',markPriceUSD:'105000',asOf:'2026-10-20T23:40:00Z'}});
 assert.equal(r.position.quantityBTC,'0.01');assert.equal(r.position.remainingBasisUSD,'1000');assert.equal(r.position.averageEntryUSD,'100000');
 assert.equal(r.cash.walletUSD,'1899.5');assert.equal(r.cash.isolatedMarginUSD,'100');assert.equal(r.pnl.unrealizedGrossUSD,'50');assert.equal(r.pnl.totalEquityUSD,'2049.5');
 assert.equal(r.margin.initialRequiredUSD,'100');assert.equal(r.margin.maintenanceRequiredUSD,'50');assert.equal(r.margin.markExposureToIsolatedEquity,'7');
});
test('weighted average is quantity-weighted, including multiple cycles',()=>{
 const d=diary();d.open();d.margin('180');d.buy('0.01','100000');d.buy('0.01','80000','cycle-2');const r=run(d);
 assert.equal(r.position.averageEntryUSD,'90000');assert.equal(r.position.quantityBTC,'0.02');assert.equal(r.position.cycles.length,2);assert.equal(r.pnl.unrealizedGrossUSD,'200');
});
test('partial and aggregate total sales allocate common basis and explicit cycle quantities',()=>{
 const d=diary();d.open();d.margin('180');d.buy('0.01','100000');d.buy('0.01','80000','cycle-2');d.sell('0.005','110000');
 const partial=run(d);assert.equal(partial.position.remainingBasisUSD,'1350');assert.equal(partial.position.averageEntryUSD,'90000');assert.equal(partial.pnl.realizedGrossUSD,'100');assert.equal(partial.cash.walletUSD,'1920');
 d.sell('0.015','100000',{allocations:[{cycle:'cycle-1',quantityBTC:'0.005'},{cycle:'cycle-2',quantityBTC:'0.01'}]});const closed=run(d);
 assert.equal(closed.position.quantityBTC,'0');assert.equal(closed.position.remainingBasisUSD,'0');assert.equal(closed.pnl.realizedGrossUSD,'250');
 assert.equal(closed.cash.walletUSD,'2070');assert.equal(closed.margin.unreturnedMarginUSD,'180');
 d.cash('margin_remove','180');assert.equal(run(d).cash.walletUSD,'2250');assert.equal(run(d).cash.isolatedMarginUSD,'0');
});
test('sell allocations cannot exceed a cycle, be duplicated or fail to sum to the fill',()=>{
 for(const allocations of [[{cycle:'cycle-1',quantityBTC:'0.009'}],[{cycle:'cycle-1',quantityBTC:'0.005'},{cycle:'cycle-1',quantityBTC:'0.005'}],[{cycle:'cycle-2',quantityBTC:'0.01'}]]){
  const d=basic();d.sell('0.01','100000',{allocations});assert.throws(()=>run(d));
 }
 const d=basic();d.sell('0.0101','100000');assert.throws(()=>run(d),{code:'SELL_EXCEEDS_AVAILABLE_BTC'});
});
test('a 500 USD deposit after executions changes wallet and contributions, not isolated position',()=>{
 const d=basic(),a=run(d);d.cash('capital_deposit','500');const b=run(d);
 assert.equal(b.capital.netContributedUSD,'2500');assert.equal(b.cash.walletUSD,'2400');assert.deepEqual(a.position,b.position);assert.deepEqual(a.margin,b.margin);
 d.cash('margin_add','50',{purpose:'additional'});const c=run(d);assert.equal(c.cash.walletUSD,'2350');assert.equal(c.cash.isolatedMarginUSD,'150');assert.equal(c.cash.bookCashTotalUSD,b.cash.bookCashTotalUSD);assert.equal(c.capital.netContributedUSD,'2500');
});
test('partial execution records only filled quantity and rejects pending orders as facts',()=>{
 const d=diary();d.open();d.margin();d.buy('0.0001','100000');assert.equal(run(d).position.remainingBasisUSD,'10');
 d.events.at(-1).facts.executionStatus='pending';assert.throws(()=>run(d),{code:'UNEXECUTED_TRADE_REQUIRES_PLAN'});
});
test('realized PnL settlement destination is mandatory and never credited twice',()=>{
 const d=basic();d.sell('0.005','110000',{cycle:'cycle-1',pnlDestination:'isolated'});const r=run(d);
 assert.equal(r.cash.walletUSD,'1900');assert.equal(r.cash.isolatedMarginUSD,'150');assert.equal(r.pnl.realizedGrossUSD,'50');
 delete d.events.at(-1).facts.pnlDestination;assert.throws(()=>run(d),{code:'PNL_DESTINATION_REQUIRED'});
});
test('realized losses are debited once, and infeasible wallet settlements fail',()=>{
 const d=basic();d.sell('0.005','90000');assert.equal(run(d).pnl.realizedGrossUSD,'-50');assert.equal(run(d).cash.walletUSD,'1850');
 const poor=diary();poor.open('100');poor.margin();poor.buy('0.01','100000');poor.sell('0.01','90000');assert.throws(()=>run(poor),{code:'INSUFFICIENT_WALLET'});
});
test('fees and paid/received settled funding debit only the general wallet',()=>{
 const d=basic(),trade=d.events.at(-1);
 d.add('fee',{amountUSD:'0.5',currency:'USD',category:'trading',tradeEventId:trade.id});
 d.add('funding',{amountUSD:'2',currency:'USD',direction:'paid',settlementId:'hour-1-part-1'});
 d.add('funding',{amountUSD:'1',currency:'USD',direction:'received',settlementId:'hour-1-part-2'});
 const r=run(d);assert.equal(r.cash.walletUSD,'1898.5');assert.equal(r.cash.isolatedMarginUSD,'100');assert.equal(r.pnl.totalNetUSD,'-1.5');assert.equal(r.pnl.totalEquityUSD,'1998.5');
});
test('duplicate fee and funding settlements cannot be hidden behind new event IDs',()=>{
 for(const type of ['fee','funding']){
  const d=basic();const f=type==='fee'?{amountUSD:'1',currency:'USD',category:'trading',tradeEventId:d.events.at(-1).id}:{amountUSD:'1',currency:'USD',direction:'paid',settlementId:'same'};
  d.add(type,f);d.add(type,{...f});assert.throws(()=>run(d),{code:type==='fee'?'DUPLICATE_TRADE_FEE':'DUPLICATE_OR_INVALID_FUNDING_PERIOD'});
 }
});
test('unallocated initial margin, wrong lot and aggregate position cap fail',()=>{
 const d=diary();d.open();d.buy('0.01','100000');assert.throws(()=>run(d),{code:'INITIAL_MARGIN_NOT_ALLOCATED'});
 const odd=basic();odd.buy('0.00015','100000');assert.throws(()=>run(odd),{code:'INVALID_FILL_PRECISION_OR_INSTRUMENT'});
 const huge=diary();huge.open('100000000');huge.margin('50000000');huge.buy('1000','100000');huge.buy('201','100000');assert.throws(()=>run(huge),{code:'POSITION_LIMIT_EXCEEDED'});
});
test('initial and maintenance requirements move to the EEA tier at its boundary',()=>{
 const d=diary();d.open('10000000');d.margin('6000000');d.buy('300','100000');const r=run(d);
 assert.equal(r.margin.initialRequiredUSD,'6000000');assert.equal(r.margin.maintenanceRequiredUSD,'3000000');
 d.events[1].facts.amountUSD='3000000';assert.throws(()=>run(d),{code:'INITIAL_MARGIN_NOT_ALLOCATED'});
});
test('withdrawals and margin transfers cannot create negative settled cash',()=>{
 for(const [type,amount]of [['capital_withdrawal','2001'],['margin_add','2001'],['margin_remove','1']]){const d=diary();d.open();d.cash(type,amount,type==='margin_add'?{purpose:'additional'}:{});assert.throws(()=>run(d));}
});
test('reserves are overlays on wallet cash, never extra equity or artificial negative spending',()=>{
 const d=basic(),r=run(d,{reservations:{ordersUSD:'500',marginUSD:'400',protectedUSD:'500'}});
 assert.equal(r.cash.spendableUSD,'500');assert.equal(r.pnl.totalEquityUSD,'2000');
 const short=run(d,{reservations:{ordersUSD:'2000',marginUSD:'0',protectedUSD:'100'}});assert.equal(short.cash.unfundedReservationsUSD,'200');assert.equal(short.cash.spendableUSD,'0');assert.equal(short.cash.walletUSD,'1900');
});
test('replay sorts by effective trading time and revision, rejecting sale before purchase',()=>{
 const d=basic();d.sell('0.01','100000',{cycle:'cycle-1'});d.events.at(-1).effective_at='2026-10-20T23:34:00Z';assert.throws(()=>run(d));
 const valid=basic(),r=run(valid);valid.events.reverse();assert.deepEqual(run(valid),r);
});
test('duplicate IDs, revision and idempotency keys are rejected',()=>{
 for(const field of ['id','revision','idempotency_key']){const d=basic();d.events[2][field]=d.events[1][field];assert.throws(()=>run(d));}
 const d=basic();d.events.push({...d.events[2],id:d.events[2].id.toUpperCase(),revision:'4',idempotency_key:'new'});assert.throws(()=>run(d),{code:'DUPLICATE_OR_INVALID_EVENT_ID'});
});
test('scope, schema and unreviewed legacy events cannot leak into a reconstructed position',()=>{
 for(const patch of [{owner_id:UUID(999)},{project_id:UUID(999)},{scenario_key:'demo_long'},{origin:'legacy_demo'},{schema_version:2},{event_type:'correction'}]){const d=basic();Object.assign(d.events[2],patch);assert.throws(()=>run(d));}
 assert.throws(()=>run(basic(),{scenarioKey:'legacy_descida'}),{code:'UNREVIEWED_LEGACY_SCENARIO'});
});
test('financial numbers, hidden trade fees and future executions require explicit valid facts',()=>{
 for(const value of [500,'1e3','NaN','Infinity','-0','1,2','0.0000000000000000001']){const d=basic();d.events[0].facts.amountUSD=value;assert.throws(()=>run(d));}
 const d=basic();d.events[2].facts.feeUSD='1';assert.throws(()=>run(d),{code:'INVALID_FACT_FIELDS'});
 const future=basic();future.events[2].effective_at='2026-10-21T12:00:00Z';assert.throws(()=>run(future),{code:'FUTURE_EVENT_REQUIRES_PLAN'});
});
test('stale rules and non-mark prices cannot masquerade as current contract data',()=>{
 assert.throws(()=>run(basic(),{valuation:{kind:'synthetic',source:'test',markPriceUSD:'100000',asOf:'2026-10-22T00:00:00Z'}}),{code:'RULES_OUT_OF_SCOPE_OR_STALE'});
 assert.throws(()=>run(basic(),{valuation:{kind:'spot',source:'elsewhere',markPriceUSD:'100000',asOf:'2026-10-20T23:40:00Z'}}),{code:'MARK_PRICE_REQUIRED'});
});
test('a non-USD movement cannot silently enter the USD book',()=>{
 const d=basic();d.events[0].facts.currency='EUR';assert.throws(()=>run(d),{code:'UNSUPPORTED_CURRENCY'});
});
test('extra trailing decimal zeroes preserve values without accepting off-tick fills',()=>{
 const d=basic();d.events[2].facts.quantityBTC='0.010000000000000000';d.events[2].facts.priceUSD='100000.000000000000000000';assert.equal(run(d).position.quantityBTC,'0.01');
});
test('mark breaches do not invent a liquidation execution or promise safety',()=>{
 const r=run(basic(),{valuation:{kind:'synthetic',source:'test',markPriceUSD:'90000',asOf:'2026-10-20T23:40:00Z'}});
 assert.equal(r.margin.maintenanceStatus,'breached');assert.equal(r.position.quantityBTC,'0.01');assert.equal(r.margin.estimatedLiquidationUSD,null);assert.equal(r.recommendationsAllowed,false);assert.equal(r.ordersAllowed,false);
});
test('output is immutable, caller facts unchanged and Decimal global configuration cannot change calculations',()=>{
 const d=basic(),original=structuredClone(d.events),a=run(d);assert.deepEqual(d.events,original);assert.ok(Object.isFrozen(a.position));
 assert.throws(()=>{a.cash.walletUSD='0'},TypeError);const precision=Decimal.precision;Decimal.set({precision:3});try{assert.deepEqual(run(d),a)}finally{Decimal.set({precision})}
});
test('property: 100 complete portfolios match an independent integer cash-flow oracle',()=>{
 function fixed(value){const sign=value<0n?'-':'';value=value<0n?-value:value;return sign+(value/10000n)+'.'+String(value%10000n).padStart(4,'0');}
 const canonical=value=>fixed(value).replace(/0+$/,'').replace(/\.$/,'');
 let seed=227n;
 for(let n=0;n<100;n++){
  const d=diary();d.open('20000');d.margin('10000');let spent=0n,totalLots=0n;const allocations=[];
  for(let cycle=1;cycle<=4;cycle++){
   seed=(seed*48271n)%2147483647n;const lots=seed%100n+1n,price=70000n+seed%30000n;
   d.buy(fixed(lots),String(price),'cycle-'+cycle);spent+=lots*price;totalLots+=lots;allocations.push({cycle:'cycle-'+cycle,quantityBTC:fixed(lots)});
  }
  const exit=90000n+seed%30000n;d.sell(fixed(totalLots),String(exit),{allocations});
  d.add('fee',{amountUSD:'0.125',currency:'USD',category:'other'});d.add('funding',{amountUSD:'0.075',currency:'USD',direction:'received',settlementId:'settlement'});d.cash('margin_remove','10000');
  const r=run(d),net=totalLots*exit-spent-500n;
  assert.equal(r.pnl.realizedGrossUSD,canonical(totalLots*exit-spent));assert.equal(r.cash.walletUSD,canonical(200000000n+net));
  assert.equal(r.position.remainingBasisUSD,'0');assert.equal(r.position.quantityBTC,'0');assert.equal(r.cash.isolatedMarginUSD,'0');
 }
});
test('100 repeated thirds-based closes retain aggregate basis and exact final settlement',()=>{
 const d=diary();d.open('50000');d.margin('10000');
 for(let i=0;i<100;i++){d.buy('0.0001','100000');d.buy('0.0002','90000');d.sell('0.0001','110000');d.sell('0.0002','110000');}
 const r=run(d);assert.equal(r.position.remainingBasisUSD,'0');assert.equal(r.position.quantityBTC,'0');assert.equal(r.pnl.realizedGrossUSD,'500');assert.equal(r.pnl.totalEquityUSD,'50500');
});
test('thousands of facts reconstruct deterministically without an artificial money drift',()=>{
 const d=diary();d.open('10000');
 for(let n=0;n<1250;n++){d.cash('capital_deposit','0.01');d.cash('capital_withdrawal','0.01');}
 const a=run(d),b=run(d);assert.deepEqual(a,b);assert.equal(a.cash.walletUSD,'10000');assert.equal(a.capital.addedUSD,'12.5');assert.equal(a.capital.withdrawnUSD,'12.5');
});
test('browser module has no network or storage dependency',()=>{
 const sandbox={Decimal,BTCKrakenRules:require('../kraken-rules.js'),BTCJournalProjection:require('../journal-projection.js')};vm.runInNewContext(fs.readFileSync('financial-engine.js','utf8'),sandbox);
 assert.equal(typeof sandbox.BTCFinancialEngine.reconstruct,'function');assert.equal(sandbox.BTCFinancialEngine.reconstruct({projectId,ownerId,scenarioKey:'manual_long',platform:'europa',clientType:'retail',rules,valuation:{kind:'synthetic',source:'test',markPriceUSD:'100000',asOf:'2026-10-20T23:40:00Z'},events:basic().events}).cash.walletUSD,'1900');
});
test('combined reconstruction validates every event and detaches the effective journal',()=>{
 const f=require('./helpers/cycle-fixture.cjs'),input=f.input(),before=structuredClone(input),combined=engine.reconstructWithEvents(input);
 assert.deepEqual(combined.ledger,engine.reconstruct(input));assert.deepEqual(combined.effectiveEvents,engine.effectiveEvents(input));
 assert(Object.isFrozen(combined)&&Object.isFrozen(combined.effectiveEvents)&&Object.isFrozen(combined.effectiveEvents[0].facts));
 assert.equal(Object.isFrozen(input.events[0].facts),false);input.events[0].facts.amountUSD='999';assert.equal(combined.effectiveEvents[0].facts.amountUSD,before.events[0].facts.amountUSD);
 for(const change of [x=>x.events.push(structuredClone(x.events[0])),x=>x.events[0].owner_id=f.uuid(99),x=>x.events[0].facts.amountUSD='-1']){
  const bad=structuredClone(before);change(bad);let expected;try{engine.reconstruct(bad);}catch(e){expected=e.code;}assert(expected);assert.throws(()=>engine.reconstructWithEvents(bad),e=>e.code===expected);assert.throws(()=>engine.effectiveEvents(bad),e=>e.code===expected);
 }
});

test('prepared valuations match full replay with exact partial-sale basis and detached source facts',()=>{
 const d=diary();d.open('50000');d.margin('500');d.buy('0.003','100000');d.buy('0.004','100001');d.sell('0.001','100002');
 const input={projectId,ownerId,scenarioKey:'manual_long',platform:'europa',clientType:'retail',rules:JSON.parse(JSON.stringify(rules)),events:d.events,includeTrace:true,reservations:{ordersUSD:'10',marginUSD:'20',protectedUSD:'30'},valuation:{kind:'synthetic',source:'QA',markPriceUSD:'100000',asOf:'2026-10-20T23:40:00Z'}};
 const original=JSON.parse(JSON.stringify(input)),prepared=engine.prepareValuations(input);
 assert.deepEqual(prepared.ledger,engine.reconstruct(original));
 input.events.length=0;input.reservations.ordersUSD='999';input.ruleScenario={mode:'invalid'};input.platform='invalid';input.rules.version='changed';
 for(const price of ['0.1','99999.9','100000','123456.7']){
  const valuation={kind:'synthetic',source:'repricing-QA',markPriceUSD:price,asOf:'2026-10-20T23:40:01Z'};
  assert.deepEqual(prepared.atValuation(valuation),engine.reconstruct({...original,valuation}));
 }
 assert.deepEqual(prepared.ledger,engine.reconstruct(original));
});
test('prepared valuations enforce price, time and rule expiry without admitting new journal facts',()=>{
 const d=basic(),input={projectId,ownerId,scenarioKey:'manual_long',platform:'europa',clientType:'retail',rules,events:d.events,valuation:{kind:'synthetic',source:'QA',markPriceUSD:'100000',asOf:'2026-10-20T23:40:00Z'}};
 const p=engine.prepareValuations(input);
 for(const valuation of [{...input.valuation,markPriceUSD:'0'},{...input.valuation,source:''},{...input.valuation,asOf:'2026-10-20T23:39:59Z'},{...input.valuation,asOf:'2030-01-01T00:00:00Z'}])assert.throws(()=>p.atValuation(valuation));
 const frozen={...input,ruleScenario:{mode:'frozen-rules-synthetic',referenceAt:input.valuation.asOf}},frozenPrepared=engine.prepareValuations(frozen),valuation={...input.valuation,asOf:'2030-01-01T00:00:00Z'};
 assert.deepEqual(frozenPrepared.atValuation(valuation),engine.reconstruct({...frozen,valuation}));
 assert.throws(()=>frozenPrepared.atValuation({...valuation,kind:'public_mark'}),/INVALID_RULE_SCENARIO/);
 const invalid=JSON.parse(JSON.stringify(input));invalid.events.push({...invalid.events[0]});assert.throws(()=>engine.prepareValuations(invalid),/DUPLICATE_OR_INVALID_EVENT_ID/);
});

test('repeated timestamp strings do not hide invalid dates, future facts or changes between replays',()=>{
 const d=basic();const original=run(d);assert.equal(original.journal.sourceEventCount,3);
 for(const field of ['effective_at','recorded_at'])for(const invalid of ['2026-10-20T23:35:00+00:00','2026-02-30T23:35:00Z','2026-10-20T23:35:00.0000Z']){const bad={events:structuredClone(d.events)};bad.events[2][field]=invalid;assert.throws(()=>run(bad),/INVALID_TIMESTAMP/);}
 const future={events:structuredClone(d.events)};future.events[2].effective_at='2026-10-20T23:40:01Z';assert.throws(()=>run(future),/FUTURE_EVENT_REQUIRES_PLAN/);
 d.events[2].effective_at='invalid-after-first-replay';assert.throws(()=>run(d),/INVALID_TIMESTAMP/);
});
