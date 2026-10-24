'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Store=require('../backend/atomic-store.cjs'),Jobs=require('../backend/calculation-jobs.cjs'),CP=require('../backend/calculation-checkpoints.cjs'),HTTP=require('../backend/http-api.cjs'),f=require('./helpers/server-fixture.cjs'),cf=require('./helpers/cycle-fixture.cjs');
const scope={ownerId:f.A,projectId:f.P,scenarioKey:'demo_long'},request=(id,jobId)=>({workflow:'plan-calculation',command:{mode:'recorded',jobId,change:{id:f.uuid(id),version:'2'}}}),confirmation=p=>({headHash:p.headHash,reviewHash:p.reviewHash,idempotencyKey:'apply-calculation'});
async function setup(t){const x=await f.setup(t,{liveCalculationClock:true}),options={...x,authenticate:x.auth.authenticate,authorizeTransaction:x.auth.assertSession,enabled:true},store=Store.create(options);let contextCalls=0,timeOffset=0;
 const checkpoints=CP.create({key:Buffer.alloc(32,19),enabled:true,now:()=>new Date(Date.now()+timeOffset).toISOString(),loadSnapshot:(token,s)=>store.snapshot(token,s),contextProvider:async(...args)=>{contextCalls++;return x.contextProvider(...args);},policyProvider:async(s,input)=>({...cf.policy(),maxCycles:1,protectedCashUSD:input.reservations.protectedUSD})}),jobs=Jobs.create({...options,checkpoints}),reviewStore=Store.create({...options,calculationJobs:jobs,contextProvider:async()=>{throw Error('NEW_CONTEXT_FORBIDDEN');},planContextProvider:async()=>{throw Error('NEW_POLICY_FORBIDDEN');}});
 async function finish(key){let job=await jobs.enqueue(f.TA,scope,{idempotencyKey:key});for(let i=0;job.status!=='completed';i++){assert(i<300);job=await jobs.runUnit(f.TA,scope,job.id);}return job;}
 return {...x,options,store,reviewStore,jobs,finish,contextCalls:()=>contextCalls,setTimeOffset:v=>{timeOffset=v;}};
}
test('completed signed job becomes a frozen review and applies exactly once without generating scenarios again',async t=>{
 const x=await setup(t),before=await x.store.snapshot(f.TA,scope),job=await x.finish('complete-review'),source=await x.jobs.reviewSource(f.TA,scope,job.id);assert(source.search.done);assert.equal(x.contextCalls(),1);
 // Instrument fresh module instances: neither preparation nor confirmation may restart a simulation.
 const cyclePath=require.resolve('../cycle-planner.js'),cashPath=require.resolve('../cash-workflow.js'),storePath=require.resolve('../backend/atomic-store.cjs'),oldCycles=require.cache[cyclePath].exports,oldCash=require.cache[cashPath],oldStore=require.cache[storePath];
 try{require.cache[cyclePath].exports={...oldCycles,generate:()=>{throw Error('FULL_SEARCH_FORBIDDEN');},advanceSearch:()=>{throw Error('SCENARIO_RERUN_FORBIDDEN');}};delete require.cache[cashPath];delete require.cache[storePath];
  const instrumented=require('../backend/atomic-store.cjs').create({...x.options,calculationJobs:x.jobs,contextProvider:async()=>{throw Error('NEW_QUOTE_FORBIDDEN');}}),cmd=request(2100,job.id),p=await instrumented.prepare(f.TA,scope,cmd);
  assert.equal(p.calculationSource.expiresAt,source.expiresAt);assert(Date.parse(p.expiresAt)<=Date.parse(source.expiresAt));assert.deepEqual(p.review.result,await x.jobs.result(f.TA,scope,job.id));assert.equal(p.review.result.failedMarginSurvived,true);assert.equal((await x.store.snapshot(f.TA,scope)).headHash,before.headHash);
  const applied=await instrumented.commit(f.TA,scope,cmd,confirmation(p));assert.equal(applied.planApplied,true);assert.deepEqual(applied.eventsAppended,[]);assert.equal(applied.revision,before.revision);assert.equal((await instrumented.commit(f.TA,scope,cmd,confirmation(p))).replayed,true);
  const after=await x.store.snapshot(f.TA,scope);assert.deepEqual(after.state.input.events,before.state.input.events);assert.deepEqual(after.state.input.valuation,source.search.input.valuation);assert.equal(after.state.plan.id,f.uuid(2100));assert.deepEqual(after.state.input.reservations,p.review.proposedReservations);assert.equal(x.contextCalls(),1);
 }finally{require.cache[cyclePath].exports=oldCycles;require.cache[cashPath]=oldCash;require.cache[storePath]=oldStore;}
});
test('pending jobs, foreign accounts, injected results and stale financial facts cannot create an applicable review',async t=>{
 const x=await setup(t),pending=await x.jobs.enqueue(f.TA,scope,{idempotencyKey:'pending-review'});await assert.rejects(x.reviewStore.prepare(f.TA,scope,request(2101,pending.id)),/SEARCH_NOT_COMPLETED/);
 const job=await x.finish('stale-review');await assert.rejects(x.reviewStore.prepare(f.TB,scope,request(2101,job.id)),/VERIFIED_OWNER/);await assert.rejects(x.reviewStore.prepare(f.TA,scope,{...request(2101,job.id),result:{selected:true}}),/INVALID_COMMAND_FIELDS/);
 const movement=f.movement(),p=await x.store.prepare(f.TA,scope,movement);await x.store.commit(f.TA,scope,movement,confirmation(p));await assert.rejects(x.reviewStore.prepare(f.TA,scope,request(2101,job.id)),/STALE_CALCULATION_BASIS/);
});
test('HTTP prepare/commit accepts only a job reference and never exposes the signed source',async t=>{
 const x=await setup(t),job=await x.finish('http-review'),h=HTTP.create({...x,calculationJobs:x.jobs,origins:['https://btc.example.test'],admit:async()=>true,enabled:true,contextProvider:async()=>{throw Error('NEW_CONTEXT_FORBIDDEN');}}),cmd=request(2102,job.id);
 async function call(route,extra){const r=await h(new Request('https://api.example.test/api/v20/'+route,{method:'POST',headers:{origin:'https://btc.example.test','Content-Type':'application/json',Authorization:'Bearer '+f.TA},body:JSON.stringify({projectId:f.P,scenarioKey:'demo_long',request:cmd,...extra})}),{remoteAddress:'127.0.0.1'});return {status:r.status,...await r.json()};}
 const p=await call('prepare');assert.equal(p.status,200);assert.equal(JSON.stringify(p).includes('completedSearch'),false);assert.equal(JSON.stringify(p).includes('"mac"'),false);assert.equal((await call('commit',{confirmation:confirmation(p.result)})).status,200);
});

