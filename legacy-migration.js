/* V20 Block 2: non-destructive preparation only. Never reads or writes storage. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BTCLegacyMigration=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 function check(ok,message){if(!ok)throw Error(message);}
 function canonical(value){
  if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
  if(typeof value==='number'){check(Number.isFinite(value),'Invalid legacy number');return JSON.stringify(value);}
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  check(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype,'Invalid legacy value');
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 }
 async function digest(text){
  check(globalThis.crypto?.subtle,'SHA-256 unavailable');
  const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 }
 function uuidFromHash(hash){return hash.slice(0,8)+'-'+hash.slice(8,12)+'-5'+hash.slice(13,16)+'-a'+hash.slice(17,20)+'-'+hash.slice(20,32);}
 async function prepareProject(project,{ownerId}={}){
  check(project&&UUID.test(project.id)&&UUID.test(ownerId),'Valid project and owner required');
  check(['demo','real'].includes(project.mode)&&typeof project.name==='string'&&project.name.trim().length>=2,'Invalid legacy project');
  check(typeof project.capital==='number'&&Number.isFinite(project.capital)&&project.capital>=100&&project.capital<=1e9,'Invalid legacy capital');
  // Canonical serialization preserves the complete original values, audit and metadata.
  const original=JSON.parse(canonical(project)),payload=canonical(original);
  check(new TextEncoder().encode(payload).length<=1500000,'Legacy snapshot too large');
  const snapshot=original.snapshot;
  check(!snapshot||snapshot.schema===1,'Unsupported legacy snapshot schema');
  const ledger=snapshot?.ledger?.ledger||[];
  check(Array.isArray(ledger)&&ledger.length<=5000,'Invalid legacy ledger');
  const ids=new Set();
  for(const row of ledger){
   check(row&&typeof row.id==='string'&&!ids.has(row.id),'Duplicate or invalid legacy operation ID');ids.add(row.id);
   check(['descida','subida'].includes(row.side)&&['buy','sell'].includes(row.kind),'Unknown legacy scenario or operation');
   check(typeof row.cycle==='string'&&/^[A-E]$/.test(row.cycle)&&Number.isSafeInteger(row.seq)&&row.seq>0,'Invalid legacy cycle or sequence');
   check(typeof row.voided==='boolean','Invalid legacy void state');
   check(typeof row.date==='string'&&Number.isFinite(Date.parse(row.date)),'Invalid effective date');
   check(typeof row.price==='number'&&Number.isFinite(row.price)&&row.price>0,'Invalid legacy price');
   check(typeof row.fee==='number'&&Number.isFinite(row.fee)&&row.fee>=0,'Invalid legacy fee');
   const amount=row.kind==='buy'?row.usd:row.qty;
   check(typeof amount==='number'&&Number.isFinite(amount)&&amount>0,'Invalid legacy amount');
  }
  const sourceHash=await digest(payload),importId=uuidFromHash(await digest(ownerId.toLowerCase()+':'+project.id.toLowerCase()+':'+sourceHash));
  const candidates=[];
  for(const row of ledger){
   const id=uuidFromHash(await digest(importId+':'+row.id));
   candidates.push({id,legacyId:row.id,scenarioKey:'legacy_'+row.side,legacyCycle:row.cycle,
    type:row.kind==='buy'?'trade_buy':'trade_sell',effectiveAt:row.date,
    source:'legacy_demo',voided:!!row.voided,reviewRequired:true,
    facts:{priceUSD:String(row.price),feeUSD:String(row.fee),nominalUSD:row.kind==='buy'?String(row.usd):null,quantityBTC:row.kind==='sell'?String(row.qty):null}});
  }
  return {schemaVersion:2,projectId:project.id,ownerId,importId,sourceHash,original,
   status:'staged',automaticActivationAllowed:false,candidates,
   unresolved:['LEGACY_MARGIN_IS_HYPOTHETICAL','EXECUTION_STATUS_UNVERIFIED','LEGACY_FLOAT_PRECISION','CHRONOLOGICAL_ENGINE_VALIDATION_PENDING'],
   scenarios:['legacy_descida','legacy_subida'],manualOpeningBalance:null};
 }
 return Object.freeze({prepareProject});
});
