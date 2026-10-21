/* Block 9: deterministic synthetic time paths; no storage, live feed or orders.
 * Funding = BTC * signed USD/BTC/hour * elapsed hours. Positive rate: LONG pays.
 * Only derived hypothetical funding is compacted; source facts never change. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('decimal.js'),require('./financial-engine.js'),require('./position-risk.js'),require('./kraken-rules.js'));else root.BTCTemporalSimulator=factory(root.Decimal,root.BTCFinancialEngine,root.BTCPositionRisk,root.BTCKrakenRules);})(typeof globalThis!=='undefined'?globalThis:this,function(Decimal,Core,Risk,Rules){
 'use strict';
 const D=Decimal.clone({precision:80,rounding:Decimal.ROUND_HALF_EVEN,toExpNeg:-100,toExpPos:100}),HOUR=3600000,DAY=86400000;
 class TemporalError extends Error{constructor(code){super(code);this.name='TemporalError';this.code=code;}}
 const need=(ok,code)=>{if(!ok)throw new TemporalError(code);},clone=o=>JSON.parse(JSON.stringify(o));
 function freeze(o){if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
 function fields(o,required,optional=[]){need(o&&typeof o==='object'&&!Array.isArray(o)&&required.every(k=>Object.hasOwn(o,k))&&Object.keys(o).every(k=>required.includes(k)||optional.includes(k)),'INVALID_TEMPORAL_FIELDS');}
 function number(s,{signed=false,positive=false}={}){need(typeof s==='string'&&(signed?/^-?(0|[1-9]\d{0,19})(\.\d{1,18})?$/:/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/).test(s)&&s!=='-0','INVALID_TEMPORAL_DECIMAL');const v=new D(s);need(!positive||v.gt(0),'INVALID_TEMPORAL_AMOUNT');return v;}
 function instant(s){need(typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,19)===s.slice(0,19),'INVALID_TEMPORAL_TIMESTAMP');return Date.parse(s);}
 const iso=n=>new Date(n).toISOString(),str=n=>n.toDecimalPlaces(24).toFixed(),cash=n=>n.toDecimalPlaces(18,D.ROUND_HALF_EVEN),charge=n=>n.toDecimalPlaces(18,D.ROUND_CEIL).toFixed();
 function absoluteRate({relativeHourlyRate,indexPriceUSD}){return str(number(relativeHourlyRate,{signed:true}).mul(number(indexPriceUSD,{positive:true})));}
 function executionQuote(r,rules){
  fields(r,['side','referencePriceUSD','spreadBps','slippageBps','quantityBTC','feeRate','feeRole']);need(['buy','sell'].includes(r.side)&&['maker','taker'].includes(r.feeRole),'INVALID_EXECUTION_SCENARIO');
  const q=number(r.quantityBTC,{positive:true}),mid=number(r.referencePriceUSD,{positive:true}),spread=number(r.spreadBps),slip=number(r.slippageBps),fee=number(r.feeRate),tick=number(rules.instrument.priceTick,{positive:true});
  need(fee.lt(1)&&spread.lt(20000)&&slip.lt(10000),'INVALID_EXECUTION_COSTS');
  // The reference is an explicit mid quote; spread is the full bid/ask spread.
  const direction=r.side==='buy'?1:-1,raw=mid.mul(new D(1).add(spread.div(20000).mul(direction))).mul(new D(1).add(slip.div(10000).mul(direction)));
  const price=(r.side==='buy'?raw.div(tick).ceil():raw.div(tick).floor()).mul(tick);need(price.gt(0),'INVALID_EXECUTION_PRICE');
  need(Rules.validateOrder(rules,{quantityBTC:q.toFixed(),priceUSD:price.toFixed(),orderType:'limit'}).metadataValid,'INVALID_EXECUTION_LOT');
  return freeze({executionPriceUSD:price.toFixed(),notionalUSD:str(q.mul(price)),feeUSD:charge(q.mul(price).mul(fee)),feeRole:r.feeRole,feeRate:r.feeRate,referenceMidUSD:mid.toFixed(),spreadBps:r.spreadBps,slippageBps:r.slippageBps,officialPrice:false});
 }
 function simulate(input,request){
  input=clone(input);request=clone(request);
  need(input.ruleScenario===undefined,'NESTED_TEMPORAL_SCENARIO');const initial=Core.reconstruct(input);need(initial.ruleAssessment.scopeReady,'CURRENT_RULES_REQUIRED_AT_START');
  need(input.rules.funding?.accrual==='continuous'&&input.rules.funding?.settlement==='hour-end-or-net-position-change'&&input.rules.funding?.absoluteRateUnit==='USD-per-BTC-per-hour'&&input.rules.funding?.settledIsolatedDebit==='general-wallet','UNSUPPORTED_FUNDING_RULE_SCOPE');
  fields(request,['scenarioId','until','rulePolicy','openingAccruedFundingNetUSD','fundingPeriods','steps']);need(typeof request.scenarioId==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(request.scenarioId),'INVALID_TEMPORAL_SCENARIO_ID');
  need(request.rulePolicy==='freeze-verified-at-start','EXPLICIT_FROZEN_RULE_ASSUMPTION_REQUIRED');
  const start=instant(input.valuation.asOf),end=instant(request.until);need(end>start&&end-start<=90*DAY,'INVALID_TEMPORAL_HORIZON');
  need(Array.isArray(request.fundingPeriods)&&request.fundingPeriods.length>0&&request.fundingPeriods.length<=10000,'FUNDING_COVERAGE_REQUIRED');
  let covered=start;
  const periods=request.fundingPeriods.map(p=>{fields(p,['start','end','absoluteRateUSDPerBTCHour','source']);const a=instant(p.start),b=instant(p.end),rate=number(p.absoluteRateUSDPerBTCHour,{signed:true});need(a===covered&&b>a&&b<=end,'FUNDING_GAP_OR_OVERLAP');need(typeof p.source==='string'&&p.source.trim().length>0&&p.source.length<=200,'FUNDING_SOURCE_REQUIRED');covered=b;return {...p,a,b,rate};});need(covered===end,'FUNDING_COVERAGE_REQUIRED');
  need(Array.isArray(request.steps)&&request.steps.length<=500,'INVALID_TEMPORAL_STEPS');let previous=start;
  const steps=request.steps.map(s=>{fields(s,['at','markPriceUSD','transition','actions'],['rules','liquidationFill']);const at=instant(s.at);need(at>previous&&at<=end&&['continuous','gap'].includes(s.transition)&&Array.isArray(s.actions)&&s.actions.length<=50,'INVALID_TEMPORAL_STEP');number(s.markPriceUSD,{positive:true});previous=at;return {...s,time:at};});
  const marks=[{time:start,markPriceUSD:input.valuation.markPriceUSD},...steps];
  // End price is explicitly held after the last supplied mark, without extrapolation.
  if(marks.at(-1).time<end)marks.push({time:end,markPriceUSD:marks.at(-1).markPriceUSD,transition:'continuous',actions:[]});
  function markAt(at){let i=1;while(i<marks.length&&marks[i].time<at)i++;const b=marks[i]||marks.at(-1),a=marks[i-1]||marks[0];if(at===b.time)return number(b.markPriceUSD,{positive:true});if(b.transition==='gap')return number(a.markPriceUSD,{positive:true});return cash(number(a.markPriceUSD).add(number(b.markPriceUSD).sub(a.markPriceUSD).mul(at-a.time).div(b.time-a.time)));}
  const times=new Set([end,...periods.map(p=>p.b),...steps.map(s=>s.time)]);for(let t=Math.floor(start/HOUR)*HOUR+HOUR;t<=end;t+=HOUR)times.add(t);for(const days of [1,7,30,90])if(start+days*DAY<=end)times.add(start+days*DAY);need(times.size<=13000,'TEMPORAL_NODE_LIMIT');
  let base=clone(input),now=start,mark=number(input.valuation.markPriceUSD),pending=number(request.openingAccruedFundingNetUSD,{signed:true}),segment=new D(0),paid=new D(0),received=new D(0),settledNet=new D(0),rounding=new D(0),serial=0,periodIndex=0;
  base.valuation={kind:'synthetic',source:'explicit-temporal-scenario',markPriceUSD:mark.toFixed(),asOf:iso(start)};base.ruleScenario={mode:'frozen-rules-synthetic',referenceAt:input.valuation.asOf};base.buyRulesByEvent={...(base.buyRulesByEvent||{})};for(const e of base.events)if(e.event_type==='trade_buy'&&!Object.hasOwn(base.buyRulesByEvent,e.id.toLowerCase()))base.buyRulesByEvent[e.id.toLowerCase()]=base.rules;
  const usedIds=new Set(input.events.map(e=>e.id.toLowerCase())),usedKeys=new Set(input.events.map(e=>e.idempotency_key));
  function event(i,type,facts,at){let id,key;do{serial++;id='00000000-0000-4000-9100-'+String(serial).padStart(12,'0');key='temporal-'+request.scenarioId+'-'+serial;}while(usedIds.has(id)||usedKeys.has(key));usedIds.add(id);usedKeys.add(key);const revision=(i.events.reduce((m,e)=>BigInt(e.revision)>m?BigInt(e.revision):m,0n)+1n).toString();return {id,project_id:i.projectId,owner_id:i.ownerId,scenario_key:i.scenarioKey,origin:i.scenarioKey==='demo_long'?'demo':'manual',schema_version:1,revision,idempotency_key:key,event_type:type,effective_at:iso(at),recorded_at:iso(at),facts};}
  function appendSynthetic(e){e=clone(e);e.revision=(base.events.reduce((m,v)=>BigInt(v.revision)>m?BigInt(v.revision):m,0n)+1n).toString();base.events.push(e);}
  function fundingEvent(i,n,at){return event(i,'funding',{amountUSD:n.abs().toFixed(),currency:'USD',direction:n.lt(0)?'paid':'received',settlementId:'temporal-group-'+request.scenarioId+'-'+(++serial)},at);}
  function materialize(at,price){const i=clone(base);i.valuation={kind:'synthetic',source:'explicit-temporal-scenario',markPriceUSD:cash(price).toFixed(),asOf:iso(at)};if(!segment.eq(0))i.events.push(fundingEvent(i,segment,at));return i;}
  let current=materialize(now,mark),ledger=Core.reconstruct(current),risk=Risk.estimate(current),firstFailure=null,firstRiskEvent=null,firstReservationShortfall=null;
  const fundingTimeline=[],actionTimeline=[],checkpoints=[];
  function economic(){return {ledger,risk,accruedUnsettledNetUSD:str(pending),fundingAdjustedAvailableUSD:str(D.max(0,new D(ledger.cash.walletUSD).add(D.min(0,pending)))),economicEquityUSD:str(new D(ledger.pnl.totalEquityUSD).add(pending)),economicNetPnLUSD:str(new D(ledger.pnl.totalNetUSD).add(pending))};}
  function observe(at){const unfunded=new D(ledger.cash.unfundedReservationsUSD).add(D.max(0,D.max(0,pending.neg()).sub(ledger.cash.spendableUSD)));if(!firstReservationShortfall&&unfunded.gt(0))firstReservationShortfall={at:iso(at),amountUSD:str(unfunded)};const days=(at-start)/DAY;if([1,7,30,90].includes(days)||at===end)checkpoints.push({days,at:iso(at),...economic()});}
  if(risk.atOrBelowMaintenance){firstRiskEvent={at:iso(start),phase:'initial',estimatedBoundaryUSD:risk.estimatedPriceUSD};firstFailure={at:iso(start),code:'MAINTENANCE_ALREADY_REACHED'};}
  if(!firstFailure&&new D(ledger.cash.walletUSD).add(D.min(0,pending)).lt(0))firstFailure={at:iso(start),code:'GENERAL_WALLET_FUNDING_EXHAUSTED'};
  for(const at of [...times].sort((a,b)=>a-b)){
   if(firstFailure)break;while(periods[periodIndex].b<=now)periodIndex++;const p=periods[periodIndex],q=new D(ledger.position.quantityBTC),perHour=q.mul(p.rate),arrival=markAt(at),dt=at-now;
   let stopAt=at,stopCode=null;
   if(perHour.gt(0)&&new D(ledger.cash.walletUSD).add(pending).sub(perHour.mul(dt).div(HOUR)).lt(0)){
    const ms=D.max(0,new D(ledger.cash.walletUSD).add(pending)).mul(HOUR).div(perHour);stopAt=now+Math.max(0,Math.floor(ms.toNumber()));stopCode='GENERAL_WALLET_FUNDING_EXHAUSTED';
   }
   const step=steps.find(s=>s.time===at),isGap=step?.transition==='gap';
   if(q.gt(0)&&risk.estimatedPriceUSD!==null&&arrival.lte(risk.estimatedPriceUSD)&&mark.gt(risk.estimatedPriceUSD)&&!isGap){
    const cross=now+Math.ceil(new D(risk.estimatedPriceUSD).sub(mark).mul(dt).div(arrival.sub(mark)).toNumber());if(cross<stopAt){stopAt=cross;stopCode='MAINTENANCE_REACHED_BETWEEN_NODES';}
   }
   const duration=stopAt-now,flow=perHour.mul(duration).div(HOUR).neg();pending=pending.add(flow);if(flow.lt(0))paid=paid.sub(flow);else received=received.add(flow);
   if(stopCode){
    const price=isGap?mark:mark.add(arrival.sub(mark).mul(duration).div(dt));now=stopAt;mark=price;current=materialize(now,mark);ledger=Core.reconstruct(current);risk=Risk.estimate(current);
    firstFailure={at:iso(now),code:stopCode};if(stopCode==='MAINTENANCE_REACHED_BETWEEN_NODES')firstRiskEvent={at:iso(now),phase:'between-nodes',estimatedBoundaryUSD:risk.estimatedPriceUSD,pathAssumption:'piecewise-linear'};break;
   }
   // Settle at UTC hour-end or immediately before an explicitly executed position change.
   const positionChanges=step?.actions.some(a=>['buy','sell'].includes(a.kind)&&['filled','partial'].includes(a.outcome));
   const settle=at%HOUR===0||positionChanges||!!step?.liquidationFill,settlement=settle?cash(pending):new D(0),groups=[],descriptions=[];let settlementScheduled=false;
   if(!step&&arrival.eq(mark)){
    if(!settlement.eq(0)){segment=segment.add(settlement);settledNet=settledNet.add(settlement);rounding=rounding.add(settlement.sub(pending));pending=new D(0);fundingTimeline.push({at:iso(at),settledNetUSD:settlement.toFixed(),reason:'hour-end'});}
    now=at;mark=arrival;current=materialize(now,mark);ledger=Core.reconstruct(current);observe(at);continue;
   }
   let builder=clone(current);builder.valuation={kind:'synthetic',source:'explicit-temporal-scenario',markPriceUSD:cash(arrival).toFixed(),asOf:iso(at)};
   if(at%HOUR===0&&!settlement.eq(0)){settlementScheduled=true;const e=fundingEvent(builder,settlement,at);groups.push({outcome:'filled',events:[e]});builder.events.push(e);descriptions.push({kind:'funding-settlement',amountUSD:settlement.toFixed()});}
   for(const a of step?.actions||[]){
    need(a&&['buy','sell','margin_add','margin_remove','capital_deposit','capital_withdrawal','cost'].includes(a.kind)&&['filled','partial','unfilled','failed'].includes(a.outcome),'INVALID_TEMPORAL_ACTION');
    if(!['filled','partial'].includes(a.outcome)){groups.push({outcome:a.outcome});descriptions.push({kind:a.kind,outcome:a.outcome});continue;}
    const events=[],emit=(type,facts)=>{const e=event(builder,type,facts,at);events.push(e);builder.events.push(e);return e;};
    if(['buy','sell'].includes(a.kind)){
     fields(a,['kind','outcome','requestedQuantityBTC','filledQuantityBTC','referencePriceUSD','spreadBps','slippageBps','feeRate','feeRole'],a.kind==='buy'?['cycle']:['allocations','pnlDestination']);const requested=number(a.requestedQuantityBTC,{positive:true}),filled=number(a.filledQuantityBTC,{positive:true});need(filled.lte(requested)&&(a.outcome==='partial'?filled.lt(requested):filled.eq(requested)),'INVALID_FILL_QUANTITY');
     let settles=false;if(!settlementScheduled&&!settlement.eq(0)){const e=fundingEvent(builder,settlement,at);events.push(e);builder.events.push(e);settlementScheduled=true;settles=true;}
     const quote=executionQuote({side:a.kind,quantityBTC:a.filledQuantityBTC,referencePriceUSD:a.referencePriceUSD,spreadBps:a.spreadBps,slippageBps:a.slippageBps,feeRate:a.feeRate,feeRole:a.feeRole},builder.rules);
     const trade=emit(a.kind==='buy'?'trade_buy':'trade_sell',{symbol:'PF_XBTUSD',quantityBTC:a.filledQuantityBTC,priceUSD:quote.executionPriceUSD,executionStatus:'executed',...(a.kind==='buy'?{cycle:a.cycle}:{allocations:a.allocations,pnlDestination:a.pnlDestination})});if(new D(quote.feeUSD).gt(0))emit('fee',{amountUSD:quote.feeUSD,currency:'USD',category:'trading',tradeEventId:trade.id});descriptions.push({kind:a.kind,outcome:a.outcome,quantityBTC:a.filledQuantityBTC,quote,settlesFunding:settles});
    }else if(['margin_add','margin_remove','capital_deposit','capital_withdrawal'].includes(a.kind)){
     fields(a,['kind','outcome','amountUSD'],a.kind==='margin_add'?['purpose']:[]);need(a.outcome==='filled','PARTIAL_CASH_ACTION_UNSUPPORTED');number(a.amountUSD,{positive:true});emit(a.kind,{amountUSD:a.amountUSD,currency:'USD',...(a.kind==='margin_add'?{purpose:a.purpose}:{})});descriptions.push({kind:a.kind,amountUSD:a.amountUSD});
    }else if(a.kind==='cost'){
     fields(a,['kind','outcome','amountUSD','category']);need(a.outcome==='filled'&&['conversion','liquidation','other'].includes(a.category),'INVALID_EXPLICIT_COST');number(a.amountUSD);emit('fee',{amountUSD:a.amountUSD,currency:'USD',category:a.category});descriptions.push({kind:a.kind,category:a.category,amountUSD:a.amountUSD});
    }else need(false,'UNSUPPORTED_TEMPORAL_ACTION');
    groups.push({outcome:'filled',events});
   }
   let liquidationFill;
   if(step?.liquidationFill){
    const l=step.liquidationFill;fields(l,['quantityBTC','executionPriceUSD','allocations','pnlDestination','feeUSD']);number(l.quantityBTC,{positive:true});number(l.executionPriceUSD,{positive:true});number(l.feeUSD);const li=clone(current);li.valuation.asOf=iso(at);const events=[];
    if(!settlement.eq(0)){const e=fundingEvent(li,settlement,at);li.events.push(e);events.push(e);}
    const e=event(li,'trade_sell',{symbol:'PF_XBTUSD',quantityBTC:l.quantityBTC,priceUSD:l.executionPriceUSD,executionStatus:'executed',allocations:l.allocations,pnlDestination:l.pnlDestination},at);li.events.push(e);events.push(e);if(number(l.feeUSD).gt(0))events.push(event(li,'fee',{amountUSD:l.feeUSD,currency:'USD',category:'liquidation'},at));liquidationFill={events};
   }
   const result=Risk.simulate(current,{steps:[{at:iso(at),markPriceUSD:cash(arrival).toFixed(),transition:isGap?'gap':'continuous',actions:groups,...(step?.rules?{rules:step.rules}:{}),...(liquidationFill?{liquidationFill}:{})}]});
   let successful=result.history.filter(h=>h.phase==='after-action');let guardFailure=null,fundingSeen=false;const filledGroups=groups.filter(g=>g.outcome==='filled');
   for(let i=0;i<successful.length;i++){if(filledGroups[i].events.some(e=>e.event_type==='funding'))fundingSeen=true;const wallet=new D(successful[i].projectedLedger.cash.walletUSD);if(wallet.add(fundingSeen?0:D.min(0,pending)).lt(0)){successful=successful.slice(0,i);guardFailure={at:iso(at),code:'GENERAL_WALLET_RESERVED_FOR_ACCRUED_FUNDING'};break;}}
   const successfulGroups=groups.filter(g=>g.outcome==='filled').slice(0,successful.length),liquidation=result.history.find(h=>h.phase==='explicit-liquidation-fill'),settledApplied=!settlement.eq(0)&&(successfulGroups.some(g=>g.events.some(e=>e.event_type==='funding'))||!!liquidation);
   if(settledApplied){segment=segment.add(settlement);settledNet=settledNet.add(settlement);rounding=rounding.add(settlement.sub(pending));pending=new D(0);fundingTimeline.push({at:iso(at),settledNetUSD:settlement.toFixed(),reason:at%HOUR===0?'hour-end':'position-change'});}
   let consumed=0,nonFundingApplied=false;
   for(let index=0;index<groups.length;index++){
    const group=groups[index];if(group.outcome!=='filled'){actionTimeline.push({at:iso(at),...descriptions[index],applied:false});continue;}
    if(consumed>=successful.length)break;consumed++;if(descriptions[index].kind==='funding-settlement')continue;
    if(!nonFundingApplied){base=materialize(at,arrival);segment=new D(0);nonFundingApplied=true;}
    for(const e of group.events){if(e.event_type==='funding')continue;appendSynthetic(e);if(e.event_type==='trade_buy')base.buyRulesByEvent[e.id.toLowerCase()]=step?.rules||base.rules;}
    actionTimeline.push({at:iso(at),...descriptions[index],applied:true});
   }
   if(step?.rules)base.rules=clone(step.rules);
   now=at;mark=arrival;
   // Explicit liquidation fills have their own risk-engine phase and are never inferred.
   if(liquidation){base=materialize(at,arrival);segment=new D(0);for(const e of liquidationFill.events)if(e.event_type!=='funding')appendSynthetic(e);actionTimeline.push({at:iso(at),kind:'explicit-liquidation-fill',applied:true});}
   current=materialize(now,mark);ledger=Core.reconstruct(current);risk=Risk.estimate(current);
   if(!guardFailure&&!firstRiskEvent&&result.firstRiskEvent)firstRiskEvent={at:iso(at),...result.firstRiskEvent};
   if(guardFailure)firstFailure=guardFailure;
   else if(result.firstFailure)firstFailure={at:iso(at),code:result.firstFailure.reason,details:result.firstFailure};
   observe(at);
  }
  return freeze({temporalVersion:'v20-temporal-9.1',kind:'synthetic-scenario',status:firstFailure?'stopped-at-first-failure':'completed-declared-horizon',scenarioId:request.scenarioId,scenarioDefinition:request,sourceValuation:input.valuation,sourceEventCount:input.events.length,sourceRevision:input.events.reduce((m,e)=>BigInt(e.revision)>BigInt(m)?e.revision:m,'0'),from:input.valuation.asOf,requestedUntil:request.until,simulatedUntil:iso(now),rulePolicy:request.rulePolicy,ruleReferenceAt:input.valuation.asOf,originalRuleVersion:input.rules.version,finalRuleVersion:base.rules.version,
   funding:{openingAccruedNetUSD:request.openingAccruedFundingNetUSD,paidAccruedUSD:str(paid),receivedAccruedUSD:str(received),settledNetUSD:str(settledNet),accruedUnsettledNetUSD:str(pending),settlementRoundingNetUSD:str(rounding),timeline:fundingTimeline,positiveAccrualSpendableBeforeSettlement:false},
   final:economic(),checkpoints,actions:actionTimeline,firstFailure,firstRiskEvent,firstReservationShortfall,probabilitiesProvided:false,officialKrakenPrice:false,ledgerChanged:false,ordersExecuted:false,transfersPerformed:false,databaseWritten:false,protectionGuaranteed:false,
   assumptions:['Funding absolute rates are explicit USD/BTC/hour scenarios, not predictions or annual interest.','Frozen rules are assessed at the start, not verified for future dates.','Marks interpolate linearly between continuous nodes; gaps hold the previous mark until arrival.','General-wallet exhaustion stops the scenario; account-level liquidation is not reproduced.','Positive unsettled funding is not spendable in this conservative model.','Synthetic funding groups are compacted for calculation; source facts remain unchanged.','No fills, margin additions or liquidation costs are inferred.']});
 }
 return Object.freeze({TemporalError,absoluteRate,executionQuote,simulate});
});
