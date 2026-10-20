/* BTC Strategy Pro · Bloco 13 — versioned, per-owner cloud writes.
 * The client still requires Supabase Auth + RLS. Never store service keys here. */
(function(root){
'use strict';
class ConflictError extends Error{constructor(message){super(message||'Projeto alterado noutro dispositivo; exporta backup antes de recarregar.');this.name='ConflictError';this.code='CLOUD_VERSION_CONFLICT'}}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const meta=p=>({name:String(p.name),mode:String(p.mode),capital:Number(p.capital),archived:!!p.archived});
const signature=v=>JSON.stringify(v);
function requireProject(p){
 if(!p||typeof p.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(p.id))throw Error('ID de projeto inválido.');
 const m=meta(p);
 if(m.name.trim().length<2||m.name.length>65||!['demo','real'].includes(m.mode)||!Number.isFinite(m.capital)||m.capital<100||m.capital>1e9)throw Error('Dados do projeto inválidos.');
 if(!p.snapshot||typeof p.snapshot!=='object'||Array.isArray(p.snapshot))throw Error('Snapshot inválido.');
 const payload=signature(p.snapshot);
 if(payload.length>1400000)throw Error('Snapshot demasiado grande. Exporta os dados localmente.');
 return {m,payload};
}
function failed(result,where){if(result.error)throw Error(where+': '+result.error.message);return result.data;}
function create(client,userId){
 if(!client||!userId)throw Error('É necessária uma sessão autenticada.');
 const states=new Map();
 function seed(p,row){
  const snapshot=Array.isArray(row.project_snapshots)?row.project_snapshots[0]:row.project_snapshots;
  states.set(p.id,{
   metaStamp:row.updated_at,
   metaSignature:signature(meta(p)),
   version:Number.isInteger(snapshot?.version)?snapshot.version:null,
   payloadSignature:snapshot?.payload?signature(snapshot.payload):null
  });
 }
 function pending(p){const x=states.get(p.id);if(!x)return true;const m=meta(p);return signature(m)!==x.metaSignature || (p.snapshot&&signature(p.snapshot)!==x.payloadSignature)}
 async function persist(p){
  const {m,payload}=requireProject(p);
  let st=states.get(p.id);
  if(!st){
   const result=await client.from('projects').insert({id:p.id,owner_id:userId,...m}).select('updated_at').single();
   const data=failed(result,'Criar projeto');
   if(!data?.updated_at)throw new ConflictError('Não foi possível confirmar a criação do projeto.');
   st={metaStamp:data.updated_at,metaSignature:signature(m),version:null,payloadSignature:null};
   states.set(p.id,st);
  }
  if(signature(m)!==st.metaSignature){
   const result=await client.from('projects').update({...m}).eq('id',p.id).eq('owner_id',userId).eq('updated_at',st.metaStamp).select('updated_at').maybeSingle();
   const data=failed(result,'Atualizar projeto');
   if(!data?.updated_at)throw new ConflictError('Os dados do projeto foram alterados ou eliminados noutro dispositivo.');
   st.metaStamp=data.updated_at;
   st.metaSignature=signature(m);
  }
  if(payload!==st.payloadSignature){
   const snap={project_id:p.id,owner_id:userId,payload:p.snapshot};
   if(st.version===null){
    const result=await client.from('project_snapshots').insert({...snap,version:1}).select('version').single();
    const data=failed(result,'Criar snapshot');
    if(data?.version!==1)throw new ConflictError('O snapshot inicial já existe ou não pôde ser confirmado.');
    st.version=1;
   }else{
    if(st.version>=2147483647)throw Error('Limite de revisões atingido.');
    const result=await client.from('project_snapshots').update({payload:p.snapshot,version:st.version+1}).eq('project_id',p.id).eq('owner_id',userId).eq('version',st.version).select('version').maybeSingle();
    const data=failed(result,'Guardar snapshot');
    if(!data||data.version!==st.version+1)throw new ConflictError();
    st.version=data.version;
   }
   st.payloadSignature=payload;
  }
  return {version:st.version,updatedAt:st.metaStamp};
 }
 function forget(id){states.delete(id)}
 return {seed,pending,persist,forget,state:id=>states.has(id)?{...states.get(id)}:null,reset:()=>states.clear()};
}
root.BTCCloudSync={create,ConflictError,requireProject};
})(typeof window!=='undefined'?window:globalThis);
