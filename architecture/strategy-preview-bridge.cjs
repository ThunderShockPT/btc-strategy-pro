/* R3.2 BTC Strategy Pro — read-only bridge to the ACTUAL V20 Kraken rule validator.
 * Does NOT use an account, modify the ledger, place trades, or silently assume future margin transfers.
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./strategy-comparison-contract.cjs'),require('../kraken-rules.js'));
 else root.BTCStrategyPreviewBridge=factory(root.BTCStrategyComparisonContract,root.BTCKrakenRules);
})(typeof globalThis!=='undefined'?globalThis:this,function(Compare,Rules){
 'use strict';
 const SCALE=1000000n,VERSION='r3.2-preview-bridge-1';
 const isDecimal=s=>typeof s==='string'&&/^(0|[1-9]\d{0,16})(\.\d{1,6})?$/.test(s);
 function units(value){if(!isDecimal(value))throw new Error('UNSUPPORTED_PREVIEW_DECIMAL');const [a,b='']=value.split('.');return BigInt(a)*SCALE+BigInt((b+'000000').slice(0,6));}
 function decimal(n){if(n<0n)throw new Error('NEGATIVE_DERIVED_AMOUNT');const a=String(n/SCALE),b=String(n%SCALE).padStart(6,'0').replace(/0+$/,'');return b?a+'.'+b:a;}
 function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 function run({request,rules:rawRules,context,riskEngine=null}){
   const model=Compare.generate(request);
   const rules=Rules.load(rawRules);
   if(!context||typeof context!=='object'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(context.asOf))throw new Error('VALIDATION_TIME_REQUIRED');
   const assessment=Rules.assess(rules,{now:context.asOf,symbol:'PF_XBTUSD',jurisdiction:'EEA',marginMode:'isolated',selectedLeverage:'10',platform:context.platform,clientType:context.clientType,collateralCurrency:'USD'});
   const minQuantity=units(rules.instrument.minQuantity),step=units(rules.instrument.quantityStep);
   if(step<=0n||minQuantity<=0n)throw new Error('INVALID_RULE_LOT');
   const orders=[];let sumQty=0n,sumNominal=0n,sumAlloc=0n;
   for(const level of model.levels){
     const nominal=units(level.nominalAllocationUSD),price=units(level.entryPriceUSD);
     const requestedQty=nominal*SCALE/price;
     const quantity=requestedQty/step*step;
     const realNominal=quantity*price/SCALE;
     const valid=Rules.validateOrder(rules,{quantityBTC:decimal(quantity),priceUSD:decimal(price),orderType:'limit'});
     const issues=[...valid.reasons];
     if(level.atOrBelowRiskFloor)issues.push('AT_OR_BELOW_RISK_FLOOR');
     if(level.belowLadderBound)issues.push('BELOW_LADDER_LOWER_BOUND');
     if(quantity===0n||quantity<minQuantity)issues.push('LOT_BELOW_MINIMUM');
     if(realNominal>nominal)throw new Error('PREVIEW_QUANTITY_OVERRUN');
     orders.push({cycle:level.cycle,stage:level.stage,entryPriceUSD:level.entryPriceUSD,allocationPercent:level.weightPercent,
        targetNominalUSD:level.nominalAllocationUSD,quantityBTC:decimal(quantity),executableNominalUSD:decimal(realNominal),unspentNominalUSD:decimal(nominal-realNominal),
        metadataValid:valid.metadataValid,blocked:issues.length>0,issues});
     sumAlloc+=nominal;sumNominal+=realNominal;sumQty+=quantity;
   }
   const reasons=[...new Set([...model.blockers.map(v=>v.code),...orders.flatMap(v=>v.issues),...assessment.reasons])];
   const quantities={targetNominalUSD:decimal(sumAlloc),executableNominalUSD:decimal(sumNominal),executableQuantityBTC:decimal(sumQty),unspentNominalUSD:decimal(sumAlloc-sumNominal)};
   let risk={status:'not-evaluated',reason:'RISK_ENGINE_NOT_PROVIDED',result:null,officialLiquidation:false};
   if(!assessment.scopeReady){risk={status:'blocked',reason:'STALE_OR_OUT_OF_SCOPE_KRAKEN_RULES',result:null,officialLiquidation:false};}
   else if(orders.some(o=>o.blocked)){risk={status:'blocked',reason:'INVALID_PRICE_OR_LOT_LADDER',result:null,officialLiquidation:false};}
   else if(riskEngine&&typeof riskEngine.requiredMarginForFloor==='function'){
     try{
       const result=riskEngine.requiredMarginForFloor({quantityBTC:quantities.executableQuantityBTC,basisUSD:quantities.executableNominalUSD,
          floorUSD:model.riskFloorUSD,bufferUSD:'0',markPriceUSD:model.referencePriceUSD,rules,
          platform:context.platform,clientType:context.clientType});
       risk={status:'v20-estimate-under-synthetic-all-fills',reason:null,result,officialLiquidation:false};
     }catch(e){risk={status:'blocked',reason:'V20_RISK_ENGINE_ERROR',code:String(e.code||e.message).slice(0,160),result:null,officialLiquidation:false};}
   }
   return freeze({schemaVersion:1,bridgeVersion:VERSION,sourceContractVersion:model.contractVersion,
      sourceRulesVersion:rules.version,sourceRulesObservedAt:rules.observedAt,validatedAt:context.asOf,
      status:'comparison-only',canApply:false,mayWriteLedger:false,maySubmitOrders:false,mayCallExchange:false,
      needsUserApproval:true,ruleAssessment:assessment,ladder:model,orders,totals:quantities,risk,
      warnings:['Snapshot Kraken rule metadata may be stale; this is NOT a trade recommendation or Kraken quotation.',
       'Hypothetical quantities show minimum-lot rounding. Orders have NOT been sent to an exchange.',
       'All-fill aggregate risk is not pathwise liquidation analysis; gaps, fees, funding and actual transfer timing are not modeled here.',
       'Planned margin increases have not been transferred and do not count as isolated collateral.']});
 }
 return Object.freeze({VERSION,run});
});