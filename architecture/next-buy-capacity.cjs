/* BTC Strategy Pro R3 Owner Review: forward buying power in isolated margin.
 * READ ONLY. Uses V20 ledger/risk/rules, not a trading permission, pricing feed or order sender.
 */
'use strict';
const Decimal=require('decimal.js');
const Core=require('../financial-engine.js');
const Risk=require('../position-risk.js');
const Rules=require('../kraken-rules.js');
const D=Decimal.clone({precision:80,rounding:Decimal.ROUND_HALF_EVEN,toExpNeg:-100,toExpPos:100});
const ZERO=new D(0);
const str=x=>new D(x).toDecimalPlaces(18,D.ROUND_HALF_EVEN).toFixed();
function decimal(value,positive=false){
 if(typeof value!=='string'||!/^(0|[1-9]\d{0,17})(\.\d{1,18})?$/.test(value))throw Error('INVALID_PREVIEW_DECIMAL');
 const n=new D(value);
 if(positive?!n.gt(0):!n.gte(0))throw Error('INVALID_PREVIEW_AMOUNT');
 return n;
}
function freeze(o){if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
function nextBuyCapacity({input,entryPriceUSD,targetNominalUSD,stressFloorUSD,
 fundingPendingDebitUSD='0',extraSafetyBufferUSD='0',feeRate='0.0005',quoteCeilingNominalUSD='10000'}){
 // No external account or price connection; the caller supplies its real recorded journal and context.
 const ledger=Core.reconstruct(input),rules=Rules.load(input.rules);
 if(!ledger.ruleAssessment.scopeReady)throw Error('CURRENT_KRAKEN_RULES_REQUIRED');
 if(ledger.cash.reservationStatus!=='funded')throw Error('UNFUNDED_EXISTING_RESERVATIONS');
 const entry=decimal(entryPriceUSD,true),target=decimal(targetNominalUSD,true),floor=decimal(stressFloorUSD,true);
 const funding=decimal(fundingPendingDebitUSD),buffer=decimal(extraSafetyBufferUSD),rate=decimal(feeRate);
 const quoteCap=decimal(quoteCeilingNominalUSD,true),mark=decimal(input.valuation.markPriceUSD,true);
 if(!entry.gt(floor))throw Error('ENTRY_AT_OR_BELOW_STRESS_FLOOR');
 if(entry.gt(mark))throw Error('ENTRY_ALREADY_PASSED_REVIEW_REQUIRED');
 if(rate.gte(1))throw Error('INVALID_FEE_RATE');
 const qStep=new D(rules.instrument.quantityStep),qMin=new D(rules.instrument.minQuantity);
 const maxPosition=new D(rules.instrument.maxQuantity);
 if(!Rules.validateOrder(rules,{priceUSD:str(entry),quantityBTC:str(qMin),orderType:'limit'}).metadataValid)throw Error('INVALID_KRAKEN_PRICE_TICK');
 const wallet=decimal(ledger.cash.spendableUSD),cash=D.max(ZERO,wallet.sub(funding));
 const prevQ=decimal(ledger.position.quantityBTC),prevBasis=decimal(ledger.position.remainingBasisUSD);
 const prevMargin=decimal(ledger.cash.isolatedMarginUSD);
 const existingRequirement=Core.marginRequirements({basisUSD:str(prevBasis),rules,platform:input.platform,clientType:input.clientType});
 const previousPnlAtEntry=prevQ.mul(entry).sub(prevBasis);
 const maintenanceAtEntry=prevMargin.add(previousPnlAtEntry).sub(existingRequirement.maintenanceUSD);
 const previousUnrealizedAtMark=decimal(ledger.pnl.unrealizedGrossUSD);
 const top=Object.freeze({cashAvailableUSD:str(cash),bookWalletUSD:ledger.cash.walletUSD,
   isolatedMarginAlreadyAllocatedUSD:str(prevMargin),unrealizedPnLNowUSD:str(previousUnrealizedAtMark),
   unrealizedPnLAtFutureEntryUSD:str(previousPnlAtEntry),pendingFundingDebitUSD:str(funding),
   currentIsolatedEquityUSD:ledger.margin.isolatedEquityUSD,
   isolatedEquityBeforeFutureBuyUSD:str(prevMargin.add(previousPnlAtEntry)),
   positionMaintenanceBufferAtFutureEntryUSD:str(maintenanceAtEntry),
   source:'MANUAL_JOURNAL_AND_SYNTHETIC_TRIGGER',asOf:ledger.valuation.asOf});
 const status=(prevQ.gt(0)&&maintenanceAtEntry.lte(0))?'EXISTING_POSITION_UNSAFE_BEFORE_NEXT_BUY':
  cash.eq(0)?'NO_AVAILABLE_CASH':null;
 function candidate(quantity){
  const q=prevQ.add(quantity),basis=prevBasis.add(quantity.mul(entry));
  const unrl=q.mul(entry).sub(basis),mm=Core.marginRequirements({basisUSD:str(basis),rules,platform:input.platform,clientType:input.clientType});
  const initialEquityNeed=D.max(ZERO,new D(mm.initialUSD).sub(unrl));
  const floorNeed=Risk.requiredMarginForFloor({quantityBTC:str(q),basisUSD:str(basis),
    floorUSD:str(floor),bufferUSD:str(buffer),markPriceUSD:str(entry),rules,
    platform:input.platform,clientType:input.clientType});
  const requiredIsolated=D.max(initialEquityNeed,new D(floorNeed.requiredTotalMarginUSD),new D(mm.initialUSD));
  const extra=D.max(ZERO,requiredIsolated.sub(prevMargin));
  const nominal=quantity.mul(entry),fee=nominal.mul(rate).toDecimalPlaces(2,D.ROUND_CEIL);
  const total=extra.add(fee);
  return {quantityBTC:str(quantity),nominalUSD:str(nominal),additionalMarginUSD:str(extra),feeUSD:str(fee),
    requiredTotalIsolatedMarginUSD:str(requiredIsolated),cashUsedUSD:str(total),
    cashAfterUSD:str(D.max(ZERO,cash.sub(total))),canFund:total.lte(cash),
    projectedIsolatedEquityAtEntryUSD:str(prevMargin.add(extra).add(unrl)),
    projectedMaintenanceUSD:mm.maintenanceUSD};
 }
 const plannedUnits=target.div(entry).div(qStep).floor();
 const positionUnits=D.max(ZERO,maxPosition.sub(prevQ).div(qStep).floor());
 const capUnits=D.min(positionUnits,quoteCap.div(entry).div(qStep).floor());
 const minUnits=qMin.div(qStep).ceil();
 function evaluate(units){return candidate(units.mul(qStep));}
 let maximum=null;
 if(!status&&capUnits.gte(minUnits)){
  let lo=new D(0),hi=capUnits;
  while(lo.lt(hi)){const mid=lo.add(hi).add(1).div(2).floor();if(evaluate(mid).canFund)lo=mid;else hi=mid.sub(1);}
  if(lo.gte(minUnits))maximum=evaluate(lo);
 }
 const planned=plannedUnits.gte(minUnits)&&plannedUnits.lte(positionUnits)?evaluate(plannedUnits):null;
 const blockers=[];
 if(status)blockers.push(status);
 if(planned===null)blockers.push('TARGET_BELOW_MINIMUM_LOT_OR_POSITION_LIMIT');
 if(planned&&!planned.canFund)blockers.push('INSUFFICIENT_CASH_FOR_TARGET_AND_FLOOR_STRESS');
 if(!maximum&&!status)blockers.push('NO_EXECUTABLE_LOT_WITH_AVAILABLE_CASH');
 return freeze({schemaVersion:1,status:status||blockers.length?'not-eligible-under-model':'model-fundable-conditional',
   canApply:false,mayWriteLedger:false,mayCallExchange:false,officialKrakenBuyingPower:false,
   sourceRuleVersion:rules.version,reference:top,proposedEntryPriceUSD:str(entry),
   stressFloorUSD:str(floor),targetNominalUSD:str(target),targetEstimate:planned,
   maxAffordableEstimate:maximum,quoteCeilingNominalUSD:str(quoteCap),blockers,
   warnings:[
     'The MAX is limited by the quoted study ceiling, not an authorized trading limit.',
     'Existing position equity must survive BEFORE the next entry; no late transfers are assumed.',
     'Amounts are illustrative, with a supplied future mark at the purchase trigger and no gap or order-fill guarantee.',
     'Wallet free cash is not the same as isolated position equity; losses are not debited twice from cash.',
     'Funding, fees, earlier trades and other reservations are only as accurate as user-entered records.',
     'R3/R2 financial policy approvals and fresh Kraken rules are required before use on live orders.'
   ]});
}
module.exports=Object.freeze({nextBuyCapacity});