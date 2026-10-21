'use strict';
// Backend-only PostgreSQL adapter. No keys, HTTP endpoints, or cloud activation.
const {createHash,randomUUID}=require('node:crypto'),P=require('./persistence-contract.cjs');
const W=require('../execution-workflow.js'),Cash=require('../cash-workflow.js');
const VERSION='v20-atomic-store-12c3.1',ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const clone=v=>JSON.parse(P.canonical(v)),hash=v=>createHash('sha256').update(P.canonical(v)).digest('hex');
function need(v,code){if(!v)throw Error(code);}
function fields(v,required,optional=[]){need(v&&typeof v==='object'&&!Array.isArray(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k)),'INVALID_COMMAND_FIELDS');}
function scope(s){fields(s,['ownerId','projectId','scenarioKey']);need(ID.test(s.ownerId)&&ID.test(s.projectId)&&['manual_long','demo_long'].includes(s.scenarioKey),'INVALID_SCOPE');}
const params=s=>[s.projectId,s.ownerId,s.scenarioKey];
const revision=s=>s.input.events.reduce((m,e)=>BigInt(e.revision)>m?BigInt(e.revision):m,0n).toString();
const sourceHash=s=>hash(s);
function split(s){const {events,...context}=s.input,{input,plan,planHistory,...extras}=s;return {context,extras};}
async function addPlan(tx,p,basis,ruleVersion){
 await tx.query(`insert into public.btcsp_plan_versions
 (id,project_id,owner_id,version,basis_revision,scenario_key,profile,reference_price_usd,reference_at,protection_floor_usd,rule_version,configuration,plan_envelope)
 values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[p.id,p.projectId,p.ownerId,p.version,basis,p.scenarioKey,p.profile,p.referencePriceUSD,p.referenceAt,p.protectionFloorUSD,ruleVersion,p.configuration,p]);
}
async function addEvent(tx,e){await tx.query(`insert into public.btcsp_financial_events
 (id,project_id,owner_id,revision,idempotency_key,event_type,scenario_key,origin,effective_at,recorded_at,facts,target_event_id,target_plan_id,import_id,correction_reason,schema_version,event_envelope)
 values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,[e.id,e.project_id,e.owner_id,e.revision,e.idempotency_key,e.event_type,e.scenario_key,e.origin,e.effective_at,e.recorded_at,e.facts,e.target_event_id||null,e.target_plan_id||null,e.import_id||null,e.correction_reason||null,e.schema_version,e]);}
async function initializeInTransaction(tx,s,raw){
 scope(s);const state=P.stage(raw,s).payload.source;need(state.input.ruleScenario===undefined,'SYNTHETIC_RULE_SCENARIO_NOT_RECORDABLE');
  const project=await tx.query('select id from public.projects where id=$1 and owner_id=$2 for update',params(s).slice(0,2));need(project.rows.length===1,'PROJECT_NOT_FOUND');
  const old=await tx.query('select project_id from btcsp_private.project_heads where project_id=$1 and owner_id=$2',params(s).slice(0,2));need(!old.rows.length,'ALREADY_INITIALIZED');
  const existing=await tx.query('select id from public.btcsp_financial_events where project_id=$1 and owner_id=$2 limit 1',params(s).slice(0,2));need(!existing.rows.length,'EXISTING_EVENTS_REQUIRE_RECONCILIATION');
  // Provisioning is a trusted internal step, never an unreviewed client import.
  for(const p of [...state.planHistory,state.plan].sort((a,b)=>BigInt(a.version)<BigInt(b.version)?-1:1))await addPlan(tx,p,revision(state),p.id===state.plan.id?state.input.rules.version:'unrecorded-historical-rule-version');
  for(const e of [...state.input.events].sort((a,b)=>BigInt(a.revision)<BigInt(b.revision)?-1:1))await addEvent(tx,e);
  const {context,extras}=split(state),h=sourceHash(state);
  await tx.query('insert into btcsp_private.project_heads(project_id,owner_id,scenario_key,revision,generation,state_hash,active_plan_id,input_context,extras,event_order,history_order) values($1,$2,$3,$4,1,$5,$6,$7,$8,$9,$10)',[...params(s),revision(state),h,state.plan.id,context,extras,JSON.stringify(state.input.events.map(e=>e.id)),JSON.stringify(state.planHistory.map(p=>p.id))]);
  return {stateHash:h,revision:revision(state)};
}
async function initialize(db,s,raw){const state=P.stage(raw,s).payload.source;return db.transaction(tx=>initializeInTransaction(tx,s,state));}

