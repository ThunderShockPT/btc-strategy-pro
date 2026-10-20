/* BTC Strategy Pro — atomic cloud writes (RLS + transactional RPC). */
(function(root){
'use strict';
class ConflictError extends Error{
 constructor(msg='Projeto alterado noutro dispositivo. Exporta backup antes de recarregar da cloud.'){
  super(msg);this.name='ConflictError';this.code='CLOUD_VERSION_CONFLICT';
 }
}
const meta=p=>({name:String(p.name),mode:String(p.mode),capital:Number(p.capital),archived:!!p.archived});
const signature=v=>JSON.stringify(v);
function requireProject(p){
 if(!p||typeof p.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id))throw Error('ID de projeto inválido.');
 const m=meta(p);
 if(m.name.trim().length<2||m.name.length>65||!['demo','real'].includes(m.mode)||!Number.isFinite(m.capital)||m.capital<100||m.capital>1e9)throw Error('Dados do projeto inválidos.');
 if(!p.snapshot||typeof p.snapshot!=='object'||Array.isArray(p.snapshot))throw Error('Snapshot inválido.');
 const payload=signature(p.snapshot);
 if(payload.length>1400000)throw Error('Snapshot demasiado grande. Exporta os dados localmente.');
 return {m,payload};
}
function create(client,userId){
 if(!client||typeof client.rpc!=='function'||!userId)throw Error('É necessária uma sessão autenticada e uma API de sincronização.');
 const states=new Map();
 function seed(p,row){
  const snap=Array.isArray(row.project_snapshots)?row.project_snapshots[0]:row.project_snapshots;
  states.set(p.id,{
   metaStamp:row.updated_at,
   metaSignature:signature(meta(p)),
   version:Number.isInteger(snap?.version)?snap.version:null,
   payloadSignature:snap?.payload?signature(snap.payload):null
  });
 }
 function pending(p){
  const st=states.get(p.id);if(!st)return true;
  return signature(meta(p))!==st.metaSignature || (p.snapshot&&signature(p.snapshot)!==st.payloadSignature);
 }
 async function persist(p){
  const {m,payload}=requireProject(p),st=states.get(p.id);
  let result;
  try{
   result=await client.rpc('btcsp_save_project_v1',{
    p_id:p.id,p_name:m.name,p_mode:m.mode,p_capital:m.capital,
    p_archived:m.archived,p_payload:p.snapshot,
    p_expected_meta_updated_at:st?.metaStamp??null,
    p_expected_version:st?.version??null
   });
  }catch(e){throw new Error('Ligação à cloud falhou: '+String(e?.message||e));}
  if(result?.error){
   const e=result.error;
   if(e.code==='P0001'||e.code==='23505'||String(e.message).includes('BTCSP_VERSION_CONFLICT'))
    throw new ConflictError();
   throw Error('Falha na gravação segura: '+e.message);
  }
  const row=Array.isArray(result.data)?result.data[0]:result.data;
  if(!row||typeof row.meta_updated_at!=='string'||!Number.isInteger(row.snapshot_version))
   throw Error('Não foi possível confirmar a gravação atómica.');
  states.set(p.id,{
   metaStamp:row.meta_updated_at,
   metaSignature:signature(m),
   version:row.snapshot_version,
   payloadSignature:payload
  });
  return {version:row.snapshot_version,updatedAt:row.meta_updated_at};
 }
 function forget(id){states.delete(id)}
 return {seed,pending,persist,forget,state:id=>states.has(id)?{...states.get(id)}:null,reset:()=>states.clear()};
}
root.BTCCloudSync={create,ConflictError,requireProject};
})(typeof window!=='undefined'?window:globalThis);
