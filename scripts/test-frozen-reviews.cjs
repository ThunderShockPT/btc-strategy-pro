'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Store=require('../backend/atomic-store.cjs'),f=require('./helpers/server-fixture.cjs');
const {createHash}=require('node:crypto'),{canonical}=require('../backend/persistence-contract.cjs');
const scope={ownerId:f.A,projectId:f.P,scenarioKey:'demo_long'};
const cf=(p,key='frozen-confirm')=>({headHash:p.headHash,reviewHash:p.reviewHash,idempotencyKey:key});
async function setup(t){const x=await f.setup(t);let calls=0;const contextProvider=async(s,input)=>{calls++;return {...await x.contextProvider(s,input),valuation:{...input.valuation,markPriceUSD:String(100000+calls*1000)}};};return {...x,contextProvider,calls:()=>calls,make:extra=>Store.create({...x,authenticate:x.auth.authenticate,authorizeTransaction:x.auth.assertSession,contextProvider,enabled:true,...extra})};}
test('reviewed quote survives provider changes and service restart; exact retry survives review cleanup',async t=>{
 const x=await setup(t),a=x.make(),request=f.movement(),p=await a.prepare(f.TA,scope,request);assert.equal(x.calls(),1);assert(p.expiresAt>p.reviewedAt);assert.equal((await a.snapshot(f.TA,scope)).revision,'3');
 const b=x.make({contextProvider:async()=>{throw Error('must not fetch a new quote at confirmation');}}),r=await b.commit(f.TA,scope,request,cf(p));assert.equal(r.revision,'4');assert.equal(x.calls(),1);assert.equal((await b.snapshot(f.TA,scope)).state.input.valuation.markPriceUSD,'101000');
 await x.db.query('delete from btcsp_private.command_reviews');assert.equal((await b.commit(f.TA,scope,request,cf(p))).replayed,true);
});
test('plan-only review preserves quote, events and version after provider changes',async t=>{
 const x=await setup(t),a=x.make(),before=await a.snapshot(f.TA,scope),request={workflow:'plan-reservations',command:{mode:'recorded',change:{id:f.uuid(1900),version:'2',reservations:{ordersUSD:'100',marginUSD:'100',protectedUSD:'200'}}}},p=await a.prepare(f.TA,scope,request);
 const result=await x.make({contextProvider:async()=>{throw Error('new context forbidden');}}).commit(f.TA,scope,request,cf(p));assert.equal(result.planApplied,true);const after=await a.snapshot(f.TA,scope);assert.deepEqual(after.state.input.events,before.state.input.events);assert.equal(after.state.input.valuation.markPriceUSD,'101000');assert.equal(after.state.plan.version,'2');
});
test('missing, altered request and another owner cannot reuse a persisted review',async t=>{
 const x=await setup(t),a=x.make(),p=await a.prepare(f.TA,scope,f.movement());await assert.rejects(a.commit(f.TA,scope,{...f.movement(),command:{...f.movement().command,amountUSD:'900'}},cf(p)),/TAMPERED/);await assert.rejects(a.commit(f.TB,scope,f.movement(),cf(p)),/VERIFIED_OWNER/);await assert.rejects(a.commit(f.TA,scope,f.movement(),{...cf(p),reviewHash:'0'.repeat(64)}),/TAMPERED/);assert.equal((await a.snapshot(f.TA,scope)).revision,'3');
});
test('SQL prevents review updates and client reads; expiry is checked again before financial writes',async t=>{
 const x=await setup(t),a=x.make(),p=await a.prepare(f.TA,scope,f.movement());await assert.rejects(x.db.query("update btcsp_private.command_reviews set payload='{}'"),/APPEND_ONLY/);await x.db.exec('set role authenticated');await assert.rejects(x.db.query('select * from btcsp_private.command_reviews'),{code:'42501'});await x.db.exec('reset role');
 // Instrument the final transaction with the DB freshness answer, without weakening the immutable table.
 let checks=0;const wrapped={transaction:fn=>x.db.transaction(tx=>fn({query:async(sql,args)=>{if(sql.startsWith('select expires_at>clock_timestamp() as fresh from btcsp_private.command_reviews')){checks++;return {rows:[{fresh:false}]};}return tx.query(sql,args);}}))};
 await assert.rejects(x.make({db:wrapped}).commit(f.TA,scope,f.movement(),cf(p)),/COMMAND_REVIEW_EXPIRED/);assert.equal(checks,1);assert.equal((await a.snapshot(f.TA,scope)).revision,'3');
});

test('database clock rejects a genuinely expired stored review without appending facts',async t=>{
 const x=await setup(t),a=x.make(),p=await a.prepare(f.TA,scope,f.movement()),row=(await x.db.query('select * from btcsp_private.command_reviews')).rows[0],payload=JSON.parse(JSON.stringify(row.payload));
 const deadline=new Date(Date.now()+20).toISOString();delete payload.result.reviewHash;payload.result.expiresAt=deadline;payload.result.reviewHash=createHash('sha256').update(canonical(payload.result)).digest('hex');
 await x.db.query('insert into btcsp_private.command_reviews(project_id,owner_id,scenario_key,review_hash,request_hash,basis_hash,payload,expires_at,recorded_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[f.P,f.A,'demo_long',payload.result.reviewHash,row.request_hash,row.basis_hash,payload,deadline,new Date(Date.now()-59000).toISOString()]);
 await new Promise(r=>setTimeout(r,40));await assert.rejects(a.commit(f.TA,scope,f.movement(),cf(payload.result)),/COMMAND_REVIEW_EXPIRED/);assert.equal((await a.snapshot(f.TA,scope)).revision,'3');
});

test('profile review expiry is capped by the trusted public observation deadline',async t=>{
 const x=await setup(t),of=require('./helpers/onboarding-fixture.cjs'),deadline=new Date(Date.now()+30000).toISOString(),context=of.context(),store=x.make({planContextProvider:async()=>({market:{...context.market,validUntil:deadline},baseCyclePolicy:{...context.baseCyclePolicy,maxCycles:1}})}),request={workflow:'plan-profile',command:{mode:'recorded',change:{id:f.uuid(1950),version:'2',profile:'balanced',floorMode:'preserve',marginAdmission:'strict'}}},p=await store.prepare(f.TA,scope,request);
 assert.equal(p.expiresAt,deadline);assert.equal(p.review.change.market.validUntil,deadline);
});
