/* Account UI orchestration. Financial facts and reviews always come from the API. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BTCAccountWorkflowV20=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const copy=v=>v===null?null:JSON.parse(JSON.stringify(v));
const messages={PLAN_NOT_APPLICABLE:'Esta proposta não pode ser aplicada. Revê o perfil e os dados.',EXPLICIT_SERVER_REVIEW_REQUIRED:'Lê a proposta e aceita-a antes de confirmar.',UNCERTAIN_COMMAND_REQUIRES_RECONCILIATION:'Existe um pedido por confirmar. Verifica o seu resultado antes de continuar.',CLOUD_CONNECTION_UNCERTAIN:'A ligação foi interrompida. Consulta o estado antes de continuar.',CLOUD_RESPONSE_UNCERTAIN:'A resposta não pôde ser confirmada. Consulta o estado antes de continuar.',CALCULATION_WINDOW_TOO_SHORT:'Os dados têm pouco tempo de validade. Aguarda uma nova observação e volta a calcular.',CALCULATION_RULE_WINDOW_TOO_SHORT:'As regras precisam de revisão antes de calcular.',CALCULATION_EXPIRED:'O cálculo expirou. Recolhe dados novos através de um novo cálculo.',COMMAND_REVIEW_EXPIRED:'A proposta expirou. É necessário calcular e rever novamente.',STALE_PROJECT_REVIEW:'A carteira mudou noutro pedido ou dispositivo. Atualiza e revê novamente.',STALE_CALCULATION_BASIS:'O histórico mudou. Atualiza a carteira antes de calcular.',SESSION_CHANGED:'A conta mudou. Os dados da sessão anterior foram removidos.',SESSION_REQUIRED:'Inicia sessão para consultar a conta.',SESSION_NOT_VALID:'A sessão terminou. Volta a iniciar sessão.',CLOUD_NOT_ENABLED:'A conta online ainda não está disponível.',RATE_LIMITED:'Foram feitos demasiados pedidos. Aguarda antes de tentar novamente.'};
function applicable(r){return r?.type==='profile-review'?r.canApply===true:r?.type==='cycle-plan-review'&&r.result?.selected!=null&&r.result.failedMarginSurvived===true;}
function create({client,newId=()=>crypto.randomUUID(),now=()=>Date.now(),onChange=()=>{},shouldPause=()=>false}){
 if(!client||typeof client.startCalculation!=='function')throw Error('ACCOUNT_CLIENT_REQUIRED');
 let generation=0,busy=false,pause=false,snapshot=null,result=null,review=null,receipt=null,error=null,phase='idle';
 const listeners=new Set([onChange]);
 function state(){const c=client.state();return {phase,busy,snapshot:copy(snapshot),job:copy(c.calculation),result:copy(result),review:copy(review),receipt:copy(receipt),error:copy(error),hasPending:c.hasPending,hasUncertainCalculationStart:c.hasUncertainCalculationStart,expired:!!review&&Date.parse(review.expiresAt)<=now()};}
 function emit(){const value=state();for(const listener of listeners)listener(copy(value));}
 function clear(){generation++;pause=true;client.clearSession();snapshot=result=review=receipt=error=null;busy=false;phase='signed-out';emit();}
 function ensure(ticket){if(ticket!==generation)throw Error('SESSION_CHANGED');}
 function failure(e){const c=client.state();if(c.status==='signed-out'||c.status==='session-changed'){snapshot=result=review=receipt=null;phase=c.status;}else{phase=c.hasPending?'commit-uncertain':c.hasUncertainCalculationStart?'start-uncertain':e.uncertain?'calculation-uncertain':'error';if(!c.hasPending)review=null;}error={code:e.message,message:messages[e.message]||'Não foi possível concluir. Os dados guardados foram preservados.'};}
 async function action(fn){if(busy)throw Error('ACCOUNT_REQUEST_IN_PROGRESS');const ticket=generation;busy=true;error=null;emit();try{return await fn(ticket);}catch(e){if(ticket===generation)failure(e);throw e;}finally{if(ticket===generation){busy=false;emit();}}}
 async function load(){return action(async ticket=>{const value=await client.read();ensure(ticket);if(snapshot&&snapshot.headHash!==value.headHash){review=result=null;}snapshot=value;phase=client.state().hasPending?'commit-uncertain':'ready';return copy(value);});}
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
  pause=false;result=review=receipt=null;phase='calculating';emit();
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
  review=null;const version=String(BigInt(snapshot.state.plan.version)+1n);
  const value=await client.prepare({workflow:'plan-calculation',command:{mode:'recorded',jobId:c.calculation.id,change:{id:newId(),version}}});ensure(ticket);if(!Number.isFinite(Date.parse(value.expiresAt)))throw Error('INVALID_SERVER_REVIEW');review=value;phase='review';return copy(value);
 });}
 async function confirm({reviewHash,accepted=false}={}){return action(async ticket=>{
  if(!accepted||!review||reviewHash!==review.reviewHash)throw Error('EXPLICIT_SERVER_REVIEW_REQUIRED');
  if(!applicable(review.review))throw Error('PLAN_NOT_APPLICABLE');
  if(Date.parse(review.expiresAt)<=now())throw Error('COMMAND_REVIEW_EXPIRED');
  const value=await client.confirm({reviewHash});ensure(ticket);receipt=value;review=result=null;snapshot=null;phase='refresh-required';return copy(value);
 });}
 async function retryConfirmation(){return action(async ticket=>{const value=await client.retry();ensure(ticket);receipt=value;review=result=snapshot=null;phase='refresh-required';return copy(value);});}
 return Object.freeze({state,load,calculate,resume,cancel,pause:pauseCalculation,preparePlan,confirm,retryConfirmation,clearSession:clear,subscribe(fn){listeners.add(fn);fn(state());return ()=>listeners.delete(fn);}});
}
return Object.freeze({create,messages,applicable});
});
