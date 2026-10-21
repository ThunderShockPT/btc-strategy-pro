'use strict';
// Explicit public-only diagnostic. Never loaded by the app and never writes financial data.
const O=require('../backend/public-observations.cjs'),M=require('../backend/public-market.cjs');
async function probe({fetchImpl=globalThis.fetch,now=()=>new Date().toISOString(),clock=()=>performance.now(),timeoutMs=3000}={}){
 const samples=[],startedAt=now();
 const measured=async(url,options)=>{const start=clock(),item={source:url,startedAt:now(),status:'in-flight-at-deadline'};samples.push(item);try{const r=await fetchImpl(url,options);item.headersMs=clock()-start;item.httpStatus=r.status;const reader=r.body?.getReader();if(!reader)throw Error('PUBLIC_PROBE_BODY_REQUIRED');let size=0,parts=[];try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1000000)throw Error('PUBLIC_PROBE_BODY_TOO_LARGE');parts.push(value);}}finally{void reader.cancel().catch(()=>{});}const bytes=Buffer.concat(parts);item.totalMs=clock()-start;item.bytes=bytes.byteLength;item.status='completed';return new Response(bytes,{status:r.status,headers:r.headers});}catch(e){item.totalMs=clock()-start;item.status='failed';item.error=e.name;throw e;}};
 const observations=O.create({fetchImpl:measured,now,timeoutMs,cacheMs:0}),ticker=M.create({fetchImpl:measured,now,timeoutMs,cacheMs:0});
 let status='success',code=null,observed=null;try{const d=await observations.snapshot(),q=await ticker.snapshot({notBefore:new Date(Math.max(Date.parse(d.book.observedAt),Date.parse(d.history.observedThrough))).toISOString()});observed={bookAt:d.book.observedAt,historyThrough:d.history.observedThrough,tickerAt:q.observedAt};}catch(e){status='failed';code=e.message;}
 return {startedAt,completedAt:now(),timeoutMs,status,code,observed,samples,limitation:'One environment sample; not a latency or availability guarantee'};
}
module.exports={probe};
if(require.main===module)probe().then(v=>process.stdout.write(JSON.stringify(v,null,2)+'\n')).catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
