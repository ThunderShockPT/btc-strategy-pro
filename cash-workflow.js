/* V20 Block 5: manual cash movement reviews, never exchange or database writes.
 * Review hashes detect stale local state; they are NOT authorization signatures. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('decimal.js'),require('./financial-engine.js'),require('./position-risk.js'),require('node:crypto').webcrypto,require('./cycle-planner.js'),require('./risk-profiles.js'));
 else root.BTCCashWorkflow=factory(root.Decimal,root.BTCFinancialEngine,root.BTCPositionRisk,root.crypto,root.BTCCyclePlanner,root.BTCRiskProfiles);
})(typeof globalThis!=='undefined'?globalThis:this,function(Decimal,Core,Risk,crypto,Cycles,Profiles){
 'use strict';
 const D=Decimal.clone({precision:80,rounding:Decimal.ROUND_HALF_EVEN,toExpNeg:-100,toExpPos:100});
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const TYPES=['capital_deposit','capital_withdrawal','margin_add','margin_remove'],MAX=9223372036854775807n;
 class CashError extends Error{constructor(code){super(code);this.name='CashError';this.code=code;}}
 function need(ok,code){if(!ok)throw new CashError(code);}
 function object(o){return o!==null&&typeof o==='object'&&!Array.isArray(o);}
 function fields(o,required,optional=[]){need(object(o)&&required.every(k=>Object.hasOwn(o,k))&&Object.keys(o).every(k=>required.includes(k)||optional.includes(k)),'INVALID_WORKFLOW_FIELDS');}
 function canonical(o){
  if(o===null||typeof o==='string'||typeof o==='boolean')return JSON.stringify(o);
  if(typeof o==='number'){need(Number.isSafeInteger(o),'INVALID_JSON_NUMBER');return JSON.stringify(o);}
  if(Array.isArray(o)){need(Object.keys(o).length===o.length,'INVALID_JSON_ARRAY');return '['+o.map(canonical).join(',')+']';}
  need(object(o)&&Object.getPrototypeOf(o)===Object.prototype,'INVALID_JSON_OBJECT');
  return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')+'}';
 }
 const clone=o=>JSON.parse(canonical(o));
 function freeze(o){if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
 async function hash(o){need(crypto?.subtle,'SECURE_CONTEXT_REQUIRED');const bytes=new TextEncoder().encode(canonical(o));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');}
 function decimal(v,positive=false){need(typeof v==='string'&&/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/.test(v),'INVALID_CASH_DECIMAL');const n=new D(v);need(positive?n.gt(0):n.gte(0),'INVALID_CASH_AMOUNT');return n;}
 const str=n=>n.toDecimalPlaces(24,D.ROUND_HALF_EVEN).toFixed();
 function time(v){need(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v),'INVALID_CASH_TIMESTAMP');const n=Date.parse(v);need(Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===v.slice(0,19),'INVALID_CASH_TIMESTAMP');return n;}
 function revision(v,zero=false){need(typeof v==='string'&&(zero?/^(0|[1-9]\d{0,18})$/:/^[1-9]\d{0,18}$/).test(v)&&BigInt(v)<=MAX,'INVALID_CASH_REVISION');return BigInt(v);}
 const lastRevision=input=>input.events.reduce((r,e)=>{const v=revision(e.revision);return v>r?v:r;},0n).toString();
 function validatePlan(p,input){
  need(input.ruleScenario===undefined,'SYNTHETIC_RULE_SCENARIO_NOT_RECORDABLE');
  fields(p,['id','projectId','ownerId','scenarioKey','version','profile','referencePriceUSD','referenceAt','protectionFloorUSD'],['configuration']);
  need(typeof p.projectId==='string'&&typeof p.ownerId==='string'&&p.projectId.toLowerCase()===input.projectId.toLowerCase()&&p.ownerId.toLowerCase()===input.ownerId.toLowerCase()&&p.scenarioKey===input.scenarioKey,'PLAN_SCOPE_MISMATCH');
  need(typeof p.id==='string'&&UUID.test(p.id),'INVALID_PLAN_ID');revision(p.version);
  need(['safe','balanced','risky'].includes(p.profile),'INVALID_PROFILE');
  const reference=decimal(p.referencePriceUSD,true),floor=decimal(p.protectionFloorUSD,true);
  need(floor.lt(reference),'INVALID_PROTECTION_FLOOR');need(time(p.referenceAt)<=time(input.valuation.asOf),'FUTURE_PLAN_REFERENCE');
  if(p.configuration!==undefined)need(object(p.configuration)&&canonical(p.configuration).length<=500000,'INVALID_PLAN_CONFIGURATION');
 }
 function validateRequest(r,input){
  fields(r,['id','idempotencyKey','expectedRevision','kind','mode','amountUSD','currency','effectiveAt','recordedAt'],['source','note','purpose','profileMarketContext']);
  need(typeof r.id==='string'&&UUID.test(r.id),'INVALID_MOVEMENT_ID');
  need(typeof r.idempotencyKey==='string'&&r.idempotencyKey.trim().length>0&&r.idempotencyKey.length<=128,'INVALID_IDEMPOTENCY_KEY');
  revision(r.expectedRevision,true);need(TYPES.includes(r.kind),'INVALID_MOVEMENT_KIND');need(['recorded','planned'].includes(r.mode),'MOVEMENT_MODE_REQUIRED');
  need(r.currency==='USD','UNSUPPORTED_CURRENCY');decimal(r.amountUSD,true);
  const effective=time(r.effectiveAt),recorded=time(r.recordedAt),asOf=time(input.valuation.asOf);
  need(recorded<=asOf,'FUTURE_RECORDING_TIMESTAMP');
  if(r.mode==='recorded')need(effective<=recorded,'FUTURE_FACT_REQUIRES_PLAN');
  if(r.kind==='margin_add')need(['initial','additional'].includes(r.purpose),'MARGIN_PURPOSE_REQUIRED');else need(r.purpose===undefined,'UNEXPECTED_MARGIN_PURPOSE');
  for(const [field,max]of [['source',120],['note',500]])if(r[field]!==undefined)need(typeof r[field]==='string'&&r[field].trim().length>0&&r[field].length<=max&&!/[\u0000-\u001f\u007f]/.test(r[field]),'INVALID_MOVEMENT_METADATA');
 }
 function movementEvent(input,r,rev,{projection=false}={}){
  const facts={amountUSD:r.amountUSD,currency:r.currency};for(const k of ['source','note','purpose'])if(r[k]!==undefined)facts[k]=r[k];
  return {id:r.id.toLowerCase(),project_id:input.projectId,owner_id:input.ownerId,scenario_key:input.scenarioKey,origin:input.scenarioKey==='demo_long'?'demo':'manual',schema_version:1,
   revision:rev,idempotency_key:r.idempotencyKey,event_type:r.kind,effective_at:projection?input.valuation.asOf:r.effectiveAt,recorded_at:r.recordedAt,facts};
 }
 function state(input,plan){
  const ledger=Core.reconstruct({...input,bookkeepingOnly:true});
  if(!ledger.ruleAssessment.scopeReady)return {ledger,risk:{status:'unavailable-stale-rules',estimatedPriceUSD:null,atOrBelowMaintenance:null,officialKrakenPrice:false,guaranteedProtection:false},inverse:{status:'unavailable-stale-rules',additionalMarginUSD:null}};
  return {ledger,risk:Risk.estimate(input),inverse:Risk.inverse(input,{floorUSD:plan.protectionFloorUSD,useReservedMargin:true})};
 }
 function difference(a,b){
  const delta=(x,y)=>str(new D(y).sub(x));
  return {netContributedUSD:delta(a.ledger.capital.netContributedUSD,b.ledger.capital.netContributedUSD),walletUSD:delta(a.ledger.cash.walletUSD,b.ledger.cash.walletUSD),
   isolatedMarginUSD:delta(a.ledger.cash.isolatedMarginUSD,b.ledger.cash.isolatedMarginUSD),spendableUSD:delta(a.ledger.cash.spendableUSD,b.ledger.cash.spendableUSD),
   unfundedReservationsUSD:delta(a.ledger.cash.unfundedReservationsUSD,b.ledger.cash.unfundedReservationsUSD),totalEquityUSD:delta(a.ledger.pnl.totalEquityUSD,b.ledger.pnl.totalEquityUSD),
   quantityBTC:delta(a.ledger.position.quantityBTC,b.ledger.position.quantityBTC),
   estimatedLiquidationUSD:a.risk.estimatedPriceUSD===null||b.risk.estimatedPriceUSD===null?null:delta(a.risk.estimatedPriceUSD,b.risk.estimatedPriceUSD)};
 }
 async function seal(body){return freeze({...body,reviewHash:await hash(body)});}
 async function prepareMovement(input,plan,request){
  // Snapshot before the first await: callers cannot change what gets reviewed mid-flight.
  input=clone(input);plan=clone(plan);request=clone(request);
  validatePlan(plan,input);validateRequest(request,input);const before=state(input,plan),baseRevision=lastRevision(input);
  const matching=input.events.filter(e=>e.id.toLowerCase()===request.id.toLowerCase()||e.idempotency_key===request.idempotencyKey);
  let event=null,after=before,replayed=false,projectedInput=clone(input);
  if(matching.length){
   need(request.mode==='recorded'&&matching.length===1,'IDEMPOTENCY_CONFLICT');
   const old=matching[0],expected=movementEvent(input,request,old.revision);
   need(canonical(old)===canonical(expected),'IDEMPOTENCY_CONFLICT');replayed=true;
  }else{
   need(request.expectedRevision===baseRevision,'CASH_REVISION_CONFLICT');need(BigInt(baseRevision)<MAX,'REVISION_EXHAUSTED');
   event=movementEvent(input,request,(BigInt(baseRevision)+1n).toString(),{projection:request.mode==='planned'});
   projectedInput.events.push(event);after=state(projectedInput,plan);
  }
  const warnings=[];
  if(after.ledger.cash.reservationStatus==='unfunded')warnings.push('RESERVATIONS_REQUIRE_REVIEW');
  if(after.risk.atOrBelowMaintenance)warnings.push('MAINTENANCE_REACHED_AT_CURRENT_MARK');
  if(after.inverse.status==='infeasible-with-current-cash')warnings.push('PROTECTION_FLOOR_UNFUNDED_UNDER_MODEL');
  const riskUnavailable=!after.ledger.ruleAssessment.scopeReady;
  if(riskUnavailable)warnings.push('RISK_UNAVAILABLE_RULES_STALE');
  let transferPreview=null;
  if(!riskUnavailable&&!replayed&&['margin_add','margin_remove'].includes(request.kind)){
   transferPreview=Risk.previewTransfer(input,{direction:request.kind==='margin_add'?'add':'remove',amountUSD:request.amountUSD,useReservedMargin:true});
   warnings.push(...transferPreview.reasons);
  }
  let feasible=true;
  if(request.mode==='planned'){
   if(riskUnavailable&&['margin_add','margin_remove'].includes(request.kind))feasible=false;
   if(request.kind==='capital_withdrawal'&&new D(request.amountUSD).gt(before.ledger.cash.spendableUSD)){feasible=false;warnings.push('PLANNED_WITHDRAWAL_USES_RESERVED_CASH');}
   if(transferPreview&&!transferPreview.feasibleUnderAssumptions)feasible=false;
  }
  if(!replayed&&request.kind.startsWith('capital_')){
   need(canonical(before.ledger.position)===canonical(after.ledger.position)&&before.risk.estimatedPriceUSD===after.risk.estimatedPriceUSD,'CAPITAL_MOVEMENT_CHANGED_POSITION');
  }
  let newCycles={status:'not-configured',count:null};
  if(plan.configuration?.profilePolicyVersion){
   try{
    need(Profiles&&plan.configuration.profilePolicyVersion===Profiles.definition().version,'PROFILE_POLICY_VERSION_REQUIRES_REVIEW');
    need(request.profileMarketContext,'FRESH_PROFILE_MARKET_CONTEXT_REQUIRED');
    const profileRequest={profile:plan.profile,floorMode:'preserve',marginAdmission:'strict',market:request.profileMarketContext,baseCyclePolicy:plan.configuration.profileBaseCyclePolicy};
    const a=Profiles.preview(input,plan,profileRequest),b=Profiles.preview(projectedInput,plan,profileRequest);
    newCycles={status:'calculated-approved-profile',beforeCount:a.cycles.newCycleCount,count:b.cycles.newCycleCount,additionalCycleCapacity:b.cycles.newCycleCount-a.cycles.newCycleCount,before:a,after:b};
   }catch(error){newCycles={status:'requires-profile-review',count:null,reason:error.code||'INVALID_PROFILE_CONTEXT'};warnings.push('PROFILE_RECALCULATION_REQUIRES_REVIEW');}
  }else if(plan.configuration?.cyclePolicy){
   try{need(Cycles,'CYCLE_PLANNER_REQUIRED');const a=Cycles.generate(input,plan,plan.configuration.cyclePolicy),b=Cycles.generate(projectedInput,plan,plan.configuration.cyclePolicy);
    newCycles={status:'calculated-synthetic',beforeCount:a.newCycleCount,count:b.newCycleCount,additionalCycleCapacity:b.newCycleCount-a.newCycleCount,before:a,after:b};
   }catch(error){newCycles={status:'requires-plan-review',count:null,reason:error.code||'INVALID_CYCLE_CONFIGURATION'};warnings.push('CYCLE_RECALCULATION_REQUIRES_REVIEW');}
  }
  return seal({workflowVersion:'v20-cash-7b.1',type:'movement-review',basisHash:await hash({input,plan}),baseRevision,request,
   status:replayed?'already-recorded':request.mode==='planned'?'planned-only':'awaiting-record-confirmation',before,after,delta:difference(before,after),
   projectionBasis:request.mode==='planned'?'if-recorded-now-at-unchanged-mark-and-rules':'declared-effective-time-at-current-valuation',
   eventToAppend:request.mode==='recorded'?event:null,plannedMovement:request.mode==='planned'?request:null,transferPreview,movementFitsCurrentConstraints:feasible,warnings,
   activePlan:plan,planReviewRequired:!replayed,newCycles,
   databaseWritten:false,krakenTransferPerformed:false,planApplied:false,protectionGuaranteed:false});
 }
 async function verifyReview(input,plan,proposal,type,confirmation){
  fields(confirmation,['confirmed','reviewHash']);need(confirmation.confirmed===true&&confirmation.reviewHash===proposal.reviewHash,'EXPLICIT_REVIEW_CONFIRMATION_REQUIRED');
  need(proposal.type===type,'WRONG_REVIEW_TYPE');
  const {reviewHash,...body}=proposal;need(reviewHash===await hash(body),'MODIFIED_REVIEW');
  need(proposal.basisHash===await hash({input,plan}),'STALE_REVIEW');
 }
 async function confirmMovement(input,plan,proposal,confirmation){
  input=clone(input);plan=clone(plan);proposal=clone(proposal);confirmation=clone(confirmation);
  await verifyReview(input,plan,proposal,'movement-review',confirmation);
  need(proposal.request.mode==='recorded','PLANNED_MOVEMENT_IS_NOT_A_FACT');
  const fresh=await prepareMovement(input,plan,proposal.request);need(fresh.reviewHash===proposal.reviewHash,'MODIFIED_REVIEW');
  const nextInput=clone(input);if(fresh.eventToAppend)nextInput.events.push(clone(fresh.eventToAppend));
  return freeze({status:fresh.status==='already-recorded'?'already-recorded':'prepared-for-persistence',nextInput,activePlan:clone(plan),
   eventToAppend:fresh.eventToAppend,comparison:fresh,planReviewRequired:fresh.planReviewRequired,databaseWritten:false,krakenTransferPerformed:false,planApplied:false});
 }
 async function preparePlanChange(input,plan,change){
  input=clone(input);plan=clone(plan);change=clone(change);validatePlan(plan,input);
  need(!plan.configuration?.cyclePolicy,'USE_CYCLE_PLAN_REVIEW_FOR_MODELED_CYCLES');
  fields(change,['id','version','reservations']);
  need(typeof change.id==='string'&&UUID.test(change.id)&&change.id.toLowerCase()!==plan.id.toLowerCase(),'NEW_PLAN_ID_REQUIRED');
  need(revision(change.version)===revision(plan.version)+1n,'NEXT_PLAN_VERSION_REQUIRED');
  const nextPlan={...plan,id:change.id.toLowerCase(),version:change.version};
  const nextInput={...input,reservations:change.reservations},before=state(input,plan),after=state(nextInput,nextPlan);
  return seal({workflowVersion:'v20-cash-5.1',type:'plan-review',basisHash:await hash({input,plan}),baseRevision:lastRevision(input),change,
   activePlan:plan,candidatePlan:nextPlan,before,after,delta:difference(before,after),reservationRevisionAdmissible:after.ledger.ruleAssessment.scopeReady&&after.ledger.cash.reservationStatus==='funded'&&!after.risk.atOrBelowMaintenance,
   status:'awaiting-plan-confirmation',newCycles:{status:'not-calculated-block6',count:null},databaseWritten:false,krakenTransferPerformed:false,planApplied:false});
 }
 async function confirmPlanChange(input,plan,proposal,confirmation){
  input=clone(input);plan=clone(plan);proposal=clone(proposal);confirmation=clone(confirmation);
  await verifyReview(input,plan,proposal,'plan-review',confirmation);
  const fresh=await preparePlanChange(input,plan,proposal.change);need(fresh.reviewHash===proposal.reviewHash,'MODIFIED_REVIEW');
  need(fresh.reservationRevisionAdmissible,'PLAN_NOT_FUNDED_OR_MAINTENANCE_REACHED');
  return freeze({status:'prepared-for-persistence',nextInput:{...input,reservations:clone(fresh.change.reservations)},nextPlan:clone(fresh.candidatePlan),
   basisRevision:lastRevision(input),databaseWritten:false,krakenTransferPerformed:false,planApplied:false,
   limitations:['RESERVATIONS_ONLY_NOT_FULL_CYCLE_VALIDATION','ATOMIC_PERSISTENCE_BLOCK12']});
 }
 async function cyclePlanReview(input,plan,change,completedSearch){
  input=clone(input);plan=clone(plan);change=clone(change);validatePlan(plan,input);
  need(!plan.configuration?.profilePolicyVersion,'USE_PROFILE_REVIEW_FOR_APPROVED_PROFILE');
  fields(change,['id','version','policy']);need(typeof change.id==='string'&&UUID.test(change.id)&&change.id.toLowerCase()!==plan.id.toLowerCase(),'NEW_PLAN_ID_REQUIRED');
  need(revision(change.version)===revision(plan.version)+1n,'NEXT_PLAN_VERSION_REQUIRED');need(Cycles,'CYCLE_PLANNER_REQUIRED');
  let result;if(completedSearch){need(canonical(completedSearch.input)===canonical(input)&&canonical(completedSearch.plan)===canonical(plan)&&canonical(completedSearch.policy)===canonical(change.policy),'COMPLETED_SEARCH_BASIS_MISMATCH');need(change.policy.requireFailedMarginSurvival===true,'PROFILE_ADMISSION_NOT_APPROVED');result=Cycles.searchResult(completedSearch);}else result=Cycles.generate(input,plan,change.policy);
  const candidatePlan={...plan,id:change.id.toLowerCase(),version:change.version,configuration:{...(plan.configuration||{}),cyclePolicy:change.policy,cycleInventory:result.candidateInventory||clone(plan.configuration?.cycleInventory||[])}};
  if(result.selected)candidatePlan.configuration.cycleReservationBasis={protectedCashUSD:change.policy.protectedCashUSD,fundingReserveUSD:change.policy.fundingReserveUSD,closingFeeReserveUSD:result.selected.closingFeeReserveUSD};
  return seal({workflowVersion:'v20-cash-6.1',type:'cycle-plan-review',basisHash:await hash({input,plan}),baseRevision:lastRevision(input),change,activePlan:plan,candidatePlan,result,
   previousReservations:input.reservations||{ordersUSD:'0',marginUSD:'0',protectedUSD:'0'},proposedReservations:result.selected?.reservations||null,
   status:'awaiting-cycle-plan-confirmation',planApplied:false,databaseWritten:false,krakenTransferPerformed:false});
 }
 async function prepareCyclePlanChange(input,plan,change){return cyclePlanReview(input,plan,change,null);}
 // A local review is not authorization. Server callers must authenticate the completed checkpoint.
 async function prepareCompletedCyclePlanChange(input,plan,change,completedSearch){return cyclePlanReview(input,plan,change,clone(completedSearch));}
 async function confirmCompletedCyclePlanChange(input,plan,proposal,confirmation,completedSearch){
  input=clone(input);plan=clone(plan);proposal=clone(proposal);confirmation=clone(confirmation);
  await verifyReview(input,plan,proposal,'cycle-plan-review',confirmation);
  const fresh=await prepareCompletedCyclePlanChange(input,plan,proposal.change,completedSearch);need(fresh.reviewHash===proposal.reviewHash,'MODIFIED_REVIEW');
  need(fresh.result.selected&&fresh.result.failedMarginSurvived===true&&!fresh.result.conditionalOnPlannedMargin,'CYCLE_PLAN_INFEASIBLE');
  return freeze({status:'prepared-for-persistence',nextInput:{...input,reservations:clone(fresh.proposedReservations)},nextPlan:clone(fresh.candidatePlan),basisRevision:lastRevision(input),planApplied:false,databaseWritten:false,krakenTransferPerformed:false,protectionGuaranteed:false});
 }
 async function confirmCyclePlanChange(input,plan,proposal,confirmation){
  input=clone(input);plan=clone(plan);proposal=clone(proposal);confirmation=clone(confirmation);
  await verifyReview(input,plan,proposal,'cycle-plan-review',confirmation);
  const fresh=await prepareCyclePlanChange(input,plan,proposal.change);need(fresh.reviewHash===proposal.reviewHash,'MODIFIED_REVIEW');
  need(fresh.result.selected,'CYCLE_PLAN_INFEASIBLE');
  return freeze({status:'prepared-for-persistence',nextInput:{...input,reservations:clone(fresh.proposedReservations)},nextPlan:clone(fresh.candidatePlan),basisRevision:lastRevision(input),
   planApplied:false,databaseWritten:false,krakenTransferPerformed:false,protectionGuaranteed:false});
 }
 async function profilePlanReview(input,plan,change,completedSearch){
  input=clone(input);plan=clone(plan);change=clone(change);validatePlan(plan,input);
  fields(change,['id','version','profile','floorMode','marginAdmission','market','baseCyclePolicy']);need(Profiles,'PROFILE_ENGINE_REQUIRED');
  need(typeof change.id==='string'&&UUID.test(change.id)&&change.id.toLowerCase()!==plan.id.toLowerCase(),'NEW_PLAN_ID_REQUIRED');
  need(revision(change.version)===revision(plan.version)+1n,'NEXT_PLAN_VERSION_REQUIRED');
  const result=completedSearch?Profiles.completePreview(input,plan,change,completedSearch):Profiles.preview(input,plan,change),candidatePlan={...result.candidatePlan,id:change.id.toLowerCase(),version:change.version};
  candidatePlan.configuration={...(plan.configuration||{}),cyclePolicy:result.cyclePolicy,profilePolicyVersion:result.policyVersion,profileAdmission:change.marginAdmission,
   profileBaseCyclePolicy:clone(change.baseCyclePolicy),profileMarketContext:clone(change.market),profileValuation:clone(input.valuation),profileFloorMode:change.floorMode,
   cycleInventory:result.cycles.candidateInventory||clone(plan.configuration?.cycleInventory||[])};
  if(result.cycles.selected)candidatePlan.configuration.cycleReservationBasis={protectedCashUSD:result.cyclePolicy.protectedCashUSD,fundingReserveUSD:result.cyclePolicy.fundingReserveUSD,closingFeeReserveUSD:result.cycles.selected.closingFeeReserveUSD};
  validatePlan(candidatePlan,input);
  return seal({workflowVersion:'v20-cash-7b.1',type:'profile-review',basisHash:await hash({input,plan}),baseRevision:lastRevision(input),change,activePlan:plan,candidatePlan,result,
   status:result.canApply?'awaiting-project-confirmation':result.status,canApply:result.canApply,planApplied:false,databaseWritten:false,krakenTransferPerformed:false});
 }
 async function prepareProfileChange(input,plan,change){return profilePlanReview(input,plan,change,null);}
 async function prepareCompletedProfileChange(input,plan,change,completedSearch){need(change.marginAdmission===Profiles.definition().approvedAdmission,'PROFILE_ADMISSION_NOT_APPROVED');return profilePlanReview(input,plan,change,clone(completedSearch));}
 async function confirmCompletedProfileChange(input,plan,proposal,confirmation,completedSearch){
  input=clone(input);plan=clone(plan);proposal=clone(proposal);confirmation=clone(confirmation);await verifyReview(input,plan,proposal,'profile-review',confirmation);
  const fresh=await prepareCompletedProfileChange(input,plan,proposal.change,completedSearch);need(fresh.reviewHash===proposal.reviewHash,'MODIFIED_REVIEW');
  need(fresh.canApply&&fresh.result.cycles.selected&&fresh.result.cycles.failedMarginSurvived===true&&!fresh.result.cycles.conditionalOnPlannedMargin,'PROFILE_PLAN_INFEASIBLE');
  return freeze({status:'prepared-for-persistence',nextInput:{...input,reservations:clone(fresh.result.cycles.selected.reservations)},nextPlan:clone(fresh.candidatePlan),basisRevision:lastRevision(input),policyVersion:fresh.result.policyVersion,policyAdmission:'strict',planApplied:false,databaseWritten:false,krakenTransferPerformed:false,protectionGuaranteed:false,limitations:['LOCAL_REVIEW_NOT_SERVER_AUTHORIZATION','ATOMIC_PERSISTENCE_BLOCK12','BETA_POLICY_NOT_PUBLIC_LAUNCH_APPROVAL']});
 }
 async function confirmProfileChange(input,plan,proposal,confirmation){
  input=clone(input);plan=clone(plan);proposal=clone(proposal);confirmation=clone(confirmation);
  await verifyReview(input,plan,proposal,'profile-review',confirmation);
  const fresh=await prepareProfileChange(input,plan,proposal.change);need(fresh.reviewHash===proposal.reviewHash,'MODIFIED_REVIEW');
  need(fresh.change.marginAdmission===Profiles.definition().approvedAdmission,'PROFILE_ADMISSION_NOT_APPROVED');
  need(fresh.canApply&&fresh.result.cycles.selected,'PROFILE_PLAN_INFEASIBLE');
  return freeze({status:'prepared-for-persistence',nextInput:{...input,reservations:clone(fresh.result.cycles.selected.reservations)},nextPlan:clone(fresh.candidatePlan),basisRevision:lastRevision(input),
   policyVersion:fresh.result.policyVersion,policyAdmission:'strict',planApplied:false,databaseWritten:false,krakenTransferPerformed:false,protectionGuaranteed:false,
   limitations:['LOCAL_REVIEW_NOT_SERVER_AUTHORIZATION','ATOMIC_PERSISTENCE_BLOCK12','BETA_POLICY_NOT_PUBLIC_LAUNCH_APPROVAL']});
 }
 return Object.freeze({CashError,prepareMovement,confirmMovement,preparePlanChange,confirmPlanChange,prepareCyclePlanChange,confirmCyclePlanChange,prepareCompletedCyclePlanChange,confirmCompletedCyclePlanChange,prepareProfileChange,confirmProfileChange,prepareCompletedProfileChange,confirmCompletedProfileChange});
});
