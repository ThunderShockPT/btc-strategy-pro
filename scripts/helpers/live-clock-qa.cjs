'use strict';
// Synthetic test-only rules and observations. Never a verification of live Kraken rules.
const clone=v=>JSON.parse(JSON.stringify(v));
function context(scope,input,at=new Date().toISOString()){if(scope.scenarioKey!=='demo_long')throw Error('QA_DEMO_REQUIRED');const rules=clone(input.rules);rules.version='QA-SYNTHETIC-CLOCK-'+rules.version.replace(/^QA-SYNTHETIC-CLOCK-/,'');rules.qaFixture={kind:'synthetic-not-Kraken-verification',referenceObservedAt:rules.qaFixture?.referenceObservedAt||rules.observedAt};rules.observedAt=at;rules.limitations=[...rules.limitations.filter(x=>x.code!=='QA_SYNTHETIC_NOT_LIVE_VERIFIED'),{code:'QA_SYNTHETIC_NOT_LIVE_VERIFIED',blockingFor:'specific-risk-recommendations'}];return {rules,valuation:{...input.valuation,kind:'synthetic',source:'qa-live-clock-synthetic',asOf:at}};}
function market(value,at=new Date().toISOString()){const result=clone(value),delta=Date.parse(at)-Date.parse(value.observedAt);result.observedAt=at;result.observations=result.observations.map(x=>({...x,at:new Date(Date.parse(x.at)+delta).toISOString()}));return result;}
function pinHistoricalRules(input){input.buyRulesByEvent={...(input.buyRulesByEvent||{})};for(const e of input.events)if(e.event_type==='trade_buy')input.buyRulesByEvent[e.id.toLowerCase()]=clone(input.rules);return input;}
module.exports={context,market,pinHistoricalRules};
