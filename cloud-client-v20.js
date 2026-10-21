/* Explicit authenticated sync protocol; no background writes or token persistence. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BTCCloudClientV20=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create({baseURL,projectId,scenarioKey,getSession,fetchImpl=fetch,newId=()=>crypto.randomUUID(),enabled=false}){
 const url=new URL(baseURL);if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password||typeof getSession!=='function')throw Error('INVALID_CLOUD_CONFIGURATION');
 let owner=null,review=null,pending=null,snapshot=null,status='idle',busy=false;
 const copy=v=>JSON.parse(JSON.stringify(v));
 async function session(){if(enabled!==true)throw Error('CLOUD_NOT_ENABLED');const s=await getSession();if(!s||!s.ownerId||!s.accessToken){owner=null;review=null;pending=null;snapshot=null;status='signed-out';throw Error('SESSION_REQUIRED');}if(owner!==null&&owner!==s.ownerId){owner=s.ownerId;review=null;pending=null;snapshot=null;status='session-changed';throw Error('SESSION_CHANGED');}owner=s.ownerId;return s;}
 async function call(route,data){const s=await session();let response;try{response=await fetchImpl(url.origin+'/api/v20/'+route,{method:'POST',headers:{Authorization:'Bearer '+s.accessToken,'Content-Type':'application/json'},body:JSON.stringify({projectId,scenarioKey,...data}),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});}catch{const e=Error('CLOUD_CONNECTION_UNCERTAIN');e.uncertain=true;throw e;}
  let body;try{body=await response.json();}catch{const e=Error('CLOUD_RESPONSE_UNCERTAIN');e.uncertain=true;throw e;}
  if(!response.ok){const e=Error(body?.code||'CLOUD_REQUEST_FAILED');e.status=response.status;if(response.status===401){owner=null;review=null;pending=null;snapshot=null;status='signed-out';}if(response.status>=500)e.uncertain=true;throw e;}
  if(!body?.result||typeof body.result!=='object'){const e=Error('CLOUD_RESPONSE_UNCERTAIN');e.uncertain=true;throw e;}return body.result;
 }
 async function exclusive(fn){if(busy)throw Error('CLOUD_REQUEST_IN_PROGRESS');busy=true;try{return await fn();}finally{busy=false;}}
 async function read(){return exclusive(async()=>{try{const r=await call('state',{});snapshot=copy(r);if(!pending)status='synced';return copy(r);}catch(e){if(status!=='signed-out'&&status!=='session-changed')status=pending?'uncertain':'offline';throw e;}});}
 async function prepare(command){return exclusive(async()=>{if(pending)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');const request=copy(command);review=null;try{const r=await call('prepare',{request});if(typeof r.headHash!=='string'||typeof r.reviewHash!=='string')throw Error('INVALID_SERVER_REVIEW');review={request,result:copy(r),idempotencyKey:newId()};status='review-required';return copy(r);}catch(e){if(status!=='signed-out'&&status!=='session-changed')status='review-failed';throw e;}});}
 async function sendPending(){try{const result=await call('commit',pending);pending=null;review=null;snapshot=null;status='refresh-required';return copy(result);}catch(e){if(status==='signed-out'||status==='session-changed')throw e;if(e.uncertain){status='uncertain';}else{pending=null;review=null;status=e.status===409?'conflict-review-required':'review-required';}throw e;}}
 async function confirm({reviewHash,acceptPlanLinkCleanup=false}={}){return exclusive(async()=>{if(!review||pending||reviewHash!==review.result.reviewHash)throw Error('EXPLICIT_SERVER_REVIEW_REQUIRED');pending={request:copy(review.request),confirmation:{headHash:review.result.headHash,reviewHash:review.result.reviewHash,idempotencyKey:review.idempotencyKey,...(acceptPlanLinkCleanup?{acceptPlanLinkCleanup:true}:{})}};return sendPending();});}
 async function retry(){return exclusive(async()=>{if(!pending||status!=='uncertain')throw Error('NO_UNCERTAIN_COMMAND');return sendPending();});}
 return Object.freeze({read,prepare,confirm,retry,state:()=>({status,hasPending:!!pending,hasReview:!!review,snapshot:snapshot?copy(snapshot):null})});
}
return Object.freeze({create});
});
