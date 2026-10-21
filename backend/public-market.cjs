'use strict';
const Decimal=require('decimal.js');
const D=Decimal.clone({precision:80,toExpNeg:-100,toExpPos:100});
const URL_TICKER='https://futures.kraken.com/derivatives/api/v3/tickers/PF_XBTUSD';
const VERSION='v20-public-market-12d1.1';
const need=(v,c)=>{if(!v)throw Error(c);};
const clone=v=>JSON.parse(JSON.stringify(v));
function timestamp(v,nanoseconds=false){const pattern=nanoseconds?/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;need(typeof v==='string'&&pattern.test(v),'INVALID_PUBLIC_TIME');const n=Date.parse(v);need(Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===v.slice(0,19),'INVALID_PUBLIC_TIME');return n;}
function price(v){need((typeof v==='number'&&Number.isFinite(v))||(typeof v==='string'&&/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/.test(v)),'INVALID_PUBLIC_PRICE');const n=new D(String(v));need(n.gt(0)&&n.lt('100000000000000000000'),'INVALID_PUBLIC_PRICE');return n.toFixed();}
function parse(body,receivedAt){
 const received=timestamp(receivedAt);need(body?.result==='success'&&body.ticker,'INVALID_PUBLIC_TICKER');const t=body.ticker;
 need(typeof t.symbol==='string'&&t.symbol.toUpperCase()==='PF_XBTUSD'&&t.pair==='XBT:USD'&&t.tag==='perpetual','WRONG_PUBLIC_CONTRACT');
 need(t.suspended===false&&t.postOnly===false,'PUBLIC_CONTRACT_UNAVAILABLE');
 const server=timestamp(body.serverTime);need(server<=received&&received-server<=60000,'STALE_OR_FUTURE_PUBLIC_QUOTE');
 const markPriceUSD=price(t.markPrice),bidUSD=price(t.bid),askUSD=price(t.ask),lastTradePriceUSD=price(t.last);
 need(new D(askUSD).gte(bidUSD),'CROSSED_PUBLIC_QUOTE');const last=timestamp(t.lastTime,true);need(last<=server,'FUTURE_PUBLIC_TRADE');
 return {version:VERSION,symbol:'PF_XBTUSD',currency:'USD',source:URL_TICKER,observedAt:body.serverTime,receivedAt,
  markPriceUSD,bidUSD,askUSD,lastTradePriceUSD,lastTradeAt:t.lastTime,
  executionPriceUSD:null,krakenLiquidationPriceUSD:null,historyAvailable:false,depthAvailable:false,
  limitations:['PUBLIC_OBSERVATION_NOT_ACCOUNT_DATA','SERVER_TIME_IS_SNAPSHOT_TIME_NOT_MARK_UPDATE_TIME','NO_EXECUTION_OR_TRANSFER','NETWORK_LATENCY_NOT_GUARANTEED']};
}
function create({fetchImpl=globalThis.fetch,now=()=>new Date().toISOString(),cacheMs=5000,timeoutMs=3000}={}){
 need(typeof fetchImpl==='function'&&typeof now==='function'&&Number.isInteger(cacheMs)&&cacheMs>=0&&cacheMs<=5000&&Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=10000,'PUBLIC_MARKET_CONFIGURATION_REQUIRED');
 let cached=null,inflight=null;
 function valid(snapshot){const n=timestamp(now()),received=timestamp(snapshot.receivedAt),observed=timestamp(snapshot.observedAt);return n>=received&&n-received<cacheMs&&n>=observed&&n-observed<=60000;}
 async function read(){const controller=new AbortController();let timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('PUBLIC_MARKET_TIMEOUT'));},timeoutMs);});
  try{return await Promise.race([(async()=>{const response=await fetchImpl(URL_TICKER,{method:'GET',headers:{Accept:'application/json'},credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});need(response.ok,'PUBLIC_MARKET_UNAVAILABLE');
   const reader=response.body?.getReader();need(reader,'PUBLIC_MARKET_BODY_REQUIRED');let size=0,parts=[];try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;need(size<=64000,'PUBLIC_MARKET_RESPONSE_TOO_LARGE');parts.push(value);}}finally{void reader.cancel().catch(()=>{});}
   let body;try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Error('INVALID_PUBLIC_TICKER');}return parse(body,now());})(),deadline]);}finally{clearTimeout(timer);}
 }
 async function snapshot(){if(cached&&valid(cached))return clone(cached);if(!inflight)inflight=read().then(v=>{cached=v;return v;}).finally(()=>{inflight=null;});const result=await inflight;need(timestamp(now())>=timestamp(result.observedAt)&&timestamp(now())-timestamp(result.observedAt)<=60000,'STALE_OR_FUTURE_PUBLIC_QUOTE');return clone(result);}
 return Object.freeze({snapshot});
}
module.exports=Object.freeze({create,parse,VERSION,URL_TICKER});
