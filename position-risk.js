/* V20 Block 4: approximate maintenance boundaries and explicit stress paths.
 * No exchange account access, orders, transfers, storage or assumed protection. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('decimal.js'),require('./financial-engine.js'),require('./kraken-rules.js'));
 else root.BTCPositionRisk=factory(root.Decimal,root.BTCFinancialEngine,root.BTCKrakenRules);
})(typeof globalThis!=='undefined'?globalThis:this,function(Decimal,Core,Rules){
 'use strict';
 const D=Decimal.clone({precision:80,rounding:Decimal.ROUND_HALF_EVEN,toExpNeg:-100,toExpPos:100}),TOL=new D('0.00000001');
 class RiskError extends Error{constructor(code){super(code);this.name='RiskError';this.code=code;}}
 function need(ok,code){if(!ok)throw new RiskError(code);}
 function amount(value,positive=false){need(typeof value==='string'&&/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/.test(value),'INVALID_RISK_DECIMAL');const v=new D(value);need(positive?v.gt(0):v.gte(0),'INVALID_RISK_AMOUNT');return v;}
 const str=v=>v.toDecimalPlaces(24,D.ROUND_HALF_EVEN).toFixed();
 function instant(value){need(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value),'INVALID_RISK_TIMESTAMP');const n=Date.parse(value);need(Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===value.slice(0,19),'INVALID_RISK_TIMESTAMP');return n;}
 function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 function snapshot(input,includeEvents=false){
  const rebuilt=includeEvents?Core.reconstructWithEvents(input):null,ledger=rebuilt?rebuilt.ledger:Core.reconstruct(input);need(ledger.ruleAssessment.scopeReady,'RISK_RULES_UNAVAILABLE');
  const q=new D(ledger.position.quantityBTC),basis=new D(ledger.position.remainingBasisUSD),margin=new D(ledger.cash.isolatedMarginUSD),mark=new D(input.valuation.markPriceUSD);
  const req=Core.marginRequirements({basisUSD:ledger.position.remainingBasisUSD,rules:input.rules,platform:input.platform,clientType:input.clientType});
  return {ledger,q,basis,margin,mark,mm:new D(req.maintenanceUSD),im:new D(req.initialUSD),...(rebuilt?{effectiveEvents:rebuilt.effectiveEvents}:{})};
 }
 const buffer=(s,p)=>s.margin.add(s.q.mul(p)).sub(s.basis).sub(s.mm);
 function boundary(s){
  if(s.q.eq(0))return {status:'no-position',estimatedPriceUSD:null,bracket:null,iterations:0};
  if(buffer(s,new D(0)).gte(0))return {status:'no-positive-root-under-assumptions',estimatedPriceUSD:null,bracket:null,iterations:0};
  let low=new D(0),high=D.max(s.mark,s.basis.div(s.q),1),iterations=0;
  while(buffer(s,high).lt(0)){high=high.mul(2);need(++iterations<128,'ROOT_NOT_BRACKETED');}
  while(high.sub(low).gt(TOL)){
   need(++iterations<=256,'ROOT_DID_NOT_CONVERGE');const mid=low.add(high).div(2),b=buffer(s,mid);
   if(b.eq(0)){low=mid;high=mid;break;}if(b.lt(0))low=mid;else high=mid;
  }
  return {status:'estimated-maintenance-boundary',estimatedPriceUSD:low.add(high).div(2).toDecimalPlaces(8).toFixed(),
   bracket:{lowerUSD:low.toDecimalPlaces(8,D.ROUND_FLOOR).toFixed(),upperUSD:high.toDecimalPlaces(8,D.ROUND_CEIL).toFixed()},iterations};
 }
 function view(s){return {modelVersion:'v20-risk-4.1',ruleVersion:s.ledger.ruleVersion,...boundary(s),markPriceUSD:str(s.mark),maintenanceRequiredUSD:str(s.mm),initialRequiredUSD:str(s.im),
  marginUSD:str(s.margin),maintenanceBufferUSD:str(buffer(s,s.mark)),atOrBelowMaintenance:s.q.gt(0)&&buffer(s,s.mark).lte(0),
  source:'local-model',syntheticFrozenRules:s.ledger.ruleAssessment.syntheticFrozenRules,ruleAssessmentAt:s.ledger.ruleAssessment.assessedAt,officialKrakenPrice:false,guaranteedProtection:false,recommendationsAllowed:false,
  limitations:['USD_LONG_ONLY','MANUAL_FACTS','ENTRY_NOTIONAL_MARGIN','NO_EXECUTION_PRICE_GUARANTEE','NO_FUNDING_FORECAST']};}
 function estimate(input){return freeze(view(snapshot(input)));}
 function available(s,useReservedMargin){
  // Cap by actual wallet after other reservations, even if the plan is unfunded.
  const c=s.ledger.cash;
  return D.max(0,new D(c.walletUSD).sub(c.reservedOrdersUSD).sub(c.protectedUSD).sub(useReservedMargin?'0':c.reservedMarginUSD));
 }
 function requiredMarginForFloor({quantityBTC,basisUSD,floorUSD,bufferUSD='0',markPriceUSD,rules,platform,clientType}){
  need(typeof quantityBTC==='string'&&/^(0|[1-9]\d{0,39})(\.\d{1,24})?$/.test(quantityBTC),'INVALID_DERIVED_QUANTITY');
  const q=new D(quantityBTC),floor=amount(floorUSD,true),desired=amount(bufferUSD);
  const req=Core.marginRequirements({basisUSD,rules,platform,clientType});
  need(q.eq(0)?new D(basisUSD).eq(0):new D(basisUSD).gt(0),'INVALID_EMPTY_POSITION');
  const required=q.eq(0)?new D(0):D.max(0,new D(basisUSD).sub(q.mul(floor)).add(req.maintenanceUSD).add(desired));
  const initialEquityMargin=markPriceUSD===undefined?null:str(D.max(0,new D(req.initialUSD).sub(q.mul(amount(markPriceUSD,true))).add(basisUSD)));
  return freeze({requiredTotalMarginUSD:str(required),initialRequiredUSD:req.initialUSD,maintenanceRequiredUSD:req.maintenanceUSD,initialEquityRequiredMarginUSD:initialEquityMargin});
 }
 function inverse(input,{floorUSD,bufferUSD='0',useReservedMargin=false}={}){
  need(typeof useReservedMargin==='boolean','INVALID_RESERVE_POLICY');const floor=amount(floorUSD,true),desired=amount(bufferUSD),s=snapshot(input);
  const required=new D(requiredMarginForFloor({quantityBTC:str(s.q),basisUSD:str(s.basis),floorUSD,bufferUSD,rules:input.rules,platform:input.platform,clientType:input.clientType}).requiredTotalMarginUSD);
  const addition=s.q.eq(0)?new D(0):D.max(0,required.sub(s.margin)),funds=available(s,useReservedMargin),shortfall=D.max(0,addition.sub(funds));
  const late=s.q.gt(0)&&buffer(s,s.mark).lte(0),projected={...s,margin:s.margin.add(addition)};
  return freeze({modelVersion:'v20-risk-4.1',status:s.q.eq(0)?'no-position':late?'too-late-under-current-scenario':shortfall.gt(0)?'infeasible-with-current-cash':'model-fundable',
   floorUSD:str(floor),desiredBufferUSD:str(desired),requiredTotalMarginUSD:str(required),additionalMarginUSD:str(addition),availableForMarginUSD:str(funds),additionalCapitalRequiredUSD:str(shortfall),
   current: view(s),projectedAfterExplicitTransfer:view(projected),transferPerformed:false,protectionGuaranteed:false,
   note:desired.eq(0)?'Zero buffer targets the mathematical maintenance boundary, not protection.':'Fundability is conditional on the declared scenario and timely transfer.'});
 }
 function previewTransfer(input,{direction,amountUSD,minimumBufferUSD='0',useReservedMargin=false}={}){
  need(['add','remove'].includes(direction)&&typeof useReservedMargin==='boolean','INVALID_TRANSFER');
  const n=amount(amountUSD,true),minimum=amount(minimumBufferUSD),s=snapshot(input),reasons=[];
  const projected={...s,margin:direction==='add'?s.margin.add(n):s.margin.sub(n)};
  if(s.q.gt(0)&&buffer(s,s.mark).lte(0))reasons.push('TOO_LATE_UNDER_CURRENT_SCENARIO');
  if(direction==='add'&&n.gt(available(s,useReservedMargin)))reasons.push('INSUFFICIENT_UNCOMMITTED_CASH');
  if(projected.margin.lt(0))reasons.push('INSUFFICIENT_ISOLATED_MARGIN');
  if(direction==='remove'&&s.q.gt(0)&&projected.margin.add(s.q.mul(s.mark)).sub(s.basis).lt(s.im))reasons.push('INITIAL_EQUITY_REQUIRED_AFTER_WITHDRAWAL');
  if(s.q.gt(0)&&buffer(projected,s.mark).lte(minimum))reasons.push('INSUFFICIENT_MAINTENANCE_BUFFER');
  return freeze({feasibleUnderAssumptions:reasons.length===0,reasons,before:view(s),after:projected.margin.gte(0)?view(projected):null,transferPerformed:false,protectionGuaranteed:false});
 }
 function runSimulation(input,{steps}={},resume=null,maxSteps=500){
  need(Number.isSafeInteger(maxSteps)&&maxSteps>=0&&maxSteps<=500,'INVALID_STRESS_BATCH_SIZE');
  need(Array.isArray(steps)&&steps.length<=500,'INVALID_STRESS_STEPS');
  const source=resume?resume.current:input,{buyRulesByEvent:sourceBuyRules,...facts}=source;
  let current=JSON.parse(JSON.stringify(facts));
  current.rules=Rules.load(current.rules);
  if(resume){
   need(Array.isArray(resume.rulePool)&&resume.rulePool.length>0&&resume.rulePool.length<=10001&&resume.buyRuleRefs&&typeof resume.buyRuleRefs==='object','INVALID_STRESS_RULE_POOL');
   const pool=resume.rulePool.map(r=>Rules.load(r));current.buyRulesByEvent={};
   for(const [id,index]of Object.entries(resume.buyRuleRefs)){need(Number.isInteger(index)&&index>=0&&index<pool.length,'INVALID_STRESS_RULE_REFERENCE');current.buyRulesByEvent[id]=pool[index];}
  }else current.buyRulesByEvent=JSON.parse(JSON.stringify(sourceBuyRules||{}));
  let state=snapshot(current,true),previousTime=resume?resume.previousTime:instant(input.valuation.asOf),stopped=resume?resume.stopped:false,firstRiskEvent=resume?resume.firstRiskEvent:null,firstFailure=resume?resume.firstFailure:null;
  const history=resume?JSON.parse(JSON.stringify(resume.history)):[],hypotheticalIds=new Set(resume?resume.hypotheticalIds:[]),views=new WeakMap();
  function riskView(s){if(!views.has(s))views.set(s,view(s));return views.get(s);}
  for(const e of state.effectiveEvents)if(e.event_type==='trade_buy'&&Object.hasOwn(current.buyRulesByEvent,e.id.toLowerCase()))current.buyRulesByEvent[e.id.toLowerCase()]=Rules.load(current.buyRulesByEvent[e.id.toLowerCase()]);
  for(const e of current.events)if(e.event_type==='trade_buy'&&!Object.hasOwn(current.buyRulesByEvent,e.id.toLowerCase()))current.buyRulesByEvent[e.id.toLowerCase()]=current.rules;
  function fail(reason,index,phase,details={}){if(!firstFailure)firstFailure={reason,index,phase,...details};stopped=true;}
  function risk(index,phase,transition,prior,arrival){
   if(!firstRiskEvent){const root=boundary(prior);firstRiskEvent={index,phase,transition,boundary:root,arrivalMarkUSD:str(arrival),executionPriceUSD:null};}
  }
  function apply(events,index,{liquidation=false}={}){
   need(Array.isArray(events)&&events.length>0&&events.length<=50,'INVALID_ACTION_EVENTS');
   // Journal/valuation are copied. Active rules are validated/frozen; unused metadata
   // is detached from caller input and never mutated inside this simulation.
   const {rules,buyRulesByEvent,...mutable}=current;
   let candidate={...JSON.parse(JSON.stringify(mutable)),rules,buyRulesByEvent:{...buyRulesByEvent}};
   const startRevision=candidate.events.reduce((v,e)=>BigInt(e.revision)>v?BigInt(e.revision):v,0n);
   let evaluated;
   for(let j=0;j<events.length;j++){
    const e=events[j];need(e&&['margin_add','margin_remove','trade_buy','trade_sell','fee','funding','capital_deposit','capital_withdrawal'].includes(e.event_type),'JOURNAL_CORRECTION_NOT_A_MARKET_ACTION');need(e&&e.effective_at===candidate.valuation.asOf&&typeof e.id==='string'&&!hypotheticalIds.has(e.id.toLowerCase()),'INVALID_HYPOTHETICAL_EVENT');
    need(e.revision===(startRevision+BigInt(j)+1n).toString(),'NON_SEQUENTIAL_HYPOTHETICAL_REVISION');
    if(liquidation)need(['trade_sell','fee','funding'].includes(e.event_type),'INVALID_LIQUIDATION_ACTION');
    candidate.events.push(e);
    if(e.event_type==='trade_buy')candidate.buyRulesByEvent[e.id.toLowerCase()]=candidate.rules;
    try{evaluated=snapshot(candidate);}catch(error){fail(error.code||'INVALID_ACTION',index,'action');return false;}
    const equity=evaluated.margin.add(evaluated.q.mul(evaluated.mark)).sub(evaluated.basis);
    if(e.event_type==='trade_buy'&&equity.lt(evaluated.im)){fail('INSUFFICIENT_INITIAL_EQUITY',index,'action');return false;}
    if(e.event_type==='margin_remove'&&evaluated.q.gt(0)&&equity.lt(evaluated.im)){fail('INITIAL_EQUITY_REQUIRED_AFTER_WITHDRAWAL',index,'action');return false;}
    if(!liquidation&&evaluated.q.gt(0)&&buffer(evaluated,evaluated.mark).lte(0)){risk(index,'after-event','event',evaluated,evaluated.mark);fail('MAINTENANCE_AFTER_ACTION',index,'action');return false;}
   }
   // The final event already rebuilt this exact candidate; retain every post-action check.
   const next=evaluated;
   if(!liquidation&&next.q.gt(0)&&buffer(next,next.mark).lte(0)){risk(index,'after-action','event',state,next.mark);fail('MAINTENANCE_AFTER_ACTION',index,'action');return false;}
   current=candidate;state=next;for(const e of events)hypotheticalIds.add(e.id.toLowerCase());return true;
  }
  if(!resume&&state.q.gt(0)&&buffer(state,state.mark).lte(0)){risk(-1,'initial','initial',state,state.mark);fail('MAINTENANCE_ALREADY_REACHED',-1,'initial');}
  let nextIndex=resume?resume.nextIndex:0,processed=0;
  for(let index=nextIndex;index<steps.length&&!stopped&&processed<maxSteps;index++,processed++){
   nextIndex=index+1;
   const step=steps[index],at=instant(step.at),price=amount(step.markPriceUSD,true);
   need(at>previousTime&&['continuous','gap'].includes(step.transition),'INVALID_STRESS_PATH');
   need(Array.isArray(step.actions||[])&&(step.actions||[]).length<=50,'INVALID_STRESS_ACTIONS');
   const prior=state,crossed=prior.q.gt(0)&&buffer(prior,price).lte(0);
   current.valuation={kind:'synthetic',source:'explicit-stress-path',markPriceUSD:str(price),asOf:step.at};
   if(step.rules){
    need(step.rules.version!==current.rules.version||JSON.stringify(step.rules)===JSON.stringify(current.rules),'RULE_VERSION_REUSED');current.rules=Rules.load(step.rules);
   }
   state=snapshot(current);
   const breached=crossed||(state.q.gt(0)&&buffer(state,price).lte(0));
   if(breached){
    risk(index,crossed?'before-actions':'rule-change',step.transition,crossed?prior:state,price);
    if(step.liquidationFill){
     need(step.liquidationFill.events?.some(e=>e.event_type==='trade_sell'),'LIQUIDATION_FILL_REQUIRED');
     if(!apply(step.liquidationFill.events,index,{liquidation:true}))break;
     history.push({index,markPriceUSD:str(price),phase:'explicit-liquidation-fill',risk:riskView(state),projectedLedger:state.ledger,skippedActions:(step.actions||[]).length});
     if(state.q.gt(0)&&buffer(state,price).lte(0))fail('MAINTENANCE_REMAINS_AFTER_PARTIAL_FILL',index,'after-liquidation');
    }else{
     history.push({index,markPriceUSD:str(price),phase:'before-actions',risk:riskView(state),skippedActions:(step.actions||[]).length});
     fail('MAINTENANCE_REACHED_BEFORE_ACTIONS',index,'before-actions');
    }
   }else{
    need(step.liquidationFill===undefined,'UNTRIGGERED_LIQUIDATION_FILL');
    for(const action of step.actions||[]){
     need(action&&['filled','failed','unfilled'].includes(action.outcome),'ACTION_OUTCOME_REQUIRED');
     if(action.outcome!=='filled'){history.push({index,phase:'skipped-action',outcome:action.outcome});continue;}
     if(!apply(action.events,index))break;
     history.push({index,phase:'after-action',risk:riskView(state),projectedLedger:state.ledger});
    }
    if(!stopped)history.push({index,phase:'after-mark',risk:riskView(state)});
   }
   previousTime=at;
  }
  if(!stopped&&nextIndex<steps.length){
   const {buyRulesByEvent,...savedCurrent}=current,rulePool=[],indexes=new Map(),byContent=new Map(),buyRuleRefs={};
   for(const [id,rules]of Object.entries(buyRulesByEvent)){if(!indexes.has(rules)){const key=JSON.stringify(rules);if(!byContent.has(key)){byContent.set(key,rulePool.length);rulePool.push(rules);}indexes.set(rules,byContent.get(key));}buyRuleRefs[id]=indexes.get(rules);}
   if(rulePool.length===0)rulePool.push(current.rules);
   return freeze({continuation:{version:'v20-risk-path-12d9.1',current:savedCurrent,rulePool,buyRuleRefs,steps,nextIndex,previousTime,stopped,firstRiskEvent,firstFailure,history,hypotheticalIds:[...hypotheticalIds]},result:null});
  }
  return freeze({continuation:null,result:{modelVersion:'v20-risk-4.1',status:stopped?'stopped-at-first-failure':'completed-declared-path',firstRiskEvent,firstFailure,history,
   finalRisk:riskView(state),projectedLedger:state.ledger,ledgerChanged:false,ordersExecuted:false,transfersPerformed:false,protectionGuaranteed:false,
   assumptions:['Synthetic path; filled actions are explicit hypothetical assumptions.','Maintenance equality stops conservatively; this is not an official exchange execution.','Partial liquidation requires explicit supplied fills and costs.','No automatic funding forecast or unseen between-step movement.']}});
 }
 function simulate(input,path){return runSimulation(input,path).result;}
 function beginSimulation(input,path){return runSimulation(input,path,null,0);}
 function advanceSimulation(saved,{maxSteps=1}={}){
  need(saved?.version==='v20-risk-path-12d9.1'&&Number.isInteger(saved.nextIndex)&&saved.nextIndex>=0&&saved.nextIndex<=saved.steps?.length&&Number.isFinite(saved.previousTime)&&Array.isArray(saved.history)&&Array.isArray(saved.hypotheticalIds)&&saved.stopped===false,'INVALID_STRESS_CONTINUATION');
  need(Number.isSafeInteger(maxSteps)&&maxSteps>=1&&maxSteps<=500,'INVALID_STRESS_BATCH_SIZE');
  return runSimulation(saved.current,{steps:saved.steps},JSON.parse(JSON.stringify(saved)),maxSteps);
 }
 return Object.freeze({RiskError,estimate,inverse,previewTransfer,simulate,beginSimulation,advanceSimulation,requiredMarginForFloor});
});
