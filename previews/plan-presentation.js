/* Shared Demo/account presentation. Decimal is used for display coordinates only.
 * Amounts, lots, budgets and margin requirements come from the existing engines.
 * This module cannot write events, calculate a strategy or confirm a review. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('decimal.js'),require('./plan-view.js'));
 else root.BTCPlanPresentation=factory(root.Decimal,root.BTCPlanView);
})(typeof globalThis!=='undefined'?globalThis:this,function(Decimal,View){
'use strict';
const D=Decimal.clone({precision:80}),names=['Entrada','Primeiro reforço','Segundo reforço'];
const labels={safe:'Seguro',balanced:'Equilibrado',risky:'Arriscado'};
function profileOptions({esc:e,value,name='profile',field=null,disabled=false}){
 return '<fieldset class="profile-options"><legend>Perfil de risco</legend><div class="profiles">'+[
  ['safe','Seguro','Mais reservas e menor exposição.','40 000'],['balanced','Equilibrado','Compromisso entre exposição e reserva.','20 000'],['risky','Arriscado','Mais exposição, maior risco de perdas.','10 000']
 ].map(([v,label,description,distance])=>'<label class="profile"><input type="radio" name="'+e(name)+'" value="'+v+'" '+(field?'data-wallet-field="'+e(field)+'" ':'')+(value===v?'checked ':'')+(disabled?'disabled':'')+'><strong>'+label+'</strong><span>'+description+'</span><span>Distância de referência: '+distance+' USD</span></label>').join('')+'</div><p class="legend">Estas distâncias orientam o plano. Nenhum perfil garante ganhos ou evita liquidação.</p></fieldset>';
}
function create({esc:e,money:m,stat,line,warning}){
 const positive=v=>v!==undefined&&v!==null&&new D(v).gt(0);
 const usd=v=>v===null||v===undefined?'—':m(v);
 const btc=v=>v===null||v===undefined?'—':new D(v).toFixed(8)+' BTC';
 function stageState(entry){
  if(entry.state!=='active')return entry.state==='cancelled'?'Etapa cancelada':'Etapa fechada';
  if(positive(entry.overrunUSD))return 'Acima do orçamento · rever';
  if(entry.pendingQuantityBTC!==undefined&&!positive(entry.pendingQuantityBTC))return 'Orçamento da etapa preenchido';
  return positive(entry.executedQuantityBTC)||entry.fillEventIds?.length?'Execução parcial · rever restante':'Planeada';
 }
 function ordersFromCycles(cycles){
  return (cycles||[]).flatMap(c=>c.entries.filter(x=>x.state==='active'&&positive(x.pendingQuantityBTC)).map(x=>({
   key:c.cycle+':'+x.stage,cycle:c.cycle,stage:x.stage,priceUSD:x.priceUSD,nominalUSD:x.pendingNominalUSD,quantityBTC:x.pendingQuantityBTC
  })));
 }
 function timeline(selected,reference,{limit=Infinity}={}){
  const rows=!selected?[]:positive(reference)?View.timeline(selected,reference):(selected.orders||[]).map(o=>({...o,label:names[o.stage-1],dropPercent:null})).sort((a,b)=>new D(b.priceUSD).cmp(a.priceUSD));
  if(!rows.length)return '<p class="legend">Sem compras pendentes neste plano.</p>';
  const item=(o,i)=>'<li><div class="order-top"><strong>'+e(i+1)+'. '+e(o.label)+' · Ciclo '+e(o.cycle.slice(6))+'</strong><span>'+e(o.dropPercent===null?'Referência não fornecida':new D(o.dropPercent).eq(0)?'Na referência escolhida':new D(o.dropPercent).lt(0)?'Acima da referência guardada':'↓ '+o.dropPercent.replace('.',',')+'% da referência')+'</span></div><div class="order-price">BTC a '+e(m(o.priceUSD))+'</div>'+line('Compra nominal executável',usd(o.nominalUSD))+(o.additionalMarginUSD===undefined?'':line('Margem adicional prevista nesta etapa',usd(o.additionalMarginUSD)))+'<small>'+e(btc(o.quantityBTC))+' · Sem execução automática</small></li>';
  const shown=rows.slice(0,limit).map(item).join(''),rest=rows.slice(limit);
  return '<ol class="buy-timeline" data-plan-timeline>'+shown+'</ol>'+(rest.length?'<details class="detail"><summary>Ver as restantes '+e(rest.length)+' compras planeadas</summary><ol class="buy-timeline" start="'+e(limit+1)+'">'+rest.map((o,i)=>item(o,i+limit)).join('')+'</ol></details>':'');
 }
 function cycleCard(c){
  return '<article class="cycle" data-plan-cycle="'+e(c.cycle)+'"><div class="cycle-head"><strong>Ciclo '+e(c.cycle.slice(6))+'</strong><small>Orçamento nominal · '+e(usd(c.nominalBudgetUSD))+'</small></div><div class="buys">'+c.entries.map(x=>'<div class="buy"><small>'+e([20,30,50][x.stage-1])+'% · '+e(names[x.stage-1])+'</small><small>Nominal pendente</small><strong>'+e(usd(x.pendingNominalUSD))+'</strong><em>Preço BTC: '+e(usd(x.priceUSD))+'</em><small>Orçamento: '+e(usd(x.allocatedNominalUSD))+'</small><small>Registado: '+e(usd(x.executedNominalUSD))+'</small><span class="stage-state">'+e(stageState(x))+'</span></div>').join('')+'</div></article>';
 }
 function keyTable(cycles){
  if(!cycles?.length)return '';
  return '<div class="table-scroll" role="region" aria-label="Tabela Chaves dos ciclos" tabindex="0"><table class="plan-table"><caption>Tabela Chaves · plano e execuções</caption><thead><tr><th scope="col">Ciclo / compra</th><th scope="col">Preço BTC</th><th scope="col">Orçamento nominal</th><th scope="col">Nominal pendente</th><th scope="col">Nominal registado</th><th scope="col">BTC pendente</th><th scope="col">Estado</th></tr></thead><tbody>'+cycles.flatMap(c=>c.entries.map(x=>'<tr><th scope="row">Ciclo '+e(c.cycle.slice(6))+' · '+e([20,30,50][x.stage-1])+'%<small>'+e(names[x.stage-1])+'</small></th><td>'+e(usd(x.priceUSD))+'</td><td>'+e(usd(x.allocatedNominalUSD))+'</td><td>'+e(usd(x.pendingNominalUSD))+'</td><td>'+e(usd(x.executedNominalUSD))+'</td><td>'+e(btc(x.pendingQuantityBTC))+'</td><td>'+e(stageState(x))+'</td></tr>')).join('')+'</tbody></table></div>';
 }
 function distribution(cycles){
  if(!cycles?.length)return '<p class="legend">Sem ciclos neste plano.</p>';
  return '<div class="plan-distribution">'+cycles.slice(0,1).map(cycleCard).join('')+(cycles.length>1?'<details class="detail"><summary>Ver os outros '+e(cycles.length-1)+' ciclos</summary>'+cycles.slice(1).map(cycleCard).join('')+'</details>':'')+'</div><details class="detail"><summary>Abrir Tabela Chaves · todos os ciclos</summary>'+keyTable(cycles)+'</details>';
 }
 function levelMap({cycles=[],referenceUSD,floorUSD}){
  if(!cycles.length||!positive(referenceUSD)||!positive(floorUSD))return '';
  const prices=cycles.flatMap(c=>c.entries.map(x=>new D(x.priceUSD))),hi=D.max(referenceUSD,floorUSD,...prices),lo=D.min(referenceUSD,floorUSD,...prices),range=hi.sub(lo),span=range.eq(0)?new D(1):range;
  // Only SVG coordinates use Number. No coordinate is returned to a calculator.
  const x=v=>80+Number(hi.sub(v).div(span).mul(590)),height=84+cycles.length*44;
  const marker=(v,kind,label)=>'<line class="map-'+kind+'" x1="'+x(v).toFixed(2)+'" x2="'+x(v).toFixed(2)+'" y1="34" y2="'+(height-26)+'"/><text class="map-label map-'+kind+'" x="'+x(v).toFixed(2)+'" y="18" text-anchor="'+(x(v)>560?'end':x(v)<180?'start':'middle')+'">'+e(label)+'</text>';
  return '<figure class="level-map" data-plan-map><figcaption><strong>Mapa das compras em descida</strong><span>Níveis do plano · sem escala de tempo</span></figcaption><div class="map-scroll" role="region" aria-label="Mapa dos níveis por ciclo" tabindex="0"><svg viewBox="0 0 740 '+height+'" role="img" aria-label="Referência, piso e três compras por ciclo. Os valores exatos estão na Tabela Chaves.">'+marker(referenceUSD,'reference','Referência')+marker(floorUSD,'floor','Piso')+cycles.map((c,i)=>{
   const y=50+i*44;return '<text x="8" y="'+(y+5)+'" class="map-label">Ciclo '+e(c.cycle.slice(6))+'</text><line class="map-row" x1="80" x2="670" y1="'+y+'" y2="'+y+'"/>'+c.entries.map(v=>'<circle class="map-stage stage-'+e(v.stage)+(v.state!=='active'||v.pendingQuantityBTC!==undefined&&!positive(v.pendingQuantityBTC)?' stage-complete':'')+'" cx="'+x(v.priceUSD).toFixed(2)+'" cy="'+y+'" r="7"><title>'+e('Ciclo '+c.cycle.slice(6)+' · '+names[v.stage-1]+' · '+m(v.priceUSD)+' · '+stageState(v))+'</title></circle>').join('');
  }).join('')+'<text class="map-label" x="80" y="'+(height-6)+'">'+e(m(hi.toFixed()))+'</text><text class="map-label" x="670" y="'+(height-6)+'" text-anchor="end">'+e(m(lo.toFixed()))+'</text></svg></div><div class="chart-legend"><span class="legend-stage-1">20% · Entrada</span><span class="legend-stage-2">30% · Primeiro reforço</span><span class="legend-stage-3">50% · Segundo reforço</span><span>○ Preenchida / fechada</span></div><p class="legend">O piso é o cenário preservado. Não é um stop nem uma garantia de liquidação. Um gap pode saltar níveis.</p></figure>';
 }
 function capital(ledger){
  if(!ledger)return '';
  const c=ledger.cash,items=[['Caixa livre',c.spendableUSD,'free'],['Reserva para ordens',c.reservedOrdersUSD,'orders'],['Reserva para margem',c.reservedMarginUSD,'margin'],['Reserva protegida',c.protectedUSD,'protected'],['Margem atribuída',c.isolatedMarginUSD,'assigned']];
  const values=items.map(x=>new D(x[1])),total=values.reduce((s,n)=>s.add(n),new D(0)),drawable=values.every(x=>x.gte(0))&&total.gt(0);
  return '<section class="surface capital-chart" data-capital-chart><h3>Onde está o capital</h3><p>As reservas fazem parte da caixa. A margem atribuída já está na posição.</p>'+(drawable?'<div class="capital-bar" role="img" aria-label="Repartição da caixa e margem registadas">'+items.map((x,i)=>values[i].gt(0)?'<span class="capital-'+x[2]+'" style="width:'+values[i].div(total).mul(100).toFixed(4)+'%" title="'+e(x[0]+': '+m(x[1]))+'"></span>':'').join('')+'</div>':'<p class="legend">Há saldos negativos ou capital nulo. Consulta os valores antes de rever o plano.</p>')+'<dl class="capital-key">'+items.map(x=>'<div><dt><i class="capital-'+x[2]+'" aria-hidden="true"></i>'+e(x[0])+'</dt><dd>'+e(m(x[1]))+'</dd></div>').join('')+'</dl></section>';
 }
 function demoModel(r){return {plan:r.candidatePlan,selected:r.profile.cycles.selected,cycles:r.profile.cycles,summary:r.summary,markPriceUSD:r.context.valuation.markPriceUSD,profileLabel:r.profile.label,policyVersion:r.profile.policyVersion,valuationAsOf:r.context.valuation.asOf,synthetic:r.context.valuation.kind==='synthetic'};}
 function accountModel(r,snapshot){
  const result=r.result||{},cycles=result.cycles||result,selected=cycles.selected,ledger=snapshot?.dashboard?.ledger,config=r.candidatePlan.configuration||{};
  // Recorded cash/quantity are tied to the reviewed head. A changed head must
  // never be silently mixed into an immutable proposal's display.
  const sameHead=String(snapshot?.revision)===String(r.baseRevision),l=sameHead?ledger:null;
  return {plan:r.candidatePlan,selected,cycles,markPriceUSD:result.valuation?.markPriceUSD||config.profileValuation?.markPriceUSD,profileLabel:labels[r.candidatePlan.profile]||r.candidatePlan.profile,policyVersion:result.policyVersion||config.profilePolicyVersion,synthetic:result.valuation?.kind==='synthetic',valuationAsOf:sameHead?snapshot?.dashboard?.asOf:null,summary:{
   capitalUSD:result.capitalBasisUSD??l?.capital.netContributedUSD,walletUSD:l?.cash.walletUSD,isolatedMarginUSD:l?.cash.isolatedMarginUSD,
   totalActiveCycles:cycles.totalActiveCycles??selected?.cycles?.length,newCycleCount:cycles.newCycleCount,
   plannedAdditionalMarginUSD:selected?.additionalMarginUSD,uncommittedAfterPlanUSD:selected?.uncommittedAfterFullPlanUSD,
   actualQuantityBTC:l?.position.quantityBTC,actualNotionalUSD:l?.position.markNotionalUSD,estimatedLiquidationUSD:sameHead?snapshot?.dashboard?.risk?.estimatedPriceUSD:undefined,protectedCashUSD:result.cyclePolicy?.protectedCashUSD??config.cycleReservationBasis?.protectedCashUSD,
   fundingReserveUSD:result.cyclePolicy?.fundingReserveUSD??config.cycleReservationBasis?.fundingReserveUSD,
   openingFeeReserveUSD:selected?.openingFeesUSD,closingFeeReserveUSD:selected?.closingFeeReserveUSD,plannedFinalNominalUSD:selected?.finalBasisUSD,horizonDays:config.horizonDays,
   protectionFloorUSD:r.candidatePlan.protectionFloorUSD,referencePriceUSD:r.candidatePlan.referencePriceUSD
  }};
 }
 function proposal(model){
  const {summary:s,selected,plan}=model,reference=model.markPriceUSD||plan.referencePriceUSD;
  return '<div class="plan-presentation" data-plan-presentation="proposal"><span class="mode-label">'+e(model.profileLabel)+' · proposta por confirmar</span><div class="example"><small>PREÇO DE PARTIDA DESTE CÁLCULO</small><strong>'+e(usd(reference))+'</strong><p class="legend">Referência guardada: '+e(usd(plan.referencePriceUSD))+' · Piso do cenário: '+e(usd(plan.protectionFloorUSD))+'. Os níveis não acompanham o mercado automaticamente.</p></div><div class="stats">'+stat('Capital contabilístico',usd(s.capitalUSD))+stat('Carteira · saldo atual',usd(s.walletUSD))+stat('Margem isolada · já atribuída',usd(s.isolatedMarginUSD))+stat('Ciclos previstos no plano',String(s.totalActiveCycles??'—'),true)+stat('Margem adicional · planeada',usd(s.plannedAdditionalMarginUSD),true)+stat('Livre após reservas do plano',usd(s.uncommittedAfterPlanUSD),true)+'</div>'+levelMap({cycles:selected?.cycles,referenceUSD:plan.referencePriceUSD,floorUSD:plan.protectionFloorUSD})+'<h3 class="section-title">Se o BTC descer: ordem das compras planeadas</h3><p class="legend">Os ciclos decorrem em paralelo. As compras aparecem do preço mais alto para o mais baixo; preços iguais podem atingir várias etapas.</p>'+(positive(selected?.initialAddition)?warning('Antes de novas compras, o plano prevê adicionar '+m(selected.initialAddition)+' à margem da posição existente. Ainda não foi realizado.'):'')+timeline(selected,reference,{limit:3})+'<details class="detail"><summary>Ver posição atual, custos e reservas</summary><div class="data-grid">'+line('Quantidade realmente aberta',btc(s.actualQuantityBTC))+line('Exposição realmente aberta · avaliação',usd(s.actualNotionalUSD))+line('Liquidação estimada · avaliação',s.actualQuantityBTC==='0'?'Sem posição aberta':usd(s.estimatedLiquidationUSD))+line('Data desta avaliação da posição',model.valuationAsOf||'Indisponível')+line('Piso do cenário',usd(s.protectionFloorUSD))+line('Reserva de segurança do perfil',usd(s.protectedCashUSD))+line('Reserva de funding assumida',usd(s.fundingReserveUSD))+line('Custos de abertura previstos',usd(s.openingFeeReserveUSD))+line('Reserva de comissões de fecho',usd(s.closingFeeReserveUSD))+line('Exposição nominal planeada completa',usd(s.plannedFinalNominalUSD))+line('Horizonte declarado',s.horizonDays===undefined?'—':s.horizonDays+' dias')+'</div></details><details class="detail"><summary>Ver distribuição 20 / 30 / 50 por ciclo</summary>'+distribution(selected?.cycles)+'</details><p class="legend">O orçamento nominal, o lote executável e a margem são valores diferentes. Os lotes podem deixar um remanescente. Política '+e(model.policyVersion||'do plano')+'.</p>'+warning('Confirmar guarda o plano e as suas reservas. Não compra BTC nem transfere margem. O piso não garante proteção.')+'</div>';
 }
 function history(plans){return '<div class="surface"><details><summary>Configurações anteriores do plano ('+plans.length+')</summary><p class="legend">Parâmetros guardados de versões anteriores. Não representam um relatório de PnL histórico.</p>'+plans.map(p=>'<div class="data-grid">'+line('Versão',p.version)+line('Perfil',({safe:'Seguro',balanced:'Equilibrado',risky:'Arriscado'})[p.profile]||p.profile)+line('Referência BTC',usd(p.referencePriceUSD))+line('Piso do cenário',usd(p.protectionFloorUSD))+'</div>').join('')+'</details></div>';}
 function saved(snapshot){
  const plan=snapshot.plan,cycles=snapshot.cycles||[],orders=ordersFromCycles(cycles);
  return '<div class="plan-presentation" data-plan-presentation="saved">'+levelMap({cycles,referenceUSD:plan.referencePriceUSD,floorUSD:plan.protectionFloorUSD})+'<h3 class="section-title">Se o BTC descer: compras pendentes do plano guardado</h3>'+timeline({orders},plan.referencePriceUSD,{limit:3})+'<p class="legend">Montantes pendentes do plano guardado. A margem adicional por etapa exige um novo cálculo e revisão após movimentos.</p><h3 class="section-title">Distribuição 20 / 30 / 50 por ciclo</h3>'+distribution(cycles)+'</div>';
 }
 return Object.freeze({history,timeline,cycleCard,levelMap,capital,keyTable,distribution,demoModel,accountModel,proposal,saved,ordersFromCycles});
}
return Object.freeze({create,profileOptions});
});
