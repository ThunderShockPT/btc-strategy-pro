/* BTC Strategy Pro | R3.1. Comparison-only contract; NO authority to persist/submit trades. */
'use strict';
const VERSION = 'r3.1-comparison-schema-1';
const SCALE = 1000000n;
const PROFILE_DISTANCE = Object.freeze({safe:'40000',balanced:'20000',risky:'10000'});
const MODES = Object.freeze(['classic-demo','v20-base-illustrative','adjustable-preview']);
const INPUT_FIELDS = Object.freeze([
  'schemaVersion','mode','profile','referencePriceUSD','firstEntryPriceUSD',
  'riskFloorUSD','buyLadderLowerBoundUSD','cycleFirstEntryGapUSD',
  'withinCycleReinforcementGapUSD','maxCycles','nominalCycleBudgetUSD',
  'walletCashUSD','reportedIsolatedMarginUSD','plannedMarginAddsUSD','protectedCashUSD'
]);
class ContractError extends Error {constructor(code){super(code);this.name='ContractError';this.code=code;}}
function requireValue(ok,code){if(!ok)throw new ContractError(code);}
function money(v,label,positive=false){
  requireValue(typeof v==='string' && /^(0|[1-9]\d{0,13})(\.\d{1,6})?$/.test(v),'INVALID_'+label);
  const [a,b='']=v.split('.'); const n=BigInt(a)*SCALE+BigInt((b+'000000').slice(0,6));
  requireValue(!positive || n>0n,'INVALID_'+label);return n;
}
function print(n){requireValue(n>=0n,'NEGATIVE_RESULT');const s=(n/SCALE).toString(),f=(n%SCALE).toString().padStart(6,'0').replace(/0+$/,'');return f?s+'.'+f:s;}
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function generate(input){
  requireValue(input && typeof input==='object' && !Array.isArray(input),'INVALID_INPUT');
  requireValue(Object.keys(input).length===INPUT_FIELDS.length && INPUT_FIELDS.every(k=>Object.hasOwn(input,k)),'INVALID_INPUT_FIELDS');
  requireValue(input.schemaVersion===1,'UNSUPPORTED_SCHEMA');
  requireValue(MODES.includes(input.mode),'INVALID_MODE');
  requireValue(Object.hasOwn(PROFILE_DISTANCE,input.profile),'INVALID_PROFILE');
  requireValue(Number.isSafeInteger(input.maxCycles) && input.maxCycles>=1 && input.maxCycles<=12,'INVALID_CYCLE_COUNT');
  const amounts={};for(const k of INPUT_FIELDS.filter(k=>k.endsWith('USD'))) amounts[k]=money(input[k],k.toUpperCase(),!['walletCashUSD','reportedIsolatedMarginUSD','plannedMarginAddsUSD','protectedCashUSD'].includes(k));
  const {referencePriceUSD:ref,firstEntryPriceUSD:first,riskFloorUSD:floor,buyLadderLowerBoundUSD:lower}=amounts;
  requireValue(ref>floor && ref>=first && first>floor,'INVALID_PRICE_REFERENCE_OR_FLOOR');
  requireValue(lower>=floor && lower<=first,'INVALID_LADDER_LOWER_BOUND');
  const nominal=amounts.nominalCycleBudgetUSD;
  const minRef=money(PROFILE_DISTANCE[input.profile],'PROFILE_DISTANCE');
  const refFloor=ref>minRef?ref-minRef:null;
  let cycleGap=amounts.cycleFirstEntryGapUSD,step=amounts.withinCycleReinforcementGapUSD;
  if(input.mode==='classic-demo'){
    requireValue(cycleGap===money('1000','CYCLE_GAP') && step===money('8000','STAGE_GAP'),'CLASSIC_PRESET_IS_IMMUTABLE');
  }else if(input.mode==='v20-base-illustrative'){
    // Only the base percentages, never a full replacement of the volatility-aware V20 engine.
    requireValue(cycleGap===(ref*3n+999n)/1000n && step===(ref*15n+999n)/1000n,'V20_BASE_PRESET_IS_IMMUTABLE');
  }
  const weights=[2n,3n,5n],levels=[],blockers=[];
  for(let i=0;i<input.maxCycles;i++){
    for(let j=0;j<3;j++){
      const p=first-BigInt(i)*cycleGap-BigInt(j)*step;
      requireValue(p>0n,'NONPOSITIVE_ENTRY_PRICE');
      const belowFloor=p<=floor,belowLadder=p<lower;
      if(belowFloor)blockers.push({code:'ENTRY_AT_OR_BELOW_RISK_FLOOR',cycle:i+1,stage:j+1});
      if(belowLadder)blockers.push({code:'ENTRY_BELOW_LADDER_BOUND',cycle:i+1,stage:j+1});
      levels.push({cycle:i+1,stage:j+1,weightPercent:Number(weights[j])*10,
        entryPriceUSD:print(p),nominalAllocationUSD:print(nominal*weights[j]/10n),
        atOrBelowRiskFloor:belowFloor,belowLadderBound:belowLadder});
    }
  }
  const sums={walletCashUSD:print(amounts.walletCashUSD),reportedIsolatedMarginUSD:print(amounts.reportedIsolatedMarginUSD),plannedMarginAddsUSD:print(amounts.plannedMarginAddsUSD),protectedCashUSD:print(amounts.protectedCashUSD)};
  if(amounts.protectedCashUSD>amounts.walletCashUSD)blockers.push({code:'PROTECTED_RESERVE_EXCEEDS_REPORTED_WALLET'});
  // Do not double-count the future margin addition as actually deposited isolated collateral.
  const profileReferenceFloor=refFloor===null?null:print(refFloor);
  return freeze({schemaVersion:1,contractVersion:VERSION,status:'comparison-only',canApply:false,
    mayWriteLedger:false,maySubmitOrders:false,mayCallExchange:false,
    mode:input.mode,profile:input.profile,referencePriceUSD:print(ref),
    riskFloorUSD:print(floor),profileReferenceFloorUSD:profileReferenceFloor,
    riskFloorDiffersFromProfileReference:refFloor!==null && refFloor!==floor,
    buyLadderLowerBoundUSD:print(lower),cycleFirstEntryGapUSD:print(cycleGap),
    withinCycleReinforcementGapUSD:print(step),maxCycles:input.maxCycles,
    nominalCycleBudgetUSD:print(nominal),funds:sums,levels,blockers,
    warnings:[
      'These are hypothetical unfilled levels, not actual purchases or orders.',
      'Reported isolated margin excludes future planned transfers; no wallet funds are automatically margin.',
      'No Kraken tick/lot validation, live mark price, funding, fees or liquidation has been evaluated.',
      ...(input.mode==='v20-base-illustrative'?['V20 base percentages omit the higher volatility-driven spacing possible in the actual V20 engine.']:[]),
      ...(refFloor===null?['Reference price is too low to derive the profile distance without an invalid floor.']:[])
    ]});
}
module.exports=Object.freeze({VERSION,MODES,PROFILE_DISTANCE,ContractError,generate});
