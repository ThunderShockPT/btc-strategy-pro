'use strict';
const HTTP=require('./http-api.cjs'),Auth=require('./supabase-auth.cjs'),Database=require('./pg-database.cjs'),Admission=require('./request-admission.cjs'),Store=require('./atomic-store.cjs'),Checkpoints=require('./calculation-checkpoints.cjs'),Jobs=require('./calculation-jobs.cjs');
const VERSION='v20-edge-runtime-12d14.1',PREFIX='/functions/v1/btcsp-v20-api';
const CHECKS=['smtpExclusive','confirmedAndRecoveredAccounts','realAccountIsolation','productionRestore','backupRetentionAndKeys','ingressAndAbuse','financialContext','onboardingAndPlans','privacyLifecycle'];
function approved(p){return p?.projectRef===Auth.PROJECT&&p.financialCloudApproved===true&&CHECKS.every(k=>p.checks?.[k]===true)&&Array.isArray(p.pendingWorkflows)&&p.pendingWorkflows.length===0;}
function create({getEnv,Pool,policy,origins,contextProvider,planContextProvider,setupContextProvider,now,fetchImpl=globalThis.fetch}){
 const release=JSON.parse(JSON.stringify(policy)),enabled=approved(release)&&[contextProvider,planContextProvider,setupContextProvider].every(p=>typeof p==='function');let services=null;
 function live(){if(!enabled)throw Error('CLOUD_NOT_ENABLED');if(services)return services;
  if(getEnv('SUPABASE_URL')!==Auth.URL_BASE||typeof contextProvider!=='function')throw Error('CLOUD_CONFIGURATION_INCOMPLETE');
  const readKey=name=>{const value=getEnv(name);if(typeof value!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(value))throw Error('CLOUD_CONFIGURATION_INCOMPLETE');const bytes=Buffer.from(value,'base64');if(bytes.length!==32||bytes.toString('base64')!==value)throw Error('CLOUD_CONFIGURATION_INCOMPLETE');return bytes;};
  const key=readKey('BTCSP_ADMISSION_KEY'),calculationKey=readKey('BTCSP_CALCULATION_KEY');let db;
  try{
   if(key.equals(calculationKey))throw Error('CLOUD_CONFIGURATION_INCOMPLETE');
   const keys=JSON.parse(getEnv('SUPABASE_PUBLISHABLE_KEYS')||'{}'),publishableKey=keys.default||getEnv('SUPABASE_ANON_KEY');if(typeof publishableKey!=='string'||publishableKey.length===0)throw Error('CLOUD_CONFIGURATION_INCOMPLETE');const auth=Auth.create({publishableKey,fetchImpl,now:now===undefined?undefined:()=>Date.parse(now())});
   db=Database.create({Pool,connectionString:getEnv('SUPABASE_DB_URL')});const admit=Admission.create({db,key}),signingKey=Buffer.from(calculationKey);
   // Only the signing material is reused; identity is request-local and SQL sessions stay live-checked.
   const calculationJobsFactory=({authenticate})=>{
    const store=Store.create({db,authenticate,authorizeTransaction:auth.assertSession,contextProvider,planContextProvider,enabled:true});
    const checkpoints=Checkpoints.create({key:signingKey,enabled:true,now,loadSnapshot:(token,s)=>store.snapshot(token,s),contextProvider,
     policyProvider:async(s,input,plan)=>{const c=await planContextProvider(s,input,plan);if(!c?.cyclePolicy)throw Error('PLAN_CONTEXT_REQUIRED');return c.cyclePolicy;},
     profileContextProvider:async(s,input,plan)=>{const c=await planContextProvider(s,input,plan);if(!c?.market||!c?.baseCyclePolicy)throw Error('PROFILE_CONTEXT_REQUIRED');return {market:c.market,baseCyclePolicy:c.baseCyclePolicy};}});
    return Jobs.create({db,authenticate,authorizeTransaction:auth.assertSession,checkpoints,enabled:true});
   };
   services={db,auth,admit,calculationJobsFactory};return services;
  }catch(e){if(db)void db.close().catch(()=>{});throw e;}finally{key.fill(0);calculationKey.fill(0);}
 }
 const db={transaction:fn=>live().db.transaction(fn)},auth={authenticate:t=>live().auth.authenticate(t),assertSession:(tx,u,s)=>live().auth.assertSession(tx,u,s)};
 const handler=HTTP.create({db,auth,calculationJobsFactory:options=>live().calculationJobsFactory(options),availability:()=>{live();return true;},contextProvider:(s,i)=>contextProvider(s,i),planContextProvider,setupContextProvider,now,admit:context=>live().admit(context),origins,enabled});
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
