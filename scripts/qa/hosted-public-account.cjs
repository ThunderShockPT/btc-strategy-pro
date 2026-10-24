'use strict';
// Capability-only hosted QA: real public prices/Auth/SQL, invented fixed history
// and explicitly synthetic rules. Never approves or re-dates Kraken rules.
const {createHash,timingSafeEqual}=require('node:crypto');
const Account=require('./hosted-account-handler.cjs'),Runtime=require('../../backend/edge-runtime.cjs'),Database=require('../../backend/pg-database.cjs'),Store=require('../../backend/atomic-store.cjs'),P=require('../../backend/persistence-contract.cjs'),Core=require('../../financial-engine.js'),Public=require('../../backend/public-profile-context.cjs'),Market=require('../../backend/public-market.cjs'),Observations=require('../../backend/public-observations.cjs'),baseline=require('./hosted-account-fixture.json');
const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function create({config,fixture,Pool,getEnv,fetchImpl=fetch,now=()=>Date.now(),memory=()=>({})}){
 if(![1,12].includes(config.maxCycles))throw Error('QA_CAPACITY_REQUIRED');
 const scope={ownerId:config.accounts[0].id,projectId:config.accounts[0].projectId,scenarioKey:'manual_long'};
 const source=fixture;if(source?.input?.ownerId!==scope.ownerId||source.input.projectId!==scope.projectId||source.input.scenarioKey!==scope.scenarioKey||source?.plan?.ownerId!==scope.ownerId||source.plan.projectId!==scope.projectId||source.plan.scenarioKey!==scope.scenarioKey)throw Error('QA_FIXTURE_SCOPE_REQUIRED');
 if(source.input.events.length>5000||source.input.rules.qaFixture?.kind!=='synthetic-not-Kraken-verification')throw Error('QA_FIXTURE_REQUIRED');
 const rules=source.input.rules,clock=()=>new Date(now()).toISOString();
 let contextError=null;
 const observed=fn=>async(...args)=>{try{return await fn(...args);}catch(e){contextError=/^[A-Z][A-Z_]{0,99}$/.test(e?.message||'')?e.message:'QA_PUBLIC_CONTEXT_FAILED';throw e;}};
 const publicPair=()=>Public.create({now:clock,market:Market.create({now:clock,fetchImpl,cacheMs:0}),observations:Observations.create({now:clock,fetchImpl,cacheMs:0}),rulesProvider:async()=>rules,baseCyclePolicyProvider:async()=>({...baseline.baseCyclePolicy,maxCycles:config.maxCycles})});
 const handler=Account.create({config,Pool,getEnv,fetchImpl,now,memory,scenarioKey:'manual_long',runtimeFactory:options=>{
  const pair=publicPair();
  return Runtime.create({...options,contextProvider:observed(pair.contextProvider),planContextProvider:observed(pair.planContextProvider),setupContextProvider:async()=>{throw Error('QA_SETUP_NOT_SUPPORTED');}});
 }});
 async function initialize(){P.stage(source,scope);const db=Database.create({Pool,connectionString:Account.connection(getEnv('SUPABASE_DB_URL'))});try{return await db.transaction(async tx=>{
  const user=(await tx.query("select id from auth.users where id=$1 and raw_app_meta_data->>'btcsp_qa_run'=$2 and (banned_until is null or banned_until <= now())",[scope.ownerId,config.runId])).rows;
  if(user.length!==1)throw Error('QA_ACCOUNT_SCOPE_MISMATCH');
  const old=await tx.query('select state_hash from btcsp_private.project_heads where project_id=$1 and owner_id=$2',[scope.projectId,scope.ownerId]);
  if(old.rows.length){if(old.rows[0].state_hash!==Store.sourceHash(source))throw Error('QA_FIXED_FIXTURE_MISMATCH');return {alreadyInitialized:true,eventCount:source.input.events.length};}
  const capital=Core.reconstruct(source.input).capital.netContributedUSD;
  await tx.query("insert into public.projects(id,owner_id,name,capital,mode) values($1,$2,$3,$4,'real')",[scope.projectId,scope.ownerId,'[QA '+config.runId+'] public-source fixture',capital]);
  // Small fixtures use the actual trusted initializer, including its hashes.
  if(source.input.events.length<=100)return {...await Store.initializeInTransaction(tx,scope,source),eventCount:source.input.events.length};
  // Bulk provisioning is QA-only, fixed by the server bundle. It retains the
  // exact envelopes and head format; no caller can submit or replace history.
  const plans=[...source.planHistory,source.plan],revision=source.input.events.reduce((n,e)=>BigInt(e.revision)>BigInt(n)?e.revision:n,'0');
  for(const p of plans)await tx.query(`insert into public.btcsp_plan_versions(id,project_id,owner_id,version,basis_revision,scenario_key,profile,reference_price_usd,reference_at,protection_floor_usd,rule_version,configuration,plan_envelope) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[p.id,p.projectId,p.ownerId,p.version,revision,p.scenarioKey,p.profile,p.referencePriceUSD,p.referenceAt,p.protectionFloorUSD,rules.version,p.configuration,p]);
  await tx.query(`insert into public.btcsp_financial_events(id,project_id,owner_id,revision,idempotency_key,event_type,scenario_key,origin,effective_at,recorded_at,facts,schema_version,event_envelope) select (e->>'id')::uuid,(e->>'project_id')::uuid,(e->>'owner_id')::uuid,(e->>'revision')::bigint,e->>'idempotency_key',e->>'event_type',e->>'scenario_key',e->>'origin',(e->>'effective_at')::timestamptz,(e->>'recorded_at')::timestamptz,e->'facts',(e->>'schema_version')::integer,e from jsonb_array_elements($1::jsonb) e`,[JSON.stringify(source.input.events)]);
  const {events,...context}=source.input,{input,plan,planHistory,...extras}=source,stateHash=createHash('sha256').update(P.canonical(source)).digest('hex');
  await tx.query('insert into btcsp_private.project_heads(project_id,owner_id,scenario_key,revision,generation,state_hash,active_plan_id,input_context,extras,event_order,history_order) values($1,$2,$3,$4,1,$5,$6,$7,$8,$9,$10)',[scope.projectId,scope.ownerId,scope.scenarioKey,revision,stateHash,plan.id,context,extras,JSON.stringify(events.map(e=>e.id)),JSON.stringify(planHistory.map(p=>p.id))]);
  return {eventCount:events.length,revision,stateHash};
 });}finally{await db.close();}}
 return async(request,info)=>{
  const path=new URL(request.url).pathname;if(!['/fixture','/public-probe','/public-start-probe'].some(s=>path.endsWith(s))){contextError=null;const response=await handler(request,info);if(contextError)response.headers.set('X-BTCSP-QA-Context-Error',contextError);return response;}
  if(now()>=Date.parse(config.expiresAt))return reply(503,{code:'QA_COMPLETE_CLOSED'});
  const cap=request.headers.get('X-BTCSP-QA-Capability');if(typeof cap!=='string'||!/^[a-f0-9]{64}$/.test(cap)||!timingSafeEqual(createHash('sha256').update(cap).digest(),Buffer.from(config.capHash,'hex')))return reply(401,{code:'QA_CAPABILITY_REQUIRED'});
  if(request.method!=='POST')return reply(405,{code:'QA_POST_REQUIRED'});
  // No caller-provided fixture or scope is accepted.
  if(await request.text()!=='{}')return reply(400,{code:'QA_FIXED_FIXTURE_REQUIRED'});
  if(path.endsWith('/public-probe')||path.endsWith('/public-start-probe')){try{const pair=publicPair(),context=await pair.contextProvider(scope,source.input),plan=await pair.planContextProvider(scope,{...source.input,...context});let checkpoint=null;if(path.endsWith('/public-start-probe')){const service=require('../../backend/calculation-checkpoints.cjs').create({key:Buffer.alloc(32,31),enabled:true,now:clock,loadSnapshot:async()=>({headHash:Store.sourceHash(source),state:source}),contextProvider:async()=>context,profileContextProvider:async()=>({market:plan.market,baseCyclePolicy:plan.baseCyclePolicy}),policyProvider:async()=>plan.baseCyclePolicy});const e=await service.start('synthetic-QA-only',scope);checkpoint={createdAt:e.payload.createdAt,expiresAt:e.payload.expiresAt};}return reply(200,{checkpoint,valuation:context.valuation,provenance:plan.market.provenance,validUntil:plan.market.validUntil,remainingMs:Date.parse(plan.market.validUntil)-now(),rules:'synthetic-not-Kraken-verification'});}catch(e){return reply(503,{code:/^[A-Z][A-Z_]+$/.test(e?.message||'')?e.message:'QA_PUBLIC_PROBE_FAILED'});}}
  try{return reply(200,{result:await initialize(),rules:'synthetic-not-Kraken-verification',prices:'public-read-only'});}catch(e){return reply(503,{code:/^[A-Z][A-Z_]+$/.test(e?.message||'')?e.message:'QA_FIXTURE_FAILED'});}
 };
}
module.exports={create};
