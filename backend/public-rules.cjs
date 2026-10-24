'use strict';
// Refresh only evidence that the public instrument API actually supplies. A
// changed EEE schedule or contract needs a new human review, not normalization
// into the previously approved values. Documentary limitations stay in force.
const {createHash}=require('node:crypto'),Rules=require('../kraken-rules.js'),P=require('./persistence-contract.cjs'),baseline=require('../rules/kraken/eea-pf-xbtusd-20261021.json');
const URL_INSTRUMENTS='https://futures.kraken.com/derivatives/api/v3/instruments';
const clone=v=>JSON.parse(JSON.stringify(v)),need=(v,c)=>{if(!v)throw Error(c);};
function normalize(body,receivedAt){
 const n=Date.parse(receivedAt),at=Date.parse(body?.serverTime),items=body?.instruments||body?.instrument;
 need(body?.result==='success'&&Number.isFinite(n)&&Number.isFinite(at)&&at<=n&&n-at<=60000&&Array.isArray(items),'CURRENT_PUBLIC_RULES_REQUIRED');
 const found=items.filter(x=>x.symbol==='PF_XBTUSD');need(found.length===1,'PUBLIC_RULES_CONTRACT_MISSING');const i=found[0],b=baseline;
 need(i.type==='flexible_futures'&&i.base==='BTC'&&i.quote==='USD'&&i.contractSize===1&&i.tickSize===1&&i.contractValueTradePrecision===4&&i.maxPositionSize===1200&&i.tradeable===true&&i.suspended===false&&i.postOnly===false&&!i.isExpired,'PUBLIC_RULES_REQUIRE_REVIEW');
 for(const platform of b.supportedSchedulePlatforms)for(const client of b.supportedClientTypes){
  need(i.platformsPermitted?.includes(platform),'PUBLIC_RULES_REQUIRE_REVIEW');
  const schedule=i.marginSchedules?.[platform]?.[client];need(Array.isArray(schedule)&&schedule.length===b.margin.schedules[platform][client].length,'PUBLIC_RULES_REQUIRE_REVIEW');
  need(schedule.every((x,k)=>{const old=b.margin.schedules[platform][client][k];return String(x.numNonContractUnits)===old.lowerBoundUSD&&String(x.initialMargin)===old.initialRate&&String(x.maintenanceMargin)===old.maintenanceRate;}),'PUBLIC_RULES_REQUIRE_REVIEW');
 }
 const evidence={result:body.result,serverTime:body.serverTime,instrument:[i]},digest=createHash('sha256').update(P.canonical(evidence)).digest('hex'),rules=clone(b);
 rules.version='kraken-eea-public-'+digest.slice(0,24);rules.observedAt=body.serverTime;
 const source=rules.sources.find(x=>x.id==='instrument-api');source.observedAt=body.serverTime;source.sha256=digest;delete source.snapshot;
 // Do not change reviewedOn, applicationPolicy, documentary source dates,
 // funding assumptions or the partial/documented-not-reconciled status.
 return {rules:clone(Rules.load(rules)),evidence};
}
function create({fetchImpl=globalThis.fetch,now=()=>new Date().toISOString(),cacheMs=300000}={}){
 need(typeof fetchImpl==='function'&&typeof now==='function'&&Number.isInteger(cacheMs)&&cacheMs>=0&&cacheMs<=300000,'INVALID_PUBLIC_RULES_CONFIGURATION');let cached=null,pending=null;
 async function read(){
  const response=await fetchImpl(URL_INSTRUMENTS,{headers:{Accept:'application/json'},cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(5000)});need(response.ok,'PUBLIC_RULES_UNAVAILABLE');
  const reader=response.body?.getReader();need(reader,'PUBLIC_RULES_BODY_REQUIRED');let size=0,parts=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;need(size<=4000000,'PUBLIC_RULES_TOO_LARGE');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
  const result=normalize(JSON.parse(Buffer.concat(parts).toString('utf8')),now());cached={...result,receivedAt:now()};return result.rules;
 }
 async function snapshot(){const n=Date.parse(now()),r=cached&&Date.parse(cached.receivedAt),o=cached&&Date.parse(cached.rules.observedAt);if(cached&&n>=r&&n-r<cacheMs&&n>=o&&n-o<86400000)return clone(cached.rules);if(!pending)pending=read().finally(()=>{pending=null;});return clone(await pending);}
 return Object.freeze({snapshot});
}
module.exports=Object.freeze({create,normalize,URL_INSTRUMENTS});
