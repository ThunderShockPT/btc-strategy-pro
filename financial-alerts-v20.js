/* BTC Strategy Pro — Bloco 13.1 / Alertas financeiros somente de leitura.
 * Compatível com fonte autenticada R5.1–R5.5. Sem ordens, push, notificações
 * em segundo plano, preços externos ou recomendações automáticas de negociação.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();
else root.BTCFinancialAlertsV20=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/i;
const REV=/^(0|[1-9]\d{0,18})$/;
const NUM=/^-?(0|[1-9]\d{0,19})(?:\.\d{1,24})?$/;
const ordering={critical:0,warning:1,info:2};
function immutable(o){if(o&&typeof o==='object'){for(const v of Object.values(o))immutable(v);Object.freeze(o);}return o;}
function alert(code,severity,title,message,section){return {code,severity,title,message,section,notificationType:'in-app-only',maySubmitOrders:false};}
function evaluate({account,journal,capacity=null,capacityBasis=null,risk=null,riskBasis=null}={}){
 const acc=account||{},p=acc.projection,s=p?.shared||{},f=p?.financial||{},j=journal||{};
 const valid=acc.authenticated===true&&acc.connected===true&&
 ['ready','bookkeeping-only'].includes(acc.phase)&&s.ownerScoped===true&&
 typeof s.projectId==='string'&&UUID.test(s.projectId)&&acc.selectedProjectId===s.projectId&&
 typeof s.revision==='string'&&REV.test(s.revision)&&typeof s.headHash==='string'&&SHA.test(s.headHash)&&
 j.source==='V20_AUTHENTICATED_EVENT_JOURNAL'&&j.selectedProjectId===s.projectId&&
 j.revision===s.revision&&j.sourceHeadHash===s.headHash&&
 !j.needsReconciliation&&!['signed-out','session-changed','error','commit-uncertain','refresh-required'].includes(j.phase);
 const base={schemaVersion:1,status:'locked',basis:null,alerts:[],counts:{critical:0,warning:0,info:0},
  hasFinancialAdvice:false,canTrade:false,canWrite:false,canPush:false};
 if(!valid){
  const a=alert('REVIEW_ACCOUNT_SYNC','warning','Dados indisponíveis',
   'Confirma a sessão e sincroniza a carteira e o diário. Não serão apresentados alertas financeiros baseados em dados antigos.','conta');
  return immutable({...base,status:'reconciliation-required',alerts:[a],counts:{critical:0,warning:1,info:0}});
 }
 const basis={projectId:s.projectId,revision:s.revision,headHash:s.headHash};
 const alerts=[];
 if(s.quoteCurrent!==true||s.rulesCurrent!==true)alerts.push(alert('STALE_MARKET_OR_RULES','warning','Dados de mercado por atualizar',
  'A cotação ou as regras Kraken não estão atualizadas. As simulações não autorizam compras nem confirmam o preço de liquidação.','mercado'));
 if(j.reviewPending===true)alerts.push(alert('PENDING_EXPLICIT_REVIEW','info','Movimento à espera de revisão',
  'Existe uma proposta preparada. Revê o resultado no diário e confirma apenas se corresponde a uma operação já efetuada.','registos'));
 if(typeof f.freeCashUSD==='string'&&NUM.test(f.freeCashUSD)&&Number(f.freeCashUSD)===0)
  alerts.push(alert('NO_FREE_CASH','warning','Sem caixa livre para novas compras',
   'A caixa livre contabilística é zero. Não assumas que o valor da margem isolada pode financiar outra compra.','inicio'));
 const matched=b=>b&&b.projectId===basis.projectId&&b.revision===basis.revision&&b.headHash===basis.headHash;
 if(capacity){
  if(!matched(capacityBasis))alerts.push(alert('CAPACITY_REQUIRES_RECALCULATION','warning','Capacidade de compra por recalcular',
    'O estudo de capacidade não corresponde à revisão atual da carteira. Atualiza antes de consultar a compra seguinte.','estrategias'));
  else if(capacity.canApply!==false||capacity.mayCallExchange!==false||capacity.officialKrakenBuyingPower!==false)
   alerts.push(alert('CAPACITY_SOURCE_NOT_VERIFIED','warning','Resultado de compra não validado',
    'A fonte da estimativa de compras não passou nas verificações de segurança. Não utilizar.','estrategias'));
  else if(Array.isArray(capacity.blockers)){
   if(capacity.blockers.includes('EXISTING_POSITION_UNSAFE_BEFORE_NEXT_BUY'))
    alerts.push(alert('EXISTING_MARGIN_AT_RISK','critical','Posição em risco antes da próxima compra',
      'Na simulação, a posição pode atingir a margem de manutenção antes do preço da compra seguinte. Não contar com reforços futuros não efetuados.','risco'));
   if(capacity.blockers.includes('INSUFFICIENT_CASH_FOR_TARGET_AND_FLOOR_STRESS')||
      capacity.blockers.includes('NO_AVAILABLE_CASH')||
      capacity.blockers.includes('NO_EXECUTABLE_LOT_WITH_AVAILABLE_CASH'))
    alerts.push(alert('NEXT_BUY_NOT_FUNDED','warning','Caixa insuficiente no cenário',
     'Com as compras anteriores, taxas e margem necessária neste cenário, a compra planeada não fica financiada.','estrategias'));
   if(capacity.blockers.includes('TARGET_BELOW_MINIMUM_LOT_OR_POSITION_LIMIT'))
    alerts.push(alert('NEXT_BUY_INVALID_LOT','info','Compra planeada não executável no modelo',
     'O valor pretendido não respeita o lote mínimo ou o limite de posição no cenário testado.','estrategias'));
  }
 }
 if(risk){
  if(!matched(riskBasis))alerts.push(alert('RISK_REQUIRES_RECALCULATION','warning','Risco por recalcular',
    'Os dados do cálculo de risco pertencem a outra revisão ou carteira. Consulta uma avaliação atualizada.','risco'));
  else if(risk.maintenanceReached===true&&risk.source==='V20_VERIFIED_MODEL')
   alerts.push(alert('MAINTENANCE_REACHED_IN_MODEL','critical','Manutenção atingida no modelo',
    'A margem de manutenção foi atingida no cenário financeiro analisado. Isto não confirma o estado da corretora.','risco'));
 }
 alerts.sort((a,b)=>ordering[a.severity]-ordering[b.severity]||a.code.localeCompare(b.code));
 const counts={critical:alerts.filter(x=>x.severity==='critical').length,warning:alerts.filter(x=>x.severity==='warning').length,info:alerts.filter(x=>x.severity==='info').length};
 return immutable({...base,status:'ready',basis,alerts,counts});
}
return Object.freeze({evaluate});
});