async function load(tx,s,lock='share'){
 const h=(await tx.query(`select *,revision::text as revision,generation::text as generation from btcsp_private.project_heads where project_id=$1 and owner_id=$2 and scenario_key=$3 for ${lock==='update'?'update':'share'}`,params(s))).rows[0];need(h,'PROJECT_NOT_INITIALIZED');
 const events=(await tx.query('select event_envelope from public.btcsp_financial_events where project_id=$1 and owner_id=$2 and scenario_key=$3 order by revision',params(s))).rows.map(r=>r.event_envelope);
 const plans=(await tx.query('select plan_envelope from public.btcsp_plan_versions where project_id=$1 and owner_id=$2 and scenario_key=$3 order by version',params(s))).rows.map(r=>r.plan_envelope);
 need(events.every(Boolean)&&plans.every(Boolean),'MISSING_ENVELOPE_REQUIRES_RECONCILIATION');
 const plan=plans.find(p=>p.id===h.active_plan_id);need(plan,'ACTIVE_PLAN_MISSING');
 const reorder=(rows,order)=>{need(Array.isArray(order)&&new Set(order).size===order.length&&rows.length===order.length,'STORED_SOURCE_ORDER_MISMATCH');const map=new Map(rows.map(r=>[r.id,r]));return order.map(id=>{need(map.has(id),'STORED_SOURCE_ORDER_MISMATCH');return map.get(id);});};
 const state={...h.extras,input:{...h.input_context,events:reorder(events,h.event_order)},plan,planHistory:reorder(plans.filter(p=>p.id!==plan.id),h.history_order)};
 need(sourceHash(state)===h.state_hash&&revision(state)===h.revision,'STORED_SOURCE_INTEGRITY_FAILURE');
 return {state,head:h};
}
function create({db,authenticate,contextProvider,planContextProvider=null,authorizeTransaction=null,enabled=false}){
 need(db&&typeof db.transaction==='function'&&typeof authenticate==='function'&&typeof contextProvider==='function','SERVER_DEPENDENCIES_REQUIRED');
 async function identity(token,s){need(enabled===true,'CLOUD_WRITE_GATE_CLOSED');scope(s);const user=await authenticate(token);need(user&&user.id===s.ownerId&&typeof user.email_confirmed_at==='string'&&Number.isFinite(Date.parse(user.email_confirmed_at))&&user.is_anonymous===false,'VERIFIED_OWNER_SESSION_REQUIRED');return user;}
 async function authorize(tx,user,s){if(authorizeTransaction)await authorizeTransaction(tx,user,s);}
 async function proposal(base,s,request){
  fields(request,['workflow','command']);need(['execution','movement','plan-reservations','plan-cycles','plan-profile'].includes(request.workflow),'UNSUPPORTED_WORKFLOW');
  need(Buffer.byteLength(P.canonical(request),'utf8')<=64000,'COMMAND_TOO_LARGE');
  const state=clone(base.state),context=await contextProvider(s,clone(state.input));
  fields(context,['rules','valuation'],['bookkeepingOnly']);
  state.input={...state.input,rules:context.rules,valuation:context.valuation};
  if(context.bookkeepingOnly===true)state.input.bookkeepingOnly=true;else delete state.input.bookkeepingOnly;
  need(state.input.ruleScenario===undefined&&request.command.mode==='recorded','ONLY_RECORDED_COMMANDS_ALLOWED');
  P.stage(state,s);
  let review;
  if(request.workflow==='execution')review=await W.prepare(state.input,state.plan,request.command);
  else if(request.workflow==='movement')review=await Cash.prepareMovement(state.input,state.plan,request.command);
  else{
   fields(request.command,['mode','change']);let change=clone(request.command.change);
   if(request.workflow==='plan-reservations')review=await Cash.preparePlanChange(state.input,state.plan,change);
   else{
    need(typeof planContextProvider==='function','PLAN_CONTEXT_REQUIRED');const trusted=await planContextProvider(s,clone(state.input));
    if(request.workflow==='plan-cycles'){fields(change,['id','version']);review=await Cash.prepareCyclePlanChange(state.input,state.plan,{...change,policy:trusted.cyclePolicy});}
    else{fields(change,['id','version','profile','floorMode','marginAdmission']);review=await Cash.prepareProfileChange(state.input,state.plan,{...change,market:trusted.market,baseCyclePolicy:trusted.baseCyclePolicy});}
   }
  }
  const result={version:VERSION,headHash:base.head.state_hash,basisRevision:base.head.revision,request:clone(request),review};
  return {state,review,result:{...result,reviewHash:hash(result)}};
 }
 async function prepare(token,s,raw){const request=clone(raw);const user=await identity(token,s);const base=await db.transaction(async tx=>{await authorize(tx,user,s);return load(tx,s);});return (await proposal(base,s,request)).result;}
 async function commit(token,s,raw,rawConfirmation){
  const request=clone(raw),confirmation=clone(rawConfirmation);fields(confirmation,['headHash','reviewHash','idempotencyKey'],['acceptPlanLinkCleanup']);
  need(typeof confirmation.idempotencyKey==='string'&&confirmation.idempotencyKey.length>0&&confirmation.idempotencyKey.length<=128,'INVALID_COMMAND_IDEMPOTENCY_KEY');
  const user=await identity(token,s);const commandHash=hash({request,confirmation});
  const receipt=async tx=>(await tx.query('select command_hash,result from btcsp_private.command_receipts where project_id=$1 and owner_id=$2 and scenario_key=$3 and idempotency_key=$4',[...params(s),confirmation.idempotencyKey])).rows[0];
  const replay=r=>{need(r.command_hash===commandHash,'COMMAND_IDEMPOTENCY_CONFLICT');return {...r.result,replayed:true};};
  const base=await db.transaction(async tx=>{await authorize(tx,user,s);const b=await load(tx,s);const r=await receipt(tx);return r?{receipt:r}:b;});
  if(base.receipt)return replay(base.receipt);
  need(confirmation.headHash===base.head.state_hash,'STALE_PROJECT_REVIEW');
  const p=await proposal(base,s,request);need(confirmation.reviewHash===p.result.reviewHash,'REVIEW_CHANGED_OR_TAMPERED');
  const planWorkflow=request.workflow.startsWith('plan-'),handlers={'plan-reservations':Cash.confirmPlanChange,'plan-cycles':Cash.confirmCyclePlanChange,'plan-profile':Cash.confirmProfileChange};
  const next=request.workflow==='execution'?await W.confirm(p.state.input,p.state.plan,p.review,{confirmedReviewHash:p.review.reviewHash,acceptPlanLinkCleanup:confirmation.acceptPlanLinkCleanup===true}):planWorkflow?await handlers[request.workflow](p.state.input,p.state.plan,p.review,{confirmed:true,reviewHash:p.review.reviewHash}):await Cash.confirmMovement(p.state.input,p.state.plan,p.review,{confirmed:true,reviewHash:p.review.reviewHash});
  const nextPlan=next.nextPlan||next.activePlan;
  need(nextPlan.id!==base.state.plan.id?BigInt(nextPlan.version)===BigInt(base.state.plan.version)+1n:hash(nextPlan)===hash(base.state.plan),'PLAN_VERSION_REQUIRED');
  const history=[...base.state.planHistory];if(nextPlan.id!==base.state.plan.id)history.push(base.state.plan);
  const state={...base.state,input:next.nextInput,plan:nextPlan,planHistory:history};P.stage(state,s);
  const originals=new Map(base.state.input.events.map(e=>[e.id,e]));
  need(state.input.events.filter(e=>originals.has(e.id)).every(e=>hash(e)===hash(originals.get(e.id))),'SOURCE_EVENT_MUTATION');
  const events=state.input.events.filter(e=>!originals.has(e.id));need(planWorkflow?events.length===0&&nextPlan.id!==base.state.plan.id:events.length>0,'INVALID_WORKFLOW_EVENT_EFFECTS');
  need(state.input.events.length===originals.size+events.length&&[...originals.keys()].every(id=>state.input.events.some(e=>e.id===id)),'SOURCE_EVENT_REMOVAL');
  const sorted=[...events].sort((a,b)=>BigInt(a.revision)<BigInt(b.revision)?-1:1);
  need(sorted.every((e,i)=>BigInt(e.revision)===BigInt(base.head.revision)+BigInt(i)+1n),'NON_CONTIGUOUS_REVISIONS');
  const {context,extras}=split(state),stateHash=sourceHash(state);
  return db.transaction(async tx=>{
   await authorize(tx,user,s);
   const current=(await tx.query('select state_hash,generation::text as generation from btcsp_private.project_heads where project_id=$1 and owner_id=$2 and scenario_key=$3 for update',params(s))).rows[0];need(current,'PROJECT_NOT_INITIALIZED');
   const r=await receipt(tx);if(r)return replay(r);
   need(current.state_hash===base.head.state_hash&&current.generation===base.head.generation,'CONCURRENT_PROJECT_CHANGE');
   if(nextPlan.id!==base.state.plan.id)await addPlan(tx,nextPlan,revision(state),state.input.rules.version);
   for(const e of sorted)await addEvent(tx,e);
   await tx.query('insert into public.btcsp_calculation_runs(id,project_id,owner_id,basis_revision,engine_version,rule_version,result_kind,assumptions,results) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),s.projectId,s.ownerId,base.head.revision,p.review.workflowVersion||p.review.version,state.input.rules.version,state.input.valuation.kind==='synthetic'?'synthetic':'manual-position-estimate',{rules:state.input.rules,valuation:state.input.valuation,headHash:base.head.state_hash,request,reviewHash:confirmation.reviewHash},{before:p.review.before||null,after:p.review.after||null,result:p.review.result||null}]);
   await tx.query('update btcsp_private.project_heads set revision=$4,generation=generation+1,state_hash=$5,active_plan_id=$6,input_context=$7,extras=$8,event_order=$9,history_order=$10 where project_id=$1 and owner_id=$2 and scenario_key=$3',[...params(s),revision(state),stateHash,nextPlan.id,context,extras,JSON.stringify(state.input.events.map(e=>e.id)),JSON.stringify(history.map(p=>p.id))]);
   const result={version:VERSION,revision:revision(state),planId:nextPlan.id,stateHash,reviewHash:confirmation.reviewHash,eventsAppended:events.map(e=>e.id),databaseWritten:true,exchangeTradeChanged:false,planApplied:planWorkflow,planReviewRequired:!planWorkflow};
   await tx.query('insert into btcsp_private.command_receipts(project_id,owner_id,scenario_key,idempotency_key,command_hash,result) values($1,$2,$3,$4,$5,$6)',[...params(s),confirmation.idempotencyKey,commandHash,result]);
   return result;
  });
 }
 async function snapshot(token,s){const user=await identity(token,s);return db.transaction(async tx=>{await authorize(tx,user,s);const b=await load(tx,s);return {state:clone(b.state),headHash:b.head.state_hash,revision:b.head.revision};});}
 return Object.freeze({prepare,commit,snapshot});
}
module.exports=Object.freeze({VERSION,initialize,initializeInTransaction,create,load,sourceHash});
