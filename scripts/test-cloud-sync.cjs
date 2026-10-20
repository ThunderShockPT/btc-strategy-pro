/* Bloco 13 — isolated tests, no real Supabase accounts, secrets or credentials */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('cloud-sync.js','utf8');
const context={};vm.runInNewContext(code,context);
const {create,ConflictError}=context.BTCCloudSync;
const ID='b78b23e1-4a6f-4306-a84d-5c069fab7201';
const U1='f9f7f0c7-05b2-4f2c-8d79-0d72d5b9fa32';
const U2='2ad20f27-e175-44c5-8e9b-67774e64a9e8';
const db={projects:new Map(),project_snapshots:new Map()};let tick=0;
function clientFor(viewer){
 return {from(table){
  const q={action:null,data:null,filters:[],selectCols:'',
   insert(value){this.action='insert';this.data=value;return this},
   update(value){this.action='update';this.data=value;return this},
   select(columns){this.selectCols=columns;return this},
   eq(k,v){this.filters.push([k,v]);return this},
   async single(){return this.exec(true)},
   async maybeSingle(){return this.exec(false)},
   async exec(required){
    await Promise.resolve();const map=db[table];let row;
    if(this.action==='insert'){
     const id=table==='projects'?this.data.id:this.data.project_id;
     if(map.has(id))return {data:null,error:{message:'duplicate key'}};
     if(this.data.owner_id!==viewer)return {data:null,error:{message:'row-level security'}};
     row={...this.data,updated_at:'timestamp-'+(++tick)};
     map.set(id,row);
    }else{
     const key=table==='projects'?'id':'project_id';
     const found=Array.from(map.values()).find(r=>r.owner_id===viewer&&this.filters.every(([k,v])=>r[k]===v));
     if(!found)return {data:required?null:null,error:null};
     row={...found,...this.data,updated_at:'timestamp-'+(++tick)};
     map.set(found[key],row);
    }
    return {data:row,error:null}
   }
  };
  return q;
 }};
}
function project(name='Projeto teste',value=1){return {id:ID,name,mode:'demo',capital:2000,archived:false,snapshot:{schema:1,ledger:{ledger:[value]}}}}
(async()=>{
 const c1=clientFor(U1),c2=clientFor(U1);
 const a=create(c1,U1),p=project();
 assert.equal(a.pending(p),true);
 assert.equal((await a.persist(p)).version,1,'first insert');
 assert.equal(db.project_snapshots.get(ID).version,1);
 assert.equal(a.pending(p),false,'no write if nothing changed');
 const b=create(c2,U1);const initial={...db.projects.get(ID),project_snapshots:{...db.project_snapshots.get(ID)}};
 b.seed(project(),initial);
 const other=project('Projeto teste',9);
 assert.equal(b.pending(other),true);
 p.snapshot.ledger.ledger.push(2);
 assert.equal((await a.persist(p)).version,2,'version increment');
 assert.equal(db.project_snapshots.get(ID).version,2);
 await assert.rejects(()=>b.persist(other),e=>e instanceof ConflictError&&e.code==='CLOUD_VERSION_CONFLICT','stale write rejected');
 assert.equal(db.project_snapshots.get(ID).payload.ledger.ledger[1],2,'newer changes preserved');
 const c=create(clientFor(U1),U1);
 const latest={...db.projects.get(ID),project_snapshots:{...db.project_snapshots.get(ID)}};
 c.seed({...p},latest);const renamed=project('Nome atualizado',2);
 assert.equal((await c.persist(renamed)).version,3,'metadata + version');
 const old=project('Nome do dispositivo antigo',2);
 await assert.rejects(()=>a.persist(old),e=>e instanceof ConflictError,'metadata collision');
 const stranger=create(clientFor(U2),U2);
 await assert.rejects(()=>stranger.persist(project()),/duplicate key|security/i,'other user cannot create project with foreign ID');
 assert.equal(db.projects.get(ID).owner_id,U1,'ownership intact');
 assert.throws(()=>context.BTCCloudSync.requireProject({...p,id:'not-a-uuid'}),/ID de projeto inválido/);
 console.log('BTC Strategy Pro Bloco 13: 9 optimistic-sync assertions PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
