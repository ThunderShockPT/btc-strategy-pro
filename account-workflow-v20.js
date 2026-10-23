/* Account UI orchestration. Financial facts and reviews always come from the API. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./journal-projection.js'));else root.BTCAccountWorkflowV20=factory(root.BTCJournalProjection);})(typeof globalThis!=='undefined'?globalThis:this,function(Journal){
'use strict';
const copy=v=>v===null?null:JSON.parse(JSON.stringify(v));
const messages={PLAN_STAGE_REQUIRED:'Escolhe a etapa correspondente do plano para esta compra.',PLAN_STAGE_NOT_ACTIVE:'Esta etapa do plano não está ativa. Revê o ciclo escolhido.',UNKNOWN_PLAN_STAGE:'O ciclo não consta do plano; escolhe sem vínculo a uma etapa.',INVALID_ORDER_QUANTITY_STEP:'A quantidade não respeita o lote exigido pelas regras atuais.',CORRECTION_REASON_REQUIRED:'Indica um motivo para a correção, com pelo menos três caracteres.',EXECUTION_RECORD_ACK_REQUIRED:'Confirma que a execução ou correção corresponde ao que já ocorreu.',INVALID_EXECUTION_AMOUNT:'Revê as quantidades, o preço e a comissão.',INVALID_EXECUTION_TIME:'Indica uma data de execução válida e já ocorrida.',EXPLICIT_PLAN_LINK_CLEANUP_REQUIRED:'Aceita explicitamente a reconciliação dos vínculos ao plano.',FUTURE_EXECUTION_REQUIRES_PLAN:'A execução é posterior aos dados de mercado. Aguarda dados novos e volta a comparar o mesmo registo.',FUTURE_CORRECTION:'A correção é posterior aos dados de mercado. Aguarda dados novos e volta a comparar.',EXECUTION_REVISION_CONFLICT:'O histórico mudou. Atualiza a conta antes de comparar.',CORRECTION_REVISION_CONFLICT:'O histórico mudou. Atualiza a conta antes de corrigir.',CASH_REVISION_CONFLICT:'O histórico mudou. Atualiza a carteira e volta a comparar o movimento.',FUTURE_FACT_REQUIRES_PLAN:'Um movimento futuro é planeamento. Regista apenas o que já ocorreu.',MOVEMENT_RECORD_ACK_REQUIRED:'Confirma que este movimento já ocorreu antes de o registar.',INVALID_MOVEMENT_AMOUNT:'Indica um montante positivo em USD.',INVALID_MOVEMENT_TIME:'Indica uma data válida, anterior ou igual à hora do registo.',FUTURE_RECORDING_TIMESTAMP:'A cotação ainda é anterior a este registo. Aguarda dados novos e volta a comparar, sem alterar o movimento.',PLAN_NOT_APPLICABLE:'Esta proposta não pode ser aplicada. Revê o perfil e os dados.',EXPLICIT_SERVER_REVIEW_REQUIRED:'Lê a proposta e aceita-a antes de confirmar.',UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION:'Existe um pedido por confirmar. Verifica o seu resultado antes de continuar.',CLOUD_CONNECTION_UNCERTAIN:'A ligação foi interrompida. Consulta o estado antes de continuar.',CLOUD_RESPONSE_UNCERTAIN:'A resposta não pôde ser confirmada. Consulta o estado antes de continuar.',CALCULATION_WINDOW_TOO_SHORT:'Os dados têm pouco tempo de validade. Aguarda uma nova observação e volta a calcular.',CALCULATION_RULE_WINDOW_TOO_SHORT:'As regras precisam de revisão antes de calcular.',CALCULATION_EXPIRED:'O cálculo expirou. Recolhe dados novos através de um novo cálculo.',COMMAND_REVIEW_EXPIRED:'A proposta expirou. É necessário calcular e rever novamente.',STALE_PROJECT_REVIEW:'A carteira mudou noutro pedido ou dispositivo. Atualiza e revê novamente.',STALE_CALCULATION_BASIS:'O histórico mudou. Atualiza a carteira antes de calcular.',SESSION_CHANGED:'A conta mudou. Os dados da sessão anterior foram removidos.',SESSION_REQUIRED:'Inicia sessão para consultar a conta.',SESSION_NOT_VALID:'A sessão terminou. Volta a iniciar sessão.',CLOUD_NOT_ENABLED:'A conta online ainda não está disponível.',RATE_LIMITED:'Foram feitos demasiados pedidos. Aguarda antes de tentar novamente.'};
function applicable(r){return r?.command?.kind==='trade'||r?.command?.kind==='correction'?r.canConfirm===true&&r.command.mode==='recorded'&&!r.blocking:r?.type==='movement-review'?r.request?.mode==='recorded'&&r.plannedMovement===null&&['awaiting-record-confirmation','already-recorded'].includes(r.status):r?.type==='profile-review'?r.canApply===true:r?.type==='cycle-plan-review'&&r.result?.selected!=null&&r.result.failedMarginSurvived===true;}
function create({client,newId=()=>crypto.randomUUID(),now=()=>Date.now(),onChange=()=>{},shouldPause=()=>false}){
 if(!client||typeof client.startCalculation!=='function')throw Error('ACCOUNT_CLIENT_REQUIRED');
 let generation=0,busy=false,pause=false,snapshot=null,result=null,review=null,receipt=null,error=null,phase='idle',movementDraft=null,movementRequest=null,calculationObsolete=false,executionDraft=null,executionRequest=null,journal=null,historyPage=0,receiptKind=null;
 const listeners=new Set([onChange]);
 function state(){const c=client.state();return {phase,busy,snapshot:copy(snapshot),job:calculationObsolete?null:copy(c.calculation),result:copy(result),review:copy(review),receipt:copy(receipt),receiptKind,error:copy(error),hasPending:c.hasPending,hasUncertainCalculationStart:c.hasUncertainCalculationStart,movementDraft:copy(movementDraft),executionDraft:copy(executionDraft),history:journal?copy(journal.records.slice().reverse().slice(historyPage*50,(historyPage+1)*50)):[],historyCount:journal?.records.length||0,historyPage,expired:!!review&&Date.parse(review.expiresAt)<=now()};}
 function emit(){const value=state();for(const listener of listeners)listener(copy(value));}
 function clear(){generation++;pause=true;client.clearSession();snapshot=result=review=receipt=error=movementDraft=movementRequest=executionDraft=executionRequest=journal=receiptKind=null;calculationObsolete=false;busy=false;phase='signed-out';emit();}
 function ensure(ticket){if(ticket!==generation)throw Error('SESSION_CHANGED');}
 function failure(e){const c=client.state();if(c.status==='signed-out'||c.status==='session-changed'){snapshot=result=review=receipt=movementDraft=movementRequest=executionDraft=executionRequest=journal=receiptKind=null;calculationObsolete=false;phase=c.status;}else{phase=c.hasPending?'commit-uncertain':c.hasUncertainCalculationStart?'start-uncertain':e.uncertain?'calculation-uncertain':'error';if(!c.hasPending)review=null;}error={code:e.message,message:messages[e.message]||'Não foi possível concluir. Os dados guardados foram preservados.'};}
 async function action(fn){if(busy)throw Error('ACCOUNT_REQUEST_IN_PROGRESS');const ticket=generation;busy=true;error=null;emit();try{return await fn(ticket);}catch(e){if(ticket===generation)failure(e);throw e;}finally{if(ticket===generation){busy=false;emit();}}}
 async function load(){return action(async ticket=>{const value=await client.read();ensure(ticket);if(snapshot&&snapshot.headHash!==value.headHash){review=result=movementRequest=executionRequest=executionDraft=null;calculationObsolete=true;}snapshot=value;journal=Journal.project(value.state.input.events);historyPage=0;phase=client.state().hasPending?'commit-uncertain':'ready';return copy(value);});}
 async function run(ticket,job){
  let steps=0;
  while(job.status==='queued'||job.status==='running'){
   if(pause||shouldPause()||job.busy===true||job.status==='running'&&job.canResume===false){phase='paused';return copy(job);}
   if(++steps>10000)throw Error('CALCULATION_PROGRESS_LIMIT');
   job=await client.advanceCalculation();ensure(ticket);emit();
  }
  if(job.status!=='completed'){phase=job.status==='cancelled'?'cancelled':'blocked';error={code:job.errorCode||'CALCULATION_BLOCKED',message:messages[job.errorCode]||'O cálculo foi bloqueado. Atualiza a carteira e revê os dados.'};return copy(job);}
  if(pause||shouldPause()){phase='paused';return copy(job);}
  result=await client.calculationResult();ensure(ticket);phase='calculated';return copy(result);
 }
 async function calculate(profileChange){return action(async ticket=>{
  if(client.state().hasPending||client.state().hasUncertainCalculationStart)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');
  if(!snapshot)throw Error('ACCOUNT_SNAPSHOT_REQUIRED');
  pause=false;result=review=receipt=null;calculationObsolete=false;phase='calculating';emit();
  const job=await client.startCalculation(profileChange);ensure(ticket);emit();return run(ticket,job);
 });}
 async function resume(){return action(async ticket=>{if(client.state().hasPending)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');pause=false;review=null;phase='calculating';
  const job=client.state().hasUncertainCalculationStart?await client.retryCalculationStart():await client.calculationStatus();ensure(ticket);emit();return run(ticket,job);
 });}
 async function cancel(){pause=true;return action(async ticket=>{const job=await client.cancelCalculation();ensure(ticket);result=review=null;phase=job.status==='completed'?'calculated':'cancelled';return copy(job);});}
 function pauseCalculation(){pause=true;if(busy)emit();}
 async function preparePlan(){return action(async ticket=>{
  const c=client.state();if(c.hasPending||c.hasUncertainCalculationStart)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');
  if(!snapshot||!result||c.calculation?.status!=='completed')throw Error('COMPLETED_CALCULATION_REQUIRED');
  movementDraft=movementRequest=executionDraft=executionRequest=null;review=null;const version=String(BigInt(snapshot.state.plan.version)+1n);
  const value=await client.prepare({workflow:'plan-calculation',command:{mode:'recorded',jobId:c.calculation.id,change:{id:newId(),version}}});ensure(ticket);if(!Number.isFinite(Date.parse(value.expiresAt)))throw Error('INVALID_SERVER_REVIEW');review=value;phase='review';return copy(value);
 });}
 function editMovement(fields){
  if(busy)throw Error('ACCOUNT_REQUEST_IN_PROGRESS');
  if(client.state().hasPending||client.state().hasUncertainCalculationStart)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');
  executionDraft=executionRequest=null;movementDraft=copy(fields);movementRequest=null;review=null;error=null;emit();
 }
 function discardMovement(){if(busy||client.state().hasPending)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');movementDraft=movementRequest=review=null;emit();}
 async function prepareMovement(){return action(async ticket=>{
  if(client.state().hasPending||client.state().hasUncertainCalculationStart)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');
  if(!snapshot)throw Error('ACCOUNT_SNAPSHOT_REQUIRED');
  const draft=movementDraft;
  if(draft?.alreadyRecorded!==true)throw Error('MOVEMENT_RECORD_ACK_REQUIRED');
  if(!['capital_deposit','capital_withdrawal','margin_add','margin_remove'].includes(draft.kind))throw Error('INVALID_MOVEMENT_KIND');
  const amount=String(draft.amountUSD??'').trim();
  if(!/^\d+(?:[,.]\d{1,18})?$/.test(amount)||!/[1-9]/.test(amount))throw Error('INVALID_MOVEMENT_AMOUNT');
  if(typeof draft.effectiveAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(draft.effectiveAt)||!Number.isFinite(Date.parse(draft.effectiveAt))||new Date(draft.effectiveAt).toISOString().slice(0,19)!==draft.effectiveAt.slice(0,19)||Date.parse(draft.effectiveAt)>now())throw Error('INVALID_MOVEMENT_TIME');
  if(!movementRequest){
   const id=newId();movementRequest={id,idempotencyKey:'account-movement-'+id,expectedRevision:String(snapshot.revision),kind:draft.kind,mode:'recorded',amountUSD:amount.replace(',','.'),currency:'USD',effectiveAt:draft.effectiveAt,recordedAt:new Date(now()).toISOString(),source:'Registo manual na conta BTC',...(draft.kind==='margin_add'?{purpose:draft.purpose}:{}),...(draft.note?.trim()?{note:draft.note.trim()}:{})};
  }
  review=null;const value=await client.prepare({workflow:'movement',command:copy(movementRequest)});ensure(ticket);if(!Number.isFinite(Date.parse(value.expiresAt)))throw Error('INVALID_SERVER_REVIEW');review=value;phase='review';return copy(value);
 });}
 function editExecution(fields){
  if(busy)throw Error('ACCOUNT_REQUEST_IN_PROGRESS');
  if(client.state().hasPending||client.state().hasUncertainCalculationStart)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');
  movementDraft=movementRequest=null;executionDraft=copy(fields);executionRequest=null;review=error=null;emit();
 }
 function discardExecution(){if(busy||client.state().hasPending)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');executionDraft=executionRequest=review=null;emit();}
 function number(value,zero=false){const s=String(value??'').trim().replace(',','.').replace(/^0+(?=\d)/,'');if(!/^(0|[1-9]\d{0,19})(?:\.\d{1,18})?$/.test(s)||!zero&&!/[1-9]/.test(s))throw Error('INVALID_EXECUTION_AMOUNT');return s;}
 function validTime(at){if(typeof at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(at)||!Number.isFinite(Date.parse(at))||new Date(at).toISOString().slice(0,19)!==at.slice(0,19)||Date.parse(at)>now())throw Error('INVALID_EXECUTION_TIME');return at;}
 async function prepareExecution(){return action(async ticket=>{
  if(client.state().hasPending||client.state().hasUncertainCalculationStart)throw Error('UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION');
  if(!snapshot||!journal)throw Error('ACCOUNT_SNAPSHOT_REQUIRED');
  const d=executionDraft;if(d?.alreadyRecorded!==true)throw Error('EXECUTION_RECORD_ACK_REQUIRED');
  if(!executionRequest){
   const recordedAt=new Date(now()).toISOString(),planId=newId();
   if(d.kind==='trade'){
    if(!['trade_buy','trade_sell'].includes(d.type)||!['filled','partial'].includes(d.fillStatus)||!/^cycle-[1-9]\d{0,5}$/.test(d.cycle)||!Number.isInteger(d.stage)||d.stage<0||d.stage>3)throw Error('INVALID_EXECUTION_COMMAND');
    const id=newId(),quantityBTC=number(d.quantityBTC);executionRequest={kind:'trade',mode:'recorded',planId,id,feeId:newId(),idempotencyKey:'account-trade-'+id,expectedRevision:String(snapshot.revision),type:d.type,fillStatus:d.fillStatus,quantityBTC,requestedQuantityBTC:d.fillStatus==='filled'?quantityBTC:number(d.requestedQuantityBTC),priceUSD:number(d.priceUSD),feeUSD:number(d.feeUSD,true),cycle:d.cycle,stage:d.type==='trade_sell'?0:d.stage,effectiveAt:validTime(d.effectiveAt),recordedAt,...(d.type==='trade_sell'?{pnlDestination:d.pnlDestination}:{})};
   }else if(d.kind==='correction'){
    const row=journal.records.find(r=>r.original.id===d.targetEventId);if(!row||!['trade_buy','trade_sell','fee','funding'].includes(row.original.event_type))throw Error('CORRECTION_TARGET_NOT_FOUND');
    if(!['replace','void','restore','revert'].includes(d.action)||typeof d.reason!=='string'||d.reason.trim().length<3)throw Error('CORRECTION_REASON_REQUIRED');
    function change(r,action){const id=newId();return {id,idempotencyKey:'account-correction-'+id,targetEventId:r.original.id,expectedVersion:r.version,action,reason:d.reason.trim(),...(action==='revert'?{reversesCorrectionId:r.lastCorrectionId}:{})};}
    const item=change(row,d.action);
    if(d.action==='replace'){
     const facts=copy(row.state.record.facts);
     if(row.original.event_type.startsWith('trade_')){facts.quantityBTC=number(d.quantityBTC);facts.priceUSD=number(d.priceUSD);}else facts.amountUSD=number(d.amountUSD,true);
     item.record={facts,effective_at:validTime(d.effectiveAt)};
    }
    const changes=[item];if(d.includeLinkedFees===true&&['void','restore'].includes(d.action))for(const fee of journal.records.filter(r=>r.original.event_type==='fee'&&r.state.record.facts.tradeEventId===row.original.id&&(d.action==='void'?r.state.active:!r.state.active)))changes.push(change(fee,d.action));
    executionRequest={kind:'correction',mode:'recorded',planId,request:{expectedRevision:String(snapshot.revision),recordedAt,changes}};
    if(d.restoreStage>0&&row.original.event_type==='trade_buy'&&['restore','revert'].includes(d.action))executionRequest.restoreLinks=[{fillId:row.original.id,cycle:row.state.record.facts.cycle,stage:d.restoreStage}];
   }else throw Error('INVALID_EXECUTION_COMMAND');
  }
  review=null;const value=await client.prepare({workflow:'execution',command:copy(executionRequest)});ensure(ticket);if(!Number.isFinite(Date.parse(value.expiresAt)))throw Error('INVALID_SERVER_REVIEW');review=value;phase='review';return copy(value);
 });}
 function applied(value){receiptKind=review?.review.command?.kind||review?.review.type||null;receipt=value;review=result=null;snapshot=journal=null;if(value.planReviewRequired){calculationObsolete=true;movementDraft=movementRequest=executionDraft=executionRequest=null;}phase='refresh-required';}
 async function confirm({reviewHash,accepted=false,acceptPlanLinkCleanup=false}={}){return action(async ticket=>{
  if(!accepted||!review||reviewHash!==review.reviewHash)throw Error('EXPLICIT_SERVER_REVIEW_REQUIRED');
  if(!applicable(review.review))throw Error('PLAN_NOT_APPLICABLE');
  if(Date.parse(review.expiresAt)<=now())throw Error('COMMAND_REVIEW_EXPIRED');
  if((review.review.removedPlanLinks||review.review.restoredPlanLinks)&&acceptPlanLinkCleanup!==true)throw Error('EXPLICIT_PLAN_LINK_CLEANUP_REQUIRED');
  const value=await client.confirm({reviewHash,acceptPlanLinkCleanup});ensure(ticket);applied(value);return copy(value);
 });}
 async function retryConfirmation(){return action(async ticket=>{const value=await client.retry();ensure(ticket);applied(value);return copy(value);});}
 return Object.freeze({state,load,calculate,resume,cancel,pause:pauseCalculation,preparePlan,editMovement,discardMovement,prepareMovement,editExecution,discardExecution,prepareExecution,confirm,retryConfirmation,clearSession:clear,pageHistory(delta){if(busy||!journal||![-1,1].includes(delta))return;historyPage=Math.max(0,Math.min(Math.max(0,Math.ceil(journal.records.length/50)-1),historyPage+delta));emit();},subscribe(fn){listeners.add(fn);fn(state());return ()=>listeners.delete(fn);}});
}
return Object.freeze({create,messages,applicable});
});
