/* Block 8: explicit, hash-reviewed local journal corrections. No persistence. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('decimal.js'),require('./financial-engine.js'),require('./position-risk.js'),require('./journal-projection.js'),require('node:crypto').webcrypto);else root.BTCCorrectionWorkflow=factory(root.Decimal,root.BTCFinancialEngine,root.BTCPositionRisk,root.BTCJournalProjection,root.crypto);})(typeof globalThis!=='undefined'?globalThis:this,function(Decimal,Core,Risk,Journal,crypto){
 'use strict';
 const D=Decimal.clone({precision:80,rounding:Decimal.ROUND_HALF_EVEN}),UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,MAX=9223372036854775807n;
 const {canonical,clone,freeze}=Journal;
 class CorrectionError extends Error{constructor(code){super(code);this.name='CorrectionError';this.code=code;}}
 const need=(ok,code)=>{if(!ok)throw new CorrectionError(code);};
 function fields(o,required,optional=[]){need(o&&typeof o==='object'&&!Array.isArray(o)&&required.every(k=>Object.hasOwn(o,k))&&Object.keys(o).every(k=>required.includes(k)||optional.includes(k)),'INVALID_CORRECTION_REQUEST');}
 function rev(s,zero=false){need(typeof s==='string'&&(zero?/^(0|[1-9]\d{0,18})$/:/^[1-9]\d{0,18}$/).test(s)&&BigInt(s)<=MAX,'INVALID_CORRECTION_REVISION');return BigInt(s);}
 function instant(s){need(typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,19)===s.slice(0,19),'INVALID_CORRECTION_TIMESTAMP');return Date.parse(s);}
 const latest=i=>i.events.reduce((m,e)=>BigInt(e.revision)>m?BigInt(e.revision):m,0n).toString();
 async function hash(o){need(crypto?.subtle,'SECURE_CONTEXT_REQUIRED');const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(o)));return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');}
 function state(input){const ledger=Core.reconstruct({...input,bookkeepingOnly:true});return {ledger,risk:ledger.ruleAssessment.scopeReady?Risk.estimate(input):{status:'unavailable-stale-rules',estimatedPriceUSD:null,officialKrakenPrice:false}};}
 function validate(input,request){
  fields(request,['expectedRevision','recordedAt','changes']);rev(request.expectedRevision,true);need(instant(request.recordedAt)<=instant(input.valuation.asOf),'FUTURE_CORRECTION');
  need(Array.isArray(request.changes)&&request.changes.length>0&&request.changes.length<=100,'INVALID_CORRECTION_BATCH');
  const ids=new Set(),keys=new Set();
  for(const c of request.changes){
   fields(c,['id','idempotencyKey','targetEventId','expectedVersion','action','reason'],['record','reversesCorrectionId']);
   for(const k of ['id','targetEventId'])need(typeof c[k]==='string'&&UUID.test(c[k]),'INVALID_CORRECTION_ID');
   need(!ids.has(c.id.toLowerCase()),'DUPLICATE_CORRECTION_ID');ids.add(c.id.toLowerCase());
   need(typeof c.idempotencyKey==='string'&&c.idempotencyKey.trim().length>0&&c.idempotencyKey.length<=128&&!keys.has(c.idempotencyKey),'INVALID_CORRECTION_KEY');keys.add(c.idempotencyKey);
   rev(c.expectedVersion);need(['replace','void','restore','revert'].includes(c.action),'INVALID_CORRECTION_ACTION');
   need(typeof c.reason==='string'&&c.reason.trim().length>=3&&c.reason.length<=1000&&!/[\u0000-\u001f\u007f]/.test(c.reason),'CORRECTION_REASON_REQUIRED');
   if(c.action==='replace')fields(c.record,['facts','effective_at']);else need(c.record===undefined,'UNEXPECTED_REPLACEMENT');
   if(c.action==='revert')need(typeof c.reversesCorrectionId==='string'&&UUID.test(c.reversesCorrectionId),'REVERSAL_REFERENCE_REQUIRED');else need(c.reversesCorrectionId===undefined,'UNEXPECTED_REVERSAL_REFERENCE');
  }
 }
 function inventoryImpact(plan,projection){
  const rows=new Map(projection.records.map(r=>[r.original.id.toLowerCase(),r]));const result=[];
  for(const c of plan?.configuration?.cycleInventory||[])for(const e of c.entries||[])for(const id of e.fillEventIds||[]){const r=rows.get(id.toLowerCase());if(!r||!r.state.active||r.state.record.facts.cycle!==c.cycle)result.push({cycle:c.cycle,stage:e.stage,fillEventId:id,status:!r?'missing':!r.state.active?'voided':'cycle-changed'});}
  return result;
 }
 function delta(before,after){
  const values=[['walletUSD',before.ledger.cash.walletUSD,after.ledger.cash.walletUSD],['isolatedMarginUSD',before.ledger.cash.isolatedMarginUSD,after.ledger.cash.isolatedMarginUSD],['quantityBTC',before.ledger.position.quantityBTC,after.ledger.position.quantityBTC],['realizedGrossUSD',before.ledger.pnl.realizedGrossUSD,after.ledger.pnl.realizedGrossUSD],['feesPaidUSD',before.ledger.pnl.feesPaidUSD,after.ledger.pnl.feesPaidUSD],['fundingNetUSD',before.ledger.pnl.fundingNetUSD,after.ledger.pnl.fundingNetUSD],['totalEquityUSD',before.ledger.pnl.totalEquityUSD,after.ledger.pnl.totalEquityUSD]];
  return Object.fromEntries(values.map(([k,a,b])=>[k,new D(b).sub(a).toDecimalPlaces(24).toFixed()]));
 }
 function matches(e,c,request,index){
  return e.id.toLowerCase()===c.id.toLowerCase()&&e.idempotency_key===c.idempotencyKey&&e.target_event_id?.toLowerCase()===c.targetEventId.toLowerCase()&&e.recorded_at===request.recordedAt&&e.correction_reason===c.reason&&e.facts.action===c.action&&e.facts.expectedVersion===c.expectedVersion&&e.revision===(BigInt(request.expectedRevision)+BigInt(index)+1n).toString()&&e.facts.reversesCorrectionId===(c.reversesCorrectionId?.toLowerCase()||null)&&(c.action!=='replace'||canonical(e.facts.next.record)===canonical(c.record));
 }
 async function prepare(input,request,{plan=null}={}){
  input=clone(input);request=clone(request);plan=clone(plan);validate(input,request);
  if(plan)need(plan.projectId?.toLowerCase()===input.projectId.toLowerCase()&&plan.ownerId?.toLowerCase()===input.ownerId.toLowerCase()&&plan.scenarioKey===input.scenarioKey,'PLAN_SCOPE_MISMATCH');
  const before=state(input),basisRevision=latest(input),nextInput=clone(input),appended=[];
  const found=request.changes.map(c=>input.events.filter(e=>e.id.toLowerCase()===c.id.toLowerCase()||e.idempotency_key===c.idempotencyKey));
  const replayed=found.some(x=>x.length>0);
  if(replayed)need(found.every((x,i)=>x.length===1&&matches(x[0],request.changes[i],request,i)),'CORRECTION_IDEMPOTENCY_CONFLICT');
  else{
   need(request.expectedRevision===basisRevision,'CORRECTION_REVISION_CONFLICT');need(rev(basisRevision,true)+BigInt(request.changes.length)<=MAX,'REVISION_EXHAUSTED');need(input.events.length+request.changes.length<=10000,'INVALID_EVENT_COUNT');
   for(const c of request.changes){
    const projection=Journal.project(nextInput.events),row=projection.records.find(r=>r.original.id.toLowerCase()===c.targetEventId.toLowerCase());need(row,'CORRECTION_TARGET_NOT_FOUND');
    let next=clone(row.state);
    if(c.action==='replace')next.record=clone(c.record);
    if(c.action==='void')next.active=false;
    if(c.action==='restore')next.active=true;
    if(c.action==='revert'){need(row.lastCorrectionId===c.reversesCorrectionId.toLowerCase(),'INVALID_CORRECTION_REVERSAL');const prior=nextInput.events.find(e=>e.id.toLowerCase()===row.lastCorrectionId);next=clone(prior.facts.previous);}
    const event={id:c.id.toLowerCase(),project_id:input.projectId,owner_id:input.ownerId,scenario_key:input.scenarioKey,origin:input.scenarioKey==='demo_long'?'demo':'manual',schema_version:1,revision:(BigInt(basisRevision)+BigInt(appended.length)+1n).toString(),idempotency_key:c.idempotencyKey,event_type:c.action==='void'?'void':c.action==='revert'?'reversal':'correction',effective_at:request.recordedAt,recorded_at:request.recordedAt,target_event_id:c.targetEventId.toLowerCase(),correction_reason:c.reason,facts:{expectedVersion:c.expectedVersion,action:c.action,previous:clone(row.state),next,reversesCorrectionId:c.reversesCorrectionId?.toLowerCase()||null}};
    need(new TextEncoder().encode(JSON.stringify(event.facts,null,1)).byteLength<=64000,'CORRECTION_FACTS_TOO_LARGE');
    nextInput.events.push(event);appended.push(event);
    // Validate audit transitions immediately; financial replay runs once for the entire atomic batch.
    Journal.project(nextInput.events);
   }
  }
  let after=null,blocking=null;
  try{after=state(nextInput);}catch(error){blocking={code:error.code||'REPLAY_FAILED',eventId:error.eventId||null};}
  const projection=Journal.project(nextInput.events),body={workflowVersion:'v20-corrections-8.1',status:blocking?'blocked-inconsistent-history':replayed?'already-recorded':'awaiting-correction-confirmation',canConfirm:!blocking,basisRevision,basisHash:await hash({input,plan}),request,appendedEvents:appended,replayed,before,after,difference:after?delta(before,after):null,blocking,affectedRecords:projection.records.filter(r=>request.changes.some(c=>c.targetEventId.toLowerCase()===r.original.id.toLowerCase())),inventoryImpact:inventoryImpact(plan,projection),planReviewRequired:!replayed,newCycleCount:null,exitTargetsRequireReview:!replayed,confirmationRequired:true,localJournalAdjustment:true,exchangeTradeChanged:false,databaseWritten:false,planApplied:false,warnings:['LOCAL_RECORD_ADJUSTMENT_ONLY','HISTORICAL_VERSIONS_PRESERVED','PLAN_RESERVATIONS_AND_TARGETS_REQUIRE_SEPARATE_REVIEW',...(!after?.ledger.ruleAssessment.scopeReady?['RISK_UNAVAILABLE']:[])]};
  return freeze({...body,reviewHash:await hash(body)});
 }
 async function confirm(input,review,{confirmedReviewHash,plan=null}={}){
  input=clone(input);review=clone(review);plan=clone(plan);
  need(confirmedReviewHash===review.reviewHash,'EXPLICIT_CORRECTION_CONFIRMATION_REQUIRED');const {reviewHash,...body}=review;need(await hash(body)===reviewHash,'CORRECTION_REVIEW_TAMPERED');need(await hash({input,plan})===review.basisHash,'CORRECTION_REVIEW_STALE');
  const fresh=await prepare(input,review.request,{plan});need(fresh.reviewHash===reviewHash,'CORRECTION_REVIEW_CHANGED');need(fresh.canConfirm,'CORRECTION_INCONSISTENT_HISTORY');
  const nextInput=clone(input);nextInput.events.push(...clone(fresh.appendedEvents));
  return freeze({status:fresh.replayed?'already-recorded':'prepared-for-persistence',nextInput,appendedEvents:clone(fresh.appendedEvents),basisRevision:fresh.basisRevision,reviewHash,planReviewRequired:fresh.planReviewRequired,databaseWritten:false,planApplied:false,exchangeTradeChanged:false});
 }
 return Object.freeze({CorrectionError,prepare,confirm});
});
