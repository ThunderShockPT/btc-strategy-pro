'use strict';
// Internal server service. No HTTP route, queue, persistence or financial writes.
// loadSnapshot must be the authenticated, live-session-checked store.snapshot adapter.
const {createHash,createHmac,timingSafeEqual}=require('node:crypto'),Cycles=require('../cycle-planner.js'),Rules=require('../kraken-rules.js'),P=require('./persistence-contract.cjs'),build=require('../policies/calculation-checkpoint-build-20261021.json');
const VERSION='v20-calculation-checkpoint-12d3.1',ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const need=(v,c)=>{if(!v)throw Error(c);},clone=v=>JSON.parse(P.canonical(v));
const ENGINE_BUILD=createHash('sha256').update(P.canonical(build)).digest('hex');
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function scope(s){need(s&&Object.keys(s).sort().join(',')==='ownerId,projectId,scenarioKey'&&ID.test(s.ownerId)&&ID.test(s.projectId)&&['manual_long','demo_long'].includes(s.scenarioKey),'INVALID_CALCULATION_SCOPE');}
function instant(v){need(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,19)===v.slice(0,19),'INVALID_CALCULATION_CLOCK');return Date.parse(v);}
function create({key,loadSnapshot,contextProvider,policyProvider,now=()=>new Date().toISOString(),enabled=false}){
 need(Buffer.isBuffer(key)&&key.length===32&&[loadSnapshot,contextProvider,policyProvider,now].every(v=>typeof v==='function'),'CALCULATION_DEPENDENCIES_REQUIRED');const privateKey=Buffer.from(key);
 function encoded(payload){const value=P.canonical(payload);need(Buffer.byteLength(value,'utf8')<=8000000,'CALCULATION_CHECKPOINT_TOO_LARGE');return value;}
 const mac=payload=>createHmac('sha256',privateKey).update(encoded(payload)).digest('hex');
 function seal(payload){return freeze({payload,mac:mac(payload)});}
 function fresh(p){const at=instant(now());need(at>=instant(p.createdAt)&&at<instant(p.expiresAt),'CALCULATION_EXPIRED');}
 function verify(s,raw){need(enabled===true,'CLOUD_WRITE_GATE_CLOSED');scope(s);const e=clone(raw);need(e&&Object.keys(e).sort().join(',')==='mac,payload'&&typeof e.mac==='string'&&/^[a-f0-9]{64}$/.test(e.mac),'INVALID_CALCULATION_SIGNATURE');need(timingSafeEqual(Buffer.from(e.mac,'hex'),Buffer.from(mac(e.payload),'hex')),'INVALID_CALCULATION_SIGNATURE');
  const p=e.payload;need(p.version===VERSION&&P.canonical(p.scope)===P.canonical(s),'CALCULATION_SCOPE_MISMATCH');need(p.engineBuild===ENGINE_BUILD,'CALCULATION_BUILD_CHANGED');fresh(p);return p;
 }
 async function current(token,s,p){const snapshot=await loadSnapshot(token,s);need(snapshot.headHash===p.headHash,'STALE_CALCULATION_BASIS');fresh(p);return snapshot;}
 async function start(token,s){need(enabled===true,'CLOUD_WRITE_GATE_CLOSED');scope(s);const base=await loadSnapshot(token,s);need(/^[a-f0-9]{64}$/.test(base.headHash),'INVALID_CALCULATION_BASIS');const input=clone(base.state.input);need(input.ownerId===s.ownerId&&input.projectId===s.projectId&&input.scenarioKey===s.scenarioKey,'CALCULATION_SCOPE_MISMATCH');const context=await contextProvider(s,clone(input));need(context&&Object.keys(context).sort().join(',')==='rules,valuation','INVALID_CALCULATION_CONTEXT');Object.assign(input,clone(context));
  need(input.ruleScenario===undefined,'SYNTHETIC_RULE_SCENARIO_NOT_RECORDABLE');
  const createdAt=now(),created=instant(createdAt),quote=instant(input.valuation.asOf);let expiry=created+60000;
  if(s.scenarioKey==='manual_long'){need(['public_mark','manual_mark'].includes(input.valuation.kind)&&quote<=created&&created-quote<60000,'CURRENT_MANUAL_CONTEXT_REQUIRED');expiry=Math.min(expiry,quote+60000);}else need(input.valuation.kind==='synthetic','EXPLICIT_DEMO_DATA_REQUIRED');
  const assessment=Rules.assess(input.rules,{now:createdAt,symbol:'PF_XBTUSD',jurisdiction:'EEA',marginMode:'isolated',selectedLeverage:'10',platform:input.platform,clientType:input.clientType,collateralCurrency:'USD'});need(assessment.scopeReady,'CURRENT_RULES_REQUIRED');expiry=Math.min(expiry,instant(input.rules.observedAt)+input.rules.applicationPolicy.reviewMaxAgeSeconds*1000);
  const policy=clone(await policyProvider(s,clone(input),clone(base.state.plan)));need(policy.requireFailedMarginSurvival===true,'PROFILE_ADMISSION_NOT_APPROVED');const search=Cycles.beginSearch(input,base.state.plan,policy);
  const p={version:VERSION,engineBuild:ENGINE_BUILD,scope:clone(s),headHash:base.headHash,createdAt,expiresAt:new Date(expiry).toISOString(),sequence:0,search};fresh(p);return seal(p);
 }
 async function advance(token,s,envelope){const p=verify(s,envelope);await current(token,s,p);if(p.search.done)return seal(p);const search=Cycles.advanceSearch(p.search,{maxScenarios:1});fresh(p);return seal({...p,sequence:p.sequence+1,search});}
 async function result(token,s,envelope){const p=verify(s,envelope);await current(token,s,p);const value=Cycles.searchResult(p.search);fresh(p);return value;}
 return Object.freeze({start,advance,result});
}
module.exports=Object.freeze({create,VERSION});
