/* BTC Strategy Pro · v19 — first-entry strategy guide and wallet setup.
 * Runs on first verified login; optionally in a fresh Demo project. Never trades.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const currency=v=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(v);
let visible=false,step=1,accepted=false,preview=null,origin='',previousOverflow='',previousFocus=null,draft=null;
function workspace(){return window.BTCBlock7}
function active(){return workspace()?.active?.()}
function alreadyConfigured(){return active()?.snapshot?.onboarding?.version>=1}
function hasUserActivity(){
 const p=active();return !!p?.snapshot?.ledger?.ledger?.some(e=>!e.seed&&!e.voided);
}
function ensureRoot(){
 let el=$('btcOnboarding');
 if(!el){el=document.createElement('div');el.id='btcOnboarding';el.hidden=true;el.setAttribute('role','presentation');document.body.append(el);}
 return el;
}
function setup(){
 const p=active(),state=window.BTCPro?.state?.();
 const ref=state?.current||82000;
 const existing=p?.snapshot?.onboarding;
 return {capital:Number(p?.capital)||2000,protectPrice:existing?.protectPrice||Math.round(ref*.70/100)*100};
}
function present(){
 const el=ensureRoot();el.hidden=false;visible=true;
 previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;
 document.body.style.overflow='hidden';
 render();
}
function close(){
 const el=$('btcOnboarding');if(el)el.hidden=true;
 visible=false;document.body.style.overflow=previousOverflow;
 if(previousFocus?.isConnected)previousFocus.focus();
}
function open({force=false,initialStep=1,source='settings'}={}){
 if(visible)return;
 if(!workspace()?.active?.()||!window.BTCWalletPlanner)return;
 if(!force&&(alreadyConfigured()||(source==='demo'&&hasUserActivity())))return;
 if(source==='account'&&!workspace()?.accountSession?.().authenticated)return;
 origin=source;
 const configured=alreadyConfigured();
 step=initialStep===2&&configured?2:1;
 accepted=configured;
 draft=setup();preview=null;
 present();
}
function maybeForDemo(){
 if(!workspace()?.active?.())return;
 if(workspace()?.accountSession?.().authenticated)return;
 open({source:'demo'});
}
function maybeForAccount(){
 if(!workspace()?.accountSession?.().authenticated)return;
 open({source:'account'});
}
function title(heading,desc){
 return '<div class="bo-top"><span class="bo-step">PRIMEIROS PASSOS · '+step+' DE 2</span><button id="boLater" type="button" class="bo-close" aria-label="Continuar mais tarde">Agora não</button></div><div class="bo-body"><h2 id="boTitle">'+heading+'</h2><p class="bo-lead">'+desc+'</p>';
}
function render(){
 if(!visible)return;
 const el=ensureRoot();
 if(step===1){
  el.innerHTML='<div class="bo-card" role="dialog" aria-modal="true" aria-labelledby="boTitle" aria-describedby="boDescription">'+
  title('Como funciona a estratégia?','<span id="boDescription">Um guia rápido antes de configurares a tua carteira. Bastam dois passos.</span>')+
  '<div class="bo-list">'+
   '<article><i aria-hidden="true">①</i><div><strong>5 estratégias · A a E</strong><span>Cada ciclo tem uma compra de 20% e dois reforços de 30% e 50%. São parcelas do orçamento <em>desse ciclo</em>, não de toda a carteira.</span></div></article>'+
   '<article><i aria-hidden="true">▣</i><div><strong>Caixa é a tua reserva</strong><span>É o capital que defines para o projeto. Nem tudo deve ficar comprometido: uma parte permanece fora da margem de simulação.</span></div></article>'+
   '<article><i aria-hidden="true">⚠</i><div><strong>Liquidação e margem</strong><span>Com alavancagem, uma descida do BTC pode consumir a garantia e causar liquidação antes de uma recuperação. Taxas e funding também contam.</span></div></article>'+
  '</div>'+
  '<div class="bo-warning"><strong>Importante:</strong> o teu preço de proteção é um limite para testar cenários, não uma ordem stop nem uma garantia. A liquidação real depende da corretora, do tipo de margem e das posições. Aqui tudo é simulado.</div>'+
  '<label class="bo-agree"><input id="boAccept" type="checkbox"><span>Li e compreendi o funcionamento e o risco da estratégia e aceito os <a href="./termos-demo.html" target="_blank" rel="noopener noreferrer">Termos da Demo</a> e a <a href="./privacidade.html" target="_blank" rel="noopener noreferrer">informação de privacidade</a>.</span></label>'+
  '<div class="bo-actions"><button class="bo-btn" id="boDismiss" type="button">Continuar mais tarde</button><button class="bo-btn primary" id="boNext" type="button" disabled>Compreendi · Configurar carteira →</button></div></div></div>';
  $('boAccept').checked=accepted;
  $('boAccept').addEventListener('change',e=>{accepted=e.target.checked;$('boNext').disabled=!accepted});
  $('boNext').disabled=!accepted;
  $('boNext').onclick=()=>{if(!accepted)return;step=2;render()};
  $('boDismiss').onclick=close;
 }else{
  el.innerHTML='<div class="bo-card" role="dialog" aria-modal="true" aria-labelledby="boTitle">'+
  title('Configura a tua carteira','Introduz a tua caixa inicial e o preço até ao qual queres testar a resistência da estratégia. Os valores de compra são calculados automaticamente.')+
  '<div class="bo-controls">'+
    '<div class="bo-field"><label for="boCapital">Caixa inicial (USD)</label><input id="boCapital" type="number" inputmode="decimal" step="100" min="100" max="1000000000" required><small>Capital do projeto, não saldo numa corretora.</small></div>'+
    '<div class="bo-field"><label for="boProtect">Preço BTC de proteção (USD)</label><input id="boProtect" type="number" inputmode="decimal" step="100" min="1000" max="250000" required><small>Preço de stress que gostarias de suportar, não liquidação garantida.</small></div>'+
  '</div>'+
  '<div class="bo-preview" id="boPreview" aria-live="polite"></div>'+
  '<div class="bo-warning">O cálculo considera os <strong>5 ciclos completos</strong>, margem isolada simulada, reserva de 30% da caixa e folga adicional. Mesmo assim pode haver perdas totais da margem, gaps e liquidação numa corretora real.</div>'+
  '<div class="bo-actions"><button class="bo-btn" id="boBack" type="button">← Voltar</button><button class="bo-btn primary" id="boFinish" type="button">Guardar configuração</button></div></div></div>';
  $('boCapital').value=draft.capital;$('boProtect').value=draft.protectPrice;
  $('boCapital').addEventListener('input',recalculate);
  $('boProtect').addEventListener('input',recalculate);
  $('boBack').onclick=()=>{draft.capital=Number($('boCapital').value);draft.protectPrice=Number($('boProtect').value);step=1;render()};
  $('boFinish').onclick=finish;
  recalculate();
 }
 $('boLater').onclick=close;
 const first=el.querySelector('#boAccept, #boCapital, #boLater');
 if(first)first.focus({preventScroll:true});
}
function recalculate(){
 const out=$('boPreview');if(!out)return;
 draft.capital=Number($('boCapital').value);draft.protectPrice=Number($('boProtect').value);
 const s=window.BTCPro.state(),cfg=window.BTCPro.settings();
 const entries='ABCDE'.split('').map(id=>s.sets.descida[id].entry);
 try{
  preview=window.BTCWalletPlanner.estimate({
   capital:draft.capital,protectPrice:draft.protectPrice,referencePrice:s.current,
   entries,gap:cfg.gap,entryFeeRate:cfg.fee,
   marginShare:.70,safetyShare:.30,maintenanceRate:.05,
   exitFeeRate:.0005,funding8h:.0001,days:14,maxExposureMultiple:2.5
  });
  $('boFinish').disabled=!preview.safeUnderAssumptions;
  const a=preview.amounts;
  out.innerHTML='<div class="bo-plan-row"><span class="bo-plan-title">Compras sugeridas por ciclo A–E</span><strong>'+currency(preview.perCycle)+'</strong></div>'+
    '<div class="bo-allocs"><div class="bo-alloc"><small>20% · Entrada</small><strong>'+currency(a[0])+'</strong></div><div class="bo-alloc"><small>30% · Reforço</small><strong>'+currency(a[1])+'</strong></div><div class="bo-alloc"><small>50% · Reforço</small><strong>'+currency(a[2])+'</strong></div></div>'+
    '<div class="bo-summary"><div><small>Exposição se os 5 ciclos forem completos</small><strong>'+currency(preview.nominalTotal)+'</strong></div><div><small>Margem simulada (70% da caixa)</small><strong>'+currency(preview.margin)+'</strong></div><div><small>Caixa fora da margem (30%)</small><strong>'+currency(preview.reserve)+'</strong></div><div><small>Folga estimada ao preço de proteção</small><strong>'+currency(preview.bufferAtProtection)+'</strong></div></div>'+
    '<p class="bo-alert">Alavancagem efetiva hipotética: '+preview.leverageEquivalent.toFixed(2).replace('.',',')+'×. Montantes em USD nominais, repetidos nos 5 ciclos. Não é uma previsão do preço nem uma garantia contra liquidação.</p>';
 }catch(e){preview=null;$('boFinish').disabled=true;out.innerHTML='<p class="bo-error">'+String(e?.message||'Corrige os valores indicados.')+'</p>'}
}
function finish(){
 if(!accepted||!preview||!preview.safeUnderAssumptions)return;
 const api=workspace();
 try{
  if(!api?.completeOnboarding)throw Error('Configuração indisponível.');
  api.completeOnboarding({...preview,acceptedAt:new Date().toISOString()});
  close();
  window.BTCPro?.message?.('Carteira configurada. Podes alterar os valores em Conta → Configurar carteira.');
 }catch(e){const node=$('boPreview');if(node)node.insertAdjacentHTML('beforeend','<p class="bo-error">Não foi possível guardar. Verifica os dados ou exporta um backup.</p>')}
}
function keyHandler(e){
 if(!visible)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return}
 if(e.key==='Tab'){
  const els=[...$('btcOnboarding').querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')].filter(v=>v.getClientRects().length);
  if(!els.length)return;
  if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus()}
  else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus()}
 }
}
function init(){
 ensureRoot();
 document.addEventListener('keydown',keyHandler,true);
 window.addEventListener('btc-demo-entered',()=>setTimeout(maybeForDemo,0));
 window.addEventListener('btc-auth-session-changed',e=>{if(e?.detail?.authenticated)setTimeout(maybeForAccount,0);});
 if(workspace()?.accountSession?.().authenticated)maybeForAccount();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.BTCOnboarding={open,close,get isOpen(){return visible}};
})();