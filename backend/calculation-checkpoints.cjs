'use strict';
// Internal server service. No HTTP route, queue, persistence or financial writes.
// loadSnapshot must be the authenticated, live-session-checked store.snapshot adapter.
const {createHash,createHmac,timingSafeEqual}=require('node:crypto'),Cycles=require('../cycle-planner.js'),Rules=require('../kraken-rules.js'),Profiles=require('../risk-profiles.js'),P=require('./persistence-contract.cjs'),build=require('../policies/calculation-checkpoint-build-20261021.json');
const VERSION='v20-calculation-checkpoint-12d3.1',ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const need=(v,c)=>{if(!v)throw Error(c);},clone=v=>JSON.parse(P.canonical(v));
const ENGINE_BUILD=createHash('sha256').update(P.canonical(build)).digest('hex');
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function scope(s){need(s&&Object.keys(s).sort().join(',')==='ownerId,projectId,scenarioKey'&&ID.test(s.ownerId)&&ID.test(s.projectId)&&['manual_long','demo_long'].includes(s.scenarioKey),'INVALID_CALCULATION_SCOPE');}
function instant(v){need(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,19)===v.slice(0,19),'INVALID_CALCULATION_CLOCK');return Date.parse(v);}
function create({key,loadSnapshot,contextProvider,policyProvider,profileContextProvider=null,now=()=>new Date().toISOString(),enabled=false,maxPathStepsPerUnit=2}){
 need([1,2].includes(maxPathStepsPerUnit)&&Buffer.isBuffer(key)&&key.length===32&&[loadSnapshot,contextProvider,policyProvider,now].every(v=>typeof v==='function'),'CALCULATION_DEPENDENCIES_REQUIRED');const privateKey=Buffer.from(key);
 function encoded(payload){const value=P.canonical(payload);need(Buffer.byteLength(value,'utf8')<=8000000,'CALCULATION_CHECKPOINT_TOO_LARGE');return value;}
 const mac=payload=>createHmac('sha256',privateKey).update(encoded(payload)).digest('hex');
 function seal(payload){return freeze({payload,mac:mac(payload)});}
 function fresh(p){const at=instant(now());need(at>=instant(p.createdAt)&&at<instant(p.expiresAt),'CALCULATION_EXPIRED');}
 function verify(s,raw){need(enabled===true,'CLOUD_WRITE_GATE_CLOSED');scope(s);need(raw&&typeof raw==='object'&&!Array.isArray(raw)&&[Object.prototype,null].includes(Object.getPrototypeOf(raw))&&Object.getOwnPropertySymbols(raw).length===0&&Object.keys(raw).sort().join(',')==='mac,payload'&&typeof raw.mac==='string'&&/^[a-f0-9]{64}$/.test(raw.mac),'INVALID_CALCULATION_SIGNATURE');
  // Validate/canonicalize once: the same bytes are authenticated and detached.
  const body=encoded(raw.payload),signature=createHmac('sha256',privateKey).update(body).digest('hex');
  need(timingSafeEqual(Buffer.from(raw.mac,'hex'),Buffer.from(signature,'hex')),'INVALID_CALCULATION_SIGNATURE');
  const p=JSON.parse(body);need(p.version===VERSION&&P.canonical(p.scope)===P.canonical(s),'CALCULATION_SCOPE_MISMATCH');need(p.engineBuild===ENGINE_BUILD,'CALCULATION_BUILD_CHANGED');fresh(p);return p;
 }
 async function current(token,s,p){const snapshot=await loadSnapshot(token,s);need(snapshot.headHash===p.headHash,'STALE_CALCULATION_BASIS');fresh(p);return snapshot;}
 async function start(token,s,options={}){need(enabled===true,'CLOUD_WRITE_GATE_CLOSED');scope(s);need(options&&typeof options==='object'&&!Array.isArray(options)&&Object.keys(options).every(k=>k==='profileChange'),'INVALID_CALCULATION_PROFILE_REQUEST');options=clone(options);if(Object.hasOwn(options,'profileChange'))need(options.profileChange&&typeof options.profileChange==='object'&&!Array.isArray(options.profileChange)&&Object.keys(options.profileChange).sort().join(',')==='floorMode,marginAdmission,profile'&&['safe','balanced','risky'].includes(options.profileChange.profile)&&['preserve','from-profile-reference'].includes(options.profileChange.floorMode)&&options.profileChange.marginAdmission==='strict','PROFILE_ADMISSION_NOT_APPROVED');const base=await loadSnapshot(token,s);need(/^[a-f0-9]{64}$/.test(base.headHash),'INVALID_CALCULATION_BASIS');const input=clone(base.state.input);need(input.ownerId===s.ownerId&&input.projectId===s.projectId&&input.scenarioKey===s.scenarioKey,'CALCULATION_SCOPE_MISMATCH');const context=await contextProvider(s,clone(input));need(context&&Object.keys(context).sort().join(',')==='rules,valuation','INVALID_CALCULATION_CONTEXT');Object.assign(input,clone(context));
  need(input.ruleScenario===undefined,'SYNTHETIC_RULE_SCENARIO_NOT_RECORDABLE');
  const createdAt=now(),created=instant(createdAt),quote=instant(input.valuation.asOf);let expiry=created+60000;
  if(s.scenarioKey==='manual_long'){need(['public_mark','manual_mark'].includes(input.valuation.kind)&&quote<=created&&created-quote<60000,'CURRENT_MANUAL_CONTEXT_REQUIRED');expiry=Math.min(expiry,quote+60000);}else need(input.valuation.kind==='synthetic','EXPLICIT_DEMO_DATA_REQUIRED');
  const assessment=Rules.assess(input.rules,{now:createdAt,symbol:'PF_XBTUSD',jurisdiction:'EEA',marginMode:'isolated',selectedLeverage:'10',platform:input.platform,clientType:input.clientType,collateralCurrency:'USD'});need(assessment.scopeReady,'CURRENT_RULES_REQUIRED');expiry=Math.min(expiry,instant(input.rules.observedAt)+input.rules.applicationPolicy.reviewMaxAgeSeconds*1000);
  let policy,search,profileContext;
  if(options.profileChange){need(typeof profileContextProvider==='function','PROFILE_CONTEXT_REQUIRED');need(input.bookkeepingOnly!==true,'CURRENT_MANUAL_CONTEXT_REQUIRED');const trusted=await profileContextProvider(s,clone(input),clone(base.state.plan));need(trusted&&Object.keys(trusted).sort().join(',')==='baseCyclePolicy,market','PROFILE_CONTEXT_REQUIRED');if(trusted.market?.validUntil!==undefined)expiry=Math.min(expiry,instant(trusted.market.validUntil));const request={...clone(options.profileChange),...clone(trusted)},prepared=Profiles.prepareSearch(input,base.state.plan,request);policy=prepared.policy;search=Cycles.beginSearch(prepared.input,prepared.plan,policy);profileContext={plan:clone(base.state.plan),request};
  }else{policy=clone(await policyProvider(s,clone(input),clone(base.state.plan)));search=Cycles.beginSearch(input,base.state.plan,policy);}
  need(policy.requireFailedMarginSurvival===true,'PROFILE_ADMISSION_NOT_APPROVED');
  const p={version:VERSION,engineBuild:ENGINE_BUILD,scope:clone(s),headHash:base.headHash,createdAt,expiresAt:new Date(expiry).toISOString(),sequence:0,search,...(profileContext?{profileContext}: {})};fresh(p);return seal(p);
 }
 async function advance(token,s,envelope){const p=verify(s,envelope);await current(token,s,p);if(p.search.done)return seal(p);// Operational Beta bound: large histories/checkpoints retain single-step requests.
  const batch=p.search.input.events.length<=1000&&Buffer.byteLength(JSON.stringify(p.search),'utf8')<=1500000?maxPathStepsPerUnit:1;
  const search=Cycles.advanceSearch(p.search,{maxScenarios:1,maxPathSteps:batch});fresh(p);return seal({...p,sequence:p.sequence+1,search});}
 async function result(token,s,envelope){const p=verify(s,envelope);await current(token,s,p);const value=p.profileContext?Profiles.completePreview(p.search.input,p.profileContext.plan,p.profileContext.request,p.search):Cycles.searchResult(p.search);fresh(p);return value;}
 async function reviewSource(token,s,envelope){const p=verify(s,envelope);await current(token,s,p);Cycles.searchResult(p.search);fresh(p);return freeze(clone({headHash:p.headHash,engineBuild:p.engineBuild,createdAt:p.createdAt,expiresAt:p.expiresAt,search:p.search,...(p.profileContext?{profileContext:p.profileContext}: {})}));}
 return Object.freeze({start,advance,result,reviewSource});
}
module.exports=Object.freeze({create,VERSION});
