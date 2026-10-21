'use strict';
// Staging contract only. A digest detects corruption; it is NOT authorization.
const {createHash}=require('node:crypto');
const Decimal=require('decimal.js').clone({precision:80});
const Core=require('../financial-engine.js');
const VERSION='btcsp-persistence-staging-12a.1';
const MAX_BYTES=8000000, UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function need(value,code){if(!value)throw Error(code);}
function canonical(value,seen=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){need(Number.isFinite(value)&&(!Number.isInteger(value)||Number.isSafeInteger(value)),'UNSAFE_JSON_NUMBER');return JSON.stringify(value);}
 need(value&&typeof value==='object'&&!seen.has(value),'NON_JSON_OR_CYCLIC_VALUE');
 need(Array.isArray(value)||[Object.prototype,null].includes(Object.getPrototypeOf(value)),'NON_JSON_OBJECT');
 need(Object.getOwnPropertySymbols(value).length===0,'NON_JSON_SYMBOL');
 seen.add(value);let result;
 if(Array.isArray(value)){
  need(Object.keys(value).length===value.length,'SPARSE_OR_EXTENDED_ARRAY');
  result='['+Array.from(value,v=>canonical(v,seen)).join(',')+']';
 }else{
  result='{'+Object.keys(value).sort().map(k=>{const d=Object.getOwnPropertyDescriptor(value,k);need(d&&Object.hasOwn(d,'value'),'NON_JSON_ACCESSOR');return JSON.stringify(k)+':'+canonical(d.value,seen);}).join(',')+'}';
 }
 seen.delete(value);return result;
}
const size=value=>Buffer.byteLength(canonical(value),'utf8');
const digest=value=>createHash('sha256').update(canonical(value),'utf8').digest('hex');
function scopeOf(input){return {ownerId:input.ownerId,projectId:input.projectId,scenarioKey:input.scenarioKey};}
function matchScope(input,scope){need(scope&&UUID.test(scope.ownerId)&&UUID.test(scope.projectId)&&['manual_long','demo_long'].includes(scope.scenarioKey),'INVALID_SCOPE');need(Object.entries(scopeOf(input)).every(([k,v])=>v===scope[k]),'SCOPE_MISMATCH');}
function validate(state,scope){
 need(state&&state.input&&state.plan&&Array.isArray(state.planHistory),'INVALID_SOURCE_STATE');
 matchScope(state.input,scope);
 const ledger=Core.reconstruct(state.input), plans=[...state.planHistory,state.plan], ids=new Set(), versions=new Set();
 need(plans.length<=10000,'TOO_MANY_PLAN_VERSIONS');
 for(const p of plans){
  matchScope(p,scope);need(UUID.test(p.id)&&!ids.has(p.id),'DUPLICATE_OR_INVALID_PLAN_ID');ids.add(p.id);
  need(typeof p.version==='string'&&/^[1-9]\d{0,17}$/.test(p.version)&&!versions.has(p.version),'DUPLICATE_OR_INVALID_PLAN_VERSION');versions.add(p.version);
  need(p.configuration&&size(p.configuration)<=500000,'PLAN_CONFIGURATION_TOO_LARGE');
 }
 need(plans.every(p=>BigInt(p.version)<=BigInt(state.plan.version)),'CURRENT_PLAN_NOT_LATEST');
 for(const e of state.input.events){
  need(size(e.facts)<=64000,'EVENT_FACTS_TOO_LARGE');
  need(size(e)<=128000,'EVENT_ENVELOPE_TOO_LARGE');
  const m=e.execution_metadata;if(m===undefined)continue;
  need(['trade_buy','trade_sell'].includes(e.event_type)&&m&&['filled','partial'].includes(m.fillStatus),'INVALID_EXECUTION_METADATA');
  const dec=v=>{need(typeof v==='string'&&/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/.test(v),'INVALID_METADATA_QUANTITY');return new Decimal(v);};
  const requested=dec(m.requestedQuantityBTC),unfilled=dec(m.unfilledQuantityBTC),filled=dec(e.facts.quantityBTC);
  need(requested.eq(filled.plus(unfilled))&&(m.fillStatus==='partial'?unfilled.gt(0):unfilled.eq(0)),'INCONSISTENT_PARTIAL_FILL');
  need(Number.isInteger(m.stage)&&m.stage>=0&&m.stage<=3&&typeof m.commandHash==='string'&&/^[a-f0-9]{64}$/.test(m.commandHash),'INVALID_EXECUTION_METADATA');
 }
 return ledger;
}
function stage(state,scope){
 // Serialize before validation so undefined, NaN and special objects cannot vanish.
 const serialized=canonical(state);need(Buffer.byteLength(serialized,'utf8')<=MAX_BYTES,'SOURCE_PACKAGE_TOO_LARGE');
 const source=JSON.parse(serialized);validate(source,scope);
 const payload={format:VERSION,scope:scopeOf(source.input),source};
 return {payload,sha256:digest(payload),status:'staged',automaticActivationAllowed:false,databaseWritten:false};
}
function restore(envelope,scope){
 need(envelope&&envelope.payload&&envelope.payload.format===VERSION,'UNSUPPORTED_PACKAGE_FORMAT');
 need(typeof envelope.sha256==='string'&&digest(envelope.payload)===envelope.sha256,'PACKAGE_DIGEST_MISMATCH');
 matchScope(envelope.payload.scope,scope);
 // Recheck all limits and reconstruct facts; no stored derived balance is trusted.
 const staged=stage(envelope.payload.source,scope);
 need(digest(staged.payload)===envelope.sha256,'PACKAGE_CONTENT_MISMATCH');
 return {source:staged.payload.source,ledger:validate(staged.payload.source,scope),status:'staged',automaticActivationAllowed:false,databaseWritten:false};
}
module.exports=Object.freeze({VERSION,MAX_BYTES,stage,restore,canonical});
