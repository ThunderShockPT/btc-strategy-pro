/* V20 Block 7: explicit net targets and synthetic exits. No orders or storage. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('decimal.js'),require('./financial-engine.js'),require('./position-risk.js'),require('./kraken-rules.js'));
 else root.BTCExitPlanner=factory(root.Decimal,root.BTCFinancialEngine,root.BTCPositionRisk,root.BTCKrakenRules);
})(typeof globalThis!=='undefined'?globalThis:this,function(Decimal,Core,Risk,Rules){
 'use strict';
 const D=Decimal.clone({precision:80,rounding:Decimal.ROUND_HALF_EVEN,toExpNeg:-100,toExpPos:100});
 class ExitError extends Error{constructor(code){super(code);this.name='ExitError';this.code=code;}}
 const need=(ok,code)=>{if(!ok)throw new ExitError(code);};
 const clone=v=>JSON.parse(JSON.stringify(v));
 function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 const str=v=>v.toDecimalPlaces(24,D.ROUND_HALF_EVEN).toFixed(),cash=v=>v.toDecimalPlaces(18,D.ROUND_CEIL).toFixed();
 function amount(v,positive=false){need(typeof v==='string'&&/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/.test(v),'INVALID_EXIT_DECIMAL');const n=new D(v);need(positive?n.gt(0):n.gte(0),'INVALID_EXIT_AMOUNT');return n;}
 function costs(r){
  need(['short','intermediate','extended'].includes(r.horizon)&&Number.isSafeInteger(r.horizonDays)&&r.horizonDays>=1&&r.horizonDays<=365,'EXPLICIT_EXIT_HORIZON_REQUIRED');
  const fee=amount(r.feeRate);need(fee.lt(1),'INVALID_EXIT_FEE_RATE');
  need(r.futureFunding&&['paid','received'].includes(r.futureFunding.direction),'FUNDING_SCENARIO_REQUIRED');
  const funding=amount(r.futureFunding.amountUSD).mul(r.futureFunding.direction==='paid'?-1:1),other=amount(r.otherCostUSD);
  return {fee,funding,other};
 }
 function scope(input,r){const ledger=Core.reconstruct(input);need(ledger.ruleAssessment.scopeReady,'CURRENT_RULES_REQUIRED');const q=amount(r.quantityBTC,true);need(q.lte(ledger.position.quantityBTC),'EXIT_EXCEEDS_OPEN_BTC');need(q.mod(input.rules.instrument.quantityStep).eq(0)&&q.gte(input.rules.instrument.minQuantity),'INVALID_EXIT_LOT');return {ledger,q};}
 function targetPrice(input,request){
  input=clone(input);request=clone(request);const {ledger,q}=scope(input,request),c=costs(request),target=amount(request.netProfitTargetUSD);
  need(!Risk.estimate(input).atOrBelowMaintenance,'EXIT_POSITION_ALREADY_AT_MAINTENANCE');
  need(['exit-net-increment','account-net-after-total-close'].includes(request.profitScope),'EXPLICIT_PROFIT_SCOPE_REQUIRED');
  const full=q.eq(ledger.position.quantityBTC);need(request.profitScope!=='account-net-after-total-close'||full,'ACCOUNT_TARGET_REQUIRES_TOTAL_CLOSE');
  const basis=new D(ledger.position.remainingBasisUSD).mul(q).div(ledger.position.quantityBTC);
  const historical=request.profitScope==='account-net-after-total-close'?new D(ledger.pnl.realizedGrossUSD).sub(ledger.pnl.feesPaidUSD).add(ledger.pnl.fundingNetUSD):new D(0);
  const raw=target.add(basis).add(c.other).sub(c.funding).sub(historical).div(q.mul(new D(1).sub(c.fee))),tick=amount(input.rules.instrument.priceTick,true);
  let price=D.max(tick,raw.div(tick).ceil().mul(tick));
  // Fee settlement uses an upward rounded decimal cash amount, so verify after rounding to a tick.
  const netAt=p=>q.mul(p).sub(basis).sub(cash(q.mul(p).mul(c.fee))).sub(c.other).add(c.funding).add(historical);
  if(netAt(price).lt(target))price=D.max(price.add(tick),target.add(basis).add(c.other).sub(c.funding).sub(historical).add('0.000000000000000001').div(q.mul(new D(1).sub(c.fee))).div(tick).ceil().mul(tick));
  need(netAt(price).gte(target),'TARGET_ROUNDING_DID_NOT_CONVERGE');amount(price.toFixed(),true);
  const valid=Rules.validateOrder(input.rules,{quantityBTC:q.toFixed(),priceUSD:price.toFixed(),orderType:'limit'});need(valid.metadataValid,'TARGET_OUTSIDE_CONTRACT_METADATA');
  return freeze({exitEngineVersion:'v20-exit-7.1',status:'synthetic-target-not-order',ruleVersion:ledger.ruleVersion,valuation:ledger.valuation,feeScenarioRate:request.feeRate,executionAdmissibility:'requires-chronological-exit-simulation',horizon:request.horizon,horizonDays:request.horizonDays,profitScope:request.profitScope,quantityBTC:q.toFixed(),
   netProfitTargetUSD:target.toFixed(),targetExecutionPriceUSD:price.toFixed(),grossExitPnLUSD:str(q.mul(price).sub(basis)),estimatedClosingFeeUSD:cash(q.mul(price).mul(c.fee)),futureFundingNetUSD:str(c.funding),otherCostUSD:c.other.toFixed(),
   estimatedNetForChosenScopeUSD:str(netAt(price)),historicalResultIncludedUSD:str(historical),knownFeesPaidUSD:ledger.pnl.feesPaidUSD,knownFundingNetUSD:ledger.pnl.fundingNetUSD,
   currentMarkMeetsTargetUnderAssumptions:netAt(new D(input.valuation.markPriceUSD)).gte(target),targetAlreadyCoveredAtZeroExecutionPrice:raw.lte(0),
   ordersExecuted:false,protectionGuaranteed:false,recommendationsAllowed:false,limitations:['NO_EXECUTION_GUARANTEE','HORIZON_IS_DECLARED_NOT_TIME_TO_PROFIT','FUTURE_COSTS_ARE_EXPLICIT_LUMP_SUMS_NOT_ACCRUAL_FORECAST','PARTIAL_EXIT_SCOPE_EXCLUDES_PAST_ACCOUNT_COSTS']});
 }
 function simulateExit(input,request){
  input=clone(input);request=clone(request);const {ledger,q}=scope(input,request),c=costs(request);
  const execution=amount(request.executionPriceUSD,true),mark=amount(request.markPriceUSD,true),release=amount(request.marginReleaseUSD);
  need(['wallet','isolated'].includes(request.pnlDestination)&&['filled','unfilled'].includes(request.outcome)&&['continuous','gap'].includes(request.transition),'EXPLICIT_EXIT_EXECUTION_SCENARIO_REQUIRED');
  need(Array.isArray(request.allocations)&&request.allocations.length>0,'EXPLICIT_CYCLE_ALLOCATIONS_REQUIRED');
  const available=new Map(ledger.position.cycles.map(e=>[e.cycle,new D(e.quantityBTC)])),seen=new Set();let sum=new D(0);
  for(const a of request.allocations){need(a&&typeof a.cycle==='string'&&!seen.has(a.cycle),'INVALID_EXIT_ALLOCATIONS');seen.add(a.cycle);const n=amount(a.quantityBTC,true);need(n.mod(input.rules.instrument.quantityStep).eq(0)&&n.lte(available.get(a.cycle)||0),'INVALID_EXIT_ALLOCATIONS');sum=sum.add(n);}
  need(sum.eq(q),'INVALID_EXIT_ALLOCATIONS');
  const valid=Rules.validateOrder(input.rules,{quantityBTC:q.toFixed(),priceUSD:execution.toFixed(),orderType:'limit'});need(valid.metadataValid,'INVALID_EXIT_EXECUTION_PRECISION');
  const at=new Date(Date.parse(input.valuation.asOf)+1000).toISOString(),ids=new Set(input.events.map(e=>e.id.toLowerCase())),keys=new Set(input.events.map(e=>e.idempotency_key));
  let serial=0,revision=input.events.reduce((m,e)=>BigInt(e.revision)>m?BigInt(e.revision):m,0n);
  function event(type,facts){let id,key;do{serial++;id='00000000-0000-4000-9000-'+String(serial).padStart(12,'0');key='v20-exit-synthetic-'+serial;}while(ids.has(id)||keys.has(key));ids.add(id);keys.add(key);return {id,project_id:input.projectId,owner_id:input.ownerId,scenario_key:input.scenarioKey,origin:input.scenarioKey==='demo_long'?'demo':'manual',schema_version:1,revision:(++revision).toString(),idempotency_key:key,event_type:type,effective_at:at,recorded_at:at,facts};}
  const actions=[];
  if(!c.funding.eq(0)){
   const refs=new Set(input.events.filter(e=>e.event_type==='funding').map(e=>e.facts.settlementId));let suffix=0,settlementId;
   do{settlementId='v20-exit-scenario-'+at+'-'+suffix++;}while(refs.has(settlementId));
   actions.push({outcome:'filled',events:[event('funding',{amountUSD:request.futureFunding.amountUSD,currency:'USD',direction:request.futureFunding.direction,settlementId})]});
  }
  if(request.outcome==='unfilled')actions.push({outcome:'unfilled'});
  else{
   const sale=event('trade_sell',{symbol:'PF_XBTUSD',executionStatus:'executed',quantityBTC:q.toFixed(),priceUSD:execution.toFixed(),allocations:request.allocations,pnlDestination:request.pnlDestination}),events=[sale];
   if(release.gt(0))events.push(event('margin_remove',{amountUSD:release.toFixed(),currency:'USD'}));
   const fee=new D(cash(q.mul(execution).mul(c.fee)));if(fee.gt(0))events.push(event('fee',{amountUSD:fee.toFixed(),currency:'USD',category:'trading',tradeEventId:sale.id}));
   if(c.other.gt(0))events.push(event('fee',{amountUSD:c.other.toFixed(),currency:'USD',category:'other'}));actions.push({outcome:'filled',events});
  }
  const result=Risk.simulate(input,{steps:[{at,markPriceUSD:mark.toFixed(),transition:request.transition,actions}]}),after=result.projectedLedger;
  const gross=new D(after.pnl.realizedGrossUSD).sub(ledger.pnl.realizedGrossUSD),fees=new D(after.pnl.feesPaidUSD).sub(ledger.pnl.feesPaidUSD),funding=new D(after.pnl.fundingNetUSD).sub(ledger.pnl.fundingNetUSD);
  return freeze({exitEngineVersion:'v20-exit-7.1',status:result.status,ruleVersion:ledger.ruleVersion,feeScenarioRate:request.feeRate,horizon:request.horizon,horizonDays:request.horizonDays,executionPriceUSD:execution.toFixed(),scenarioMarkUSD:mark.toFixed(),
   grossRealizedChangeUSD:str(gross),costChangeUSD:str(fees),fundingNetChangeUSD:str(funding),netSettledScenarioUSD:str(gross.sub(fees).add(funding)),
   remainingExposureUSD:after.position.markNotionalUSD,realizedPnLUSD:after.pnl.realizedGrossUSD,unrealizedPnLUSD:after.pnl.unrealizedGrossUSD,accumulatedCostsUSD:after.pnl.feesPaidUSD,
   before:ledger,after,remainingRisk:result.finalRisk,firstRiskEvent:result.firstRiskEvent,firstFailure:result.firstFailure,
   historyChanged:false,ordersExecuted:false,transfersPerformed:false,protectionGuaranteed:false,
   assumptions:['Hypothetical fills only; explicit cycle allocations and PnL destination.','Future funding is a declared lump sum before the sale, not time accrual.','Optional margin release is explicit and precedes closing costs in this scenario.','Global account liquidation beyond the supported isolated USD LONG model is not reproduced.']});
 }
 function compareTargets(input,requests){
  need(Array.isArray(requests)&&requests.length===3,'THREE_EXIT_HORIZONS_REQUIRED');
  const ordered=['short','intermediate','extended'].map(h=>{const matches=requests.filter(r=>r.horizon===h);need(matches.length===1,'UNIQUE_EXIT_HORIZONS_REQUIRED');return matches[0];});
  need(ordered[0].horizonDays<ordered[1].horizonDays&&ordered[1].horizonDays<ordered[2].horizonDays,'EXIT_HORIZONS_MUST_INCREASE');
  return freeze({status:'independent-explicit-cost-scenarios',targets:ordered.map(r=>targetPrice(input,r)),probabilitiesProvided:false,ordersExecuted:false});
 }
 return Object.freeze({ExitError,targetPrice,simulateExit,compareTargets});
});
