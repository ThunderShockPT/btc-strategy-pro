/* BTC Strategy Pro audit — isolated transaction & concurrency QA.
 * No external API calls, real accounts or credentials. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const sandbox={};vm.runInNewContext(fs.readFileSync('cloud-sync.js','utf8'),sandbox);
const {create,ConflictError,requireProject}=sandbox.BTCCloudSync;
const P='b78b23e1-4a6f-4306-a84d-5c069fab7201',
 U1='f9f7f0c7-05b2-4f2c-8d79-0d72d5b9fa32',
 U2='2ad20f27-e175-44c5-8e9b-67774e64a9e8';
const db=new Map();let stamp=0;let failMidWrite=false,requests=0;
function clientFor(uid,disconnected=false){
 return {async rpc(proc,p){
  requests++;
  assert.equal(proc,'btcsp_save_project_v1');
  if(disconnected)return {data:null,error:{code:'NETWORK',message:'offline'}};
  const row=db.get(p.p_id);
  if(row&&row.owner!==uid)return {data:null,error:{code:'42501',message:'row level security denied'}};
  if((row?.stamp??null)!==p.p_expected_meta_updated_at||(row?.version??null)!==p.p_expected_version)
    return {data:null,error:{code:'P0001',message:'BTCSP_VERSION_CONFLICT'}};
  if(failMidWrite)return {data:null,error:{code:'XX000',message:'Simulated database transaction rollback'}};
  const m={name:p.p_name,mode:p.p_mode,capital:p.p_capital,archived:p.p_archived};
  const newStamp=row&&JSON.stringify(m)===JSON.stringify(row.meta)?row.stamp:'stamp-'+(++stamp);
  const version=row?(JSON.stringify(row.payload)===JSON.stringify(p.p_payload)?row.version:row.version+1):1;
  db.set(p.p_id,{owner:uid,stamp:newStamp,version,payload:structuredClone(p.p_payload),meta:m});
  return {data:[{meta_updated_at:newStamp,snapshot_version:version}],error:null};
 }};
}
const sample=(val=1,name='Projeto A')=>({id:P,name,mode:'demo',capital:2000,archived:false,snapshot:{schema:1,ledger:{entries:[val]}}});
(async()=>{
 let checked=0;
 const a=create(clientFor(U1),U1),p=sample();
 assert.equal(a.pending(p),true);checked++;
 assert.equal((await a.persist(p)).version,1);checked++;
 assert.equal(a.pending(p),false);checked++;
 const oldWrites=requests;
 assert.equal(a.pending(p),false);assert.equal(requests,oldWrites);checked++;
 const b=create(clientFor(U1),U1);
 b.seed(sample(),{updated_at:db.get(P).stamp,project_snapshots:{version:db.get(P).version,payload:db.get(P).payload}});
 p.snapshot.ledger.entries.push(2);
 assert.equal((await a.persist(p)).version,2);checked++;
 await assert.rejects(()=>b.persist(sample(3)),e=>e instanceof ConflictError);checked++;
 assert.equal(db.get(P).payload.ledger.entries[1],2);checked++;
 const previous=structuredClone(db.get(P));
 failMidWrite=true;
 await assert.rejects(()=>a.persist(sample(4)),/transaction rollback/i);checked++;
 assert.deepEqual(db.get(P),previous);checked++;
 failMidWrite=false;
 const c=create(clientFor(U1),U1);
 c.seed({...p},{updated_at:previous.stamp,project_snapshots:{version:previous.version,payload:previous.payload}});
 assert.equal((await c.persist(sample(4,'Nome novo'))).version,3);checked++;
 await assert.rejects(()=>a.persist(sample(5,'Nome antigo')),e=>e.code==='CLOUD_VERSION_CONFLICT');checked++;
 const outsider=create(clientFor(U2),U2);
 await assert.rejects(()=>outsider.persist(sample()),/row level security denied/i);checked++;
 assert.equal(db.get(P).owner,U1);checked++;
 await assert.rejects(()=>create(clientFor(U1,true),U1).persist({...sample(),id:'53b92e1c-14f1-4ee9-b696-e36966cb0670'}),/offline/i);checked++;
 assert.throws(()=>requireProject({...sample(),id:'not-uuid'}),/ID de projeto inválido/);checked++;
 assert.throws(()=>requireProject({...sample(),capital:NaN}),/Dados do projeto inválidos/);checked++;
 assert.throws(()=>requireProject({...sample(),snapshot:[]}),/Snapshot inválido/);checked++;
 const c2=create(clientFor(U1),U1);
 c2.seed(sample(4,'Nome novo'),{updated_at:db.get(P).stamp,project_snapshots:{version:db.get(P).version,payload:db.get(P).payload}});
 assert.equal(c2.pending(sample(4,'Nome novo')),false);checked++;
 await c2.persist(sample(4,'Nome novo'));
 assert.equal(db.get(P).version,3,'idempotent repeated save');checked++;
 console.log('BTC Strategy Pro: '+checked+' isolated audit assertions PASS — atomicity, offline, isolation, concurrency.');
})().catch(e=>{console.error(e);process.exitCode=1});
