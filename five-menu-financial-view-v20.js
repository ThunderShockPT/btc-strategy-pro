/* BTC Strategy Pro R5.2: safe bindings for the approved five-menu Demo layout.
 * Renders ONLY the shared read-only projection; never copies the old Demo ledger
 * into an authenticated account. Nothing is written to Supabase or Kraken.
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.BTCFiveMenuFinancialViewV20=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const fields=['freeCashUSD','isolatedMarginUSD','unrealizedPnLUSD','positionQuantityBTC','revision','planVersion','quoteStatus','riskStatus','projectShort'];
 const numeric=/^-?(0|[1-9]\d*)(\.\d+)?$/;
 const fmt=(s,unit='USD')=>{
  if(typeof s!=='string'||!numeric.test(s))return '—';
  const [whole,frac='']=s.split('.');
  const neg=whole.startsWith('-'),digits=neg?whole.slice(1):whole;
  const grouped=digits.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  return (neg?'−':'')+grouped+(frac?','+frac.slice(0,6):'')+(unit?' '+unit:'');
 };
 function create({bridge,root=typeof document!=='undefined'?document:null}={}){
  if(!bridge||typeof bridge.subscribe!=='function'||typeof bridge.state!=='function'||!root||typeof root.querySelectorAll!=='function')throw Error('R52_VIEW_DEPENDENCY_REQUIRED');
  let closed=false,lastStatus='initializing',unsubscribe=null,busy=false;
  function set(field,value){
   for(const element of root.querySelectorAll('[data-r52-field="'+field+'"]'))element.textContent=value;
  }
  function render(snapshot){
   if(closed)return;
   const data=snapshot?.projection;
   const available=!!data&&snapshot.authenticated===true&&['ready','bookkeeping-only'].includes(snapshot.phase);
   if(!available){
    for(const field of fields)set(field,'—');
    const labels={unavailable:'Acesso financeiro ainda não aprovado.','signed-out':'Sem sessão autenticada.',blocked:'Não foi possível confirmar os saldos.','loading-wallets':'A consultar carteiras…',loading:'A validar dados da carteira…','wallet-selection-required':'Seleciona uma carteira para consultar os saldos.','switching-wallet':'A mudar de carteira…'};
    lastStatus=labels[snapshot?.phase]||'Sem dados autenticados verificados.';
    set('status',lastStatus);
   }else{
    const f=data.financial||{},s=data.shared||{},p=data.plan||{};
    set('freeCashUSD',fmt(f.freeCashUSD));set('isolatedMarginUSD',fmt(f.isolatedMarginUSD));
    set('unrealizedPnLUSD',fmt(f.unrealizedPnLUSD));
    set('positionQuantityBTC',fmt(f.positionQuantityBTC,'BTC'));
    set('revision',String(s.revision||'—'));
    set('planVersion',String(p.version||'—'));
    set('quoteStatus',s.quoteCurrent&&s.rulesCurrent?'Histórico verificado — sem aprovação de negociação':'Mercado ou regras desatualizados');
    set('riskStatus','Não certificado para negociar');
    set('projectShort',typeof s.projectId==='string'?s.projectId.slice(0,8)+'…':'—');
    lastStatus=snapshot.phase==='bookkeeping-only'?'Caixa do diário V20 autenticado · regras de mercado antigas':'Caixa do diário V20 autenticado · apenas leitura';
    set('status',lastStatus);
   }
   const select=root.querySelector('[data-r52-wallet-select]');
   if(select){
    const saved=select.value;while(select.options.length)select.remove(0);
    const placeholder=root.createElement?root.createElement('option'):select.ownerDocument.createElement('option');
    placeholder.value='';placeholder.textContent='Selecionar carteira';select.add(placeholder);
    for(const w of snapshot?.availableWallets||[]){
      const opt=select.ownerDocument.createElement('option');opt.value=w.projectId;opt.textContent=w.title||'Carteira';select.add(opt);
    }
    const chosen=snapshot?.selectedProjectId;
    select.value=chosen&&[...select.options].some(x=>x.value===chosen)?chosen:'';
    if(!select.value&&saved&&[...select.options].some(x=>x.value===saved))select.value=saved;
    select.disabled=!snapshot?.authenticated||busy;
   }
  }
  async function withBusy(fn){
   if(busy)return;
   busy=true;try{await fn();}catch(e){set('status','Falha ao confirmar dados. Não usar os saldos anteriores.');}
   finally{busy=false;render(bridge.state());}
  }
  const unbind=[];
  function on(selector,event,fn){for(const node of root.querySelectorAll(selector)){node.addEventListener(event,fn);unbind.push(()=>node.removeEventListener(event,fn));}}
  on('[data-r52-wallet-select]','change',e=>{
   const id=e.target.value;if(!id)return;
   withBusy(()=>bridge.selectWallet(id));
  });
  on('[data-r52-action="wallets"]','click',()=>withBusy(()=>bridge.listWallets()));
  on('[data-r52-action="refresh"]','click',()=>withBusy(()=>bridge.refresh()));
  on('[data-r52-action="signout"]','click',()=>withBusy(()=>bridge.signOut()));
  on('[data-r52-login]','submit',e=>{
   e.preventDefault();const form=e.currentTarget;
   const email=form.querySelector('[name="email"]')?.value||'',passwordInput=form.querySelector('[name="password"]');
   const password=passwordInput?.value||'';if(passwordInput)passwordInput.value='';
   withBusy(()=>bridge.signIn({email,password}));
  });
  unsubscribe=bridge.subscribe(render);
  return Object.freeze({render:()=>render(bridge.state()),dispose(){if(closed)return;closed=true;unsubscribe?.();for(const fn of unbind)fn();}});
 }
 return Object.freeze({create});
});