'use strict';
// Read-only account portability. SQL serializes exact decimal digits; the
// browser must preserve those strings instead of parsing monetary JSON numbers.
const {createHash}=require('node:crypto');
const FORMAT='btcsp-account-portability-v20.1',PROJECT='oftzqqjbwonngubihrsd',PAGE_BYTES=1000000;
const TABLES={projects:'public.projects',snapshots:'public.project_snapshots',events:'public.btcsp_financial_events',plans:'public.btcsp_plan_versions',preferences:'public.btcsp_preference_versions',tutorial:'public.btcsp_tutorial_receipts',calculations:'public.btcsp_calculation_runs',legacyImports:'public.btcsp_legacy_imports',receipts:'btcsp_private.command_receipts'};
const SECTIONS=Object.freeze(['profile',...Object.keys(TABLES)]);
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function need(v,c){if(!v)throw Error(c);}
function source(section,paged=false){
 const cursor=field=>paged?` and ($2::text is null or ${field}>$2::uuid)`:"";
 if(section==='profile')return "select r.id::text as key,jsonb_build_object('id',r.id,'email',to_jsonb(r)->'email','phone',to_jsonb(r)->'phone','created_at',to_jsonb(r)->'created_at','email_confirmed_at',to_jsonb(r)->'email_confirmed_at','profile',to_jsonb(r)->'raw_user_meta_data')::text as data from auth.users r where r.id=$1"+cursor("r.id");
 const table=TABLES[section];need(table,'INVALID_PORTABILITY_REQUEST');
 const key=section==='snapshots'?"r.project_id::text":section==='receipts'?"jsonb_build_array(r.project_id,r.idempotency_key)::text":"r.id::text";
 // Private receipt hashes are integrity metadata, never account credentials.
 return `select ${key} as key,to_jsonb(r)::text as data from ${table} r where r.owner_id=$1${section==='receipts'?'':cursor(section==='snapshots'?'r.project_id':'r.id')}`;
}
function create({db,authenticate,authorizeTransaction,enabled=false,now=()=>new Date().toISOString()}){
 need(db&&typeof db.transaction==='function'&&typeof authenticate==='function'&&typeof authorizeTransaction==='function','PORTABILITY_DEPENDENCIES_REQUIRED');
 async function read(token,scope,request){
  need(enabled===true,'CLOUD_WRITE_GATE_CLOSED');need(ID.test(scope?.ownerId),'INVALID_SCOPE');
  need(request&&Object.getPrototypeOf(request)===Object.prototype&&Object.keys(request).every(k=>['section','after','pieceOffset'].includes(k))&&typeof request.section==='string','INVALID_PORTABILITY_REQUEST');
  const manifest=request.section==='manifest';need(manifest||SECTIONS.includes(request.section),'INVALID_PORTABILITY_REQUEST');
  const after=request.after??null,offset=request.pieceOffset??0;
  need(after===null||typeof after==='string'&&after.length<=512,'INVALID_PORTABILITY_REQUEST');
  need(after===null||request.section==='receipts'||ID.test(after),'INVALID_PORTABILITY_REQUEST');
  need(Number.isSafeInteger(offset)&&offset>=0&&offset<=64000000&&(!manifest||after===null&&offset===0),'INVALID_PORTABILITY_REQUEST');
  const user=await authenticate(token);need(user?.id===scope.ownerId&&user.is_anonymous===false&&user.email_confirmed_at,'VERIFIED_OWNER_SESSION_REQUIRED');
  return db.transaction(async tx=>{
   await authorizeTransaction(tx,user,scope);
   if(manifest){
    const sections=[];
    for(const name of SECTIONS){const row=(await tx.query(`with records as (${source(name)}) select count(*)::text as count,encode(sha256(convert_to(coalesce(string_agg(key||':'||encode(sha256(convert_to(data,'UTF8')),'hex'),E'\\n' order by key),''),'UTF8')),'hex') as sha256 from records`,[scope.ownerId])).rows[0];sections.push({name,count:row.count,sha256:row.sha256});}
    const fingerprint=createHash('sha256').update(JSON.stringify(sections)).digest('hex');
    return {format:FORMAT,projectRef:PROJECT,ownerId:user.id,observedAt:now(),sections,fingerprint,automaticRestoreAllowed:false,scope:'account-business-data',exclusions:['passwords-tokens-and-server-secrets','temporary-calculation-checkpoints-and-unconfirmed-reviews','provider-operational-logs-and-request-buckets','device-local-Demo']};
   }
   const base=source(request.section,true),rows=(await tx.query(`with records as (${base}), candidates as (select key,data from records where ($2::text is null or key>$2::text) order by key limit 500), sized as (select key,data,octet_length(data) as bytes,sum(octet_length(data)) over(order by key) as total_bytes,row_number() over(order by key) as ordinal from candidates) select key,case when ordinal=1 and bytes>$3 then substring(data from $4+1 for 64000) else data end as data,(ordinal=1 and bytes>$3) as piece,case when ordinal=1 and bytes>$3 then char_length(data) else null end as total_chars from sized where total_bytes<=$3 or ordinal=1 order by key`,[scope.ownerId,after,PAGE_BYTES,offset])).rows;
   need(rows.length||offset===0,'INVALID_PORTABILITY_REQUEST');
   if(offset>0)need(rows[0]?.piece&&offset<Number(rows[0].total_chars),'INVALID_PORTABILITY_REQUEST');
   const first=rows[0],piece=first?.piece===true;
   return {format:FORMAT,projectRef:PROJECT,ownerId:user.id,section:request.section,observedAt:now(),rows:rows.map(r=>({key:r.key,data:r.data})),nextAfter:piece?Number(first.total_chars)>offset+Array.from(first.data).length?after:first.key:rows.at(-1)?.key??null,piece:piece?{offset,totalChars:Number(first.total_chars),nextOffset:offset+Array.from(first.data).length<Number(first.total_chars)?offset+Array.from(first.data).length:0}:null,done:rows.length===0};
  });
 }
 return Object.freeze({read});
}
module.exports=Object.freeze({create,FORMAT,PROJECT,SECTIONS,PAGE_BYTES});
