'use strict';
const HTTP=require('./http-api.cjs'),Auth=require('./supabase-auth.cjs'),Database=require('./pg-database.cjs'),Admission=require('./request-admission.cjs');
const VERSION='v20-edge-runtime-12c2.1',PREFIX='/functions/v1/btcsp-v20-api';
const CHECKS=['smtpExclusive','confirmedAndRecoveredAccounts','realAccountIsolation','productionRestore','backupRetentionAndKeys','ingressAndAbuse','financialContext','onboardingAndPlans','privacyLifecycle'];
function approved(p){return p?.projectRef===Auth.PROJECT&&p.financialCloudApproved===true&&CHECKS.every(k=>p.checks?.[k]===true)&&Array.isArray(p.pendingWorkflows)&&p.pendingWorkflows.length===0;}
function create({getEnv,Pool,policy,origins,contextProvider}){
 const release=JSON.parse(JSON.stringify(policy)),enabled=approved(release)&&typeof contextProvider==='function';let services=null;
 function live(){if(!enabled)throw Error('CLOUD_NOT_ENABLED');if(services)return services;
  if(getEnv('SUPABASE_URL')!==Auth.URL_BASE||typeof contextProvider!=='function')throw Error('CLOUD_CONFIGURATION_INCOMPLETE');
  const db=Database.create({Pool,connectionString:getEnv('SUPABASE_DB_URL')});
  try{const keys=JSON.parse(getEnv('SUPABASE_PUBLISHABLE_KEYS')||'{}'),publishableKey=keys.default||getEnv('SUPABASE_ANON_KEY'),key=Buffer.from(getEnv('BTCSP_ADMISSION_KEY')||'','base64');
   const auth=Auth.create({publishableKey}),admit=Admission.create({db,key});services={db,auth,admit};return services;
  }catch(e){void db.close().catch(()=>{});throw e;}
 }
 const db={transaction:fn=>live().db.transaction(fn)},auth={authenticate:t=>live().auth.authenticate(t),assertSession:(tx,u,s)=>live().auth.assertSession(tx,u,s)};
 const handler=HTTP.create({db,auth,contextProvider:(s,i)=>contextProvider(s,i),admit:context=>live().admit(context),origins,enabled});
 return async function handle(request,info){
  const original=new URL(request.url),path=original.pathname;
  const base=path===PREFIX||path.startsWith(PREFIX+'/')?PREFIX:'/btcsp-v20-api';
  if(path!==base&&!path.startsWith(base+'/'))return new Response(JSON.stringify({code:'API_ROUTE_NOT_FOUND'}),{status:404,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const mapped=new URL(original);mapped.pathname='/api/v20'+path.slice(base.length);
  const forwarded=new Request(mapped,request),response=await handler(forwarded,{remoteAddress:info?.remoteAddr?.hostname});
  response.headers.set('X-BTCSP-Build',VERSION);return response;
 };
}
module.exports=Object.freeze({create,approved,VERSION,PREFIX});
