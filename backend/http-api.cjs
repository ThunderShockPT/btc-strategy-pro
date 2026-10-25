'use strict';
const Window=require('./calculation-window.cjs'),Portability=require('./account-portability.cjs');
const {randomUUID}=require('node:crypto'),Store=require('./atomic-store.cjs'),Wallet=require('./wallet-store.cjs');
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const JOB_ROUTES=Object.freeze({enqueue:"/api/v20/prepare",advance:"/api/v20/calculations/advance",status:"/api/v20/state",result:"/api/v20/state",cancel:"/api/v20/commit"});
const ERRORS={INVALID_IMPORT_REQUEST:422,INVALID_IMPORT_AMOUNT:422,INVALID_IMPORT_TIME:422,INVALID_IMPORT_FLOOR:422,COMPLETE_IMPORT_HISTORY_REQUIRED:422,OPEN_POSITION_REQUIRED:422,IMPORT_HISTORY_LIMIT:422,DUPLICATE_IMPORT_ID:422,IMPORT_CHRONOLOGY_REQUIRED:422,IMPORT_HISTORICAL_RULES_REQUIRED:422,IMPORT_RECONCILIATION_FAILED:422,INITIAL_MARGIN_NOT_ALLOCATED:422,INSUFFICIENT_WALLET:422,INSUFFICIENT_ISOLATED_MARGIN:422,INVALID_FILL_PRECISION_OR_INSTRUMENT:422,DUPLICATE_OR_INVALID_FUNDING_PERIOD:422,INVALID_PORTABILITY_REQUEST:400,HISTORICAL_RULES_REQUIRED:422,PUBLIC_RULES_REQUIRE_REVIEW:422,PROFILE_LEVELS_DO_NOT_FIT_ABOVE_FLOOR:422,INVALID_WALLET_CAPITAL:422,INVALID_WALLET_CURSOR:400,PLAN_STAGE_REQUIRED:422,PLAN_STAGE_NOT_ACTIVE:422,UNKNOWN_PLAN_STAGE:422,INVALID_ORDER_QUANTITY_STEP:422,INVALID_EXECUTION_COMMAND:400,INVALID_CYCLE:422,CORRECTION_REASON_REQUIRED:400,CORRECTION_TARGET_NOT_FOUND:404,FUTURE_EXECUTION_REQUIRES_PLAN:422,FUTURE_CORRECTION:422,EXECUTION_REVISION_CONFLICT:409,CORRECTION_REVISION_CONFLICT:409,CORRECTION_VERSION_CONFLICT:409,EXPLICIT_PLAN_LINK_CLEANUP_REQUIRED:422,EXECUTION_NOT_CONFIRMABLE:422,INVALID_EXECUTION_AMOUNT:400,INVALID_PARTIAL_EXECUTION:422,FUTURE_RECORDING_TIMESTAMP:422,FUTURE_FACT_REQUIRES_PLAN:422,CASH_REVISION_CONFLICT:409,CLOUD_CONFIGURATION_INCOMPLETE:503,INSUFFICIENT_OBSERVATIONS:422,OBSERVATION_WINDOW_INSUFFICIENT_OR_STALE:422,STALE_OR_FUTURE_MARKET_CONTEXT:422,OBSERVED_DEPTH_TOO_LOW_FOR_MINIMUM_CYCLE:422,INVALID_CALCULATION_PROFILE_REQUEST:400,CALCULATION_JOB_IDEMPOTENCY_CONFLICT:409,COMPLETED_PROFILE_SEARCH_MISMATCH:409,PROFILE_CONTEXT_REQUIRED:503,CALCULATION_REVIEW_NOT_ENABLED:503,COMPLETED_SEARCH_BASIS_MISMATCH:409,CALCULATION_BUILD_CHANGED:409,COMMAND_REVIEW_EXPIRED:409,COMMAND_REVIEW_LIMIT_REACHED:429,CALCULATION_JOB_NOT_FOUND:404,INVALID_CALCULATION_JOB_REQUEST:400,INVALID_CALCULATION_JOB_ID:400,CALCULATION_JOB_LIMIT_REACHED:429,CALCULATION_EXPIRED:409,STALE_CALCULATION_BASIS:409,CALCULATION_LEASE_LOST:409,SEARCH_NOT_COMPLETED:409,CALCULATIONS_NOT_ENABLED:503,SESSION_NOT_VALID:401,VERIFIED_OWNER_SESSION_REQUIRED:401,STALE_PROJECT_REVIEW:409,CONCURRENT_PROJECT_CHANGE:409,REVIEW_CHANGED_OR_TAMPERED:409,COMMAND_IDEMPOTENCY_CONFLICT:409,PROJECT_NOT_INITIALIZED:404,SELL_EXCEEDS_AVAILABLE_BTC:422,INSUFFICIENT_WALLET_CASH:422,INVALID_COMMAND_FIELDS:400,UNSUPPORTED_WORKFLOW:400,ONLY_RECORDED_COMMANDS_ALLOWED:400,INVALID_COMMAND_IDEMPOTENCY_KEY:400,INVALID_WALLET_COMMAND:400,INVALID_WALLET_ID:400,INVALID_PROJECT_TITLE:400,WALLET_REVIEW_ID_CONFLICT:409,WALLET_REVIEW_EXPIRED:409,WALLET_PROJECT_ALREADY_EXISTS:409,WALLET_REVIEW_LIMIT_REACHED:429,PROJECT_LIMIT_REACHED:422,CURRENT_TUTORIAL_AND_TERMS_REQUIRED:422,ALL_TUTORIAL_TOPICS_REQUIRED:422,INVALID_ACKNOWLEDGMENT_TIME:422,PROFILE_ADMISSION_NOT_APPROVED:422,PROFILE_PLAN_INFEASIBLE:422,CYCLE_PLAN_INFEASIBLE:422,PLAN_NOT_FUNDED_OR_MAINTENANCE_REACHED:422,NEXT_PLAN_VERSION_REQUIRED:409,NEW_PLAN_ID_REQUIRED:409,SETUP_PLAN_INFEASIBLE:422,CURRENT_MANUAL_CONTEXT_REQUIRED:422,CURRENT_RULES_REQUIRED:422};
function create({db,auth,contextProvider,planContextProvider=null,setupContextProvider=null,importContextProvider=null,calculationJobs=null,calculationJobsFactory=null,availability=()=>enabled===true,observeTiming=null,observeError=null,now,admit,origins,enabled=false}){
 if(!auth||typeof auth.authenticate!=='function'||typeof auth.assertSession!=='function'||typeof admit!=='function'||!Array.isArray(origins)||origins.length<1||origins.some(o=>{try{return new URL(o).origin!==o||new URL(o).protocol!=='https:';}catch{return true;}}))throw Error('HTTP_SERVER_DEPENDENCIES_REQUIRED');
 if(calculationJobs!==null&&['enqueue','runUnit','status','result','cancel'].some(k=>typeof calculationJobs[k]!=='function'))throw Error('HTTP_SERVER_DEPENDENCIES_REQUIRED');
 if(calculationJobsFactory!==null&&typeof calculationJobsFactory!=='function')throw Error('HTTP_SERVER_DEPENDENCIES_REQUIRED');
 if(typeof availability!=='function')throw Error('HTTP_SERVER_DEPENDENCIES_REQUIRED');
 if(!db||typeof db.transaction!=='function'||typeof contextProvider!=='function')throw Error('HTTP_SERVER_DEPENDENCIES_REQUIRED');
 return async function handle(request,{remoteAddress}={}){
  const requestId=randomUUID(),origin=request.headers.get('origin'),headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(origin&&origins.includes(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(status,data)=>new Response(JSON.stringify({...data,requestId}),{status,headers});
  try{
   const url=new URL(request.url);if(url.search||url.hash)return reply(400,{code:'INVALID_API_REQUEST'});
   if(origin&&!origins.includes(origin))return reply(403,{code:'ORIGIN_NOT_ALLOWED'});
   if(request.method==='GET'&&url.pathname==='/api/v20/health'){let available=false;if(enabled===true)try{available=await availability()===true;}catch{/* Configuration failure is public only as unavailable; never expose secrets. */}return reply(200,{cloudAvailable:available});}
   if(enabled!==true)return reply(503,{code:'CLOUD_NOT_ENABLED'});
   const jobAction=url.pathname.startsWith('/api/v20/calculations/')?url.pathname.slice('/api/v20/calculations/'.length):null;
   const jobRoute=jobAction!==null&&Object.hasOwn(JOB_ROUTES,jobAction);
   if(!jobRoute&&!['/api/v20/state','/api/v20/wallets','/api/v20/export','/api/v20/portability','/api/v20/prepare','/api/v20/commit'].includes(url.pathname))return reply(404,{code:'API_ROUTE_NOT_FOUND'});
   if(request.method==='OPTIONS'){
    if(!origin)return reply(403,{code:'ORIGIN_NOT_ALLOWED'});
    headers['Access-Control-Allow-Methods']='POST, OPTIONS';headers['Access-Control-Allow-Headers']='Authorization, Content-Type';return reply(200,{});
   }
   if(request.method!=='POST')return reply(405,{code:'API_METHOD_NOT_ALLOWED'});
   if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||''))return reply(415,{code:'JSON_REQUIRED'});
   if(typeof remoteAddress!=='string'||remoteAddress.length<1||remoteAddress.length>200)return reply(503,{code:'REQUEST_ADMISSION_UNAVAILABLE'});
   // Deployment adapter supplies a trusted remote address; never trust forwarded headers here.
   if(await admit({remoteAddress,route:jobRoute?JOB_ROUTES[jobAction]:['/api/v20/wallets','/api/v20/export','/api/v20/portability'].includes(url.pathname)?'/api/v20/state':url.pathname})!==true)return reply(429,{code:'RATE_LIMITED'});
   const bearer=request.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9_.-]{1,12000}$/.test(bearer))return reply(401,{code:'SESSION_NOT_VALID'});const token=bearer.slice(7);
   const reader=request.body?.getReader();if(!reader)return reply(400,{code:'INVALID_API_REQUEST'});
   let count=0,parts=[];try{for(;;){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>96000)return reply(413,{code:'REQUEST_TOO_LARGE'});parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
   let body;try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return reply(400,{code:'INVALID_API_REQUEST'});}
   const required=jobRoute?['projectId','scenarioKey',jobAction==='enqueue'?'request':'jobId']:['/api/v20/state','/api/v20/wallets','/api/v20/export'].includes(url.pathname)?['projectId','scenarioKey']:['/api/v20/prepare','/api/v20/portability'].includes(url.pathname)?['projectId','scenarioKey','request']:['projectId','scenarioKey','request','confirmation'];
   if(!body||Array.isArray(body)||required.some(k=>!Object.hasOwn(body,k))||Object.keys(body).some(k=>!required.includes(k)&&!(url.pathname==='/api/v20/wallets'&&k==='afterProjectId')&&!(jobAction==='advance'&&['includeResult','reviewPlan','prepareReview'].includes(k)))||!ID.test(body.projectId)||!['manual_long','demo_long'].includes(body.scenarioKey))return reply(400,{code:'INVALID_API_REQUEST'});
   if(Object.hasOwn(body,'includeResult')&&typeof body.includeResult!=='boolean')return reply(400,{code:'INVALID_API_REQUEST'});
   if(Object.hasOwn(body,'reviewPlan')){const p=body.reviewPlan;if(body.includeResult!==true||!p||Array.isArray(p)||Object.keys(p).sort().join(',')!=='id,version'||!ID.test(p.id)||typeof p.version!=='string'||!/^[1-9]\d{0,17}$/.test(p.version))return reply(400,{code:'INVALID_API_REQUEST'});}
   if(Object.hasOwn(body,'prepareReview')&&(typeof body.prepareReview!=='boolean'||!body.reviewPlan))return reply(400,{code:'INVALID_API_REQUEST'});
   if(jobRoute&&(jobAction==='enqueue'?(!body.request||Array.isArray(body.request)||Object.keys(body.request).some(k=>!['idempotencyKey','profileChange'].includes(k))||typeof body.request.idempotencyKey!=='string'||body.request.idempotencyKey.length<1||body.request.idempotencyKey.length>128):!ID.test(body.jobId)))return reply(400,{code:'INVALID_API_REQUEST'});
   // Owner is derived from a remotely validated identity, not from the JSON body.
   const user=await auth.authenticate(token),scope={ownerId:user.id,projectId:body.projectId,scenarioKey:body.scenarioKey};
   // Request-local identity only; SQL checks the live session in every transaction.
   const options={db,observeTiming:typeof observeTiming==='function'?event=>observeTiming({...event,requestId}):null,planContextProvider,setupContextProvider,importContextProvider,now,authenticate:async candidate=>{if(candidate!==token)throw Error('SESSION_NOT_VALID');return user;},authorizeTransaction:auth.assertSession,contextProvider,enabled};
   options.calculationJobs=calculationJobsFactory&&(jobRoute||body.request?.workflow==='plan-calculation')?calculationJobsFactory(options):calculationJobs;
   if(jobRoute){
    const jobs=options.calculationJobs;if(!jobs)return reply(503,{code:'CALCULATIONS_NOT_ENABLED'});
    const method=body.prepareReview===true?'status':jobAction==='advance'?'runUnit':jobAction;
    const result=await jobs[method](token,scope,jobAction==='enqueue'?body.request:body.jobId);
    if(body.prepareReview===true&&result.status!=='completed')return reply(409,{code:'SEARCH_NOT_COMPLETED'});
    if(result.status==='completed'&&body.reviewPlan&&body.prepareReview!==true)return reply(200,{result:{...result,reviewPending:true}});
    if(result.status==='completed'&&body.reviewPlan){
     // Preparation is read/review work, never acceptance. Reuse the result of
     // the normal frozen-review path. This bounded request prepares only the
     // review; it never also runs a heavy scenario unit. All source, session, deadline and
     // transactional checks in Store.prepare remain in force.
     if(await admit({remoteAddress,route:'/api/v20/prepare'})!==true)return reply(429,{code:'RATE_LIMITED'});
     const completedReview=await Store.create(options).prepare(token,scope,{workflow:'plan-calculation',command:{mode:'recorded',jobId:body.jobId,change:body.reviewPlan}});
     return reply(200,{result:{...result,completedResult:completedReview.review.result,completedReview}});
    }
    // The result service still checks the live SQL session, source and expiry.
    const completedResult=body.includeResult===true&&result.status==='completed'?await jobs.result(token,scope,body.jobId):undefined;
    return reply(200,{result:completedResult===undefined?result:{...result,completedResult}});
   }
   if(url.pathname==='/api/v20/portability')return reply(200,{result:await Portability.create(options).read(token,scope,body.request)});
   if(url.pathname==='/api/v20/wallets'){if(body.afterProjectId!==undefined&&!ID.test(body.afterProjectId))return reply(400,{code:'INVALID_WALLET_CURSOR'});return reply(200,{result:await Wallet.create(options).list(token,scope,{afterProjectId:body.afterProjectId??null})});}
   const api=['wallet-create','wallet-import'].includes(body.request?.workflow)?Wallet.create(options):Store.create(options);
   const result=url.pathname==='/api/v20/export'?await api.exportWallet(token,scope):url.pathname==='/api/v20/state'?await api.snapshot(token,scope):url.pathname==='/api/v20/prepare'?await api.prepare(token,scope,body.request):await api.commit(token,scope,body.request,body.confirmation);
   return reply(200,{result});
  }catch(error){if(typeof observeError==='function'){const raw=error.code||error.message;observeError({requestId,code:typeof raw==='string'&&/^[A-Z][A-Z0-9_]{0,99}$/.test(raw)?raw:'UNEXPECTED_SERVER_ERROR'});}if(error instanceof Window.WindowError){const d=error.details;if(d.retryAt)headers['Retry-After']=String(Math.max(1,Math.ceil((Date.parse(d.retryAt)-Date.parse(d.serverTime))/1000)));return reply(error.code==='CALCULATION_RULE_WINDOW_TOO_SHORT'?422:425,{code:error.code,...d});}const code=error.code||error.message;return reply(ERRORS[code]||503,{code:Object.hasOwn(ERRORS,code)?code:'API_UNAVAILABLE'});}
 };
}
module.exports=Object.freeze({create});
