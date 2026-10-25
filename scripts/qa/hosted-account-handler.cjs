'use strict';
// Temporary capability-protected hosted QA. Only fixed QA identities/projects,
// demo_long facts and synthetic prices. Never approves the public release.
const {createHash,createHmac,timingSafeEqual,randomBytes,randomUUID}=require('node:crypto');
const Runtime=require('../../backend/edge-runtime.cjs'),DB=require('../../backend/pg-database.cjs'),Auth=require('../../backend/supabase-auth.cjs'),baseline=require('./hosted-account-fixture.json'),Clock=require('../helpers/live-clock-qa.cjs'),release=require('../../policies/cloud-release-20261021.json');
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,PREFIX='/functions/v1/btcsp-v20-account-qa';
const reply=(status,value)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function connection(value){const u=new URL(value);if([...u.searchParams].length===1&&['disable','allow','prefer'].includes(u.searchParams.get('sslmode')))u.searchParams.set('sslmode','verify-full');return DB.validateConnection(u.toString());}
async function read(request){const reader=request.body?.getReader();if(!reader)throw Error('QA_BODY_REQUIRED');const parts=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>96000)throw Error('QA_BODY_TOO_LARGE');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}return JSON.parse(Buffer.concat(parts).toString('utf8'));}
function create({config,Pool,getEnv,fetchImpl=fetch,now=()=>Date.now(),runtimeFactory=Runtime.create,memory=()=>({}),scenarioKey='demo_long'}){
 if(!['demo_long','manual_long'].includes(scenarioKey))throw Error('QA_SCOPE_REQUIRED');
 if(!/^[a-f0-9]{64}$/.test(config?.capHash)||!/^[a-f0-9]{12}$/.test(config.runId)||!Number.isFinite(Date.parse(config.expiresAt))||Date.parse(config.expiresAt)>now()+21*60000||!Array.isArray(config.accounts)||config.accounts.length!==2||!config.accounts.every((a,n)=>ID.test(a.id)&&ID.test(a.projectId)&&a.alias===['owner','other'][n]&&a.email===`btc-qa-${config.runId}-${a.alias}@btcsp-qa.invalid`)||new Set(config.accounts.flatMap(a=>[a.id,a.projectId])).size!==4)throw Error('QA_CONFIGURATION_REQUIRED');
 const workerId=randomUUID(),users=new Set(config.accounts.map(a=>a.id)),projects=new Set(config.accounts.map(a=>a.projectId));let runtime;
 const timestamp=()=>new Date(now()).toISOString();
 function env(name){if(name==='SUPABASE_DB_URL')return connection(getEnv(name));if(name==='BTCSP_ADMISSION_KEY'||name==='BTCSP_CALCULATION_KEY'){const secret=getEnv('SUPABASE_SERVICE_ROLE_KEY');if(!secret)throw Error('QA_SERVER_CONFIGURATION_REQUIRED');return createHmac('sha256',secret).update('BTCSP-ISOLATED-QA:'+config.runId+':'+name).digest('base64');}return getEnv(name);}
 function live(){if(runtime)return runtime;
  // Fixture policy exists only inside the bounded QA wrapper. Production policy
  // is neither modified nor imported into the published client as approved.
  const policy={...release,financialCloudApproved:true,pendingWorkflows:[],checks:Object.fromEntries(Object.keys(release.checks).map(k=>[k,true]))};
  const contextProvider=async(s,input)=>Clock.context(s,input,timestamp());
  const planContextProvider=async(s,input)=>{if(s.scenarioKey!=='demo_long')throw Error('QA_DEMO_REQUIRED');const c=JSON.parse(JSON.stringify(baseline));return {market:Clock.market(c.market,input.valuation.asOf),baseCyclePolicy:{...c.baseCyclePolicy,maxCycles:1},cyclePolicy:{...c.baseCyclePolicy,maxCycles:1,protectedCashUSD:input.reservations.protectedUSD}};};
  const setupContextProvider=async()=>{const c=JSON.parse(JSON.stringify(baseline)),at=timestamp(),context=Clock.context({scenarioKey:'demo_long'},{rules:c.rules,valuation:c.valuation},at);return {...context,now:at,market:Clock.market(c.market,at),baseCyclePolicy:{...c.baseCyclePolicy,maxCycles:1}};};
  runtime=runtimeFactory({observeTiming:event=>console.log(JSON.stringify({kind:'btcsp-qa-timing',runId:config.runId,...event})),getEnv:env,Pool,policy,origins:['https://thundershockpt.github.io'],contextProvider,planContextProvider,setupContextProvider,now:timestamp,fetchImpl});return runtime;
 }
 async function admin(method,path,body){const key=getEnv('SUPABASE_SERVICE_ROLE_KEY');if(getEnv('SUPABASE_URL')!==Auth.URL_BASE||!key)throw Error('QA_SERVER_CONFIGURATION_REQUIRED');const r=await fetchImpl(Auth.URL_BASE+'/auth/v1/admin/users'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000),redirect:'error'});if(r.status===404&&method==='GET'){await r.body?.cancel();return null;}let value;try{value=await r.json();}catch{throw Error('QA_AUTH_ADMIN_FAILED');}if(!r.ok)throw Error('QA_AUTH_ADMIN_FAILED');return value.user||value;}
 async function bootstrap(body){if(Object.keys(body).join(',')!=='passwords'||!Array.isArray(body.passwords)||body.passwords.length!==2||!body.passwords.every(p=>typeof p==='string'&&p.length>=24&&p.length<=128))throw Error('QA_BOOTSTRAP_INPUT');
  let created=0;for(let n=0;n<2;n++){const a=config.accounts[n];let u=await admin('GET','/'+a.id);if(u&&(u.id!==a.id||u.email!==a.email||u.app_metadata?.btcsp_qa_run!==config.runId))throw Error('QA_ACCOUNT_SCOPE_MISMATCH');if(!u){u=await admin('POST','',{id:a.id,email:a.email,password:body.passwords[n],email_confirm:true,app_metadata:{btcsp_qa_run:config.runId,btcsp_qa_only:true}});created++;}else await admin('PUT','/'+a.id,{password:body.passwords[n],ban_duration:'none'});if(u.id!==a.id||u.email!==a.email)throw Error('QA_CREATED_IDENTITY_MISMATCH');}
  return reply(200,{runId:config.runId,accountsReady:2,newlyCreated:created,emailDeliveryTested:false,synthetic:true});
 }
 async function finish(){let disabled=0;for(const a of config.accounts){const u=await admin('GET','/'+a.id);if(!u)continue;if(u.id!==a.id||u.email!==a.email||u.app_metadata?.btcsp_qa_run!==config.runId)throw Error('QA_ACCOUNT_SCOPE_MISMATCH');await admin('PUT','/'+a.id,{ban_duration:'876000h',password:randomBytes(32).toString('base64url')+'aA1!'});disabled++;}return reply(200,{runId:config.runId,accountsDisabled:disabled,financialFactsDeleted:false});}
 return async function handle(request,info){const start=performance.now();try{
  const pathname=new URL(request.url).pathname,base=pathname.startsWith(PREFIX+'/')?PREFIX:'/btcsp-v20-account-qa';if(!pathname.startsWith(base+'/'))return reply(404,{code:'QA_ROUTE_NOT_FOUND'});const path=pathname.slice(base.length);
  if(now()>=Date.parse(config.expiresAt)&&path!=='/finish')return reply(503,{code:'QA_COMPLETE_CLOSED'});
  const cap=request.headers.get('X-BTCSP-QA-Capability');if(typeof cap!=='string'||!/^[a-f0-9]{64}$/.test(cap)||!timingSafeEqual(createHash('sha256').update(cap).digest(),Buffer.from(config.capHash,'hex')))return reply(401,{code:'QA_CAPABILITY_REQUIRED'});
  if(request.method!=='POST')return reply(405,{code:'QA_POST_REQUIRED'});
  const body=await read(request);
  if(path==='/bootstrap')return await bootstrap(body);
  if(path==='/finish'){if(Object.keys(body).length)throw Error('QA_INVALID_SCOPE');return await finish();}
  if(!/^\/api\/(state|wallets|export|portability|prepare|commit|calculations\/(enqueue|advance|status|result|cancel))$/.test(path))return reply(404,{code:'QA_ROUTE_NOT_FOUND'});
  // Decoding only narrows the QA allowlist. Runtime still verifies the token
  // remotely and SQL checks its live session on every transaction.
  let sub;try{sub=JSON.parse(Buffer.from(request.headers.get('Authorization').split(' ')[1].split('.')[1],'base64url')).sub;}catch{return reply(401,{code:'SESSION_NOT_VALID'});}
  if(!users.has(sub)||!projects.has(body.projectId)||body.scenarioKey!==scenarioKey)return reply(403,{code:'QA_SCOPE_REQUIRED'});
  if(body.request?.workflow==='wallet-create'&&body.request.command?.setup?.projectTitle!==`[QA ${config.runId}] ${config.accounts.find(a=>a.id===sub).alias}`)return reply(403,{code:'QA_TITLE_REQUIRED'});
  const url=new URL(Auth.URL_BASE+Runtime.PREFIX+path.slice(4)),headers=new Headers(request.headers);headers.delete('X-BTCSP-QA-Capability');headers.delete('content-length');
  const response=await live()(new Request(url,{method:'POST',headers,body:JSON.stringify(body)}),info);
  response.headers.set('X-BTCSP-QA-Worker',workerId);response.headers.set('X-BTCSP-QA-Run',config.runId);response.headers.set('X-BTCSP-QA-Wall-Ms',String(Math.round(performance.now()-start)));const usage=memory();if(Number.isFinite(usage.heapUsed))response.headers.set('X-BTCSP-QA-Heap-Bytes',String(usage.heapUsed));return response;
 }catch(e){const code=typeof e?.message==='string'&&/^QA_[A-Z_]+$/.test(e.message)?e.message:'QA_RUNTIME_FAILED';return reply(503,{code});}};
}
module.exports={create,connection,PREFIX};
