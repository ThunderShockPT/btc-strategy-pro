/* Explicit authenticated sync protocol; no background writes or token persistence. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BTCCloudClientV20=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create({baseURL,apiPath='/api/v20',projectId,scenarioKey,getSession,fetchImpl=fetch,newId=()=>crypto.randomUUID(),enabled=false}){
 const url=new URL(baseURL);if(!['/api/v20','/functions/v1/btcsp-v20-api'].includes(apiPath)||(apiPath.startsWith('/functions/')&&url.origin!=='https://oftzqqjbwonngubihrsd.supabase.co'))throw Error('INVALID_CLOUD_CONFIGURATION');if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password||typeof getSession!=='function')throw Error('INVALID_CLOUD_CONFIGURATION');
 let owner=null,review=null,pending=null,snapshot=null,status='idle',busy=null,generation=0,calculation=null,calculationRequest=null;
 const copy=v=>JSON.parse(JSON.stringify(v));
 function ensure(seq){if(seq!==generation)throw Error('SESSION_CHANGED');}
 function clearSession(){generation++;calculation=null;calculationRequest=null;owner=null;review=null;pending=null;snapshot=null;status='signed-out';busy=null;}
 async function session(){if(enabled!==true)throw Error('CLOUD_NOT_ENABLED');const seq=generation,s=await getSession();ensure(seq);if(!s||!s.ownerId||!s.accessToken){clearSession();throw Error('SESSION_REQUIRED');}if(owner!==null&&owner!==s.ownerId){clearSession();owner=s.ownerId;status='session-changed';throw Error('SESSION_CHANGED');}owner=s.ownerId;return s;}
 async function call(route,data){const seq=generation,s=await session();ensure(seq);let response;try{response=await fetchImpl(url.origin+apiPath+'/'+route,{method:'POST',headers:{Authorization:'Bearer '+s.accessToken,'Content-Type':'application/json'},body:JSON.stringify({projectId,scenarioKey,...data}),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});}catch{ensure(seq);const e=Error('CLOUD_CONNECTION_UNCERTAIN');e.uncertain=true;throw e;}ensure(seq);
  let body;try{body=await response.json();}catch{ensure(seq);const e=Error('CLOUD_RESPONSE_UNCERTAIN');e.uncertain=true;throw e;}ensure(seq);
  if(!response.ok){const e=Error(body?.code||'CLOUD_REQUEST_FAILED');e.status=response.status;if(response.status===401)clearSession();if((response.status>=500||response.status===429))e.uncertain=true;throw e;}
  if(!body?.result||typeof body.result!=='object'){const e=Error('CLOUD_RESPONSE_UNCERTAIN');e.uncertain=true;throw e;}return body.result;
 }
 async function exclusive(fn){if(busy)throw Error('CLOUD_REQUEST_IN_PROGRESS');const operation={};busy=operation;try{return await fn(generation);}finally{if(busy===operation)busy=null;}}
 async function read(){return exclusive(async seq=>{try{const r=await call('state',{});ensure(seq);snapshot=copy(r);if(!pending)status='synced';return copy(r);}catch(e){if(seq===generation&&status!=='signed-out'&&status!=='session-changed')status=pending?'uncertain':'offline';throw e;}});}
 async function prepare(command){return exclusive(async seq=>{if(pending)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');if(calculationRequest)throw Error('CALCULATION_RECONCILIATION_REQUIRED');const request=copy(command);review=null;try{const r=await call('prepare',{request});ensure(seq);if(typeof r.headHash!=='string'||typeof r.reviewHash!=='string')throw Error('INVALID_SERVER_REVIEW');review={request,result:copy(r),idempotencyKey:newId()};status='review-required';return copy(r);}catch(e){if(seq===generation&&status!=='signed-out'&&status!=='session-changed')status='review-failed';throw e;}});}
 async function sendPending(seq){try{const result=await call('commit',pending);ensure(seq);pending=null;review=null;snapshot=null;status='refresh-required';return copy(result);}catch(e){if(seq!==generation||status==='signed-out'||status==='session-changed')throw e;if(e.uncertain){status='uncertain';}else{pending=null;review=null;status=e.status===409?'conflict-review-required':'review-required';}throw e;}}
 async function confirm({reviewHash,acceptPlanLinkCleanup=false,tutorialAcknowledgment}={}){return exclusive(async seq=>{if(!review||pending||reviewHash!==review.result.reviewHash)throw Error('EXPLICIT_SERVER_REVIEW_REQUIRED');pending={request:copy(review.request),confirmation:{headHash:review.result.headHash,reviewHash:review.result.reviewHash,idempotencyKey:review.idempotencyKey,...(acceptPlanLinkCleanup?{acceptPlanLinkCleanup:true}:{}),...(tutorialAcknowledgment?{tutorialAcknowledgment:copy(tutorialAcknowledgment)}:{})}};return sendPending(seq);});}
 async function retry(){return exclusive(async seq=>{if(!pending||status!=='uncertain')throw Error('NO_UNCERTAIN_COMMAND');return sendPending(seq);});}
 async function calculate(action,request){return exclusive(async seq=>{
  if(pending)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');
  if(action==='enqueue'){
   if(calculationRequest)throw Error('CALCULATION_RECONCILIATION_REQUIRED');
   calculationRequest={idempotencyKey:newId(),...(request===undefined?{}:{profileChange:copy(request)})};
   review=null;calculation=null;
  }
  if(action==='retry-enqueue'&&!calculationRequest)throw Error('NO_UNCERTAIN_CALCULATION');
  const enqueue=action==='enqueue'||action==='retry-enqueue';
  if(!enqueue&&!calculation)throw Error('CALCULATION_REQUIRED');
  try{
   const result=await call('calculations/'+(enqueue?'enqueue':action),enqueue?{request:calculationRequest}:{jobId:calculation.id});ensure(seq);
   if(enqueue||action!=='result'){
    if(typeof result.id!=='string'||typeof result.status!=='string') {const e=Error('CLOUD_RESPONSE_UNCERTAIN');e.uncertain=true;throw e;}
    calculation=copy(result);
   }
   calculationRequest=null;status=action==='result'?'calculation-result':'calculation-'+calculation.status;return copy(result);
  }catch(e){
   if(seq===generation&&status!=='signed-out'&&status!=='session-changed'){
    if(enqueue&&!e.uncertain)calculationRequest=null;
    status=e.uncertain?'calculation-uncertain':'calculation-failed';
   }
   throw e;
  }
 });}
 async function listWallets(afterProjectId){return exclusive(async seq=>{const value=await call('wallets',afterProjectId?{afterProjectId}:{});ensure(seq);return copy(value);});}
 async function selectWallet(nextProjectId,nextScenarioKey=scenarioKey){return exclusive(async seq=>{
  if(pending||calculationRequest)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');
  if(typeof nextProjectId!=='string'||!(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/).test(nextProjectId)||!['manual_long','demo_long'].includes(nextScenarioKey))throw Error('INVALID_WALLET_ID');
  await session();ensure(seq);generation++;projectId=nextProjectId;scenarioKey=nextScenarioKey;review=snapshot=calculation=calculationRequest=null;status='wallet-selected';
 });}
 return Object.freeze({read,prepare,confirm,retry,clearSession,exportWallet:()=>exclusive(async seq=>{if(pending||calculationRequest)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');const result=await call('export',{});ensure(seq);return copy(result);}),listWallets,selectWallet,startCalculation:profileChange=>calculate('enqueue',profileChange),retryCalculationStart:()=>calculate('retry-enqueue'),calculationStatus:()=>calculate('status'),advanceCalculation:()=>calculate('advance'),calculationResult:()=>calculate('result'),cancelCalculation:()=>calculate('cancel'),state:()=>({projectId,scenarioKey,status,hasPending:!!pending,hasReview:!!review,snapshot:snapshot?copy(snapshot):null,calculation:calculation?copy(calculation):null,hasUncertainCalculationStart:!!calculationRequest})});
}
return Object.freeze({create});
});