test('job expiry is never renewed by preparing a review; altered signed payload is rejected',async t=>{
 const x=await setup(t),job=await x.finish('expired-review');x.setTimeOffset(61000);await assert.rejects(x.reviewStore.prepare(f.TA,scope,request(2103,job.id)),/CALCULATION_EXPIRED/);assert.equal((await x.db.query('select count(*)::int n from btcsp_private.command_reviews')).rows[0].n,0);
});
test('a stored payload changed without its MAC cannot become a server review',async t=>{
 const x=await setup(t),job=await x.finish('tampered-review'),row=(await x.db.query('select envelope from btcsp_private.calculation_jobs where id=$1',[job.id])).rows[0];row.envelope.payload.search.input.valuation.markPriceUSD='1';await x.db.query('update btcsp_private.calculation_jobs set envelope=$2 where id=$1',[job.id,row.envelope]);await assert.rejects(x.reviewStore.prepare(f.TA,scope,request(2104,job.id)),/INVALID_CALCULATION_SIGNATURE/);assert.equal((await x.jobs.status(f.TA,scope,job.id)).status,'blocked');
});

test('factored inputs retain their digest, reject corruption and read legacy full-input reviews without changing confirmation',async t=>{
 const x=await setup(t),job=await x.finish('factored-review'),cmd=request(2110,job.id),p=await x.reviewStore.prepare(f.TA,scope,cmd),row=(await x.db.query('select * from btcsp_private.command_reviews where review_hash=$1',[p.reviewHash])).rows[0];
 assert.equal(Object.hasOwn(row.payload.completedSearch,'input'),false);assert.match(row.payload.completedSearchInputHash,/^[a-f0-9]{64}$/);
 async function replace(payload){await x.db.query('delete from btcsp_private.command_reviews where review_hash=$1',[p.reviewHash]);await x.db.query('insert into btcsp_private.command_reviews(project_id,owner_id,scenario_key,review_hash,request_hash,basis_hash,payload,expires_at,recorded_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[f.P,f.A,'demo_long',p.reviewHash,row.request_hash,row.basis_hash,payload,row.expires_at,row.recorded_at]);}
 await replace({...row.payload,completedSearchInputHash:'0'.repeat(64)});await assert.rejects(x.reviewStore.commit(f.TA,scope,cmd,confirmation(p)),/REVIEW_CHANGED_OR_TAMPERED/);assert.equal((await x.db.query('select count(*)::int n from btcsp_private.command_receipts')).rows[0].n,0);
 const legacy=JSON.parse(JSON.stringify(row.payload));legacy.completedSearch.input=legacy.state.input;delete legacy.completedSearchInputHash;await replace(legacy);assert.equal((await x.reviewStore.commit(f.TA,scope,cmd,confirmation(p))).planApplied,true);
});
