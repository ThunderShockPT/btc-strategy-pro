/* Exact, bounded, user-initiated account download. No restore or storage writes. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('node:crypto').webcrypto);else root.BTCAccountPortabilityV20=factory(root.crypto);})(typeof globalThis!=='undefined'?globalThis:this,function(crypto){
'use strict';
const FORMAT='btcsp-account-portability-v20.1',PROJECT='oftzqqjbwonngubihrsd',MAX_BYTES=64000000;
const SECTIONS=['profile','projects','snapshots','events','plans','preferences','tutorial','calculations','legacyImports','receipts'];
const need=(v,c='INVALID_ACCOUNT_EXPORT')=>{if(!v)throw Error(c);};
const bytes=s=>new TextEncoder().encode(s);
async function sha(s){need(crypto?.subtle,'SECURE_CONTEXT_REQUIRED');return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(s))),b=>b.toString(16).padStart(2,'0')).join('');}
async function collect({read,onProgress=()=>{},check=()=>{},limitBytes=MAX_BYTES}){
 need(typeof read==='function'&&Number.isSafeInteger(limitBytes)&&limitBytes>0&&limitBytes<=MAX_BYTES);
 const first=await read({section:'manifest'});check();
 need(first.format===FORMAT&&first.projectRef===PROJECT&&first.automaticRestoreAllowed===false&&first.sections?.map(s=>s.name).join(',')===SECTIONS.join(','));
 need(typeof first.ownerId==='string'&&/^[a-f0-9-]{36}$/.test(first.ownerId)&&/^[a-f0-9]{64}$/.test(first.fingerprint));
 need(await sha(JSON.stringify(first.sections))===first.fingerprint);check();
 const sections=[];let totalBytes=0,completed=0;
 for(const section of first.sections){
  let after=null,offset=0,part='',partKey=null,done=false,requests=0;const records=[],hashes=[],keys=new Set();
  while(!done){
   check();need(++requests<=100000,'ACCOUNT_EXPORT_PROGRESS_LIMIT');
   const page=await read({section:section.name,after,pieceOffset:offset});check();
   need(page.format===FORMAT&&page.projectRef===PROJECT&&page.ownerId===first.ownerId&&page.section===section.name&&Array.isArray(page.rows)&&page.rows.length<=500);
   for(const row of page.rows){
    need(typeof row.key==='string'&&typeof row.data==='string');totalBytes+=bytes(row.data).length;
    need(totalBytes<=limitBytes,'ACCOUNT_EXPORT_TOO_LARGE');
    if(page.piece){need(page.rows.length===1&&page.piece.offset===offset&&(!partKey||row.key===partKey));partKey=row.key;part+=row.data;need(page.piece.nextOffset===0||page.piece.nextOffset>offset);if(page.piece.nextOffset!==0)continue;row.data=part;part='';partKey=null;}
    need(!keys.has(row.key),'ACCOUNT_EXPORT_DUPLICATE_RECORD');keys.add(row.key);records.push(row.data);hashes.push(row.key+':'+await sha(row.data));check();completed++;
   }
   check();onProgress({section:section.name,completed,bytes:totalBytes});
   done=page.done===true;
   if(done)need(page.rows.length===0&&offset===0&&!part);
   else{need(page.rows.length>0);const nextOffset=page.piece?.nextOffset??0;need(nextOffset>0||page.nextAfter!==null&&page.nextAfter!==after);after=page.nextAfter;offset=nextOffset;}
  }
  need(String(records.length)===section.count&&await sha(hashes.join('\n'))===section.sha256,'ACCOUNT_EXPORT_CHANGED');check();
  sections.push(JSON.stringify(section.name)+':['+records.join(',')+']');
 }
 const last=await read({section:'manifest'});check();need(last.format===FORMAT&&last.projectRef===PROJECT&&last.ownerId===first.ownerId&&last.fingerprint===first.fingerprint,'ACCOUNT_EXPORT_CHANGED');
 const metadata={...first,completedAt:last.observedAt,complete:true,integrity:'per-section-sha256-and-unchanged-final-manifest',financialSnapshot:false,automaticRestoreAllowed:false};
 const content='{"metadata":'+JSON.stringify(metadata)+',"sections":{'+sections.join(',')+'}}';
 need(bytes(content).length<=limitBytes,'ACCOUNT_EXPORT_TOO_LARGE');check();
 return {format:FORMAT,content,mimeType:'application/json',filename:'btcsp-account-'+first.ownerId+'-portability.json',records:completed,bytes:bytes(content).length};
}
return Object.freeze({collect,FORMAT,PROJECT,MAX_BYTES});
});
