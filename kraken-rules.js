/* V20 Block 1: read-only contract metadata. No balances, orders or transfers.
 * Decimal strings are compared exactly; this is NOT the financial engine. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BTCKrakenRules=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCALE=10n**16n;
 class RulesError extends Error {
  constructor(code){super(code);this.name='RulesError';this.code=code;}
 }
 function requireThat(ok,code){if(!ok)throw new RulesError(code);}
 function units(value){
  requireThat(typeof value==='string'&&/^(0|[1-9]\d{0,23})(\.\d{1,16})?$/.test(value),'INVALID_DECIMAL');
  const [whole,fraction='']=value.split('.');
  return BigInt(whole)*SCALE+BigInt(fraction.padEnd(16,'0'));
 }
 function timestamp(value){
  requireThat(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value),'INVALID_TIMESTAMP');
  const t=Date.parse(value);
  requireThat(Number.isFinite(t)&&new Date(t).toISOString().slice(0,19)===value.slice(0,19),'INVALID_TIMESTAMP');
  return t;
 }
 function freeze(value){
  if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}
  return value;
 }
 function load(input){
  requireThat(input&&input.schemaVersion===1&&input.jurisdiction==='EEA'&&input.symbol==='PF_XBTUSD','UNSUPPORTED_RULESET');
  requireThat(input.base==='BTC'&&input.quote==='USD'&&input.product==='linear-multi-m-perpetual','UNSUPPORTED_RULESET');
  requireThat(typeof input.version==='string'&&input.version.length>0&&input.status==='partial','UNSUPPORTED_RULESET');
  requireThat(input.marginMode==='isolated'&&input.selectedLeverage==='10','UNSUPPORTED_RULESET');
  timestamp(input.observedAt);
  const policy=input.applicationPolicy;
  requireThat(policy&&policy.specificRiskRecommendationsEnabled===false&&policy.orderExecutionEnabled===false&&policy.transfersEnabled===false,'UNSUPPORTED_CAPABILITY');
  requireThat(Number.isSafeInteger(policy.reviewMaxAgeSeconds)&&policy.reviewMaxAgeSeconds>0&&policy.reviewMaxAgeSeconds<=86400,'INVALID_REVIEW_POLICY');
  requireThat(Array.isArray(input.sources)&&input.sources.length>0,'MISSING_SOURCES');
  const sourceIds=new Set();
  for(const source of input.sources){
   requireThat(typeof source.id==='string'&&!sourceIds.has(source.id),'INVALID_SOURCE');
   let url;try{url=new URL(source.url);}catch{throw new RulesError('INVALID_SOURCE');}
   requireThat(url.protocol==='https:'&&!url.username&&!url.password&&['support.kraken.com','docs.kraken.com','futures.kraken.com','www.kraken.com'].includes(url.hostname),'INVALID_SOURCE');
   sourceIds.add(source.id);
  }
  const instrument=input.instrument, margin=input.margin;
  requireThat(instrument&&margin,'MISSING_RULES');
  for(const group of [instrument,margin,input.funding,input.fees]){
   requireThat(group&&Array.isArray(group.sources)&&group.sources.length>0&&group.sources.every(id=>sourceIds.has(id)),'MISSING_SOURCES');
  }
  const min=units(instrument.minQuantity),step=units(instrument.quantityStep),tick=units(instrument.priceTick),max=units(instrument.maxQuantity);
  requireThat(min>0n&&step>0n&&tick>0n&&max>=min&&min%step===0n,'INVALID_INSTRUMENT');
  requireThat(['tradeable','suspended','postOnly'].every(key=>typeof instrument[key]==='boolean'),'INVALID_INSTRUMENT');
  requireThat(margin.thresholdUnit==='USD'&&margin.thresholdConvention==='lower-inclusive'&&margin.valuationBasis==='entry-notional','UNSUPPORTED_MARGIN_BASIS');
  requireThat(Array.isArray(input.supportedSchedulePlatforms)&&input.supportedSchedulePlatforms.length===2&&new Set(input.supportedSchedulePlatforms).size===2&&input.supportedSchedulePlatforms.every(p=>['europa','europa_crypto'].includes(p)),'UNSUPPORTED_PLATFORM');
  requireThat(Array.isArray(input.supportedClientTypes)&&input.supportedClientTypes.length===2&&new Set(input.supportedClientTypes).size===2&&input.supportedClientTypes.every(p=>['retail','professional'].includes(p)),'UNSUPPORTED_CLASSIFICATION');
  for(const platform of input.supportedSchedulePlatforms){
   for(const kind of input.supportedClientTypes){
    const levels=margin.schedules?.[platform]?.[kind];
    requireThat(Array.isArray(levels)&&levels.length>0,'MISSING_PLATFORM_SCHEDULE');
    let previous=-1n;
    for(const level of levels){
     const lower=units(level.lowerBoundUSD),im=units(level.initialRate),mm=units(level.maintenanceRate);
     requireThat(lower>previous&&(previous!==-1n||lower===0n)&&im>0n&&im<=SCALE&&mm>0n&&mm<=im,'INVALID_MARGIN_SCHEDULE');
     previous=lower;
    }
   }
  }
  requireThat(Array.isArray(input.limitations)&&input.limitations.length>0&&input.limitations.every(x=>typeof x.code==='string'&&x.blockingFor==='specific-risk-recommendations'),'MISSING_LIMITATIONS');
  return freeze(JSON.parse(JSON.stringify(input)));
 }
 function selectSchedule(input,platform,clientType){
  const rules=load(input);
  requireThat(rules.supportedSchedulePlatforms.includes(platform),'UNSUPPORTED_PLATFORM');
  requireThat(rules.supportedClientTypes.includes(clientType),'UNSUPPORTED_CLASSIFICATION');
  return rules.margin.schedules[platform][clientType];
 }
 function tierAt(input,platform,clientType,entryNotionalUSD){
  const levels=selectSchedule(input,platform,clientType),nominal=units(entryNotionalUSD);
  // Return a published tier, not a computed margin requirement or approval.
  return levels.reduce((chosen,level)=>units(level.lowerBoundUSD)<=nominal?level:chosen,levels[0]);
 }
 function validateOrder(input,{quantityBTC,priceUSD,orderType}){
  const rules=load(input),instrument=rules.instrument,reasons=[];
  const q=units(quantityBTC),p=units(priceUSD);
  if(q<units(instrument.minQuantity))reasons.push('BELOW_MIN_QUANTITY');
  if(q>units(instrument.maxQuantity))reasons.push('ABOVE_MAX_QUANTITY');
  if(q%units(instrument.quantityStep)!==0n)reasons.push('INVALID_QUANTITY_STEP');
  if(p===0n||p%units(instrument.priceTick)!==0n)reasons.push('INVALID_PRICE_TICK');
  if(!['limit','market'].includes(orderType))reasons.push('UNSUPPORTED_ORDER_TYPE');
  if(!instrument.tradeable||instrument.suspended)reasons.push('INSTRUMENT_UNAVAILABLE');
  if(instrument.postOnly&&orderType!=='limit')reasons.push('POST_ONLY');
  // Metadata validity alone does not prove affordability or executability.
  return freeze({metadataValid:reasons.length===0,reasons,version:rules.version});
 }
 function assess(input,context){
  const rules=load(input),now=timestamp(context.now),observed=timestamp(rules.observedAt),reasons=[];
  if(now<observed)reasons.push('RULES_FROM_FUTURE');
  if(now-observed>=rules.applicationPolicy.reviewMaxAgeSeconds*1000)reasons.push('STALE_RULES');
  if(context.symbol!==rules.symbol)reasons.push('WRONG_CONTRACT');
  if(context.jurisdiction!==rules.jurisdiction)reasons.push('WRONG_JURISDICTION');
  if(context.marginMode!==rules.marginMode)reasons.push('WRONG_MARGIN_MODE');
  if(context.selectedLeverage!==rules.selectedLeverage)reasons.push('WRONG_SELECTED_LEVERAGE');
  if(!rules.supportedSchedulePlatforms.includes(context.platform))reasons.push('UNCONFIRMED_PLATFORM');
  if(!rules.supportedClientTypes.includes(context.clientType))reasons.push('UNCONFIRMED_CLASSIFICATION');
  if(!Object.hasOwn(rules.collateral,context.collateralCurrency))reasons.push('UNSUPPORTED_COLLATERAL');
  if(context.collateralCurrency!=='USD')reasons.push('FX_COLLATERAL_ENGINE_PENDING');
  if(!rules.instrument.tradeable||rules.instrument.suspended)reasons.push('INSTRUMENT_UNAVAILABLE');
  const scopeReady=reasons.length===0;
  return freeze({version:rules.version,scopeReady,status:scopeReady?'approximate':'blocked',
   specificRiskRecommendationsAllowed:false,ordersAllowed:false,transfersAllowed:false,
   reasons:[...reasons,...rules.limitations.map(x=>x.code)],
   label:scopeReady?'Simulação aproximada — regras e reconciliação incompletas':'Dados insuficientes ou fora do âmbito — cálculo específico bloqueado'});
 }
 return Object.freeze({RulesError,load,selectSchedule,tierAt,validateOrder,assess});
});
