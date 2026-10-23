/* V20 Block 3: pure USD LONG ledger reconstruction. No API, storage or orders.
 * Decimal input facts are strings; outputs are derived, never persisted as facts. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('decimal.js'),require('./kraken-rules.js'),require('./journal-projection.js'));
 else root.BTCFinancialEngine=factory(root.Decimal,root.BTCKrakenRules,root.BTCJournalProjection);
})(typeof globalThis!=='undefined'?globalThis:this,function(Decimal,Rules,Journal){
 'use strict';
 if(!Decimal||!Rules||!Journal)throw Error('Financial engine dependencies missing');
 const D=Decimal.clone({precision:80,rounding:Decimal.ROUND_HALF_EVEN,toExpNeg:-100,toExpPos:100});
 const ZERO=new D(0),EPSILON=new D('0.000000000000000000000000000000000000000000000000000000000001');
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const TYPES=['opening_balance','capital_deposit','capital_withdrawal','margin_add','margin_remove','trade_buy','trade_sell','fee','funding','correction','void','reversal'];
 class FinancialError extends Error{
  constructor(code,eventId=null){super(code+(eventId?' ['+eventId+']':''));this.name='FinancialError';this.code=code;this.eventId=eventId;}
 }
 const insist=(condition,code,id)=>{if(!condition)throw new FinancialError(code,id);};
 function decimal(value,{positive=false}={}){
  insist(typeof value==='string'&&/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/.test(value),'INVALID_DECIMAL');
  const d=new D(value);insist(positive?d.gt(0):d.gte(0),'INVALID_AMOUNT');return d;
 }
 function uuid(value){insist(typeof value==='string'&&UUID.test(value),'INVALID_UUID');return value.toLowerCase();}
 function time(value){
  insist(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value),'INVALID_TIMESTAMP');
  const ms=Date.parse(value);insist(Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,19)===value.slice(0,19),'INVALID_TIMESTAMP');return ms;
 }
 function fmt(d){return d.toDecimalPlaces(24,D.ROUND_HALF_EVEN).toFixed();}
 function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 function keys(facts,required,optional=[]){
  insist(facts&&typeof facts==='object'&&!Array.isArray(facts),'INVALID_FACTS');
  insist(required.every(k=>Object.hasOwn(facts,k))&&Object.keys(facts).every(k=>required.includes(k)||optional.includes(k)),'INVALID_FACT_FIELDS');
 }
 function calculateMargin(basis,levels){
  const level=levels.reduce((chosen,l)=>basis.gte(l.lowerBoundUSD)?l:chosen,levels[0]);
  return {initial:basis.mul(D.max(new D(level.initialRate),new D(1).div(10))),maintenance:basis.mul(level.maintenanceRate),level};
 }
 function marginRequirements({basisUSD,rules,platform,clientType}){
  insist(typeof basisUSD==='string'&&/^(0|[1-9]\d{0,39})(\.\d{1,24})?$/.test(basisUSD),'INVALID_DERIVED_BASIS');
  const result=calculateMargin(new D(basisUSD),Rules.selectSchedule(rules,platform,clientType));
  return freeze({initialUSD:fmt(result.initial),maintenanceUSD:fmt(result.maintenance),initialRate:result.level.initialRate,maintenanceRate:result.level.maintenanceRate});
 }
 function valuationContext(input,valuation,rules){
  insist(valuation&&['synthetic','public_mark','manual_mark'].includes(valuation.kind),'MARK_PRICE_REQUIRED');
  insist(typeof valuation.source==='string'&&valuation.source.trim().length>0&&valuation.source.length<=200,'PRICE_SOURCE_REQUIRED');
  const mark=decimal(valuation.markPriceUSD,{positive:true}),asOf=time(valuation.asOf);
  let assessmentAt=valuation.asOf;
  if(input.ruleScenario!==undefined){
   keys(input.ruleScenario,['mode','referenceAt']);
   insist(input.ruleScenario.mode==='frozen-rules-synthetic'&&valuation.kind==='synthetic','INVALID_RULE_SCENARIO');
   insist(time(input.ruleScenario.referenceAt)<=asOf,'RULE_SCENARIO_FROM_FUTURE');assessmentAt=input.ruleScenario.referenceAt;
  }
  const eligibility=Rules.assess(rules,{now:assessmentAt,symbol:'PF_XBTUSD',jurisdiction:'EEA',marginMode:'isolated',selectedLeverage:'10',platform:input.platform,clientType:input.clientType,collateralCurrency:'USD'});
  const blockingReasons=eligibility.reasons.slice(0,eligibility.reasons.length-rules.limitations.length);
  const staleBookkeeping=input.bookkeepingOnly===true&&blockingReasons.length===1&&blockingReasons[0]==='STALE_RULES';
  insist(eligibility.scopeReady||staleBookkeeping,'RULES_OUT_OF_SCOPE_OR_STALE');
  return {valuation,mark,asOf,assessmentAt,eligibility,blockingReasons};
 }
 function rebuild(input,includeEvents=false,prepare=false){
  insist(input&&UUID.test(input.projectId)&&UUID.test(input.ownerId),'INVALID_SCOPE');
  insist(['manual_long','demo_long'].includes(input.scenarioKey),'UNREVIEWED_LEGACY_SCENARIO');
  insist(Array.isArray(input.events)&&input.events.length<=10000,'INVALID_EVENT_COUNT');
  // Exact timestamp strings are immutable. Validate each distinct string once per
  // replay; chronology is still checked independently for every source fact.
  const timestamps=new Map();
  function eventTime(value){if(!timestamps.has(value))timestamps.set(value,time(value));return timestamps.get(value);}
  const rules=Rules.load(input.rules);
  const {valuation,asOf,assessmentAt}=valuationContext(input,input.valuation,rules);
  const levels=Rules.selectSchedule(rules,input.platform,input.clientType);
  function requirements(basis){
   return calculateMargin(basis,levels);
  }
  const projectId=uuid(input.projectId),ownerId=uuid(input.ownerId);
  const ids=new Set(),revisions=new Set(),idempotency=new Set();
  const validated=input.events.map(event=>{
   insist(event&&typeof event.id==='string'&&UUID.test(event.id)&&!ids.has(event.id.toLowerCase()),'DUPLICATE_OR_INVALID_EVENT_ID',event?.id);ids.add(event.id.toLowerCase());
   insist(uuid(event.project_id)===projectId&&uuid(event.owner_id)===ownerId&&event.scenario_key===input.scenarioKey,'EVENT_SCOPE_MISMATCH',event.id);
   insist(event.origin===(input.scenarioKey==='manual_long'?'manual':'demo'),'EVENT_ORIGIN_MISMATCH',event.id);
   insist(event.schema_version===1,'UNSUPPORTED_EVENT_SCHEMA',event.id);
   insist(typeof event.revision==='string'&&/^[1-9]\d{0,18}$/.test(event.revision)&&BigInt(event.revision)<=9223372036854775807n&&!revisions.has(event.revision),'DUPLICATE_OR_INVALID_REVISION',event.id);revisions.add(event.revision);
   insist(typeof event.idempotency_key==='string'&&event.idempotency_key.length>0&&event.idempotency_key.length<=128&&!idempotency.has(event.idempotency_key),'DUPLICATE_OR_INVALID_IDEMPOTENCY_KEY',event.id);idempotency.add(event.idempotency_key);
   insist(TYPES.includes(event.event_type),'UNSUPPORTED_EVENT_TYPE',event.id);
   const effective=eventTime(event.effective_at);eventTime(event.recorded_at);
   insist(effective<=asOf,'FUTURE_EVENT_REQUIRES_PLAN',event.id);
   return {event,effective,revision:BigInt(event.revision)};
  });
  const projection=Journal.project(validated.map(v=>v.event));
  const sorted=projection.events.map(event=>{const effective=eventTime(event.effective_at);insist(effective<=asOf,'FUTURE_EVENT_REQUIRES_PLAN',event.id);return {event,effective,revision:BigInt(event.revision)};}).sort((a,b)=>a.effective-b.effective||(a.revision<b.revision?-1:a.revision>b.revision?1:0));
  let opened=false,wallet=ZERO,margin=ZERO,quantity=ZERO,basis=ZERO,realized=ZERO,fees=ZERO,fundingNet=ZERO;
  let initialCapital=ZERO,deposits=ZERO,withdrawals=ZERO,marginAdded=ZERO,marginRemoved=ZERO,extraMargin=ZERO;
  let acquisition=ZERO,saleNotional=ZERO,allocatedBasis=ZERO;
  const cycleQty=new Map(),trades=new Map(),feeRefs=new Set(),fundingRefs=new Set(),trace=[];
  function verify(id){
   insist(wallet.gte(0),'INSUFFICIENT_WALLET',id);insist(margin.gte(0),'INSUFFICIENT_ISOLATED_MARGIN',id);
   insist(quantity.gte(0)&&basis.gte(0)&&(!quantity.eq(0)||basis.eq(0)),'INVALID_POSITION',id);
   const expected=initialCapital.add(deposits).sub(withdrawals).add(realized).sub(fees).add(fundingNet);
   insist(wallet.add(margin).sub(expected).abs().lte(EPSILON),'CASH_CONSERVATION_FAILURE',id);
   const cycles=Array.from(cycleQty.values()).reduce((sum,q)=>sum.add(q),ZERO);
   insist(cycles.eq(quantity),'CYCLE_QUANTITY_FAILURE',id);
  }
  for(const {event:e}of sorted){
   try{
    const f=e.facts,type=e.event_type;
    insist(opened||type==='opening_balance','OPENING_BALANCE_REQUIRED',e.id);
    if(['opening_balance','capital_deposit','capital_withdrawal','margin_add','margin_remove'].includes(type)){
     keys(f,['amountUSD','currency'],['source','note',...(type==='margin_add'?['purpose']:[])]);insist(f.currency==='USD','UNSUPPORTED_CURRENCY',e.id);
     for(const [field,max]of [['source',120],['note',500]])if(f[field]!==undefined)insist(typeof f[field]==='string'&&f[field].trim().length>0&&f[field].length<=max&&!/[\u0000-\u001f\u007f]/.test(f[field]),'INVALID_MOVEMENT_METADATA',e.id);
     const amount=decimal(f.amountUSD,{positive:type!=='opening_balance'});
     if(type==='opening_balance'){insist(!opened,'DUPLICATE_OPENING_BALANCE',e.id);opened=true;initialCapital=amount;wallet=wallet.add(amount);}
     if(type==='capital_deposit'){deposits=deposits.add(amount);wallet=wallet.add(amount);}
     if(type==='capital_withdrawal'){withdrawals=withdrawals.add(amount);wallet=wallet.sub(amount);}
     if(type==='margin_add'){
      insist(['initial','additional'].includes(f.purpose),'MARGIN_PURPOSE_REQUIRED',e.id);
      wallet=wallet.sub(amount);margin=margin.add(amount);marginAdded=marginAdded.add(amount);if(f.purpose==='additional')extraMargin=extraMargin.add(amount);
     }
     if(type==='margin_remove'){margin=margin.sub(amount);wallet=wallet.add(amount);marginRemoved=marginRemoved.add(amount);}
    }else if(type==='trade_buy'||type==='trade_sell'){
     keys(f,['symbol','quantityBTC','priceUSD','executionStatus'],type==='trade_sell'?['cycle','allocations','pnlDestination']:['cycle']);
     insist(f.symbol==='PF_XBTUSD','WRONG_CONTRACT',e.id);
     insist(f.executionStatus==='executed','UNEXECUTED_TRADE_REQUIRES_PLAN',e.id);
     const validCycle=value=>typeof value==='string'&&/^cycle-[1-9]\d{0,5}$/.test(value);
     const q=decimal(f.quantityBTC,{positive:true}),price=decimal(f.priceUSD,{positive:true});
     const metadata=Rules.validateOrder(rules,{quantityBTC:q.toFixed(),priceUSD:price.toFixed(),orderType:'limit'});
     insist(metadata.metadataValid,'INVALID_FILL_PRECISION_OR_INSTRUMENT',e.id);
     const notional=q.mul(price);
     if(type==='trade_buy'){
      insist(validCycle(f.cycle),'INVALID_CYCLE',e.id);const cq=cycleQty.get(f.cycle)||ZERO;
      quantity=quantity.add(q);basis=basis.add(notional);acquisition=acquisition.add(notional);cycleQty.set(f.cycle,cq.add(q));
      insist(quantity.lte(rules.instrument.maxQuantity),'POSITION_LIMIT_EXCEEDED',e.id);
      let buyRequirements=requirements(basis);
      if(input.buyRulesByEvent&&Object.hasOwn(input.buyRulesByEvent,e.id.toLowerCase())){
       const historical=input.buyRulesByEvent[e.id.toLowerCase()];
       const valid=Rules.assess(historical,{now:input.ruleScenario&&(eventTime(e.effective_at)>eventTime(assessmentAt)||eventTime(historical.observedAt)>eventTime(e.effective_at))?assessmentAt:e.effective_at,symbol:'PF_XBTUSD',jurisdiction:'EEA',marginMode:'isolated',selectedLeverage:'10',platform:input.platform,clientType:input.clientType,collateralCurrency:'USD'});
       insist(valid.scopeReady,'HISTORICAL_RULES_INVALID',e.id);
       buyRequirements=calculateMargin(basis,Rules.selectSchedule(historical,input.platform,input.clientType));
      }
      insist(margin.gte(buyRequirements.initial),'INITIAL_MARGIN_NOT_ALLOCATED',e.id);
     }else{
      insist(q.lte(quantity),'SELL_EXCEEDS_AVAILABLE_BTC',e.id);
      insist(['wallet','isolated'].includes(f.pnlDestination),'PNL_DESTINATION_REQUIRED',e.id);
      let allocations;
      if(f.allocations===undefined){insist(validCycle(f.cycle),'INVALID_CYCLE',e.id);allocations=[{cycle:f.cycle,quantityBTC:f.quantityBTC}];}
      else {insist(f.cycle===undefined&&Array.isArray(f.allocations)&&f.allocations.length>0&&f.allocations.length<=1000,'INVALID_SELL_ALLOCATIONS',e.id);allocations=f.allocations;}
      let allocatedQty=ZERO;const seenCycles=new Set();
      for(const allocation of allocations){
       keys(allocation,['cycle','quantityBTC']);insist(validCycle(allocation.cycle)&&!seenCycles.has(allocation.cycle),'INVALID_SELL_ALLOCATIONS',e.id);seenCycles.add(allocation.cycle);
       const aq=decimal(allocation.quantityBTC,{positive:true}),available=cycleQty.get(allocation.cycle)||ZERO;
       insist(aq.mod(rules.instrument.quantityStep).eq(0),'INVALID_SELL_ALLOCATIONS',e.id);
       insist(aq.lte(available),'SELL_EXCEEDS_AVAILABLE_BTC',e.id);allocatedQty=allocatedQty.add(aq);
      }
      insist(allocatedQty.eq(q),'INVALID_SELL_ALLOCATIONS',e.id);
      const soldBasis=q.eq(quantity)?basis:basis.mul(q).div(quantity),gross=notional.sub(soldBasis);
      quantity=quantity.sub(q);basis=basis.sub(soldBasis);allocatedBasis=allocatedBasis.add(soldBasis);realized=realized.add(gross);saleNotional=saleNotional.add(notional);
      for(const allocation of allocations)cycleQty.set(allocation.cycle,cycleQty.get(allocation.cycle).sub(allocation.quantityBTC));
      if(f.pnlDestination==='wallet')wallet=wallet.add(gross);else margin=margin.add(gross);
     }
     trades.set(e.id.toLowerCase(),{type,cycle:f.cycle});
    }else if(type==='fee'){
     keys(f,['amountUSD','currency','category'],['tradeEventId']);insist(f.currency==='USD','UNSUPPORTED_CURRENCY',e.id);
     insist(['trading','conversion','liquidation','other'].includes(f.category),'INVALID_FEE_CATEGORY',e.id);
     if(f.category==='trading'){
      insist(typeof f.tradeEventId==='string'&&trades.has(f.tradeEventId.toLowerCase()),'FEE_TRADE_REFERENCE_REQUIRED',e.id);
      insist(!feeRefs.has(f.tradeEventId.toLowerCase()),'DUPLICATE_TRADE_FEE',e.id);feeRefs.add(f.tradeEventId.toLowerCase());
     }else insist(f.tradeEventId===undefined,'INVALID_FEE_REFERENCE',e.id);
     const amount=decimal(f.amountUSD);wallet=wallet.sub(amount);fees=fees.add(amount);
    }else if(type==='funding'){
     keys(f,['amountUSD','currency','direction','settlementId']);insist(f.currency==='USD','UNSUPPORTED_CURRENCY',e.id);
     insist(['paid','received'].includes(f.direction),'INVALID_FUNDING_DIRECTION',e.id);
     insist(typeof f.settlementId==='string'&&f.settlementId.length>0&&f.settlementId.length<=128&&!fundingRefs.has(f.settlementId),'DUPLICATE_OR_INVALID_FUNDING_PERIOD',e.id);fundingRefs.add(f.settlementId);
     const amount=decimal(f.amountUSD),delta=f.direction==='paid'?amount.neg():amount;wallet=wallet.add(delta);fundingNet=fundingNet.add(delta);
    }
    verify(e.id);
    if(input.includeTrace)trace.push({eventId:e.id,walletUSD:fmt(wallet),isolatedMarginUSD:fmt(margin),quantityBTC:fmt(quantity),remainingBasisUSD:fmt(basis),realizedGrossUSD:fmt(realized)});
   }catch(error){if(error instanceof FinancialError&&error.eventId===null)error.eventId=e.id;throw error;}
  }
  insist(opened,'OPENING_BALANCE_REQUIRED');
  // This closure holds exact Decimal accumulators, never rounded ledger outputs.
  // Capture only immutable valuation context; callers cannot change its source facts.
  const valuationInput={scenarioKey:input.scenarioKey,platform:input.platform,clientType:input.clientType,bookkeepingOnly:input.bookkeepingOnly,
   reservations:input.reservations?{...input.reservations}:input.reservations,ruleScenario:input.ruleScenario===undefined?undefined:{...input.ruleScenario},events:{length:input.events.length}};
  function render(nextValuation){
   const input=valuationInput;
   const {valuation,mark,asOf:nextAsOf,assessmentAt,eligibility,blockingReasons}=valuationContext(input,nextValuation,rules);
   insist(nextAsOf>=asOf,'VALUATION_BEFORE_VALIDATED_BASIS');
   const req=requirements(basis),unrealized=quantity.mul(mark).sub(basis),isolatedEquity=margin.add(unrealized);
   const reservations=input.reservations||{ordersUSD:'0',marginUSD:'0',protectedUSD:'0'};
   keys(reservations,['ordersUSD','marginUSD','protectedUSD']);
   const orders=decimal(reservations.ordersUSD),reservedMargin=decimal(reservations.marginUSD),protectedCash=decimal(reservations.protectedUSD);
   const totalReserved=orders.add(reservedMargin).add(protectedCash),free=wallet.sub(totalReserved);
   const netContributions=initialCapital.add(deposits).sub(withdrawals),netResult=realized.add(unrealized).sub(fees).add(fundingNet);
   const equity=wallet.add(margin).add(unrealized);
   insist(equity.sub(netContributions.add(netResult)).abs().lte(EPSILON),'EQUITY_CONSERVATION_FAILURE');
   const ledger=freeze({engineVersion:'v20-core-9.1',ruleVersion:rules.version,status:input.ruleScenario?'synthetic-frozen-rules':eligibility.scopeReady?'approximate-manual-ledger':'bookkeeping-only-stale-rules',
    ruleAssessment:{scopeReady:eligibility.scopeReady,reasons:blockingReasons,marginFiguresCurrent:eligibility.scopeReady&&!input.ruleScenario,syntheticFrozenRules:!!input.ruleScenario,assessedAt:assessmentAt},
    journal:{sourceEventCount:input.events.length,correctionCount:projection.correctionCount,activeFactCount:projection.events.length,localAdjustmentsOnly:true},
    inputMode:input.scenarioKey==='manual_long'?'manual':'demo',valuation:{...valuation},
    capital:{initialUSD:fmt(initialCapital),addedUSD:fmt(deposits),withdrawnUSD:fmt(withdrawals),netContributedUSD:fmt(netContributions)},
    cash:{walletUSD:fmt(wallet),isolatedMarginUSD:fmt(margin),bookCashTotalUSD:fmt(wallet.add(margin)),spendableUSD:fmt(D.max(0,free)),unfundedReservationsUSD:fmt(D.max(0,free.neg())),
     reservedOrdersUSD:fmt(orders),reservedMarginUSD:fmt(reservedMargin),protectedUSD:fmt(protectedCash),reservationStatus:free.gte(0)?'funded':'unfunded',
     marginTransferredInUSD:fmt(marginAdded),marginTransferredOutUSD:fmt(marginRemoved),additionalMarginTransferredUSD:fmt(extraMargin)},
    position:{symbol:'PF_XBTUSD',quantityBTC:fmt(quantity),remainingBasisUSD:fmt(basis),averageEntryUSD:quantity.gt(0)?fmt(basis.div(quantity)):null,
     markNotionalUSD:fmt(quantity.mul(mark)),acquisitionNotionalUSD:fmt(acquisition),saleNotionalUSD:fmt(saleNotional),allocatedBasisUSD:fmt(allocatedBasis),
     cycles:Array.from(cycleQty.entries()).filter(([,q])=>q.gt(0)).sort(([a],[b])=>BigInt(a.slice(6))<BigInt(b.slice(6))?-1:1).map(([cycle,q])=>({cycle,quantityBTC:fmt(q)}))},
    pnl:{realizedGrossUSD:fmt(realized),unrealizedGrossUSD:fmt(unrealized),feesPaidUSD:fmt(fees),fundingNetUSD:fmt(fundingNet),totalNetUSD:fmt(netResult),totalEquityUSD:fmt(equity)},
    margin:{selectedLeverage:'10',initialRequiredUSD:fmt(req.initial),maintenanceRequiredUSD:fmt(req.maintenance),isolatedEquityUSD:fmt(isolatedEquity),maintenanceBufferUSD:fmt(isolatedEquity.sub(req.maintenance)),
     initialCollateralShortfallUSD:fmt(D.max(0,req.initial.sub(margin))),maintenanceStatus:quantity.eq(0)?'no-position':isolatedEquity.lt(req.maintenance)?'breached':'not-breached-at-mark',
     effectiveEntryLeverage:quantity.gt(0)&&isolatedEquity.gt(0)?fmt(basis.div(isolatedEquity)):null,
     markExposureToIsolatedEquity:quantity.gt(0)&&isolatedEquity.gt(0)?fmt(quantity.mul(mark).div(isolatedEquity)):null,
     unreturnedMarginUSD:quantity.eq(0)?fmt(margin):'0',estimatedLiquidationUSD:null},
    precision:{inputDecimals:18,calculationSignificantDigits:80,outputDecimals:24,rounding:'half-even'},
    limitations:['LIQUIDATION_ENGINE_BLOCK4','INTRADAY_PATH_NOT_VALIDATED','OPEN_ORDER_ADMISSIBILITY_BLOCK4','FUNDING_ACCRUAL_REQUIRES_TEMPORAL_SCENARIO','MANUAL_FACTS_NOT_EXCHANGE_VERIFIED','RESERVATIONS_ARE_PLAN_OVERLAYS'],
    recommendationsAllowed:false,ordersAllowed:false,transfersAllowed:false,trace});
   return ledger;
  }
  const ledger=render(valuation);
  if(prepare)return Object.freeze({ledger,effectiveEvents:projection.events,atValuation:render});
  return includeEvents?Object.freeze({ledger,effectiveEvents:projection.events}):ledger;
 }
 function reconstruct(input){return rebuild(input);}
 function reconstructWithEvents(input){return rebuild(input,true);}
 function prepareValuations(input){return rebuild(input,true,true);}
 function effectiveEvents(input){return reconstructWithEvents(input).effectiveEvents;}
 return Object.freeze({FinancialError,reconstruct,reconstructWithEvents,prepareValuations,marginRequirements,effectiveEvents});
});
