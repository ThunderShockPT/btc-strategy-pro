'use strict';
// Invented UI fixture. Never provisioned to an owner, never live market evidence.
const f=require('./onboarding-fixture.cjs'),Core=require('../../financial-engine.js'),Risk=require('../../position-risk.js'),Cycles=require('../../cycle-planner.js'),Clock=require('./live-clock-qa.cjs');
function state({emptyPosition=false}={}){
 const source=f.existing(),historical=structuredClone(source.input.rules),at=new Date().toISOString();
 source.input.events[0].facts.amountUSD='1000';source.input.events[1].facts.amountUSD='100';source.input.events[2].facts.quantityBTC='0.002';source.input.events[2].facts.priceUSD='100000';
 if(emptyPosition)source.input.events=source.input.events.slice(0,1);
 source.input.buyRulesByEvent={};for(const e of source.input.events)if(e.event_type==='trade_buy')source.input.buyRulesByEvent[e.id]=historical;
 Object.assign(source.input,Clock.context({scenarioKey:'demo_long'},source.input,at));source.input.scenarioKey='manual_long';source.plan.scenarioKey='manual_long';source.input.events.forEach(e=>{e.scenario_key='manual_long';e.origin='manual';});source.plan.configuration.title='QA · Carteira de teste';source.plan.configuration.cycleInventory[0].entries.forEach(e=>{e.state='active';if(emptyPosition)e.fillEventIds=[];});source.planHistory=[];
 const ledger=Core.reconstruct(source.input),risk=Risk.estimate(source.input),cycles=Cycles.inspectInventory(source.input,source.plan);
 const dashboard={ledger,risk,cycles,plan:source.plan,asOf:at,fresh:true,inputContext:{rules:source.input.rules,valuation:source.input.valuation},syntheticQA:true,financialFactsChanged:false,planApplied:false};
 return {state:source,revision:String(source.input.events.length),headHash:'a'.repeat(64),dashboard,planNeedsReview:!emptyPosition};
}
function bootstrap(snapshot,{networkAPI=false}={}){return `(()=>{globalThis.BTC_UI_QA_SYNTHETIC=true;const snapshot=${JSON.stringify(snapshot).replace(/</g,'\\u003c')},owner=snapshot.state.input.ownerId;let current={user:{id:owner},access_token:'qa-ui-synthetic-not-a-real-credential',expires_at:Date.now()/1000+3600},listener=null;const supabase={auth:{onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){}}}};},async getSession(){return {data:{session:current}};},async getUser(){return {data:{user:{id:owner,is_anonymous:false,email_confirmed_at:'2026-10-01T00:00:00Z'}}};},async signOut(){current=null;listener?.('SIGNED_OUT',null);return {};}}};const fakeFetch=async(url,options)=>{if(${networkAPI})return fetch(url,options);const route=new URL(url).pathname.split('/').at(-1);if(route==='wallets')return Response.json({result:{wallets:[{projectId:snapshot.state.input.projectId,title:snapshot.state.plan.configuration.title,scenarioKey:'manual_long',revision:snapshot.revision}],nextCursor:null}});if(route==='state')return Response.json({result:snapshot});return Response.json({code:'QA_UI_MUTATIONS_DISABLED'},{status:422});};BTCV20AccountConnection.configureSession({supabase,supabaseURL:'https://oftzqqjbwonngubihrsd.supabase.co',privateTest:true,fetchImpl:fakeFetch});})();`;}
function equivalentDemo(snapshot){
 const demo=structuredClone(snapshot.state);demo.input.scenarioKey='demo_long';demo.plan.scenarioKey='demo_long';
 demo.input.valuation.kind='synthetic';demo.input.valuation.source='qa-comparison-invented-not-live';
 for(const event of demo.input.events){event.scenario_key='demo_long';event.origin='demo';}
 return demo;
}
module.exports={state,bootstrap,equivalentDemo};
