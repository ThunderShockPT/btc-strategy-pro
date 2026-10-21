'use strict';
const {randomUUID}=require('node:crypto'),Store=require('./atomic-store.cjs'),Wallet=require('./wallet-store.cjs');
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const JOB_ROUTES=Object.freeze({enqueue:"/api/v20/prepare",advance:"/api/v20/prepare",status:"/api/v20/state",result:"/api/v20/state",cancel:"/api/v20/commit"});
const ERRORS={CALCULATION_REVIEW_NOT_ENABLED:503,COMPLETED_SEARCH_BASIS_MISMATCH:409,CALCULATION_BUILD_CHANGED:409,COMMAND_REVIEW_EXPIRED:409,COMMAND_REVIEW_LIMIT_REACHED:429,CALCULATION_JOB_NOT_FOUND:404,INVALID_CALCULATION_JOB_REQUEST:400,INVALID_CALCULATION_JOB_ID:400,CALCULATION_JOB_LIMIT_REACHED:429,CALCULATION_EXPIRED:409,STALE_CALCULATION_BASIS:409,CALCULATION_LEASE_LOST:409,SEARCH_NOT_COMPLETED:409,CALCULATIONS_NOT_ENABLED:503,SESSION_NOT_VALID:401,VERIFIED_OWNER_SESSION_REQUIRED:401,STALE_PROJECT_REVIEW:409,CONCURRENT_PROJECT_CHANGE:409,REVIEW_CHANGED_OR_TAMPERED:409,COMMAND_IDEMPOTENCY_CONFLICT:409,PROJECT_NOT_INITIALIZED:404,SELL_EXCEEDS_AVAILABLE_BTC:422,INSUFFICIENT_WALLET_CASH:422,INVALID_COMMAND_FIELDS:400,UNSUPPORTED_WORKFLOW:400,ONLY_RECORDED_COMMANDS_ALLOWED:400,INVALID_COMMAND_IDEMPOTENCY_KEY:400,INVALID_WALLET_COMMAND:400,INVALID_WALLET_ID:400,INVALID_PROJECT_TITLE:400,WALLET_REVIEW_ID_CONFLICT:409,WALLET_REVIEW_EXPIRED:409,WALLET_PROJECT_ALREADY_EXISTS:409,WALLET_REVIEW_LIMIT_REACHED:429,PROJECT_LIMIT_REACHED:422,CURRENT_TUTORIAL_AND_TERMS_REQUIRED:422,ALL_TUTORIAL_TOPICS_REQUIRED:422,INVALID_ACKNOWLEDGMENT_TIME:422,PROFILE_ADMISSION_NOT_APPROVED:422,PROFILE_PLAN_INFEASIBLE:422,CYCLE_PLAN_INFEASIBLE:422,PLAN_NOT_FUNDED_OR_MAINTENANCE_REACHED:422,NEXT_PLAN_VERSION_REQUIRED:409,NEW_PLAN_ID_REQUIRED:409,SETUP_PLAN_INFEASIBLE:422,CURRENT_MANUAL_CONTEXT_REQUIRED:422,CURRENT_RULES_REQUIRED:422};
function create({db,auth,contextProvider,planContextProvider=null,setupContextProvider=null,calculationJobs=null,now,admit,origins,enabled=false}){
 if(!auth||typeof auth.authenticate!=='function'||typeof auth.assertSession!=='function'||typeof admit!=='function'||!Array.isArray(origins)||origins.length<1||origins.some(o=>{try{return new URL(o).origin!==o||new URL(o).protocol!=='https:';}catch{return true;}}))throw Error('HTTP_SERVER_DEPENDENCIES_REQUIRED');
 if(calculationJobs!==null&&['enqueue','runUnit','status','result','cancel'].some(k=>typeof calculationJobs[k]!=='function'))throw Error('HTTP_SERVER_DEPENDENCIES_REQUIRED');
 if(!db||typeof db.transaction!=='function'||typeof contextProvider!=='function')throw Error('HTTP_SERVER_DEPENDENCIES_REQUIRED');
 return async function handle(request,{remoteAddress}={}){
  const requestId=randomUUID(),origin=request.headers.get('origin'),headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(origin&&origins.includes(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(status,data)=>new Response(JSON.stringify({...data,requestId}),{status,headers});
  try{
   const url=new URL(request.url);if(url.search||url.hash)return reply(400,{code:'INVALID_API_REQUEST'});
   if(origin&&!origins.includes(origin))return reply(403,{code:'ORIGIN_NOT_ALLOWED'});
   if(request.method==='GET'&&url.pathname==='/api/v20/health')return reply(200,{cloudAvailable:enabled===true});
   if(enabled!==true)return reply(503,{code:'CLOUD_NOT_ENABLED'});
   const jobAction=url.pathname.startsWith('/api/v20/calculations/')?url.pathname.slice('/api/v20/calculations/'.length):null;
   const jobRoute=jobAction!==null&&Object.hasOwn(JOB_ROUTES,jobAction);
   if(!jobRoute&&!['/api/v20/state','/api/v20/prepare','/api/v20/commit'].includes(url.pathname))return reply(404,{code:'API_ROUTE_NOT_FOUND'});
   if(request.method==='OPTIONS'){
    if(!origin)return reply(403,{code:'ORIGIN_NOT_ALLOWED'});
    headers['Access-Control-Allow-Methods']='POST, OPTIONS';headers['Access-Control-Allow-Headers']='Authorization, Content-Type';return reply(200,{});
   }
   if(request.method!=='POST')return reply(405,{code:'API_METHOD_NOT_ALLOWED'});
   if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||''))return reply(415,{code:'JSON_REQUIRED'});
   if(typeof remoteAddress!=='string'||remoteAddress.length<1||remoteAddress.length>200)return reply(503,{code:'REQUEST_ADMISSION_UNAVAILABLE'});
   // Deployment adapter supplies a trusted remote address; never trust forwarded headers here.
   if(await admit({remoteAddress,route:jobRoute?JOB_ROUTES[jobAction]:url.pathname})!==true)return reply(429,{code:'RATE_LIMITED'});
   const bearer=request.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9_.-]{1,12000}$/.test(bearer))return reply(401,{code:'SESSION_NOT_VALID'});const token=bearer.slice(7);
   const reader=request.body?.getReader();if(!reader)return reply(400,{code:'INVALID_API_REQUEST'});
   let count=0,parts=[];try{for(;;){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>96000)return reply(413,{code:'REQUEST_TOO_LARGE'});parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
   let body;try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return reply(400,{code:'INVALID_API_REQUEST'});}
   const required=jobRoute?['projectId','scenarioKey',jobAction==='enqueue'?'request':'jobId']:url.pathname==='/api/v20/state'?['projectId','scenarioKey']:url.pathname==='/api/v20/prepare'?['projectId','scenarioKey','request']:['projectId','scenarioKey','request','confirmation'];
   if(!body||Array.isArray(body)||required.some(k=>!Object.hasOwn(body,k))||Object.keys(body).some(k=>!required.includes(k))||!ID.test(body.projectId)||!['manual_long','demo_long'].includes(body.scenarioKey))return reply(400,{code:'INVALID_API_REQUEST'});
   if(jobRoute&&(jobAction==='enqueue'?(!body.request||Array.isArray(body.request)||Object.keys(body.request).join(',')!=='idempotencyKey'||typeof body.request.idempotencyKey!=='string'||body.request.idempotencyKey.length<1||body.request.idempotencyKey.length>128):!ID.test(body.jobId)))return reply(400,{code:'INVALID_API_REQUEST'});
   // Owner is derived from a remotely validated identity, not from the JSON body.
   const user=await auth.authenticate(token),scope={ownerId:user.id,projectId:body.projectId,scenarioKey:body.scenarioKey};
   if(jobRoute){
    if(!calculationJobs)return reply(503,{code:'CALCULATIONS_NOT_ENABLED'});
    const method=jobAction==='advance'?'runUnit':jobAction;
    const result=await calculationJobs[method](token,scope,jobAction==='enqueue'?body.request:body.jobId);
    return reply(200,{result});
   }
   // Request-local identity only; SQL checks the live session in every transaction.
   const options={db,planContextProvider,setupContextProvider,calculationJobs,now,authenticate:async candidate=>{if(candidate!==token)throw Error('SESSION_NOT_VALID');return user;},authorizeTransaction:auth.assertSession,contextProvider,enabled};
   const api=body.request?.workflow==='wallet-create'?Wallet.create(options):Store.create(options);
   const result=url.pathname==='/api/v20/state'?await api.snapshot(token,scope):url.pathname==='/api/v20/prepare'?await api.prepare(token,scope,body.request):await api.commit(token,scope,body.request,body.confirmation);
   return reply(200,{result});
  }catch(error){const code=error.code||error.message;return reply(ERRORS[code]||503,{code:Object.hasOwn(ERRORS,code)?code:'API_UNAVAILABLE'});}
 };
}
module.exports=Object.freeze({create});
