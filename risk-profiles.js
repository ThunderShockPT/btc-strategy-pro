/* V20 Block 7B: approved strict Beta policy. Pure planning; no persistence or exchange actions. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('decimal.js'),require('./financial-engine.js'),require('./cycle-planner.js'),require('./policies/profiles-beta-20261021.json'));
 else root.BTCRiskProfiles=factory(root.Decimal,root.BTCFinancialEngine,root.BTCCyclePlanner,root.BTCProfileDefinition);
})(typeof globalThis!=='undefined'?globalThis:this,function(Decimal,Core,Cycles,Definition){
 'use strict';
 const D=Decimal.clone({precision:80,rounding:Decimal.ROUND_HALF_EVEN,toExpNeg:-100,toExpPos:100}),WEIGHTS=['0.2','0.3','0.5'];
 class ProfileError extends Error{constructor(code){super(code);this.name='ProfileError';this.code=code;}}
 const need=(ok,code)=>{if(!ok)throw new ProfileError(code);};
 const clone=v=>JSON.parse(JSON.stringify(v));
 function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 const POLICY=freeze(clone(Definition));
 const str=v=>v.toDecimalPlaces(24,D.ROUND_HALF_EVEN).toFixed();
 function amount(v,positive=false){need(typeof v==='string'&&/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/.test(v),'INVALID_PROFILE_DECIMAL');const n=new D(v);need(positive?n.gt(0):n.gte(0),'INVALID_PROFILE_AMOUNT');return n;}
 function time(v){need(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v),'INVALID_PROFILE_TIME');const n=Date.parse(v);need(Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===v.slice(0,19),'INVALID_PROFILE_TIME');return n;}
 function definition(){
  need(POLICY?.schemaVersion===1&&POLICY.version==='profiles-beta-2026-10-21.1'&&POLICY.status==='approved-for-beta'&&POLICY.applicationEnabled===true&&POLICY.approvedAdmission==='strict'&&POLICY.ownerDecision?.selectedAdmission==='strict','UNREVIEWED_PROFILE_DEFINITION');
  return POLICY;
 }
 function observedMarket(market,input){
  const def=definition().parameters,now=time(input.valuation.asOf);
  need(market&&['synthetic','manual-public-observation'].includes(market.kind)&&market.symbol==='PF_XBTUSD'&&market.currency==='USD'&&typeof market.source==='string'&&market.source.trim().length>0&&market.source.length<=200,'MARKET_CONTEXT_REQUIRED');
  const quoteAt=time(market.observedAt);need(quoteAt<=now&&now-quoteAt<=def.quoteMaxAgeSeconds*1000,'STALE_OR_FUTURE_MARKET_CONTEXT');
  const bid=amount(market.bidUSD,true),ask=amount(market.askUSD,true),depth=amount(market.askDepthUSD,true);need(ask.gte(bid),'CROSSED_QUOTE');
  need(Array.isArray(market.observations)&&market.observations.length>=def.minimumObservations&&market.observations.length<=1000,'INSUFFICIENT_OBSERVATIONS');
  let previous=-Infinity,peak=new D(0),drawdown=new D(0);
  for(const o of market.observations){const t=time(o.at),p=amount(o.priceUSD,true);need(t>previous&&t<=now,'INVALID_OBSERVATION_ORDER');previous=t;peak=D.max(peak,p);drawdown=D.max(drawdown,peak.sub(p).div(peak));}
  const start=time(market.observations[0].at),end=time(market.observations.at(-1).at);
  need(end-start>=def.minimumObservationWindowSeconds*1000&&now-end<=def.maximumObservationAgeSeconds*1000,'OBSERVATION_WINDOW_INSUFFICIENT_OR_STALE');
  return {kind:market.kind,source:market.source,observedAt:market.observedAt,spreadBps:str(ask.sub(bid).div(ask.add(bid).div(2)).mul(10000)),askDepthUSD:depth.toFixed(),observedMaximumDrawdownFraction:str(drawdown),
   observationWindow:{start:market.observations[0].at,end:market.observations.at(-1).at,count:market.observations.length},interpretation:'Observed peak-to-trough drawdown only; no future probability or volatility calibration.'};
 }
 function profilePreview(input,plan,request,completedSearch,prepareOnly){
  input=clone(input);plan=clone(plan);request=clone(request);const def=definition();
  need(request&&['safe','balanced','risky'].includes(request.profile)&&['preserve','from-profile-reference'].includes(request.floorMode),'PROFILE_AND_FLOOR_DECISION_REQUIRED');
  need(['strict','conditional'].includes(request.marginAdmission),'EXPLICIT_MARGIN_ADMISSION_REQUIRED');
  need(plan.projectId?.toLowerCase()===input.projectId?.toLowerCase()&&plan.ownerId?.toLowerCase()===input.ownerId?.toLowerCase()&&plan.scenarioKey===input.scenarioKey,'PLAN_SCOPE_MISMATCH');
  need(time(plan.referenceAt)<=time(input.valuation.asOf),'INVALID_REFERENCE_TIME');
  const ledger=Core.reconstruct(input);need(ledger.ruleAssessment.scopeReady,'CURRENT_RULES_REQUIRED');
  const market=observedMarket(request.market,input),p=def.parameters.profiles[request.profile],reference=amount(plan.referencePriceUSD,true),tick=amount(input.rules.instrument.priceTick,true),capital=new D(ledger.cash.bookCashTotalUSD);
  const base=amount(def.referenceDistancesApprovedUSD[request.profile]),cap=reference.mul(p.maximumDownsideFraction),observed=reference.mul(market.observedMaximumDrawdownFraction).mul(p.observedDrawdownMultiplier);
  // Low BTC prices cap the original USD reference; excessive observed stress blocks, rather than silently truncates it.
  need(observed.lte(cap),'OBSERVED_STRESS_EXCEEDS_PROFILE_DOMAIN');const distance=D.max(D.min(base,cap),observed);
  const derivedFloor=reference.sub(distance).div(tick).floor().mul(tick);need(derivedFloor.gt(0)&&derivedFloor.lt(reference),'REFERENCE_TOO_LOW_FOR_VALID_FLOOR');
  const floor=request.floorMode==='preserve'?amount(plan.protectionFloorUSD,true):derivedFloor;need(floor.lt(reference),'INVALID_PROTECTION_FLOOR');
  need(new D(market.spreadBps).lte(p.maxSpreadBps),'SPREAD_EXCEEDS_DRAFT_PROFILE_LIMIT');
  const mark=amount(input.valuation.markPriceUSD,true),first=mark.div(tick).floor().mul(tick),spacing=D.max(reference.mul(p.reinforcementFraction),reference.mul(market.observedMaximumDrawdownFraction).mul(def.parameters.volatilitySpacingFraction)).div(tick).ceil().mul(tick);
  const cycleSpacing=reference.mul(p.cycleSpacingFraction).div(tick).ceil().mul(tick),prices=[first,first.sub(spacing),first.sub(spacing.mul(2))];
  need(prices.every(x=>x.gt(floor)),'PROFILE_LEVELS_DO_NOT_FIT_ABOVE_FLOOR');
  const minimum=D.max(...prices.map((price,i)=>price.mul(input.rules.instrument.minQuantity).div(WEIGHTS[i]))).toDecimalPlaces(2,D.ROUND_CEIL);
  const depthMaximum=new D(market.askDepthUSD).mul(p.maxDepthParticipationFraction).div('0.5');
  need(depthMaximum.gte(minimum),'OBSERVED_DEPTH_TOO_LOW_FOR_MINIMUM_CYCLE');
  const budget=D.min(D.max(minimum,capital.mul(p.nominalCycleCapitalFraction)),depthMaximum).toDecimalPlaces(2,D.ROUND_FLOOR);
  const savedBase=plan.configuration?.cycleReservationBasis?.protectedCashUSD??input.reservations?.protectedUSD??'0';
  const proposedProtected=capital.mul(p.protectedFraction).toDecimalPlaces(2,D.ROUND_CEIL),protectedCash=D.max(proposedProtected,amount(savedBase));
  const policy={...request.baseCyclePolicy,nominalCycleBudgetUSD:budget.toFixed(),firstEntryPriceUSD:first.toFixed(),reinforcementSpacingUSD:spacing.toFixed(),cycleSpacingUSD:cycleSpacing.toFixed(),protectedCashUSD:protectedCash.toFixed(),
   minimumBufferUSD:D.max('0.01',capital.mul(p.marginBufferCapitalFraction)).toDecimalPlaces(2,D.ROUND_CEIL).toFixed(),marginPlacement:def.parameters.marginPlacement,requireFailedMarginSurvival:request.marginAdmission==='strict'};
  const candidatePlan={...plan,profile:request.profile,protectionFloorUSD:floor.toFixed()};
  if(prepareOnly)return freeze({input,plan:candidatePlan,policy});
  let result;
  if(completedSearch){need(same(completedSearch.input,input)&&same(completedSearch.plan,candidatePlan)&&same(completedSearch.policy,policy),'COMPLETED_PROFILE_SEARCH_MISMATCH');result=Cycles.searchResult(completedSearch);}else result=Cycles.generate(input,candidatePlan,policy);
  const depthLimit=new D(market.askDepthUSD).mul(p.maxDepthParticipationFraction);
  need(!result.selected||result.selected.orders.every(o=>new D(o.nominalUSD).lte(depthLimit)),'EXISTING_PENDING_ORDER_EXCEEDS_DRAFT_DEPTH_LIMIT');
  const canApply=request.marginAdmission===def.approvedAdmission&&result.selected!==null;
  return freeze({profileEngineVersion:'v20-profiles-7b.1',ruleVersion:ledger.ruleVersion,valuation:ledger.valuation,policyVersion:def.version,status:request.marginAdmission!==def.approvedAdmission?'comparison-only-unapproved-admission':canApply?'beta-plan-review-ready':'infeasible-under-approved-policy',applicationEnabled:true,approvalRequired:request.marginAdmission!==def.approvedAdmission,canApply,
   profile:request.profile,label:p.label,floorMode:request.floorMode,marginAdmission:request.marginAdmission,referencePriceUSD:plan.referencePriceUSD,referenceAt:plan.referenceAt,derivedFloorUSD:derivedFloor.toFixed(),chosenFloorUSD:floor.toFixed(),
   referenceDistanceUSD:base.toFixed(),chosenDownsideFraction:str(reference.sub(floor).div(reference)),capitalBasis:'settled-wallet-plus-isolated-margin-not-unrealized-PnL',capitalBasisUSD:capital.toFixed(),
   proposedProtectedCashUSD:proposedProtected.toFixed(),preservedHigherExistingReserve:protectedCash.gt(proposedProtected),minimumExecutableCycleBudgetUSD:minimum.toFixed(),depthLimited:budget.lt(D.max(minimum,capital.mul(p.nominalCycleCapitalFraction))),
   market,cyclePolicy:policy,candidatePlan,cycles:result,historyChanged:false,planApplied:false,recommendationsAllowed:false,guaranteedProtection:false,limitations:clone(def.limitations)});
 }
 function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
 const same=(a,b)=>canonical(a)===canonical(b);
 function preview(input,plan,request){return profilePreview(input,plan,request,null,false);}
 function prepareSearch(input,plan,request){return profilePreview(input,plan,request,null,true);}
 // Completed searches are local data, not authorization; the server must verify its signed source.
 function completePreview(input,plan,request,completedSearch){return profilePreview(input,plan,request,clone(completedSearch),false);}
 return Object.freeze({ProfileError,preview,prepareSearch,completePreview,definition:()=>freeze(clone(definition()))});
});
