'use strict';
// Tokens are verified by the fixed BTC Supabase Auth endpoint. Decoding is NOT verification.
const PROJECT='oftzqqjbwonngubihrsd',URL_BASE='https://'+PROJECT+'.supabase.co';
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function need(v){if(!v)throw Error('SESSION_NOT_VALID');}
function create({publishableKey,fetchImpl=fetch,now=()=>Date.now(),timeoutMs=4000}){
 need(typeof publishableKey==='string'&&publishableKey.length>0);
 // The user supplies no URL, issuer or project; no cross-project fallback.
 async function authenticate(token){
  try{
   need(typeof token==='string'&&token.length<=12000&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token));
   const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
   need(claims&&claims.iss===URL_BASE+'/auth/v1'&&ID.test(claims.sub)&&ID.test(claims.session_id));
   need(claims.aud==='authenticated'&&claims.role==='authenticated'&&Number.isSafeInteger(claims.exp)&&Number.isSafeInteger(claims.iat));
   need(claims.exp*1000>now()&&claims.iat*1000<=now()+30000&&claims.exp>claims.iat);
   const response=await fetchImpl(URL_BASE+'/auth/v1/user',{method:'GET',headers:{apikey:publishableKey,Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(timeoutMs)});
   need(response.status===200);
   const reader=response.body?.getReader();need(reader);let length=0,parts=[];try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;need(length<=65536);parts.push(value);}}finally{await reader.cancel().catch(()=>{});}
   const user=JSON.parse(Buffer.concat(parts).toString('utf8'));
   need(user&&user.id===claims.sub&&user.is_anonymous===false&&typeof user.email_confirmed_at==='string'&&Number.isFinite(Date.parse(user.email_confirmed_at)));
   // No user_metadata / app claims are used to authorize ownership.
   return Object.freeze({id:user.id,is_anonymous:false,email_confirmed_at:user.email_confirmed_at,session_id:claims.session_id,tokenExpiresAt:claims.exp*1000});
  }catch{throw Error('SESSION_NOT_VALID');}
 }
 async function assertSession(tx,user,scope){
  need(user&&user.id===scope.ownerId&&ID.test(user.session_id)&&user.tokenExpiresAt>now());
  const rows=(await tx.query(`select s.id from auth.sessions s join auth.users u on u.id=s.user_id
   where s.id=$1 and s.user_id=$2 and (s.not_after is null or s.not_after>now())
    and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=now()) for share of s,u`,[user.session_id,user.id])).rows;
  need(rows.length===1);
 }
 return Object.freeze({authenticate,assertSession});
}
module.exports=Object.freeze({PROJECT,URL_BASE,create});
