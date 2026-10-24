'use strict';
// Read-only projections for the same five screens as the Demo. A fresh public
// valuation never edits a fact, a saved plan, its reference or its floor.
const Core=require('../financial-engine.js'),Risk=require('../position-risk.js'),Cycles=require('../cycle-planner.js');
const clone=v=>JSON.parse(JSON.stringify(v));
function evaluate(state,{context=null,now=()=>new Date().toISOString(),unavailableCode=null}={}){
 const stored=clone(state.input),input=context?{...stored,...clone(context)}:stored,at=Date.parse(now()),quoted=Date.parse(input.valuation.asOf);
 const ledger=Core.reconstruct({...input,bookkeepingOnly:true}),fresh=!!context&&Number.isFinite(quoted)&&quoted<=at&&at-quoted<=60000&&ledger.ruleAssessment.scopeReady;
 const risk=fresh?Risk.estimate(input):null;let cycles=null,cycleCode=null;try{cycles=Cycles.inspectInventory(input,state.plan);}catch(error){cycleCode=error.code||'PLAN_REVIEW_REQUIRED';}
 return {ledger,risk,cycles,cycleCode,plan:clone(state.plan),asOf:input.valuation.asOf,fresh,unavailableCode:fresh?null:unavailableCode||'CURRENT_VALUATION_UNAVAILABLE',inputContext:{rules:clone(input.rules),valuation:clone(input.valuation)},financialFactsChanged:false,planApplied:false};
}
async function create(state,{scope,contextProvider,now}={}){
 try{const context=await contextProvider(scope,clone(state.input));return evaluate(state,{context,now});}
 catch(error){const code=/^[A-Z][A-Z0-9_]{0,99}$/.test(error.code||error.message||'')?error.code||error.message:'CURRENT_VALUATION_UNAVAILABLE';return evaluate(state,{now,unavailableCode:code});}
}
module.exports=Object.freeze({create,evaluate});
