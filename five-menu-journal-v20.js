/* BTC Strategy Pro R5.3 — Journal controller for the five original Demo menus.
 * All persistence stays in the existing authenticated AccountWorkflow V20:
 * client.prepare -> verified server comparison -> human accepted -> client.confirm.
 * Does NOT send exchange orders, edit financial events, or approve financial policy.
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.BTCFiveMenuJournalV20=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const kinds=new Set(['capital_deposit','capital_withdrawal','margin_add','margin_remove']);
 const execKinds=new Set(['trade','correction']);
 const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
 function fail(code){const error=new Error(code);error.code=code;return error;}
 function need(ok,code){if(!ok)throw fail(code);}
 function create({workflow,now=()=>Date.now()}={}){
  need(workflow&&['state','subscribe','load','editMovement','prepareMovement','discardMovement','editExecution','prepareExecution','discardExecution','confirm','retryConfirmation','clearSession'].every(k=>typeof workflow[k]==='function'),'R53_V20_WORKFLOW_REQUIRED');
  need(typeof now==='function','R53_CLOCK_REQUIRED');
  let pending=null,disposed=false;
  const listeners=new Set();
  const target=s=>({projectId:s.selectedProjectId,revision:s.snapshot?.revision,headHash:s.snapshot?.headHash});
  function ready(){
   need(!disposed,'R53_DISPOSED');
   const s=workflow.state();
   need(s&&s.snapshot&&s.phase==='ready'&&!s.busy&&!s.hasPending&&!s.hasUncertainCalculationStart,'R53_FRESH_SNAPSHOT_REQUIRED');
   need(typeof s.snapshot.headHash==='string'&&typeof s.snapshot.revision==='string'&&typeof s.selectedProjectId==='string','R53_SOURCE_IDENTITY_REQUIRED');
   return s;
  }
  function emission(){
   if(disposed)return;
   const s=workflow.state(),t=target(s);
   // If another source revision/wallet replaces the basis, never keep the prepared confirmation.
   if(pending&&(t.projectId!==pending.projectId||t.revision!==pending.revision||t.headHash!==pending.headHash))pending=null;
   const value=state();
   for(const cb of listeners)cb(copy(value));
  }
  const unsubscribe=workflow.subscribe(emission);
  function state(){
   const s=workflow.state(),review=s.review,good=!!pending&&review?.reviewHash===pending.reviewHash&&s.phase==='review'&&!s.busy&&!s.expired;
   const isCurrent=!!s.snapshot&&!['signed-out','session-changed','refresh-required','commit-uncertain','error'].includes(s.phase)&&!s.hasPending;
   return {phase:s.phase,selectedProjectId:s.selectedProjectId||null,
     revision:isCurrent?s.snapshot.revision:null,sourceHeadHash:isCurrent?s.snapshot.headHash:null,
     historyCount:isCurrent?s.historyCount:0,history:isCurrent?copy(s.history):[],
     source:'V20_AUTHENTICATED_EVENT_JOURNAL',canWriteDirectly:false,maySubmitOrders:false,mayModifyHistory:false,
     reviewPending:good,reviewHash:good?pending.reviewHash:null,
     reviewedOperation:good?pending.kind:null,expiresAt:good?pending.expiresAt:null,
     serverComparison:good?copy(review.review):null,needsExplicitAcceptance:true,
     needsReconciliation:!!s.hasPending||s.phase==='commit-uncertain',
     lastReceipt:s.receipt?copy(s.receipt):null,
     error:s.error?copy(s.error):null};
  }
  async function load(){
   need(!disposed,'R53_DISPOSED');pending=null;
   return workflow.load();
  }
  async function prepare(kind,fields){
   const s=ready();need(fields&&typeof fields==='object'&&!Array.isArray(fields),'R53_INVALID_DRAFT');
   need(fields.alreadyRecorded===true,'R53_ONLY_RECORDED_FACTS');
   need((kind==='movement'&&kinds.has(fields.kind))||(kind==='execution'&&execKinds.has(fields.kind)),'R53_UNKNOWN_OPERATION');
   if(kind==='execution'&&fields.kind==='correction')need(typeof fields.reason==='string'&&fields.reason.trim().length>=3,'R53_CORRECTION_REASON_REQUIRED');
   pending=null;
   const origin=target(s);
   if(kind==='movement')workflow.editMovement(copy(fields));else workflow.editExecution(copy(fields));
   const result=kind==='movement'?await workflow.prepareMovement():await workflow.prepareExecution();
   const next=workflow.state();
   need(next.selectedProjectId===origin.projectId&&next.snapshot?.revision===origin.revision&&next.snapshot?.headHash===origin.headHash,'R53_SOURCE_CHANGED_DURING_REVIEW');
   need(result?.reviewHash&&next.review?.reviewHash===result.reviewHash&&next.phase==='review','R53_SERVER_REVIEW_REQUIRED');
   need(typeof result.expiresAt==='string'&&Date.parse(result.expiresAt)>now(),'R53_REVIEW_EXPIRED');
   pending={...origin,reviewHash:result.reviewHash,kind:fields.kind,expiresAt:result.expiresAt};
   emission();
   return state();
  }
  async function confirm({reviewHash,accepted,acceptPlanLinkCleanup=false}={}){
   need(!disposed,'R53_DISPOSED');
   need(accepted===true,'R53_EXPLICIT_ACCEPTANCE_REQUIRED');
   const p=pending,s=workflow.state();
   need(p&&s.review?.reviewHash===p.reviewHash&&reviewHash===p.reviewHash,'R53_EXACT_REVIEW_REQUIRED');
   need(s.selectedProjectId===p.projectId&&s.snapshot?.revision===p.revision&&s.snapshot?.headHash===p.headHash,'R53_STALE_REVIEW');
   need(!s.busy&&!s.hasPending&&!s.hasUncertainCalculationStart,'R53_UNCERTAIN_WRITE_BLOCKED');
   need(Date.parse(p.expiresAt)>now(),'R53_REVIEW_EXPIRED');
   // The V20 workflow rechecks the server review, expiration and plan-link cleanup.
   let receipt;
   try{receipt=await workflow.confirm({reviewHash,accepted:true,acceptPlanLinkCleanup:acceptPlanLinkCleanup===true});}
   finally{pending=null;}
   // A commit receipt is not a new confirmed balance. Refresh through the server.
   try{await workflow.load();return {receipt:copy(receipt),fresh:true,status:state()};}
   catch(error){return {receipt:copy(receipt),fresh:false,status:state(),refreshRequired:true};}
  }
  function discard(){
   need(!disposed,'R53_DISPOSED');
   const kind=pending?.kind;pending=null;
   if(kind&&kinds.has(kind))workflow.discardMovement();
   else if(kind&&execKinds.has(kind))workflow.discardExecution();
   emission();
  }
  async function reconcile(){
   need(!disposed,'R53_DISPOSED');
   const s=workflow.state();
   need(s.hasPending===true&&s.phase==='commit-uncertain','R53_NO_UNCERTAIN_COMMIT');
   const receipt=await workflow.retryConfirmation();
   await workflow.load();pending=null;return {receipt:copy(receipt),status:state()};
  }
  function clear(){if(disposed)return;pending=null;workflow.clearSession();emission();}
  function dispose(){if(disposed)return;pending=null;disposed=true;unsubscribe?.();listeners.clear();}
  return Object.freeze({state,load,prepare,confirm,discard,reconcile,clear,dispose,subscribe(fn){need(!disposed&&typeof fn==='function','R53_SUBSCRIPTION_INVALID');listeners.add(fn);fn(state());return()=>listeners.delete(fn);}});
 }
 return Object.freeze({create});
});