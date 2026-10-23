'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const W=require('../correction-workflow.js'),Core=require('../financial-engine.js'),J=require('../journal-projection.js'),Risk=require('../position-risk.js'),Cycles=require('../cycle-planner.js'),Cash=require('../cash-workflow.js'),f=require('./helpers/cycle-fixture.cjs');
function opened(){const i=f.input();i.events.push(f.event(2,'margin_add',{amountUSD:'1000',currency:'USD',purpose:'initial'}),f.event(3,'trade_buy',{symbol:'PF_XBTUSD',executionStatus:'executed',quantityBTC:'0.005',priceUSD:'100000',cycle:'cycle-1'}));return i;}
const change=(i,action='replace',patch={})=>({id:f.uuid(900),idempotencyKey:'fix-900',targetEventId:i.events[2].id,expectedVersion:'1',action,reason:'Corrigir registo manual',...(action==='replace'?{record:{facts:{...i.events[2].facts,quantityBTC:'0.0005'},effective_at:i.events[2].effective_at}}:{}),...patch});
const request=(i,changes=[change(i)])=>({expectedRevision:i.events.reduce((m,e)=>BigInt(e.revision)>BigInt(m)?e.revision:m,'0'),recordedAt:f.now,changes});
const confirm=(i,r,options={})=>W.confirm(i,r,{confirmedReviewHash:r.reviewHash,...options});
async function applied(i,changes=[change(i)],options={}){return (await confirm(i,await W.prepare(i,request(i,changes),options),options)).nextInput;}
function sell(i,q='0.003'){i.events.push(f.event(i.events.length+1,'trade_sell',{symbol:'PF_XBTUSD',executionStatus:'executed',quantityBTC:q,priceUSD:'110000',cycle:'cycle-1',pnlDestination:'wallet'}));}
function fee(i){i.events.push(f.event(i.events.length+1,'fee',{amountUSD:'0.25',currency:'USD',category:'trading',tradeEventId:i.events[2].id}));}
test('500 USD entry corrected to 50 USD appends a version without changing cash or margin',async()=>{
 const i=opened(),original=structuredClone(i),r=await W.prepare(i,request(i));assert.equal(r.before.ledger.position.remainingBasisUSD,'500');assert.equal(r.after.ledger.position.remainingBasisUSD,'50');assert.equal(r.after.ledger.position.quantityBTC,'0.0005');assert.equal(r.after.ledger.cash.walletUSD,'1000');assert.equal(r.after.ledger.cash.isolatedMarginUSD,'1000');assert.equal(r.canConfirm,true);
 const saved=await confirm(i,r);assert.equal(saved.status,'prepared-for-persistence');assert.equal(saved.databaseWritten,false);assert.equal(saved.exchangeTradeChanged,false);assert.deepEqual(saved.nextInput.events.slice(0,3),original.events);assert.deepEqual(i,original);assert.equal(saved.nextInput.events.length,4);assert.equal(r.affectedRecords[0].version,'2');assert.equal(r.affectedRecords[0].state.record.facts.quantityBTC,'0.0005');
});
test('price correction recomputes weighted average, realized and unrealized PnL independently',async()=>{
 const i=opened();sell(i,'0.002');const c=change(i);c.record.facts={...i.events[2].facts,priceUSD:'90000'};const r=await W.prepare(i,request(i,[c]));assert.equal(r.after.ledger.position.averageEntryUSD,'90000');assert.equal(r.after.ledger.pnl.realizedGrossUSD,'40');assert.equal(r.after.ledger.pnl.unrealizedGrossUSD,'30');assert.equal(r.after.ledger.cash.walletUSD,'1040');assert.equal(r.after.ledger.pnl.totalEquityUSD,'2070');
});
test('old quantity correction that leaves a later sale uncovered is blocked at that sale',async()=>{
 const i=opened();sell(i);const r=await W.prepare(i,request(i));assert.equal(r.canConfirm,false);assert.equal(r.blocking.code,'SELL_EXCEEDS_AVAILABLE_BTC');assert.equal(r.blocking.eventId,i.events[3].id);await assert.rejects(()=>confirm(i,r),{code:'CORRECTION_INCONSISTENT_HISTORY'});assert.equal(i.events.length,4);
});
test('a coherent batch fixes earlier buy and dependent later sale atomically',async()=>{
 const i=opened();sell(i);const s={...change(i),id:f.uuid(901),idempotencyKey:'fix-sale',targetEventId:i.events[3].id,record:{facts:{...i.events[3].facts,quantityBTC:'0.0003'},effective_at:i.events[3].effective_at}};const r=await W.prepare(i,request(i,[change(i),s]));assert.equal(r.canConfirm,true);assert.equal(r.after.ledger.position.quantityBTC,'0.0002');assert.equal(r.after.ledger.pnl.realizedGrossUSD,'3');assert.equal((await confirm(i,r)).appendedEvents.length,2);
});
test('voiding a duplicate purchase preserves its original and removes it from active exposure',async()=>{
 const i=opened();i.events.push({...f.event(4,'trade_buy',structuredClone(i.events[2].facts))});const n=await applied(i,[change(i,'void',{targetEventId:i.events[3].id})]);assert.equal(Core.reconstruct(n).position.quantityBTC,'0.005');assert.equal(n.events.length,5);assert.equal(Core.effectiveEvents(n).some(e=>e.id===i.events[3].id),false);
});
test('void buy with a linked fee requires explicit fee resolution',async()=>{
 const i=opened();fee(i);const r=await W.prepare(i,request(i,[change(i,'void')]));assert.equal(r.canConfirm,false);assert.equal(r.blocking.code,'FEE_TRADE_REFERENCE_REQUIRED');
 const other=change(i,'void',{id:f.uuid(901),idempotencyKey:'void-fee',targetEventId:i.events[3].id});const n=await applied(i,[change(i,'void'),other]);assert.equal(Core.reconstruct(n).pnl.feesPaidUSD,'0');assert.equal(Core.reconstruct(n).position.quantityBTC,'0');
});
test('void sale restores BTC and reverses realized PnL only in local reconstruction',async()=>{
 const i=opened();sell(i);const r=await W.prepare(i,request(i,[change(i,'void',{targetEventId:i.events[3].id})]));assert.equal(r.after.ledger.position.quantityBTC,'0.005');assert.equal(r.after.ledger.pnl.realizedGrossUSD,'0');assert.equal(r.after.ledger.cash.walletUSD,'1000');assert.equal(r.exchangeTradeChanged,false);
});
test('a fee correction does not silently recompute an independently recorded fee',async()=>{
 const i=opened();fee(i);const n=await applied(i);assert.equal(Core.reconstruct(n).pnl.feesPaidUSD,'0.25');const c=change(n,'replace',{id:f.uuid(901),idempotencyKey:'fee-correction',targetEventId:n.events[3].id,record:{facts:{...n.events[3].facts,amountUSD:'0.025'},effective_at:n.events[3].effective_at}});const r=await W.prepare(n,request(n,[c]));assert.equal(r.after.ledger.pnl.feesPaidUSD,'0.025');assert.equal(r.after.ledger.cash.walletUSD,'999.975');
});
test('correcting a funding settlement is applied once and survives later replay',async()=>{
 const i=opened();i.events.push(f.event(4,'funding',{amountUSD:'2',currency:'USD',direction:'paid',settlementId:'period-1'}));const c=change(i,'replace',{targetEventId:i.events[3].id,record:{facts:{...i.events[3].facts,amountUSD:'1',direction:'received'},effective_at:i.events[3].effective_at}});const n=await applied(i,[c]);assert.equal(Core.reconstruct(n).pnl.fundingNetUSD,'1');assert.equal(Core.reconstruct(n).cash.walletUSD,'1001');assert.deepEqual(Core.reconstruct(n),Core.reconstruct(n));
});
test('date correction replays chronologically and blocks a sale moved before its buy',async()=>{
 const i=opened();sell(i);const c=change(i,'replace',{targetEventId:i.events[3].id,record:{facts:i.events[3].facts,effective_at:'2026-10-20T23:34:59Z'}});const r=await W.prepare(i,request(i,[c]));assert.equal(r.canConfirm,false);assert.ok(r.blocking.code);
});
test('a later corrected buy can leave a linked fee chronologically invalid',async()=>{
 const i=opened();fee(i);const c=change(i);c.record.facts=i.events[2].facts;c.record.effective_at='2026-10-20T23:36:00Z';const r=await W.prepare(i,request(i,[c]));assert.equal(r.canConfirm,false);assert.equal(r.blocking.code,'FEE_TRADE_REFERENCE_REQUIRED');
});
test('restore and reversal are new events, preserving every earlier correction',async()=>{
 const i=opened(),voided=await applied(i,[change(i,'void')]);const restore=change(voided,'restore',{id:f.uuid(901),idempotencyKey:'restore',expectedVersion:'2'}),restored=await applied(voided,[restore]);assert.equal(Core.reconstruct(restored).position.quantityBTC,'0.005');
 const undo=change(restored,'revert',{id:f.uuid(902),idempotencyKey:'undo',expectedVersion:'3',reversesCorrectionId:f.uuid(901)}),n=await applied(restored,[undo]);assert.equal(Core.reconstruct(n).position.quantityBTC,'0');assert.equal(n.events.length,6);assert.equal(J.project(n.events).records[2].version,'4');
});
test('reversing a replacement restores the original while preserving audit versions',async()=>{
 const i=opened(),n=await applied(i);const u=change(n,'revert',{id:f.uuid(901),idempotencyKey:'undo',expectedVersion:'2',reversesCorrectionId:f.uuid(900)});const restored=await applied(n,[u]);assert.equal(Core.reconstruct(restored).position.remainingBasisUSD,'500');assert.equal(restored.events[3].facts.next.record.facts.quantityBTC,'0.0005');
});
test('reversal of a nonlatest correction is rejected',async()=>{
 const i=opened(),n=await applied(i);const c=change(n,'replace',{id:f.uuid(901),idempotencyKey:'second',expectedVersion:'2',record:{facts:{...i.events[2].facts,quantityBTC:'0.001'},effective_at:i.events[2].effective_at}});const m=await applied(n,[c]);const u=change(m,'revert',{id:f.uuid(902),idempotencyKey:'bad-undo',expectedVersion:'3',reversesCorrectionId:f.uuid(900)});await assert.rejects(()=>W.prepare(m,request(m,[u])),{code:'INVALID_CORRECTION_REVERSAL'});
});
test('idempotent retry appends no second correction and detects changed requests',async()=>{
 const i=opened(),req=request(i),n=await applied(i);const r=await W.prepare(n,req);assert.equal(r.status,'already-recorded');assert.equal(r.appendedEvents.length,0);assert.equal((await confirm(n,r)).nextInput.events.length,4);req.changes[0].record.facts.quantityBTC='0.001';await assert.rejects(()=>W.prepare(n,req),{code:'CORRECTION_IDEMPOTENCY_CONFLICT'});
});
test('partial duplicate batch is refused rather than silently replaying remaining corrections',async()=>{
 const i=opened(),req=request(i),n=await applied(i);req.changes.push(change(n,'void',{id:f.uuid(901),idempotencyKey:'other',expectedVersion:'2'}));await assert.rejects(()=>W.prepare(n,req),{code:'CORRECTION_IDEMPOTENCY_CONFLICT'});
});
test('concurrent reviews conflict after one has been applied to local facts',async()=>{
 const i=opened(),a=await W.prepare(i,request(i)),b=await W.prepare(i,request(i,[change(i,'void',{id:f.uuid(901),idempotencyKey:'other'})]));const n=(await confirm(i,a)).nextInput;await assert.rejects(()=>confirm(n,b),{code:'CORRECTION_REVIEW_STALE'});
});
test('confirmation, tamper detection and full plan/valuation basis are mandatory',async()=>{
 const i=opened(),plan=f.plan(),r=await W.prepare(i,request(i),{plan});await assert.rejects(()=>W.confirm(i,r,{plan}),{code:'EXPLICIT_CORRECTION_CONFIRMATION_REQUIRED'});const bad=structuredClone(r);bad.after.ledger.cash.walletUSD='999999';await assert.rejects(()=>confirm(i,bad,{plan}),{code:'CORRECTION_REVIEW_TAMPERED'});
 const changed=structuredClone(i);changed.valuation.markPriceUSD='99000';await assert.rejects(()=>confirm(changed,r,{plan}),{code:'CORRECTION_REVIEW_STALE'});plan.version='2';await assert.rejects(()=>confirm(i,r,{plan}),{code:'CORRECTION_REVIEW_STALE'});
});
test('owner and scenario scope cannot be changed by a correction',async()=>{
 const i=opened(),n=await applied(i);for(const key of ['owner_id','project_id']){const bad=structuredClone(n);bad.events[3][key]=f.uuid(666);assert.throws(()=>Core.reconstruct(bad),{code:'EVENT_SCOPE_MISMATCH'});}const bad=structuredClone(n);bad.events[3].origin='demo';assert.throws(()=>Core.reconstruct(bad),{code:'EVENT_ORIGIN_MISMATCH'});
});
test('incorrect previous values and stale target versions are rejected by replay itself',async()=>{
 const i=opened(),n=await applied(i);const bad=structuredClone(n);bad.events[3].facts.previous.record.facts.quantityBTC='0.006';assert.throws(()=>Core.reconstruct(bad),{code:'CORRECTION_BEFORE_MISMATCH'});const c=change(n,'void',{id:f.uuid(901),idempotencyKey:'stale'});await assert.rejects(()=>W.prepare(n,request(n,[c])),{code:'CORRECTION_VERSION_CONFLICT'});
});
test('cannot correct capital or margin through the trade correction API',async()=>{
 const i=opened();for(const targetEventId of [i.events[0].id,i.events[1].id])await assert.rejects(()=>W.prepare(i,request(i,[change(i,'void',{targetEventId})])),{code:'CORRECTION_TARGET_UNSUPPORTED'});
});
test('trade identity, contract, precision and execution status remain validated',async()=>{
 for(const patch of [{symbol:'OTHER'},{quantityBTC:'0.00015'},{priceUSD:'-1'},{executionStatus:'pending'},{hiddenFee:'1'}]){const i=opened(),c=change(i);Object.assign(c.record.facts,patch);const r=await W.prepare(i,request(i,[c]));assert.equal(r.canConfirm,false);}
});
test('a trade cannot change type or be edited to a future execution',async()=>{
 const i=opened(),c=change(i);c.record.event_type='trade_sell';await assert.rejects(()=>W.prepare(i,request(i,[c])),{code:'INVALID_CORRECTION_REQUEST'});delete c.record.event_type;c.record.effective_at='2026-10-21T00:00:00Z';await assert.rejects(()=>W.prepare(i,request(i,[c])),{code:'FUTURE_CORRECTED_EXECUTION'});
});
test('recording time, reason and request shape cannot be omitted or malformed',async()=>{
 const i=opened();for(const reason of ['', 'ab', 'bad\nreason'])await assert.rejects(()=>W.prepare(i,request(i,[change(i,'void',{reason})])));const r=request(i);r.recordedAt='2026-10-20T23:34:00Z';await assert.rejects(()=>W.prepare(i,r),{code:'CORRECTION_RECORDING_ORDER'});r.recordedAt='2026-10-22T00:00:00Z';await assert.rejects(()=>W.prepare(i,r),{code:'FUTURE_CORRECTION'});
});
test('an imported exchange reference is preserved as local metadata, never an exchange action',async()=>{
 const i=opened();i.events[2].external_execution_id='manual-reference-kraken-42';const n=await applied(i);const row=J.project(n.events).records[2];assert.equal(row.original.external_execution_id,'manual-reference-kraken-42');assert.equal(Core.effectiveEvents(n)[2].external_execution_id,'manual-reference-kraken-42');assert.equal(row.exchangeTradeChanged,false);
});
test('stale rules allow bookkeeping corrections and explicitly withhold risk',async()=>{
 const i=opened();i.valuation.asOf='2026-10-22T00:00:00Z';const req=request(i);req.recordedAt=i.valuation.asOf;const r=await W.prepare(i,req);assert.equal(r.canConfirm,true);assert.equal(r.after.risk.status,'unavailable-stale-rules');assert.equal(r.after.ledger.position.quantityBTC,'0.0005');
});
test('changing a cycle preserves the common position and requires plan link review',async()=>{
 const i=opened(),plan=f.plan();plan.configuration.cycleInventory=[{cycle:'cycle-1',entries:[{stage:1,fillEventIds:[i.events[2].id]}]}];const c=change(i);c.record.facts={...i.events[2].facts,cycle:'cycle-5'};const r=await W.prepare(i,request(i,[c]),{plan});assert.equal(r.after.ledger.position.cycles[0].cycle,'cycle-5');assert.equal(r.inventoryImpact[0].status,'cycle-changed');assert.equal(r.planReviewRequired,true);assert.equal(r.newCycleCount,null);assert.equal(r.after.ledger.position.quantityBTC,'0.005');
});
test('a corrected cycle allocation cannot silently invalidate a later sale',async()=>{
 const i=opened();sell(i);const c=change(i);c.record.facts={...i.events[2].facts,cycle:'cycle-5'};const r=await W.prepare(i,request(i,[c]));assert.equal(r.canConfirm,false);assert.equal(r.blocking.code,'SELL_EXCEEDS_AVAILABLE_BTC');
});
test('cycle planner uses corrected fills and preserves original plus corrected cycle numbers',async()=>{
 const i=opened(),c=change(i);c.record.facts={...i.events[2].facts,cycle:'cycle-5'};const n=await applied(i,[c]);const p=f.plan(),policy={...f.policy(),maxCycles:2};const result=Cycles.generate(n,p,policy);assert.ok(result.candidateInventory.every(x=>!['cycle-1','cycle-5'].includes(x.cycle)));assert.ok(result.candidateInventory.some(x=>x.cycle==='cycle-6'));
});
test('cash workflow and risk consume the same corrected position',async()=>{
 const i=opened(),n=await applied(i);const req={id:f.uuid(950),idempotencyKey:'deposit-after-fix',expectedRevision:'4',kind:'capital_deposit',mode:'recorded',amountUSD:'500',currency:'USD',effectiveAt:f.now,recordedAt:f.now};const r=await Cash.prepareMovement(n,f.plan(),req);assert.equal(r.after.ledger.position.quantityBTC,'0.0005');assert.equal(r.after.ledger.capital.netContributedUSD,'2500');assert.equal(r.after.ledger.cash.isolatedMarginUSD,'1000');assert.deepEqual(r.before.risk,r.after.risk);assert.equal(Risk.estimate(n).officialKrakenPrice,false);
});
test('review results are frozen and snapshot inputs before awaiting hashes',async()=>{
 const i=opened(),req=request(i),promise=W.prepare(i,req);req.changes[0].record.facts.quantityBTC='0.004';i.events[2].facts.quantityBTC='0.004';const r=await promise;assert.equal(r.after.ledger.position.quantityBTC,'0.0005');assert.equal(r.before.ledger.position.quantityBTC,'0.005');assert.equal(Object.isFrozen(r.affectedRecords[0]),true);
});
test('property: 60 corrected complete portfolios match an independent integer PnL oracle',async()=>{
 for(let n=1;n<=60;n++){const i=opened();i.events[2].facts.quantityBTC='0.01';sell(i,'0.01');const price=80000+n*100;const c=change(i);c.record.facts={...i.events[2].facts,priceUSD:String(price)};const r=await W.prepare(i,request(i,[c]));const pnl=1100-price/100;assert.equal(r.after.ledger.pnl.realizedGrossUSD,String(pnl));assert.equal(r.after.ledger.position.quantityBTC,'0');assert.equal(r.after.ledger.cash.walletUSD,String(1000+pnl));assert.equal(r.after.ledger.pnl.totalEquityUSD,String(2000+pnl));}
});
test('reversing correction order in the array preserves revision-based reconstruction',async()=>{
 const n=structuredClone(await applied(opened()));const expected=Core.reconstruct(n);n.events.reverse();assert.deepEqual(Core.reconstruct(n),expected);
});
test('browser UMD supports reviewed corrections with no network, storage or account access',async()=>{
 const ctx=vm.createContext({Decimal:require('decimal.js'),crypto:require('node:crypto').webcrypto,TextEncoder,URL});for(const name of ['kraken-rules.js','journal-projection.js','financial-engine.js','position-risk.js','correction-workflow.js'])vm.runInContext(fs.readFileSync(require.resolve('../'+name),'utf8'),ctx);ctx.payload=JSON.stringify({input:opened(),request:request(opened())});const r=await vm.runInContext('(()=>{const p=JSON.parse(payload);return BTCCorrectionWorkflow.prepare(p.input,p.request)})()',ctx);assert.equal(r.after.ledger.position.quantityBTC,'0.0005');assert.equal(r.exchangeTradeChanged,false);
});
test('voiding a sale cannot erase profit already withdrawn without a coherent cash history',async()=>{
 const i=opened();sell(i,'0.005');i.events.push(f.event(5,'capital_withdrawal',{amountUSD:'1040',currency:'USD'}));const r=await W.prepare(i,request(i,[change(i,'void',{targetEventId:i.events[3].id})]));assert.equal(r.canConfirm,false);assert.equal(r.blocking.code,'INSUFFICIENT_WALLET');assert.equal(r.blocking.eventId,i.events[4].id);
});
test('quantity increases must still satisfy initial margin at the historical buy',async()=>{
 const i=opened(),c=change(i);c.record.facts.quantityBTC='0.11';const r=await W.prepare(i,request(i,[c]));assert.equal(r.canConfirm,false);assert.equal(r.blocking.code,'INITIAL_MARGIN_NOT_ALLOCATED');
});
test('correction of a fee cannot spend more settled cash than exists',async()=>{
 const i=opened();fee(i);const c=change(i,'replace',{targetEventId:i.events[3].id,record:{facts:{...i.events[3].facts,amountUSD:'1001'},effective_at:i.events[3].effective_at}});const r=await W.prepare(i,request(i,[c]));assert.equal(r.canConfirm,false);assert.equal(r.blocking.code,'INSUFFICIENT_WALLET');
});
test('no-op replacement, repeated void and invalid restore are refused',async()=>{
 const i=opened(),c=change(i);c.record.facts=structuredClone(i.events[2].facts);await assert.rejects(()=>W.prepare(i,request(i,[c])),{code:'INVALID_REPLACEMENT'});await assert.rejects(()=>W.prepare(i,request(i,[change(i,'restore')])),{code:'INVALID_RESTORE'});const n=await applied(i,[change(i,'void')]);await assert.rejects(()=>W.prepare(n,request(n,[change(n,'void',{id:f.uuid(901),idempotencyKey:'void-again',expectedVersion:'2'})])),{code:'INVALID_VOID'});
});
test('funding correction cannot duplicate another active settlement period',async()=>{
 const i=opened();for(let n=4;n<=5;n++)i.events.push(f.event(n,'funding',{amountUSD:'1',currency:'USD',direction:'paid',settlementId:'period-'+n}));const c=change(i,'replace',{targetEventId:i.events[4].id,record:{facts:{...i.events[4].facts,settlementId:'period-4'},effective_at:i.events[4].effective_at}});const r=await W.prepare(i,request(i,[c]));assert.equal(r.canConfirm,false);assert.equal(r.blocking.code,'DUPLICATE_OR_INVALID_FUNDING_PERIOD');
});
test('cycle fill links use corrected nominal, while a voided linked fill demands explicit remapping',async()=>{
 const i=opened(),n=await applied(i),p=f.plan();p.configuration.cycleInventory=[{cycle:'cycle-1',nominalBudgetUSD:'1000',entries:[1,2,3].map((stage,k)=>({stage,priceUSD:String(100000-1000*k),state:'closed',fillEventIds:k===0?[i.events[2].id]:[]}))}];const r=Cycles.generate(n,p,{...f.policy(),maxCycles:1});assert.equal(r.selected.cycles[0].entries[0].executedNominalUSD,'50');const v=await applied(i,[change(i,'void')]);assert.throws(()=>Cycles.generate(v,p,{...f.policy(),maxCycles:1}),{code:'INVALID_FILL_LINK'});
});
test('stress scenarios cannot replace a failed market action with a journal correction',async()=>{
 const i=opened(),n=await applied(i),e=structuredClone(n.events[3]);e.effective_at='2026-10-20T23:41:00Z';e.recorded_at=e.effective_at;assert.throws(()=>Risk.simulate(i,{steps:[{at:e.effective_at,transition:'continuous',markPriceUSD:'100000',actions:[{outcome:'filled',events:[e]}]}]}),{code:'JOURNAL_CORRECTION_NOT_A_MARKET_ACTION'});
});
test('thousands of untouched facts plus 60 correction versions reconstruct without drift',async()=>{
 const i=opened();for(let n=4;n<=1003;n++)i.events.push(f.event(n,'fee',{amountUSD:'0',currency:'USD',category:'other'}));let working=structuredClone(i);
 for(let n=1;n<=60;n++){const rows=J.project(working.events),row=rows.records[2],id=f.uuid(2000+n),next=structuredClone(row.state);next.record.facts.quantityBTC=n%2?'0.0005':'0.005';working.events.push({id,project_id:i.projectId,owner_id:i.ownerId,scenario_key:i.scenarioKey,origin:'manual',schema_version:1,revision:String(1003+n),idempotency_key:'load-'+n,event_type:'correction',effective_at:f.now,recorded_at:f.now,target_event_id:i.events[2].id,correction_reason:'Repeated load correction',facts:{action:'replace',expectedVersion:String(n),previous:row.state,next,reversesCorrectionId:null}});}
 const r=Core.reconstruct(working);assert.equal(r.position.quantityBTC,'0.005');assert.equal(r.cash.bookCashTotalUSD,'2000');assert.equal(r.pnl.feesPaidUSD,'0');assert.equal(r.journal.correctionCount,60);
});
test('oversized correction payloads are refused before preparing a database-bound event',async()=>{
 const i=opened(),c=change(i);c.record.facts.oversized='x'.repeat(64001);await assert.rejects(()=>W.prepare(i,request(i,[c])),{code:'CORRECTION_FACTS_TOO_LARGE'});
});
test('projection preserves the pre-optimization correction output and detaches immutable facts',()=>{
 const events=f.input().events;events.push(f.event(2,'trade_buy',{symbol:'PF_XBTUSD',executionStatus:'executed',quantityBTC:'0.001',priceUSD:'100000',cycle:'cycle-1'}));
 const previous={active:true,record:{facts:events[1].facts,effective_at:events[1].effective_at}},next={active:true,record:{facts:{...events[1].facts,quantityBTC:'0.002'},effective_at:events[1].effective_at}};
 events.push({...f.event(3,'correction',{expectedVersion:'1',action:'replace',previous,next,reversesCorrectionId:null}),effective_at:f.now,recorded_at:f.now,target_event_id:events[1].id,correction_reason:'Corrigir quantidade'});
 const result=J.project(events),serialized=J.canonical(result);
 assert.equal(require('node:crypto').createHash('sha256').update(serialized).digest('hex'),'130e74cd3ea012bf2e765d0f3a2319c7d1bb5351b814c3e9d506aa32da0e437e');
 assert.equal(Object.isFrozen(events[0].facts),false);assert.equal(Object.isFrozen(events[2].facts.next.record.facts),false);
 events[0].facts.amountUSD='1';events[2].facts.next.record.facts.quantityBTC='99';assert.equal(J.canonical(result),serialized);
 assert.throws(()=>{result.events[0].facts.amountUSD='1';},TypeError);assert.throws(()=>{result.records[1].state.record.facts.quantityBTC='99';},TypeError);
 const invalid=f.input().events;invalid[0].facts.hidden=NaN;assert.throws(()=>J.project(invalid),/INVALID_JOURNAL_JSON/);
});
test('transactional hypothetical suffix preserves the full corrected source projection',async()=>{const i=await applied(opened()),p=Core.prepareJournal(i),valuation={...i.valuation,asOf:'2026-10-20T23:41:00Z'},n=i.events.length+1,e={...f.event(n,'capital_deposit',{amountUSD:'50',currency:'USD'}),effective_at:valuation.asOf,recorded_at:valuation.asOf},action=p.beginAction(valuation),actual=action.append(e);assert.deepEqual(actual,Core.reconstruct({...i,events:[...i.events,e],valuation}));assert.equal(actual.journal.correctionCount,1);action.commit();});
