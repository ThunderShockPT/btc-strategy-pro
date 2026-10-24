'use strict';
// Internal persistence encoding only. The original complete checkpoint HMAC is
// verified by the calculation service after bounded, lossless reconstruction.
const {gzipSync,gunzipSync}=require('node:zlib'),{createHash}=require('node:crypto');
const CODEC='btcsp-search-gzip-v1',LIMIT=8000000,THRESHOLD=256000;
const keys=(v,w)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===w;
const need=v=>{if(!v)throw Error('INVALID_CALCULATION_STORAGE');};
const hash=v=>createHash('sha256').update(v).digest('hex');
function encode(envelope){
 const search=envelope?.payload?.search;need(search&&typeof search.done==='boolean'&&Number.isInteger(search.unitsCompleted));
 const text=JSON.stringify(search),bytes=Buffer.byteLength(text,'utf8');need(bytes<=LIMIT);
 if(bytes<=THRESHOLD)return envelope;
 const searchGzip=gzipSync(Buffer.from(text,'utf8'),{level:1,mtime:0}).toString('base64');
 const encoded={mac:envelope.mac,payload:{...envelope.payload,search:{done:search.done,unitsCompleted:search.unitsCompleted}},checkpointStorage:{codec:CODEC,searchBytes:bytes,searchSHA256:hash(text),searchGzip}};
 // Incompressible histories retain their existing bounded representation.
 return Buffer.byteLength(JSON.stringify(encoded),'utf8')<Buffer.byteLength(JSON.stringify(envelope),'utf8')?encoded:envelope;
}
function decode(envelope){
 if(!envelope||!Object.hasOwn(envelope,'checkpointStorage'))return envelope;
 try{
  need(keys(envelope,'checkpointStorage,mac,payload'));
  const c=envelope.checkpointStorage,stub=envelope.payload?.search;
  need(keys(c,'codec,searchBytes,searchGzip,searchSHA256')&&c.codec===CODEC&&Number.isInteger(c.searchBytes)&&c.searchBytes>THRESHOLD&&c.searchBytes<=LIMIT);
  need(typeof c.searchSHA256==='string'&&/^[a-f0-9]{64}$/.test(c.searchSHA256)&&typeof c.searchGzip==='string'&&c.searchGzip.length<=Math.ceil(LIMIT/3)*4&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(c.searchGzip));
  need(keys(stub,'done,unitsCompleted')&&typeof stub.done==='boolean'&&Number.isInteger(stub.unitsCompleted));
  const packed=Buffer.from(c.searchGzip,'base64');need(packed.toString('base64')===c.searchGzip);
  const bytes=gunzipSync(packed,{maxOutputLength:LIMIT});need(bytes.length===c.searchBytes&&hash(bytes)===c.searchSHA256);
  const search=JSON.parse(bytes.toString('utf8'));need(search.done===stub.done&&search.unitsCompleted===stub.unitsCompleted);
  return {mac:envelope.mac,payload:{...envelope.payload,search}};
 }catch{throw Error('INVALID_CALCULATION_STORAGE');}
}
module.exports=Object.freeze({encode,decode,CODEC,LIMIT,THRESHOLD});
