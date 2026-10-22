'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),HTTP=require('../backend/http-api.cjs'),Jobs=require('../backend/calculation-jobs.cjs'),Checkpoints=require('../backend/calculation-checkpoints.cjs'),Store=require('../backend/atomic-store.cjs'),f=require('./helpers/server-fixture.cjs'),cf=require('./helpers/cycle-fixture.cjs');
const origin='https://btc.example.test';
test('authenticated HTTP calculation lifecycle preserves financial state and isolates owners',async t=>{
 const x=await f.setup(t,{liveCalculationClock:true}),store=Store.create({...x,authenticate:x.auth.authenticate,authorizeTransaction:x.auth.assertSession,enabled:true});
 const checkpoints=Checkpoints.create({key:Buffer.alloc(32,31),enabled:true,now:()=>new Date().toISOString(),loadSnapshot:(token,s)=>store.snapshot(token,s),contextProvider:x.contextProvider,policyProvider:async(s,input)=>({...cf.policy(),maxCycles:1,protectedCashUSD:input.reservations.protectedUSD})});
 const calculationJobs=Jobs.create({db:x.db,authenticate:x.auth.authenticate,authorizeTransaction:x.auth.assertSession,checkpoints,enabled:true}),buckets=[];
 const options={...x,origins:[origin],admit:async q=>{buckets.push(q.route);return true;},enabled:true,calculationJobs},handle=HTTP.create(options);
 async function call(action,extra={},token=f.TA,h=handle){const response=await h(new Request('https://api.example.test/api/v20/calculations/'+action,{method:'POST',headers:{origin,'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({projectId:f.P,scenarioKey:'demo_long',...extra})}),{remoteAddress:'127.0.0.1'});return {status:response.status,...await response.json()};}
 const scope={ownerId:f.A,projectId:f.P,scenarioKey:'demo_long'},before=await store.snapshot(f.TA,scope);
 const created=await call('enqueue',{request:{idempotencyKey:'http-job'}});assert.equal(created.status,200);const id=created.result.id;
 assert.equal((await call('enqueue',{request:{idempotencyKey:'http-job'}})).result.id,id);
 assert.equal((await call('status',{jobId:id},f.TB)).status,404);
 assert.equal((await call('result',{jobId:id})).status,409);
 assert.equal((await call('advance',{jobId:id})).result.sequence,1);
 assert.equal((await call('status',{jobId:id})).result.sequence,1);
 const cancelled=await call('cancel',{jobId:id});assert.equal(cancelled.result.status,'cancelled');
 assert.equal((await call('advance',{jobId:id})).result.status,'cancelled');
 const second=await call('enqueue',{request:{idempotencyKey:'http-complete'}});let progress=second.result;
 for(let n=0;progress.status!=='completed';n++){assert(n<300);const step=await call('advance',{jobId:progress.id});assert.equal(step.status,200);progress=step.result;}
 const completed=await call('result',{jobId:progress.id});assert.equal(completed.status,200);assert.equal(completed.result.plannerVersion,'v20-cycles-6.1');
 assert.deepEqual(await store.snapshot(f.TA,scope),before);
 assert(!JSON.stringify(created).includes('envelope'));assert(!JSON.stringify(created).includes('lease_id'));
 assert(buckets.includes('/api/v20/prepare'));assert(buckets.includes('/api/v20/state'));assert(buckets.includes('/api/v20/commit'));assert(buckets.includes('/api/v20/calculations/advance'));assert(buckets.every(p=>['/api/v20/prepare','/api/v20/state','/api/v20/commit','/api/v20/calculations/advance'].includes(p)));
 for(const extra of [{jobId:id,ownerId:f.A},{jobId:id,envelope:{}},{jobId:'invalid'}])assert.equal((await call('advance',extra)).status,400);
 assert.equal((await call('enqueue',{request:{idempotencyKey:'x',price:1}})).status,400);
 assert.equal((await call('unknown',{jobId:id})).status,404);
 assert.equal((await call('status',{jobId:id},f.TA,HTTP.create({...options,calculationJobs:null}))).status,503);
 await x.db.query('delete from auth.sessions where id=$1',[f.SA]);assert.equal((await call('advance',{jobId:id})).status,401);
});
