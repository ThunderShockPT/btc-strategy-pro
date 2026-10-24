'use strict';
// Short-lived operator capability. Never included in the application bundle.
// Creates only the fixed test identities in its private deployment config;
// generates recovery links without sending an email or accepting a recipient.
const {createHash,timingSafeEqual,randomBytes}=require('node:crypto'),Auth=require('./supabase-auth.cjs');
const json=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function create({config,getEnv,fetchImpl=globalThis.fetch,now=()=>Date.now()}){
 if(!/^[a-f0-9]{64}$/.test(config?.capabilityHash)||!/^[a-f0-9]{32}$/.test(config.accessTag)||!Array.isArray(config.accounts)||config.accounts.length!==3||!Number.isFinite(Date.parse(config.expiresAt)))throw Error('PRIVATE_PROVISION_CONFIGURATION_REQUIRED');
 async function admin(path,method,body){const secret=getEnv('SUPABASE_SERVICE_ROLE_KEY');if(getEnv('SUPABASE_URL')!==Auth.URL_BASE||!secret)throw Error('CONFIGURATION');const r=await fetchImpl(Auth.URL_BASE+'/auth/v1/admin/'+path,{method,headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});if(method==='GET'&&r.status===404)return null;const result=await r.json();if(!r.ok)throw Error('AUTH_ADMIN_'+r.status+'_'+String(result.error_code||result.code||'UNKNOWN').toUpperCase().replace(/[^A-Z0-9_]/g,''));return path.startsWith('users')?result.user||result:result;}
 return async request=>{
  if(now()>=Date.parse(config.expiresAt))return json(503,{code:'PRIVATE_PROVISION_CLOSED'});
  const token=request.headers.get('X-BTCSP-Provision');if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!timingSafeEqual(createHash('sha256').update(token).digest(),Buffer.from(config.capabilityHash,'hex')))return json(401,{code:'PRIVATE_PROVISION_REQUIRED'});
  if(request.method!=='POST'||(await request.text())!=='{}')return json(400,{code:'PRIVATE_PROVISION_FIXED_INPUT_REQUIRED'});
  const route=new URL(request.url).pathname.split('/').at(-1);if(config.onlyOwnerLink===true&&route!=='owner-link')return json(404,{code:'PRIVATE_PROVISION_ROUTE_NOT_FOUND'});
  try{
   if(route==='bootstrap'){
    for(const a of config.accounts){let user=await admin('users/'+a.id,'GET');if(user&&(user.id!==a.id||user.email!==a.email||user.app_metadata?.btcsp_private_test!==config.accessTag))throw Error('IDENTITY_MISMATCH');
     if(!user){user=await admin('users','POST',{id:a.id,email:a.email,password:a.password,email_confirm:true,app_metadata:{btcsp_private_test:config.accessTag,btcsp_qa_only:a.qa===true,btcsp_email_delivery_verified:false}});if(user.id!==a.id)throw Error('IDENTITY_MISMATCH');}
    }return json(200,{accountsReady:config.accounts.length,emailDeliveryTested:false});
   }
   if(route==='owner-link'){
    const a=config.accounts.find(x=>x.qa===false);if(!a)throw Error('OWNER_REQUIRED');const u=await admin('users/'+a.id,'GET');if(u?.app_metadata?.btcsp_private_test!==config.accessTag||u.email!==a.email)throw Error('IDENTITY_MISMATCH');const link=await admin('generate_link','POST',{type:'recovery',email:a.email});const tokenHash=link.hashed_token||link.properties?.hashed_token;if(typeof tokenHash!=='string'||!/^[a-f0-9]{56}(?:[a-f0-9]{8})?$/.test(tokenHash))throw Error('RECOVERY_LINK_'+(typeof tokenHash==='string'?tokenHash.length:'MISSING'));return json(200,{tokenHash,emailDeliveryTested:false});
   }
   if(route==='finish-qa'){
    for(const a of config.accounts.filter(x=>x.qa)){const u=await admin('users/'+a.id,'GET');if(!u)continue;if(u.app_metadata?.btcsp_private_test!==config.accessTag)throw Error('IDENTITY_MISMATCH');await admin('users/'+a.id,'PUT',{ban_duration:'876000h',password:randomBytes(32).toString('base64url')+'aA1!'});}return json(200,{qaAccountsDisabled:2});
   }
   return json(404,{code:'PRIVATE_PROVISION_ROUTE_NOT_FOUND'});
  }catch(error){console.warn(JSON.stringify({kind:'btcsp-private-provision-error',code:/^[A-Z][A-Z0-9_]{0,100}$/.test(error.message)?error.message:'UNEXPECTED_PROVISION_ERROR'}));return json(503,{code:'PRIVATE_PROVISION_FAILED'});}
 };
}
module.exports=Object.freeze({create});
