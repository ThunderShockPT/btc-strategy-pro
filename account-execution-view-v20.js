/* Trade/correction forms and audit metadata; no client-side balance calculations. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BTCAccountExecutionViewV20=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function local(at){if(!at||!Number.isFinite(Date.parse(at)))return '';const d=new Date(at),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());}
function forms(s,{e,button}){
 let html='';const d=s.executionDraft,disabled=s.busy||s.hasPending?'disabled':'';
 if(d&&!s.hasPending){
  const field=(key,label,type='text')=>`<div class="field"><label>${e(label)}<input data-execution-field="${key}" type="${type}" ${type==='datetime-local'?'step="1"':'inputmode="decimal"'} value="${e(type==='datetime-local'?local(d[key]):d[key]||'')}" ${disabled}></label></div>`;
  const select=(key,label,values)=>`<div class="field"><label>${e(label)}<select data-execution-field="${key}" ${disabled}>${values.map(([v,label])=>'<option value="'+e(v)+'" '+(String(d[key])===String(v)?'selected':'')+'>'+e(label)+'</option>').join('')}</select></label></div>`;
  html+='<section aria-label="Registo de execução"><h4>'+(d.kind==='trade'?'Registar compra ou venda já executada':'Corrigir o histórico sem apagar o original')+'</h4><p>Os dados são declarações manuais. Não é enviada nenhuma ordem à Kraken.</p><div class="form-grid">';
  if(d.kind==='trade')html+=select('type','Execução',[['trade_buy','Compra'],['trade_sell','Venda']])+select('fillStatus','Preenchimento',[['filled','Completo'],['partial','Parcial']])+field('cycle','Ciclo · exemplo cycle-1')+(d.type==='trade_buy'?select('stage','Etapa do plano',[[0,'Sem vínculo a uma etapa'],[1,'Entrada'],[2,'Primeiro reforço'],[3,'Segundo reforço']]):select('pnlDestination','Destino do PnL realizado',[['wallet','Caixa'],['isolated','Margem isolada']]))+field('quantityBTC','BTC realmente executado')+(d.fillStatus==='partial'?field('requestedQuantityBTC','BTC solicitado na ordem'):'')+field('priceUSD','Preço de execução · USD')+field('feeUSD','Comissão efetiva · USD')+field('effectiveAt','Quando ocorreu · hora local','datetime-local');
  else{
   html+=select('action','Correção',[...(d.active===false?[['restore','Restaurar registo anulado']]:[['replace','Corrigir valores'],['void','Anular registo incorreto']]),...(d.hasCorrection?[['revert','Reverter a última correção']]:[])]);
   if(d.action==='replace')html+=(d.eventType.startsWith('trade_')?field('quantityBTC','BTC corrigido')+field('priceUSD','Preço corrigido · USD'):field('amountUSD','Montante corrigido · USD'))+field('effectiveAt','Data corrigida · hora local','datetime-local');
   html+='<div class="field wide"><label>Motivo da correção<input data-execution-field="reason" maxlength="1000" value="'+e(d.reason||'')+'" '+disabled+'></label></div>';
   if(['void','restore'].includes(d.action)&&d.eventType.startsWith('trade_'))html+='<label class="ack"><input type="checkbox" data-execution-field="includeLinkedFees" '+(d.includeLinkedFees?'checked':'')+' '+disabled+'>Incluir as comissões associadas nesta anulação ou restauração. A comparação mostra todos os eventos afetados.</label>';
   if(d.eventType==='trade_buy'&&['restore','revert'].includes(d.action))html+=select('restoreStage','Repor vínculo a uma etapa',[[0,'Sem reposição de vínculo'],[1,'Entrada'],[2,'Primeiro reforço'],[3,'Segundo reforço']]);
  }
  html+='</div><label class="ack"><input type="checkbox" data-execution-field="alreadyRecorded" '+(d.alreadyRecorded?'checked':'')+' '+disabled+'>Confirmo os dados da execução já ocorrida ou da correção do histórico.</label><div class="quick-actions">'+button('compare-execution','Comparar antes e depois',s.busy)+button('close-execution','Fechar registo',s.busy)+'</div></section>';
 }
 if(s.snapshot&&!s.hasPending){
  const byId=new Map((s.snapshot.state?.input?.events||[]).map(event=>[event.id,event]));
  html+='<details><summary>Histórico auditável da conta · '+e(s.historyCount||0)+' registos originais</summary><p>Até 50 registos por página. Correções preservam os originais.</p>';
  for(const r of s.history||[]){const f=r.state.record.facts;html+='<details><summary>'+e(r.original.event_type)+' · '+e(r.state.active?'Ativo':'Anulado')+'</summary><p>'+e(r.original.id)+' · versão '+e(r.version)+'</p><p>Data efetiva: '+e(r.state.record.effective_at)+'</p><p>Registo original: '+e(r.original.recorded_at)+'</p><p>Quantidade: '+e(f.quantityBTC)+' · preço USD: '+e(f.priceUSD)+' · montante USD: '+e(f.amountUSD)+'</p><p>Correções: '+e(r.history.length)+'</p>';
   html+='<details><summary>Valores originais</summary><p>BTC: '+e(r.original.facts.quantityBTC)+' · preço USD: '+e(r.original.facts.priceUSD)+' · montante USD: '+e(r.original.facts.amountUSD)+'</p></details>';for(const id of r.history){const correction=byId.get(id);if(correction)html+='<p>Alteração '+e(id)+' · '+e(correction.recorded_at)+' · '+e(correction.facts.action)+' · motivo: '+e(correction.correction_reason)+'</p>';}
   if(['trade_buy','trade_sell','fee','funding'].includes(r.original.event_type))html+='<button type="button" class="secondary" data-account-action="correction" data-account-target="'+e(r.original.id)+'" '+disabled+'>Rever correção</button>';
   html+='</details>';
  }
  html+='<div class="quick-actions">'+button('history-prev','Anteriores',s.busy||!s.historyPage)+button('history-next','Seguintes',s.busy||(s.historyPage+1)*50>=s.historyCount)+'</div></details>';
 }
 return html;
}
function review(r,{e,usd,line}){
 const before=r.before,after=r.after;
 let html='<section aria-label="Revisão da execução"><h4>Execução ou correção · antes e depois</h4>';
 if(after)html+='<div class="data-grid">'+line('Saldo da carteira',usd(before.ledger.cash.walletUSD)+' → '+usd(after.ledger.cash.walletUSD))+line('Margem isolada',usd(before.ledger.cash.isolatedMarginUSD)+' → '+usd(after.ledger.cash.isolatedMarginUSD))+line('BTC aberto',before.ledger.position.quantityBTC+' → '+after.ledger.position.quantityBTC)+line('PnL bruto realizado',usd(before.ledger.pnl.realizedGrossUSD)+' → '+usd(after.ledger.pnl.realizedGrossUSD))+line('Comissões contabilizadas',usd(before.ledger.pnl.feesPaidUSD)+' → '+usd(after.ledger.pnl.feesPaidUSD))+line('Liquidação estimada',usd(before.risk?.estimatedPriceUSD)+' → '+usd(after.risk?.estimatedPriceUSD))+'</div>';
 if(r.blocking)html+='<p class="error">O motor bloqueou este registo: '+e(r.blocking.code)+'. Nada foi gravado.</p>';
 html+='<p>'+e(r.eventsToAppend?.length||0)+' eventos a acrescentar; os registos originais são preservados.</p>';
 if(r.command.kind==='trade')html+='<div class="data-grid">'+line('Ciclo',r.command.cycle)+line('Etapa',r.command.stage)+line('Nominal executado',usd(r.executionNominalUSD))+line('Data da execução',r.command.effectiveAt)+(r.command.type==='trade_sell'?line('Destino do PnL',r.command.pnlDestination==='wallet'?'Caixa':'Margem isolada'):'')+'</div>'+ '<p>Execução: '+e(r.command.quantityBTC)+' BTC a '+e(usd(r.command.priceUSD))+'. Comissão: '+e(usd(r.command.feeUSD))+'.</p><p>Quantidade solicitada: '+e(r.command.requestedQuantityBTC)+' BTC. Não executada: '+e(r.executionMetadata?.unfilledQuantityBTC)+' BTC.</p>';
 else html+='<ul>'+r.command.request.changes.map(c=>'<li>'+e(({replace:'Corrigir',void:'Anular',restore:'Restaurar',revert:'Reverter'})[c.action])+' · '+e(c.targetEventId)+' · motivo: '+e(c.reason)+(c.record?' · BTC: '+e(c.record.facts.quantityBTC)+' · preço USD: '+e(c.record.facts.priceUSD)+' · montante USD: '+e(c.record.facts.amountUSD)+' · data: '+e(c.record.effective_at):'')+'</li>').join('')+'</ul>';
 if(r.removedPlanLinks||r.restoredPlanLinks)html+='<label class="ack"><input type="checkbox" data-account-cleanup>Aceito reconciliar os vínculos ao plano: '+e(r.removedPlanLinks)+' removidos e '+e(r.restoredPlanLinks)+' repostos.</label>';
 html+='<p>Confirmar regista factos e pede revisão do plano. Não executa compras, vendas ou transferências na Kraken.</p>';
 return html;
}
return Object.freeze({forms,review});
});
