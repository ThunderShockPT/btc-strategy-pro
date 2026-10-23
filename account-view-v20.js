/* Shared account panel: API-backed state, explicit review and confirmation. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./account-workflow-v20.js'));else root.BTCAccountViewV20=factory(root.BTCAccountWorkflowV20);})(typeof globalThis!=='undefined'?globalThis:this,function(Account){
'use strict';
const e=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={idle:'Conta online',ready:'Carteira atualizada',calculating:'A calcular o plano',paused:'Cálculo em pausa',calculated:'Cálculo concluído',review:'Proposta por confirmar',cancelled:'Cálculo cancelado',blocked:'Cálculo bloqueado','start-uncertain':'Início por confirmar','calculation-uncertain':'Consultar estado do cálculo','commit-uncertain':'Confirmação por verificar','refresh-required':'Plano confirmado · atualizar carteira','signed-out':'Sessão terminada','session-changed':'Conta alterada',error:'É necessária uma verificação'};
function render(s,{money}={}){
 const button=(action,label,disabled=false)=>`<button type="button" class="secondary" data-account-action="${action}" ${disabled?'disabled':''}>${e(label)}</button>`;
 const line=(label,value)=>`<div class="data-line"><span>${e(label)}</span><strong>${e(value)}</strong></div>`;
 const usd=v=>v===undefined||v===null?'—':money?money(v):v+' USD';
 const signedOut=['signed-out','session-changed'].includes(s.phase),snapshot=s.snapshot?.state,plan=snapshot?.plan,job=s.job;
 let html=`<section class="surface account-panel" aria-label="Conta online"><h3>Conta online</h3><p role="status" aria-live="polite">${e(labels[s.phase]||'A acompanhar a conta')}</p>`;
 if(s.error)html+=`<p class="error" role="alert">${e(s.error.message)}</p>`;
 if(signedOut)return html+'<p>Inicia sessão para voltar a consultar a carteira.</p></section>';
 html+='<p class="legend">Os dados desta conta são lidos do servidor. A carteira Demo permanece no navegador.</p>';
 if(plan&&s.error)html+='<p class="legend">Última leitura da conta. Pode estar desatualizada; atualiza antes de continuar.</p>';
 if(plan)html+=`<div class="data-grid">${line('Carteira',plan.configuration?.title||'Carteira')}${line('Versão do plano',plan.version)}${line('Perfil guardado',({safe:'Seguro',balanced:'Equilibrado',risky:'Arriscado'})[plan.profile]||plan.profile)}${line('Piso do cenário',usd(plan.protectionFloorUSD))}${line('Referência do plano',usd(plan.referencePriceUSD))}${line('Revisão do histórico',s.snapshot.revision)}</div>`;
 if(job)html+=`<div class="data-grid">${line('Estado do cálculo',({queued:'Em fila',running:'Em processamento',completed:'Concluído',cancelled:'Cancelado',blocked:'Bloqueado'})[job.status]||job.status)}${line('Unidades concluídas',job.unitsCompleted)}${line('Validade original',job.expiresAt)}</div><p class="legend">O progresso não renova a validade dos dados. O cálculo pode ser recusado ou expirar.</p>`;
 if(s.busy)html+='<p class="busy">A comunicar com o servidor…</p>'+button('pause','Pausar após este pedido',s.phase!=='calculating');
 else if(s.hasPending)html+='<p>A confirmação pode já ter sido aplicada. Verifica o recibo antes de iniciar outra operação.</p>'+button('retry-confirm','Verificar confirmação');
 else{
  html+='<div class="quick-actions">'+button('load','Atualizar carteira');
  if(s.hasUncertainCalculationStart)html+=button('resume','Verificar início do cálculo');
  else{
   html+=button('calculate','Calcular com o perfil atual',!plan);
   if(job&&['queued','running','completed'].includes(job.status))html+=button('resume','Consultar e continuar')+button('cancel','Cancelar cálculo');
   if(s.result&&job?.status==='completed')html+=button('prepare','Rever proposta');
  }
  html+='</div>';
 }
 if(s.review&&!s.hasPending){
  const r=s.review.review,before=r.activePlan,after=r.candidatePlan,previous=r.previousReservations||snapshot?.input?.reservations,reserves=r.proposedReservations||(r.result?.cycles?.selected||r.result?.selected)?.reservations;
  html+=`<section aria-label="Revisão do plano"><h4>Antes de confirmar</h4><div class="data-grid">${line('Perfil',before.profile+' → '+after.profile)}${line('Piso do cenário',usd(before.protectionFloorUSD)+' → '+usd(after.protectionFloorUSD))}${line('Referência BTC',usd(before.referencePriceUSD)+' → '+usd(after.referencePriceUSD))}${line('Reserva para ordens · antes → depois',usd(previous?.ordersUSD)+' → '+usd(reserves?.ordersUSD))}${line('Reserva para margem · antes → depois',usd(previous?.marginUSD)+' → '+usd(reserves?.marginUSD))}${line('Reserva protegida · antes → depois',usd(previous?.protectedUSD)+' → '+usd(reserves?.protectedUSD))}${line('Proposta válida até',s.review.expiresAt)}</div><p>Confirmar guarda o plano e as suas reservas. Nenhuma compra, venda ou transferência é executada na Kraken. O piso do cenário não garante proteção; uma queda brusca pode atingir manutenção antes de um reforço ou adição de margem.</p>`;
  const orders=(r.result?.cycles?.selected||r.result?.selected)?.orders||[];
  if(!orders.length)html+='<p>Esta proposta não acrescenta compras pendentes.</p>';
  if(orders.length)html+='<h4>Compras propostas</h4><ol class="buy-timeline">'+orders.map(o=>'<li>'+line('Ciclo',o.cycle)+line('Etapa',({1:'Entrada',2:'Primeiro reforço',3:'Segundo reforço'})[o.stage]||o.stage)+line('Preço BTC',usd(o.priceUSD))+line('Quantidade',o.quantityBTC===undefined?'—':o.quantityBTC+' BTC')+'</li>').join('')+'</ol>';
  if(!Account.applicable(r))html+='<p class="error">Esta proposta não pode ser aplicada. Revê os dados e o perfil.</p>';
  html+='<label class="ack"><input type="checkbox" data-account-accept '+(s.busy||s.expired||!Account.applicable(r)?'disabled':'')+'>Li a proposta e aceito guardar este plano.</label>'+button('confirm',s.expired?'Proposta expirada':'Confirmar plano',true)+'</section>';
 }
 if(s.receipt)html+='<p role="status">O servidor confirmou o registo do plano. '+(s.receipt.replayed?'O recibo foi recuperado sem duplicar a operação.':'')+'</p>';
 return html+'</section>';
}
function mount({element,workflow,money,document:doc=globalThis.document}){
 if(!element||!workflow)throw Error('ACCOUNT_PANEL_DEPENDENCIES_REQUIRED');
 let destroyed=false,lastState=null;
 const paint=s=>{if(destroyed)return;lastState=s;element.innerHTML=render(s,{money});element.setAttribute('aria-busy',String(s.busy));};
 const unsubscribe=workflow.subscribe(paint);
 async function click(event){const target=event.target.closest('[data-account-action]');if(!target||!element.contains(target)||target.disabled)return;
  const action=target.dataset.accountAction;
  try{
   if(action==='pause')workflow.pause();else if(action==='calculate')await workflow.calculate();else if(action==='resume')await workflow.resume();else if(action==='cancel')await workflow.cancel();else if(action==='prepare')await workflow.preparePlan();else if(action==='confirm')await workflow.confirm({reviewHash:lastState.review?.reviewHash,accepted:element.querySelector('[data-account-accept]')?.checked===true});else if(action==='retry-confirm')await workflow.retryConfirmation();else if(action==='load')await workflow.load();
  }catch{/* Workflow publishes a user-facing error and preserves uncertain commands. */}
 }
 function change(event){if(!event.target.matches('[data-account-accept]'))return;const button=element.querySelector('[data-account-action="confirm"]');if(button)button.disabled=!event.target.checked||lastState.busy||lastState.expired||!Account.applicable(lastState.review?.review);}
 function visibility(){if(doc.hidden)workflow.pause();}
 element.addEventListener('click',click);element.addEventListener('change',change);doc.addEventListener('visibilitychange',visibility);
 return Object.freeze({destroy(){destroyed=true;workflow.pause();unsubscribe();element.innerHTML='';element.removeEventListener('click',click);element.removeEventListener('change',change);doc.removeEventListener('visibilitychange',visibility);}});
}
return Object.freeze({render,mount});
});
