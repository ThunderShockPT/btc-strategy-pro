/* V20 Block 6. Parameter-driven synthetic cycle search. No storage or orders. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('decimal.js'),require('./financial-engine.js'),require('./position-risk.js'),require('./kraken-rules.js'));
 else root.BTCCyclePlanner=factory(root.Decimal,root.BTCFinancialEngine,root.BTCPositionRisk,root.BTCKrakenRules);
})(typeof globalThis!=='undefined'?globalThis:this,function(Decimal,Core,Risk,Rules){
 'use strict';
 const D=Decimal.clone({precision:80,rounding:Decimal.ROUND_HALF_EVEN,toExpNeg:-100,toExpPos:100}),WEIGHTS=['0.2','0.3','0.5'];
 const TECHNICAL_LIMIT=12,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 class CycleError extends Error{constructor(code){super(code);this.name='CycleError';this.code=code;}}
 const need=(ok,code)=>{if(!ok)throw new CycleError(code);};
 const clone=v=>JSON.parse(JSON.stringify(v));
 function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 const str=v=>v.toDecimalPlaces(24,D.ROUND_HALF_EVEN).toFixed(),money=v=>v.toDecimalPlaces(18,D.ROUND_CEIL);
 function decimal(v,positive=false){need(typeof v==='string'&&/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/.test(v),'INVALID_CYCLE_DECIMAL');const n=new D(v);need(positive?n.gt(0):n.gte(0),'INVALID_CYCLE_AMOUNT');return n;}
 function fields(v,required,optional=[]){need(v&&typeof v==='object'&&!Array.isArray(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k)),'INVALID_CYCLE_FIELDS');}
 function context(input,plan,policy){
  need(plan&&UUID.test(plan.id)&&typeof plan.projectId==='string'&&typeof plan.ownerId==='string'&&plan.projectId.toLowerCase()===input.projectId.toLowerCase()&&plan.ownerId.toLowerCase()===input.ownerId.toLowerCase()&&plan.scenarioKey===input.scenarioKey,'PLAN_SCOPE_MISMATCH');
  need(['safe','balanced','risky'].includes(plan.profile),'INVALID_PROFILE');
  need(typeof plan.version==='string'&&/^[1-9]\d{0,18}$/.test(plan.version)&&BigInt(plan.version)<=9223372036854775807n,'INVALID_PLAN_VERSION');
  need(typeof plan.referenceAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(plan.referenceAt)&&Number.isFinite(Date.parse(plan.referenceAt))&&new Date(plan.referenceAt).toISOString().slice(0,19)===plan.referenceAt.slice(0,19)&&Date.parse(plan.referenceAt)<=Date.parse(input.valuation.asOf),'INVALID_PLAN_REFERENCE_TIME');
  const floor=decimal(plan.protectionFloorUSD,true),reference=decimal(plan.referencePriceUSD,true);need(floor.lt(reference),'INVALID_PROTECTION_FLOOR');
  fields(policy,['maxCycles','nominalCycleBudgetUSD','firstEntryPriceUSD','reinforcementSpacingUSD','cycleSpacingUSD','feeRate','upPriceUSD','minimumBufferUSD','protectedCashUSD','fundingReserveUSD','externalOrderReserveUSD','externalMarginReserveUSD','marginPlacement','requireFailedMarginSurvival']);
  need(Number.isSafeInteger(policy.maxCycles)&&policy.maxCycles>=1&&policy.maxCycles<=TECHNICAL_LIMIT,'INVALID_TECHNICAL_CYCLE_LIMIT');
  need(['prefunded','before-each-buy'].includes(policy.marginPlacement)&&typeof policy.requireFailedMarginSurvival==='boolean','EXPLICIT_MARGIN_POLICY_REQUIRED');
  const p={};for(const k of ['nominalCycleBudgetUSD','firstEntryPriceUSD','reinforcementSpacingUSD','cycleSpacingUSD','upPriceUSD','minimumBufferUSD'])p[k]=decimal(policy[k],true);
  for(const k of ['feeRate','protectedCashUSD','fundingReserveUSD','externalOrderReserveUSD','externalMarginReserveUSD'])p[k]=decimal(policy[k]);
  need(p.feeRate.lt(1),'INVALID_FEE_SCENARIO');need(p.upPriceUSD.gt(input.valuation.markPriceUSD),'INVALID_UP_SCENARIO');
  need(p.firstEntryPriceUSD.lte(input.valuation.markPriceUSD),'FIRST_ENTRY_ALREADY_PASSED');
  const config=plan.configuration||{};
  let protectedFloor=input.reservations?.protectedUSD||'0';
  if(config.cycleReservationBasis){
   fields(config.cycleReservationBasis,['protectedCashUSD','fundingReserveUSD','closingFeeReserveUSD']);
   const saved=config.cycleReservationBasis;
   need(decimal(saved.protectedCashUSD).add(decimal(saved.fundingReserveUSD)).add(decimal(saved.closingFeeReserveUSD)).eq(protectedFloor),'RESERVATION_COMPONENTS_REQUIRE_RECONCILIATION');
   protectedFloor=saved.protectedCashUSD;
  }
  need(p.protectedCashUSD.gte(protectedFloor),'PROTECTED_RESERVE_REDUCTION_REQUIRES_SEPARATE_REVIEW');
  need(!Object.hasOwn(config,'pendingPurchases')||(Array.isArray(config.pendingPurchases)&&config.pendingPurchases.length===0),'UNMAPPED_LEGACY_PENDING_ORDERS');
  need(!Object.hasOwn(config,'cycleInventory')||Array.isArray(config.cycleInventory),'INVALID_CYCLE_INVENTORY');
  const ledger=Core.reconstruct(input);need(ledger.ruleAssessment.scopeReady,'CURRENT_RULES_REQUIRED');
  need(!Risk.estimate(input).atOrBelowMaintenance,'EXISTING_POSITION_AT_MAINTENANCE');
  return {p,floor,ledger,inventory:clone(config.cycleInventory||[])};
 }
 function inventory(input,source,{floor,ledger},isNew=false){
  need(Array.isArray(source)&&source.length<=100,'INVALID_CYCLE_INVENTORY');
  const ids=new Set(),fillIds=new Set(),buys=Core.effectiveEvents(input).filter(e=>e.event_type==='trade_buy'),byId=new Map(buys.map(e=>[e.id.toLowerCase(),e]));
  const cycles=source.map(c=>{
   fields(c,['cycle','nominalBudgetUSD','entries']);need(/^cycle-[1-9]\d{0,5}$/.test(c.cycle)&&!ids.has(c.cycle),'DUPLICATE_OR_INVALID_CYCLE');ids.add(c.cycle);
   const budget=decimal(c.nominalBudgetUSD,true);need(Array.isArray(c.entries)&&c.entries.length===3,'THREE_ENTRIES_REQUIRED');
   const stages=new Set();let previous=null;
   const entries=c.entries.map((e,index)=>{
    fields(e,['stage','priceUSD','state','fillEventIds']);need(e.stage===index+1&&!stages.has(e.stage),'INVALID_STAGE_SEQUENCE');stages.add(e.stage);
    const price=decimal(e.priceUSD,true);need(price.gt(floor)&&(!previous||price.lt(previous)),'INVALID_ENTRY_LADDER');previous=price;
    need(['active','closed','cancelled'].includes(e.state)&&Array.isArray(e.fillEventIds),'INVALID_ENTRY_STATE');
    let executed=new D(0),qty=new D(0);
    for(const id of e.fillEventIds){need(typeof id==='string'&&!fillIds.has(id.toLowerCase()),'DUPLICATE_FILL_LINK');fillIds.add(id.toLowerCase());const fill=byId.get(id.toLowerCase());need(fill&&fill.facts.cycle===c.cycle,'INVALID_FILL_LINK');executed=executed.add(new D(fill.facts.quantityBTC).mul(fill.facts.priceUSD));qty=qty.add(fill.facts.quantityBTC);}
    const allocated=budget.mul(WEIGHTS[index]),remaining=D.max(0,allocated.sub(executed));
    const q=e.state==='active'?remaining.div(price).div(input.rules.instrument.quantityStep).floor().mul(input.rules.instrument.quantityStep):new D(0);
    const valid=Rules.validateOrder(input.rules,{quantityBTC:input.rules.instrument.minQuantity,priceUSD:price.toFixed(),orderType:'limit'});need(valid.metadataValid,'INVALID_ENTRY_TICK_OR_INSTRUMENT');
    if(isNew)need(q.gte(input.rules.instrument.minQuantity),'CYCLE_BUDGET_BELOW_MINIMUM_LOT');
    if(q.gt(0))need(price.lte(input.valuation.markPriceUSD),'PENDING_ENTRY_ALREADY_PASSED_REVIEW_REQUIRED');
    return {stage:e.stage,weight:WEIGHTS[index],priceUSD:price.toFixed(),state:e.state,allocatedNominalUSD:str(allocated),executedNominalUSD:str(executed),executedQuantityBTC:str(qty),
     pendingQuantityBTC:str(q),pendingNominalUSD:str(q.mul(price)),unallocatedNominalUSD:str(remaining.sub(q.mul(price))),overrunUSD:str(D.max(0,executed.sub(allocated))),fillEventIds:clone(e.fillEventIds)};
   });return {cycle:c.cycle,nominalBudgetUSD:budget.toFixed(),entries};
  });
  for(const fill of buys)if(ids.has(fill.facts.cycle))need(fillIds.has(fill.id.toLowerCase()),'UNASSIGNED_HISTORICAL_FILL');
  return cycles;
 }
 function requirement(input,ctx,q,b,mark){
  const r=Risk.requiredMarginForFloor({quantityBTC:str(q),basisUSD:str(b),floorUSD:ctx.floor.toFixed(),bufferUSD:ctx.p.minimumBufferUSD.toFixed(),markPriceUSD:mark,rules:input.rules,platform:input.platform,clientType:input.clientType});
  return money(D.max(r.requiredTotalMarginUSD,r.initialRequiredUSD,r.initialEquityRequiredMarginUSD));
 }
 function build(input,ctx,existing,newSource){
  const cycles=[...existing,...inventory(input,newSource,ctx,true)],orders=[];
  for(const c of cycles)for(const e of c.entries)if(new D(e.pendingQuantityBTC).gt(0))orders.push({key:c.cycle+':'+e.stage,cycle:c.cycle,stage:e.stage,quantityBTC:e.pendingQuantityBTC,priceUSD:e.priceUSD,nominalUSD:e.pendingNominalUSD});
  need(orders.length<=TECHNICAL_LIMIT*3,'TOO_MANY_PENDING_ORDERS_FOR_VALIDATED_LIMIT');
  orders.sort((a,b)=>new D(b.priceUSD).cmp(a.priceUSD)||Number(a.cycle.slice(6))-Number(b.cycle.slice(6))||a.stage-b.stage);
  let q=new D(ctx.ledger.position.quantityBTC),b=new D(ctx.ledger.position.remainingBasisUSD),margin=new D(ctx.ledger.cash.isolatedMarginUSD),fees=new D(0);
  const initialNeed=D.max(margin,requirement(input,ctx,q,b,input.valuation.markPriceUSD)),schedule=[];let target=initialNeed;
  if(initialNeed.gt(margin))schedule.push({key:'existing-position',triggerPriceUSD:input.valuation.markPriceUSD,amountUSD:str(initialNeed.sub(margin)),targetMarginUSD:str(initialNeed)});
  for(const o of orders){q=q.add(o.quantityBTC);b=b.add(o.nominalUSD);need(q.lte(input.rules.instrument.maxQuantity),'POSITION_LIMIT_EXCEEDED');const next=D.max(target,requirement(input,ctx,q,b,o.priceUSD));o.additionalMarginUSD=str(next.sub(target));o.targetMarginUSD=str(next);target=next;fees=fees.add(money(new D(o.nominalUSD).mul(ctx.p.feeRate)));if(new D(o.additionalMarginUSD).gt(0))schedule.push({key:o.key,triggerPriceUSD:o.priceUSD,amountUSD:o.additionalMarginUSD,targetMarginUSD:o.targetMarginUSD});}
  const addition=target.sub(margin),closing=money(q.mul(ctx.p.upPriceUSD).mul(ctx.p.feeRate));
  const protectedTotal=ctx.p.protectedCashUSD.add(ctx.p.fundingReserveUSD).add(closing),external=ctx.p.externalOrderReserveUSD.add(ctx.p.externalMarginReserveUSD);
  const needed=addition.add(fees).add(protectedTotal).add(external),shortfall=D.max(0,needed.sub(ctx.ledger.cash.walletUSD));
  return {cycles,newSource,orders,schedule,initialAddition:str(initialNeed.sub(margin)),additionalMarginUSD:str(addition),openingFeesUSD:str(fees),closingFeeReserveUSD:str(closing),
   reservations:{ordersUSD:str(fees.add(ctx.p.externalOrderReserveUSD)),marginUSD:str(addition.add(ctx.p.externalMarginReserveUSD)),protectedUSD:str(protectedTotal)},
   totalWalletRequiredUSD:str(needed),cashShortfallUSD:str(shortfall),uncommittedAfterFullPlanUSD:str(D.max(0,new D(ctx.ledger.cash.walletUSD).sub(needed))),finalQuantityBTC:str(q),finalBasisUSD:str(b)};
 }
 function scenarios(input,ctx,candidate,policy){
  const mark=input.valuation.markPriceUSD,levels=[...new Set(candidate.orders.map(o=>o.priceUSD))].sort((a,b)=>new D(b).cmp(a));
  const descending=[mark,...levels.filter(p=>!new D(p).eq(mark)),ctx.floor.toFixed()];
  const paths={descent:descending,ascent:[mark,policy.upPriceUSD],volatile:[mark,...levels.flatMap(p=>[p,policy.upPriceUSD]),ctx.floor.toFixed(),policy.upPriceUSD],gap:[mark,ctx.floor.toFixed()],missedOrders:descending,partialFills:descending,failedMargin:descending};
  const summaries=[];
  for(const [name,path]of Object.entries(paths)){
   const failureMode=name==='failedMargin'&&new D(candidate.additionalMarginUSD).gt(0);
   let rev=input.events.reduce((r,e)=>BigInt(e.revision)>r?BigInt(e.revision):r,0n),serial=0,clock=Date.parse(input.valuation.asOf),steps=[];
   const ids=new Set(input.events.map(e=>e.id.toLowerCase())),keys=new Set(input.events.map(e=>e.idempotency_key)),done=new Set();
   function event(type,facts,at){let id,key;do{serial++;id='00000000-0000-4000-8000-'+String(serial).padStart(12,'0');key='v20-cycle-synthetic-'+serial;}while(ids.has(id)||keys.has(key));ids.add(id);keys.add(key);return {id,project_id:input.projectId,owner_id:input.ownerId,scenario_key:input.scenarioKey,origin:input.scenarioKey==='demo_long'?'demo':'manual',schema_version:1,revision:(++rev).toString(),idempotency_key:key,event_type:type,effective_at:at,recorded_at:at,facts};}
   const cash=(value,at)=>event('margin_add',{amountUSD:value,currency:'USD',purpose:'additional'},at);
   function addStep(price,actions=()=>[],transition='continuous'){const at=new Date(clock+=1000).toISOString();steps.push({at,markPriceUSD:price,transition,actions:actions(at)});}
   const initial=policy.marginPlacement==='prefunded'?candidate.additionalMarginUSD:candidate.initialAddition;
   if(new D(initial).gt(0))addStep(mark,at=>failureMode?[{outcome:'failed'}]:[{outcome:'filled',events:[cash(initial,at)]}]);
   let previous=mark;
   for(let index=0;index<path.length;index++){
    const price=path[index],gap=name==='gap'&&index>0;
    addStep(price,at=>{
     const actions=[];
     for(const o of candidate.orders){
      if(done.has(o.key)||new D(price).gt(o.priceUSD)||new D(previous).lt(o.priceUSD))continue;
      done.add(o.key);
      // Gap fills are not assumed. Failed margin gates subsequent new orders.
      if(gap||name==='missedOrders'||failureMode){actions.push({outcome:'unfilled'});continue;}
      const quantity=name==='partialFills'?new D(o.quantityBTC).mul('0.5').div(input.rules.instrument.quantityStep).floor().mul(input.rules.instrument.quantityStep).toFixed():o.quantityBTC;
      if(new D(quantity).lt(input.rules.instrument.minQuantity)){actions.push({outcome:'unfilled'});continue;}
      if(policy.marginPlacement==='before-each-buy'&&new D(o.additionalMarginUSD).gt(0))actions.push({outcome:'filled',events:[cash(o.additionalMarginUSD,at)]});
      const buy=event('trade_buy',{symbol:'PF_XBTUSD',executionStatus:'executed',quantityBTC:quantity,priceUSD:o.priceUSD,cycle:o.cycle},at),events=[buy];
      const fee=money(new D(quantity).mul(o.priceUSD).mul(ctx.p.feeRate));if(fee.gt(0))events.push(event('fee',{amountUSD:fee.toFixed(),currency:'USD',category:'trading',tradeEventId:buy.id},at));
      actions.push({outcome:'filled',events});
     }return actions;
    },gap?'gap':'continuous');previous=price;
   }
   const result=Risk.simulate(input,{steps});
   const wallet=new D(result.projectedLedger.cash.walletUSD),held=ctx.p.protectedCashUSD.add(ctx.p.fundingReserveUSD).add(candidate.closingFeeReserveUSD).add(ctx.p.externalOrderReserveUSD).add(ctx.p.externalMarginReserveUSD);
   summaries.push({name,status:result.status,completed:result.firstFailure===null,maintenanceSurvived:result.firstRiskEvent===null,
    reservationsPreserved:wallet.gte(held),firstRiskEvent:result.firstRiskEvent,firstFailure:result.firstFailure,
    finalPosition:result.projectedLedger.position,finalCash:result.projectedLedger.cash,finalPnL:result.projectedLedger.pnl,finalMargin:result.projectedLedger.margin,finalRisk:result.finalRisk,
    checkpoints:result.history.filter(h=>h.risk).map(h=>({index:h.index,phase:h.phase,markPriceUSD:h.risk.markPriceUSD,maintenanceBufferUSD:h.risk.maintenanceBufferUSD,estimatedLiquidationUSD:h.risk.estimatedPriceUSD,initialRequiredUSD:h.risk.initialRequiredUSD,maintenanceRequiredUSD:h.risk.maintenanceRequiredUSD,isolatedMarginUSD:h.risk.marginUSD,quantityBTC:h.projectedLedger?.position.quantityBTC??null,walletUSD:h.projectedLedger?.cash.walletUSD??null,effectiveEntryLeverage:h.projectedLedger?.margin.effectiveEntryLeverage??null})),
    assumptions:name==='failedMargin'?['Planned transfers fail; new buys are not placed. Existing exposure continues through the path.']:name==='gap'?['No fills assumed at levels crossed by a gap.']:name==='partialFills'?['Half of each quantity rounded down to a lot, or unfilled if below minimum. Declared full margin additions are retained conservatively.']:['Synthetic hypothetical limit fills at declared levels; not execution guarantees.']});
  }
  return summaries;
 }
 function generate(input,plan,policy){
  input=clone(input);plan=clone(plan);policy=clone(policy);const ctx=context(input,plan,policy),existing=inventory(input,ctx.inventory,ctx);
  const used=new Set([...ctx.inventory.map(c=>c.cycle),...Core.effectiveEvents(input).filter(e=>e.event_type==='trade_buy').map(e=>e.facts.cycle),...input.events.filter(e=>e.event_type==='trade_buy').map(e=>e.facts.cycle)]);
  let nextNumber=[...used].reduce((n,c)=>Math.max(n,Number(c.slice(6))),0)+1;
  const active=new Set(ctx.ledger.position.cycles.map(c=>c.cycle));for(const c of existing)if(c.entries.some(e=>new D(e.pendingQuantityBTC).gt(0)))active.add(c.cycle);
  const slots=Math.max(0,policy.maxCycles-active.size),audit=[],candidates=[];
  let newSource=[];
  for(let count=0;count<=slots;count++){
   if(count>0){
    const first=ctx.p.firstEntryPriceUSD.sub(ctx.p.cycleSpacingUSD.mul(count-1));
    const prices=[0,1,2].map(i=>first.sub(ctx.p.reinforcementSpacingUSD.mul(i)));
    if(nextNumber>999999||prices.some(p=>p.lte(ctx.floor))){audit.push({newCycles:count,status:'rejected',reason:'NO_VALID_ENTRY_LEVELS_ABOVE_FLOOR'});break;}
    newSource=[...newSource,{cycle:'cycle-'+nextNumber++,nominalBudgetUSD:policy.nominalCycleBudgetUSD,entries:prices.map((p,i)=>({stage:i+1,priceUSD:p.toFixed(),state:'active',fillEventIds:[]}))}];
   }
   try{const c=build(input,ctx,existing,newSource);c.newCount=count;candidates.push(c);audit.push({newCycles:count,status:new D(c.cashShortfallUSD).gt(0)?'rejected-cash':'cash-checked-not-simulated',cashShortfallUSD:c.cashShortfallUSD});}
   catch(error){if(!(error instanceof CycleError))throw error;audit.push({newCycles:count,status:'rejected',reason:error.code});break;}
  }
  let selected=null,stress=[];
  for(const c of [...candidates].reverse()){
   if(new D(c.cashShortfallUSD).gt(0))continue;
   const s=scenarios(input,ctx,c,policy),normal=s.filter(x=>x.name!=='failedMargin');
   const acceptable=normal.every(x=>x.completed&&x.maintenanceSurvived&&x.reservationsPreserved)&&(!policy.requireFailedMarginSurvival||s.find(x=>x.name==='failedMargin').maintenanceSurvived);
   const a=audit.find(x=>x.newCycles===c.newCount);a.status=acceptable?'validated-synthetic-scenarios':'rejected-stress';a.failedScenarios=s.filter(x=>!x.completed||!x.maintenanceSurvived||!x.reservationsPreserved).map(x=>x.name);
   a.stressFailures=s.filter(x=>!x.completed||!x.maintenanceSurvived||!x.reservationsPreserved).map(x=>({scenario:x.name,firstRiskEvent:x.firstRiskEvent,firstFailure:x.firstFailure}));
   if(acceptable){selected=c;stress=s;break;}
  }
  const failureSensitive=stress.some(s=>s.name==='failedMargin'&&!s.maintenanceSurvived);
  return freeze({plannerVersion:'v20-cycles-6.1',status:selected?(failureSensitive?'conditional-on-planned-margin':selected.newCount===0?'no-new-cycles':'synthetically-validated'):'infeasible',
   message:selected?'Resultado condicionado aos pressupostos e cenários declarados.':'Plano inviável com a caixa e as condições atuais.',profile:plan.profile,referencePriceUSD:plan.referencePriceUSD,referenceAt:plan.referenceAt,protectionFloorUSD:plan.protectionFloorUSD,
   conditionalOnPlannedMargin:failureSensitive,failedMarginSurvived:stress.length?stress.find(s=>s.name==='failedMargin').maintenanceSurvived:null,existingActiveCycles:active.size,newCycleCount:selected?.newCount??0,totalActiveCycles:active.size+(selected?.newCount||0),technicalLimit:TECHNICAL_LIMIT,configuredLimit:policy.maxCycles,
   selected,stress,audit,candidateInventory:selected?[...ctx.inventory,...selected.newSource]:null,
   reservationReplacementRequiresConfirmation:true,selectionCriterion:'Largest tested new-cycle count within explicit equal nominal budgets, levels, cash and declared stress requirements.',
   ruleVersion:input.rules.version,officialKrakenPrice:false,protectionGuaranteed:false,recommendationsAllowed:false,ordersExecuted:false,transfersPerformed:false,planApplied:false,
   limitations:['SYNTHETIC_SCENARIOS_NOT_PROBABILITIES','PROFILE_POLICY_BLOCK7','NO_FUNDING_FORECAST_BLOCK9','NO_EXIT_TARGETS_BLOCK7','MANUAL_FILL_LINKS','NO_UNSEEN_PATH_OUTSIDE_DECLARED_SCENARIOS']});
 }
 return Object.freeze({CycleError,generate,TECHNICAL_LIMIT});
});
