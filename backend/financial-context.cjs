'use strict';
const Rules=require('../kraken-rules.js'),Core=require('../financial-engine.js');
const clone=v=>JSON.parse(JSON.stringify(v));
function need(v,c){if(!v)throw Error(c);}
function create({market,rulesProvider,now=()=>new Date().toISOString()}){
 need(typeof market?.snapshot==='function'&&typeof rulesProvider==='function'&&typeof now==='function','FINANCIAL_CONTEXT_DEPENDENCIES_REQUIRED');
 return async function contextProvider(scope,input){
  need(scope?.scenarioKey==='manual_long'&&input?.scenarioKey===scope.scenarioKey&&input.ownerId===scope.ownerId&&input.projectId===scope.projectId,'MANUAL_CONTEXT_SCOPE_REQUIRED');
  need(input.ruleScenario===undefined,'SYNTHETIC_RULE_SCENARIO_NOT_ALLOWED');
  const rules=Rules.load(clone(await rulesProvider())),snapshot=await market.snapshot(),at=now(),n=Date.parse(at),observed=Date.parse(snapshot.observedAt),received=Date.parse(snapshot.receivedAt);
  need(Number.isFinite(n)&&Number.isFinite(observed)&&Number.isFinite(received)&&observed<=received&&received<=n&&n-observed<=60000,'CURRENT_PUBLIC_CONTEXT_REQUIRED');
  need(snapshot.symbol==='PF_XBTUSD'&&snapshot.currency==='USD'&&snapshot.source==='https://futures.kraken.com/derivatives/api/v3/tickers/PF_XBTUSD','TRUSTED_PUBLIC_SOURCE_REQUIRED');
  const assessment=Rules.assess(rules,{now:at,symbol:'PF_XBTUSD',jurisdiction:'EEA',marginMode:'isolated',selectedLeverage:'10',platform:input.platform,clientType:input.clientType,collateralCurrency:'USD'});
  need(assessment.scopeReady,'CURRENT_RULES_REQUIRED');
  // Keep the public snapshot timestamp; never re-date a quote or a ruleset.
  const valuation={kind:'public_mark',source:snapshot.source,markPriceUSD:snapshot.markPriceUSD,asOf:snapshot.observedAt};
  Core.reconstruct({...clone(input),rules,valuation,bookkeepingOnly:false});
  return {rules:clone(rules),valuation};
 };
}
module.exports=Object.freeze({create});
