/* Host-owned Supabase session composition. No keys, credential storage or Demo upload. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./cloud-client-v20.js'),require('./policies/cloud-release-20261021.json'));else root.BTCAccountSessionV20=factory(root.BTCCloudClientV20,root.BTCV20ReleasePolicy);})(typeof globalThis!=='undefined'?globalThis:this,function(Cloud,Release){
'use strict';
const URL_BASE='https://oftzqqjbwonngubihrsd.supabase.co',ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const checks=['smtpExclusive','confirmedAndRecoveredAccounts','realAccountIsolation','productionRestore','backupRetentionAndKeys','ingressAndAbuse','financialContext','onboardingAndPlans','privacyLifecycle'];
function approved(p){return !!(p&&p.projectRef==='oftzqqjbwonngubihrsd'&&p.financialCloudApproved===true&&checks.every(k=>p.checks?.[k]===true)&&Array.isArray(p.pendingWorkflows)&&p.pendingWorkflows.length===0);}
function createInternal({supabase,supabaseURL,connection,policy=Release,projectId,newId=()=>crypto.randomUUID(),fetchImpl,now=()=>Date.now(),schedule=fn=>setTimeout(fn,0)},privateTest=false){
 if(supabaseURL!==URL_BASE||!supabase?.auth||!connection||typeof connection.attach!=='function'||typeof connection.detach!=='function'||(projectId!==undefined&&!ID.test(projectId)))throw Error('INVALID_ACCOUNT_CONFIGURATION');
 const enabled=privateTest||approved(policy),auth=supabase.auth,listeners=new Set();
 let generation=0,verification=0,disposed=false,subscription=null,started=false,owner=null,client=null,recovery=false,locked=false,busy=false,phase=enabled?'signed-out':'unavailable',error=null;
 const state=()=>({phase,ownerId:owner,busy,error,enabled});
 function emit(){for(const fn of listeners)fn(state());}
 function clear(next='signed-out'){generation++;verification++;client?.clearSession();owner=client=null;phase=next;connection.detach();emit();}
 function ensure(seq){if(disposed||generation!==seq)throw Error('SESSION_CHANGED');}
 function requireEnabled(){if(disposed)throw Error('SESSION_CHANGED');if(!enabled)throw Error('CLOUD_NOT_ENABLED');}
 function usable(s){return !!(s&&ID.test(s.user?.id||'')&&typeof s.access_token==='string'&&s.access_token.length&&Number.isFinite(s.expires_at)&&s.expires_at*1000>now());}
 async function getSession(){requireEnabled();const seq=generation,result=await auth.getSession();ensure(seq);if(result.error||recovery||locked||!usable(result.data?.session)||result.data.session.user.id!==owner){clear();throw Error('SESSION_REQUIRED');}return {ownerId:owner,accessToken:result.data.session.access_token};}
 async function verify(session){
  const seq=generation,ticket=++verification;
  if(!usable(session)){clear();return;}
  let result;try{result=await auth.getUser(session.access_token);}catch(e){ensure(seq);if(ticket!==verification)return;throw e;}ensure(seq);if(ticket!==verification)return;
  const user=result.data?.user;
  if(result.error||!user||user.id!==session.user.id||user.is_anonymous===true||!Number.isFinite(Date.parse(user.email_confirmed_at||''))){clear();throw Error('SESSION_NOT_VALID');}
  if(recovery||locked)return;
  if(owner!==user.id||!client){
   const nextProject=projectId||newId();if(!ID.test(nextProject))throw Error('INVALID_ACCOUNT_CONFIGURATION');
   const next=Cloud.create({baseURL:URL_BASE,apiPath:privateTest?'/functions/v1/btcsp-v20-private-test':'/functions/v1/btcsp-v20-api',projectId:nextProject,scenarioKey:'manual_long',getSession,fetchImpl,enabled:true,newId});
   owner=user.id;client=next;phase='signed-in';connection.attach(client);
  }
  phase='signed-in';error=null;emit();
 }
 function fail(){if(disposed)return;clear('error');error='ACCOUNT_CONNECTION_FAILED';emit();}
 function event(name,session){
  if(disposed)return;
  if(name==='SIGNED_OUT'){recovery=false;clear();return;}
  if(name==='PASSWORD_RECOVERY'){if(!recovery){recovery=true;clear('recovery');}else{phase='recovery';emit();}return;}
  if(recovery||locked)return;
  if(owner&&session?.user?.id!==owner)clear();
  // Never call an Auth method inside its callback: the SDK holds its session lock.
  const seq=generation;
  schedule(()=>{if(disposed||recovery||locked||seq!==generation)return;verify(session).catch(e=>{if(seq===generation&&e.message!=='SESSION_CHANGED')fail();});});
 }
 async function start(){requireEnabled();if(started)return;started=true;const listener=auth.onAuthStateChange(event);subscription=listener.data.subscription;const seq=generation;try{const r=await auth.getSession();ensure(seq);if(r.error)throw r.error;if(!recovery)await verify(r.data?.session);}catch(e){if(e.message!=='SESSION_CHANGED')fail();}}
 async function operation(fn){requireEnabled();if(busy)throw Error('ACCOUNT_REQUEST_IN_PROGRESS');busy=true;error=null;emit();try{return await fn();}catch(e){if(!disposed){error=['SESSION_CHANGED','SESSION_REQUIRED','SESSION_NOT_VALID','RECOVERY_REQUIRED','INVALID_ACCOUNT_INPUT'].includes(e.message)?e.message:'ACCOUNT_CONNECTION_FAILED';emit();}throw Error(error||'SESSION_CHANGED');}finally{busy=false;if(!disposed)emit();}}
 const email=v=>{if(typeof v!=='string'||v.length>254||!/^\S+@\S+\.\S+$/.test(v.trim()))throw Error('INVALID_ACCOUNT_INPUT');return v.trim();};
 return Object.freeze({state,subscribe(fn){listeners.add(fn);fn(state());return()=>listeners.delete(fn);},start,
  redeemRecovery:tokenHash=>operation(async()=>{if(typeof tokenHash!=='string'||!/^[a-f0-9]{56}(?:[a-f0-9]{8})?$/.test(tokenHash))throw Error('INVALID_ACCOUNT_INPUT');recovery=true;locked=false;clear('recovery');const seq=generation,r=await auth.verifyOtp({token_hash:tokenHash,type:'recovery'});ensure(seq);if(r.error){recovery=false;clear('error');throw r.error;}}),
  signIn:({email:address,password})=>operation(async()=>{if(recovery)throw Error('RECOVERY_REQUIRED');if(typeof password!=='string'||!password.length||password.length>128)throw Error('INVALID_ACCOUNT_INPUT');locked=false;clear();const seq=generation,r=await auth.signInWithPassword({email:email(address),password});ensure(seq);if(r.error){locked=true;throw r.error;}await verify(r.data?.session);}),
  signOut:()=>operation(async()=>{locked=true;recovery=false;clear();const r=await auth.signOut({scope:'global'});if(r.error)throw r.error;}),
  updatePassword:({password,confirmation})=>operation(async()=>{if(!recovery)throw Error('RECOVERY_REQUIRED');if(typeof password!=='string'||password.length<10||password.length>128||password!==confirmation)throw Error('INVALID_ACCOUNT_INPUT');const seq=generation,r=await auth.updateUser({password});ensure(seq);if(r.error)throw r.error;locked=true;recovery=false;clear();const out=await auth.signOut({scope:'global'});if(out.error)throw out.error;}),
  dispose(){if(disposed)return;disposed=true;subscription?.unsubscribe();clear();listeners.clear();}
 });
}
// The explicit test factory can only select the distinct server-allowlisted
// endpoint. It never approves or opens the production API.
return Object.freeze({create:options=>createInternal(options),createPrivateTest:options=>createInternal(options,true),approved});
});
