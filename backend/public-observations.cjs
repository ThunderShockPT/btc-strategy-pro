'use strict';
// Public PF_XBTUSD observations only. Does not decide a liquidity budget or enable a profile.
const Decimal=require('decimal.js'),D=Decimal.clone({precision:80,toExpNeg:-100,toExpPos:100});
const BOOK_URL='https://futures.kraken.com/derivatives/api/v3/orderbook?symbol=PF_XBTUSD';
const HISTORY_URL='https://futures.kraken.com/api/charts/v1/mark/PF_XBTUSD/1m?count=65';
const VERSION='v20-public-observations-12d7a.1',need=(v,c)=>{if(!v)throw Error(c);},clone=v=>JSON.parse(JSON.stringify(v));
function time(v){need(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v),'INVALID_OBSERVATION_TIME');const n=Date.parse(v);need(Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===v.slice(0,19),'INVALID_OBSERVATION_TIME');return n;}
function positive(v){need(typeof v==='string'&&/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/.test(v)||typeof v==='number'&&Number.isFinite(v)&&(!Number.isInteger(v)||Number.isSafeInteger(v)),'INVALID_OBSERVATION_DECIMAL');const n=new D(String(v));need(n.gt(0)&&n.lt('100000000000000000000'),'INVALID_OBSERVATION_DECIMAL');return n.toFixed();}
function fresh(observedAt,receivedAt){const n=time(receivedAt),at=time(observedAt);need(at<=n&&n-at<=60000,'STALE_OR_FUTURE_OBSERVATION');}
function parseBook(body,receivedAt){
 need(body?.result==='success'&&body.orderBook,'INVALID_PUBLIC_BOOK');if(body.symbol!==undefined)need(typeof body.symbol==='string'&&body.symbol.toUpperCase()==='PF_XBTUSD','WRONG_PUBLIC_BOOK');fresh(body.serverTime,receivedAt);
 function side(raw,ascending){need(Array.isArray(raw)&&raw.length>0&&raw.length<=20000,'INVALID_PUBLIC_BOOK_LEVELS');const prices=new Set(),levels=raw.map(row=>{need(Array.isArray(row)&&row.length===2,'INVALID_PUBLIC_BOOK_LEVEL');const priceUSD=positive(row[0]),size=positive(row[1]);need(!prices.has(priceUSD),'DUPLICATE_PUBLIC_BOOK_PRICE');prices.add(priceUSD);return {priceUSD,size};});return levels.sort((a,b)=>new D(a.priceUSD).cmp(b.priceUSD)*(ascending?1:-1));}
 const asks=side(body.orderBook.asks,true),bids=side(body.orderBook.bids,false);need(new D(asks[0].priceUSD).gte(bids[0].priceUSD),'CROSSED_PUBLIC_BOOK');
 return {version:VERSION,symbol:'PF_XBTUSD',currency:'USD',source:BOOK_URL,observedAt:body.serverTime,receivedAt,asks,bids,bestAsk:asks[0],bestBid:bids[0],sizeUnit:'contract-size-as-reported',depthBudgetUSD:null,
  limitations:['FIXED_REQUEST_SYMBOL_NO_REQUIRED_RESPONSE_SYMBOL_ECHO','NORMALIZED_ORDER_NOT_ASSUMED_FROM_RESPONSE','VISIBLE_LIQUIDITY_CAN_DISAPPEAR','LIQUIDITY_ADMISSION_POLICY_NOT_SELECTED','NO_EXECUTION_GUARANTEE']};
}
function parseHistory(body,receivedAt){
 const at=time(receivedAt);need(body&&Array.isArray(body.candles)&&body.candles.length>0&&body.candles.length<=1000&&body.more_candles===false,'INCOMPLETE_PUBLIC_MARK_HISTORY');
 const seen=new Set(),all=body.candles.map(c=>{need(Number.isSafeInteger(c?.time)&&c.time>0&&c.time%60000===0&&!seen.has(c.time),'INVALID_PUBLIC_CANDLE_TIME');seen.add(c.time);need(c.time<=at,'FUTURE_PUBLIC_CANDLE');const openMarkUSD=positive(c.open),highMarkUSD=positive(c.high),lowMarkUSD=positive(c.low),closeMarkUSD=positive(c.close),high=new D(highMarkUSD),low=new D(lowMarkUSD);need(high.gte(openMarkUSD)&&high.gte(closeMarkUSD)&&low.lte(openMarkUSD)&&low.lte(closeMarkUSD)&&high.gte(low),'INVALID_PUBLIC_OHLC');return {startAt:new Date(c.time).toISOString(),endAt:new Date(c.time+60000).toISOString(),openMarkUSD,highMarkUSD,lowMarkUSD,closeMarkUSD};}).sort((a,b)=>time(a.startAt)-time(b.startAt));
 const candles=all.filter(c=>time(c.endAt)<=at);need(candles.length>=61,'INSUFFICIENT_CLOSED_MARK_HISTORY');need(candles.every((c,i)=>i===0||time(c.startAt)===time(candles[i-1].endAt)),'GAPPED_PUBLIC_MARK_HISTORY');fresh(candles.at(-1).endAt,receivedAt);
 return {version:VERSION,symbol:'PF_XBTUSD',currency:'USD',source:HISTORY_URL,receivedAt,priceKind:'mark',resolutionSeconds:60,observedThrough:candles.at(-1).endAt,candles,excludedOpenCandles:all.length-candles.length,
  limitations:['FIXED_REQUEST_SYMBOL_AND_TICK_TYPE_NO_RESPONSE_ECHO','ONE_MINUTE_OHLC_NOT_CONTINUOUS_TICKS','INTRAMINUTE_HIGH_LOW_ORDER_UNKNOWN','CANDLE_BOUNDARIES_NOT_INDIVIDUAL_TRADE_TIMESTAMPS','HISTORICAL_MARKS_NOT_EXECUTION_PRICES','NO_INTERPOLATION_OR_GAP_FILLING']};
}
function create({fetchImpl=globalThis.fetch,now=()=>new Date().toISOString(),timeoutMs=3000,cacheMs=5000}={}){
 need(typeof fetchImpl==='function'&&typeof now==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=10000&&Number.isInteger(cacheMs)&&cacheMs>=0&&cacheMs<=5000,'OBSERVATION_CONFIGURATION_REQUIRED');let cached=null,inflight=null;
 async function read(url,parse){const controller=new AbortController();let timer;const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('PUBLIC_OBSERVATION_TIMEOUT'));},timeoutMs);});
  try{return await Promise.race([(async()=>{const response=await fetchImpl(url,{method:'GET',headers:{Accept:'application/json'},credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});need(response.ok,'PUBLIC_OBSERVATION_UNAVAILABLE');const reader=response.body?.getReader();need(reader,'PUBLIC_OBSERVATION_BODY_REQUIRED');let size=0,parts=[];try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;need(size<=1000000,'PUBLIC_OBSERVATION_TOO_LARGE');parts.push(value);}}finally{void reader.cancel().catch(()=>{});}let data;try{data=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Error('INVALID_PUBLIC_OBSERVATION_JSON');}return parse(data,now());})(),deadline]);}finally{clearTimeout(timer);}
 }
 function current(value){const at=now();need(time(at)>=time(value.receivedAt)&&time(at)>=time(value.book.receivedAt)&&time(at)>=time(value.history.receivedAt),'OBSERVATION_CLOCK_REVERSED');fresh(value.book.observedAt,at);fresh(value.history.observedThrough,at);return at;}
 async function snapshot(){if(cached)try{const at=current(cached);if(time(at)-time(cached.receivedAt)<cacheMs)return clone(cached);}catch{/* Refetch rather than returning an expired observation. */}if(!inflight)inflight=Promise.all([read(BOOK_URL,parseBook),read(HISTORY_URL,parseHistory)]).then(([book,history])=>{const value={version:VERSION,symbol:'PF_XBTUSD',book,history,receivedAt:now(),profileContextEnabled:false};current(value);cached=value;return value;}).finally(()=>{inflight=null;});const value=await inflight;current(value);return clone(value);}
 return Object.freeze({snapshot});
}
module.exports=Object.freeze({create,parseBook,parseHistory,BOOK_URL,HISTORY_URL,VERSION});
