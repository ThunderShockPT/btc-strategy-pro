/* BTC Strategy Pro R5.4: same authenticated V20 revision in five menus.
 Demo historical financial figures are hidden in account mode, not relabelled as real.
 No direct writes, policy changes, orders, credentials or migrations.
*/
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();
else root.BTCUnifiedFiveMenusV20=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VIEWS={inicio:'homeView',estrategias:'strategiesView',mercado:'terminalView',risco:'riskView',conta:'accountView',registos:'journalView'};
const RX=/^-?(0|[1-9]\d{0,19})(\.\d{1,24})?$/, REV=/^(0|[1-9]\d{0,19})$/, SHA=/^[a-f0-9]{64}$/i,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const copy=o=>JSON.parse(JSON.stringify(o));
function err(code){const x=new Error(code);x.code=code;throw x;}
function format(value,unit='USD'){if(typeof value!=='string'||!RX.test(value))return '—';
const minus=value.startsWith('-'),parts=(minus?value.slice(1):value).split('.');
return (minus?'−':'')+parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+(parts[1]?','+parts[1].slice(0,8):'')+(unit?' '+unit:'');}
function empty(status,warning){return {status,source:'NONE',projectId:null,revision:null,headHash:null,values:null,menu:null,history:[],warning,canTrade:false,canWrite:false};}
function project(a,j){
const p=a?.projection,s=p?.shared;
const basis=!!(a?.authenticated&&a.connected&&p&&s&&s.ownerScoped===true&&UUID.test(s.projectId)
&&REV.test(s.revision)&&SHA.test(s.headHash)&&a.selectedProjectId===s.projectId&&p.financial&&p.plan
&&['ready','bookkeeping-only'].includes(a.phase));
if(!basis)return empty('locked','Sem carteira autenticada e verificada. Os valores da Demo não são dados reais.');
if(!(j?.source==='V20_AUTHENTICATED_EVENT_JOURNAL'&&j.selectedProjectId===s.projectId
 &&j.revision===s.revision&&j.sourceHeadHash===s.headHash&&!j.needsReconciliation
 &&!['signed-out','session-changed','refresh-required','commit-uncertain','error'].includes(j.phase)))
 return empty('revision-mismatch','Diário e carteira têm revisões diferentes. Atualiza; saldos anteriores ocultados.');
const f=p.financial,needed=['freeCashUSD','isolatedMarginUSD','positionQuantityBTC','unrealizedPnLUSD','isolatedEquityUSD','walletUSD','protectedCashUSD'];
if(needed.some(k=>typeof f[k]!=='string'||!RX.test(f[k]))||
 ['freeCashUSD','isolatedMarginUSD','walletUSD','protectedCashUSD'].some(k=>f[k].startsWith('-')))
 return empty('invalid-financial-data','Os valores do diário falharam na verificação. Não mostrar dados antigos.');
const val={cash:format(f.freeCashUSD),margin:format(f.isolatedMarginUSD),wallet:format(f.walletUSD),
 btc:format(f.positionQuantityBTC,'BTC'),equity:format(f.isolatedEquityUSD),pnl:format(f.unrealizedPnLUSD),
 project:s.projectId.slice(0,8)+'…',revision:s.revision,profile:p.plan.profile||'—',
 floor:typeof p.plan.riskFloorUSD==='string'?format(p.plan.riskFloorUSD):'—',
 version:p.plan.version||'—',asOf:s.valuationAsOf||'—',
 market:s.quoteCurrent&&s.rulesCurrent?'Fotografia revista; negociação não autorizada':'Regras ou cotação desatualizadas'};
const menu={
 inicio:{title:'Caixa livre estimada',main:val.cash,description:'Do diário autenticado; não equivale ao poder de compra oficial Kraken'},
 estrategias:{title:'Plano guardado',main:val.profile,description:'Versão '+val.version+' · piso '+val.floor+' · sem aprovação automática'},
 mercado:{title:'Mercado',main:val.market,description:'Fotografia '+val.asOf+' · sem preços Kraken em direto'},
 risco:{title:'Equity isolada',main:val.equity,description:'PnL não realizado '+val.pnl+' · sem garantia de liquidação'},
 conta:{title:'Carteira autenticada',main:val.project,description:'Revisão '+val.revision+' · saldo '+val.wallet},
 registos:{title:'Diário auditável',main:String(j.historyCount??0)+' eventos',description:'Correções preservam original; confirmação explícita'}};
const history=(Array.isArray(j.history)?j.history:[]).slice(0,20).map(row=>{
const record=row?.state?.record||row?.original||{},fact=record.facts||{};
return {type:String(record.event_type||row?.original?.event_type||'movimento').slice(0,40),
 amount:typeof fact.amountUSD==='string'?format(fact.amountUSD):
 typeof fact.quantityBTC==='string'?format(fact.quantityBTC,'BTC'):'—',
 date:String(record.effective_at||'').slice(0,19)||'—',status:row?.state?.active===false?'Anulado':'Registado'};});
return {status:'ready',source:'V20_AUTHENTICATED_SHARED_SNAPSHOT',projectId:s.projectId,
 revision:s.revision,headHash:s.headHash,values:val,menu,history,
 warning:'Dados do diário V20. Regra Kraken histórica; não autoriza negociação.',canTrade:false,canWrite:false};
}
function create({bridge,journal,document:doc=typeof document==='undefined'?null:document,onOpenReview=null}={}){
if(!bridge||!journal||!['state','subscribe','refresh'].every(k=>typeof bridge[k]==='function')
||!['state','subscribe','load','confirm'].every(k=>typeof journal[k]==='function'))err('R54_DEPENDENCY_REQUIRED');
let mode='demo',busy=false,closed=false,current=null;
const layers={},listeners=new Set();
const html='<div class="r54-panel"><div class="r54-kicker">BTC STRATEGY PRO · CONTA V20 · APENAS LEITURA</div><div class="r54-title" data-r54-title></div><strong class="r54-main" data-r54-main></strong><p data-r54-info></p><div class="r54-figures"><div>Caixa livre<br><b data-r54-cash></b></div><div>Margem isolada<br><b data-r54-margin></b></div><div>BTC aberto<br><b data-r54-btc></b></div></div><p class="r54-warning" data-r54-warning role="status"></p><div class="r54-buttons"><button data-r54-action="refresh" type="button">Atualizar carteira</button><button data-r54-action="journal" type="button">Abrir diário autenticado</button><button data-r54-action="demo" type="button">Voltar à Demo</button></div><div class="r54-rows" data-r54-rows></div><small>O histórico ilustrativo da Demo está oculto neste modo. Nenhuma operação Kraken será executada.</small></div>';
const css=[
'body[data-r54-mode="account"] #homeView>:not(.r54-layer),body[data-r54-mode="account"] #strategiesView>:not(.r54-layer),body[data-r54-mode="account"] #terminalView>:not(.r54-layer),body[data-r54-mode="account"] #riskView>:not(.r54-layer),body[data-r54-mode="account"] #accountView>:not(.r54-layer),body[data-r54-mode="account"] #journalView>:not(.r54-layer){display:none!important}',
'body[data-r54-mode="demo"] .r54-layer,body[data-r54-mode="account"] #r53Launch,body[data-r54-mode="account"] .r43-context{display:none!important}',
'.r54-layer{padding:14px 0;color:#ddf4fa}.r54-panel{margin:auto;max-width:1050px;padding:18px;border-radius:14px;border:1px solid #366574;background:linear-gradient(125deg,#0a2632,#10313b);font:14px system-ui,sans-serif}',
'.r54-kicker{font-size:11px;color:#75d3e1;letter-spacing:.1em}.r54-title{margin-top:14px;color:#a7d2da}.r54-main{display:block;font-size:clamp(22px,3vw,36px);overflow-wrap:anywhere;margin:10px 0}.r54-panel p{color:#a6cbd0;font-size:12px}',
'.r54-figures{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:15px 0}.r54-figures>div{padding:12px;background:#0a2531;border:1px solid #2c5462;border-radius:9px;overflow-wrap:anywhere}.r54-warning{background:#333123;border-left:3px solid #e0b85d;padding:11px}',
'.r54-buttons{display:flex;gap:10px;flex-wrap:wrap}.r54-buttons button{border:1px solid #326979;border-radius:9px;background:#164c5c;color:white;padding:11px;cursor:pointer}.r54-buttons button:disabled{opacity:.4}.r54-rows{margin:12px 0}.r54-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;border-bottom:1px solid #2e5360;padding:7px;font-size:11px}',
'@media(max-width:540px){.r54-panel{padding:12px}.r54-figures{grid-template-columns:1fr 1fr}.r54-figures>div:last-child{grid-column:1/-1}.r54-buttons button{flex:1}.r54-row{grid-template-columns:1fr 1fr}}'
].join('\n');
const set=(layer,sel,value)=>{const node=layer.querySelector(sel);if(node)node.textContent=String(value??'—');};
function paint(){
 if(closed)return;current=project(bridge.state(),journal.state());
 if(!doc)return;doc.body.dataset.r54Mode=mode;
 for(const [kind,layer]of Object.entries(layers)){
 const m=current.menu?.[kind];
 set(layer,'[data-r54-title]',m?.title||'Sem dados autenticados verificados');
 set(layer,'[data-r54-main]',m?.main||'—');set(layer,'[data-r54-info]',m?.description||'Atualiza carteira e diário para recuperar uma revisão válida.');
 set(layer,'[data-r54-cash]',current.values?.cash||'—');
 set(layer,'[data-r54-margin]',current.values?.margin||'—');
 set(layer,'[data-r54-btc]',current.values?.btc||'—');
 set(layer,'[data-r54-warning]',current.warning);
 for(const button of layer.querySelectorAll('[data-r54-action]'))button.disabled=busy||(button.dataset.r54Action==='journal'&&current.status!=='ready');
 const rows=layer.querySelector('[data-r54-rows]');
 if(rows){rows.replaceChildren();if(kind==='registos'&&current.status==='ready')
  for(const item of current.history){
   const row=doc.createElement('div');row.className='r54-row';
   for(const value of [item.date,item.type,item.amount,item.status]){const el=doc.createElement('span');el.textContent=value;row.appendChild(el);}
   rows.appendChild(row);
  }
 }
 }
}
function state(){const s=current||project(bridge.state(),journal.state());return {mode,status:s.status,projectId:s.projectId,revision:s.revision,values:s.values?copy(s.values):null,historyCount:s.history.length,canWrite:false,canWriteDirectly:false,canTrade:false};}
function signal(){paint();if(!closed)for(const cb of listeners)cb(state());}
const offA=bridge.subscribe(signal),offJ=journal.subscribe(signal);
async function refresh(){
 if(closed||busy)err('R54_BUSY_OR_DISPOSED');busy=true;paint();
 try{await bridge.refresh();await journal.load();return state();}
 finally{busy=false;signal();}
}
async function confirm({reviewHash,accepted,acceptPlanLinkCleanup=false}={}){
 if(closed||busy)err('R54_BUSY_OR_DISPOSED');if(accepted!==true)err('R54_EXPLICIT_ACCEPTANCE_REQUIRED');
 busy=true;paint();
 try{const result=await journal.confirm({reviewHash,accepted:true,acceptPlanLinkCleanup});
  if(result.fresh)await bridge.refresh();return result;
 }finally{busy=false;signal();}
}
function onClick(e){
 const b=e.target?.closest?.('[data-r54-action]');
 if(!b||!Object.values(layers).some(x=>x.contains(b)))return;
 if(b.dataset.r54Action==='demo')selectMode('demo');
 if(b.dataset.r54Action==='refresh')refresh().catch(()=>signal());
 if(b.dataset.r54Action==='journal'&&current.status==='ready'&&typeof onOpenReview==='function')onOpenReview({projectId:current.projectId,revision:current.revision});
}
function mount(){
 if(!doc?.body||!doc.getElementById)err('R54_DOCUMENT_REQUIRED');
 let style=doc.getElementById('r54-safe-css');
 if(!style){style=doc.createElement('style');style.id='r54-safe-css';style.textContent=css;doc.head.appendChild(style);}
 for(const [kind,id]of Object.entries(VIEWS)){
  const view=doc.getElementById(id);if(!view)err('R54_VIEW_MISSING_'+id);
  let layer=view.querySelector('.r54-layer');
  if(!layer){layer=doc.createElement('section');layer.className='r54-layer';layer.setAttribute('data-r54-view',kind);layer.innerHTML=html;view.insertBefore(layer,view.firstChild);}
  layers[kind]=layer;
 }
 doc.addEventListener('click',onClick);signal();return state();
}
function selectMode(next){if(closed||!['account','demo'].includes(next))err('R54_INVALID_MODE');mode=next;signal();return state();}
function dispose(){if(closed)return;closed=true;offA();offJ();listeners.clear();
 if(doc){doc.removeEventListener('click',onClick);delete doc.body.dataset.r54Mode;
 for(const layer of Object.values(layers))layer.remove();doc.getElementById('r54-safe-css')?.remove();}
}
return Object.freeze({state,refresh,confirm,selectMode,mount,dispose,subscribe(fn){if(closed||typeof fn!=='function')err('R54_INVALID_SUBSCRIBER');listeners.add(fn);fn(state());return()=>listeners.delete(fn);}});
}
return Object.freeze({project,create,format});
});