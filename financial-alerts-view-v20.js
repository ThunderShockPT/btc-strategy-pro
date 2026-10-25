/* BTC Strategy Pro — B13.1: accessible in-app alert list for verified V20 journal.
 * No service-worker, email, push, polling, mutation or order execution.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./financial-alerts-v20.js'));
else root.BTCFinancialAlertsViewV20=factory(root.BTCFinancialAlertsV20);})(typeof globalThis!=='undefined'?globalThis:this,function(Alerts){
'use strict';
function create({account,journal,host,engine=Alerts}={}){
 if(!account||!journal||typeof account.state!=='function'||typeof journal.state!=='function'
 ||typeof account.subscribe!=='function'||typeof journal.subscribe!=='function'
 ||!host||typeof host.replaceChildren!=='function'||typeof engine?.evaluate!=='function')throw Error('B13_VIEW_SOURCE_REQUIRED');
 let capacity=null,capacityBasis=null,closed=false,last=null;const doc=host.ownerDocument;
 function node(tag,cls,txt){const el=doc.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el;}
 function paint(){
  if(closed)return;
  const a=account.state(),j=journal.state();
  last=engine.evaluate({account:a,journal:j,capacity,capacityBasis});
  const wrap=node('section','b13-alerts');wrap.setAttribute('aria-label','Avisos financeiros V20');
  wrap.appendChild(node('div','b13-title','Avisos da carteira'));
  const lead=node('p','b13-note',last.status==='ready'?
   'Avisos calculados a partir do diário V20 verificado. Não são alertas da Kraken nem notificações em segundo plano.':
   'Dados de conta não sincronizados: não são apresentados avisos de risco personalizados.');
  wrap.appendChild(lead);
  const summary=node('div','b13-counts',last.counts.critical+' risco · '+last.counts.warning+' atenção · '+last.counts.info+' informação');
  wrap.appendChild(summary);
  if(!last.alerts.length){wrap.appendChild(node('p','b13-none','Sem novos avisos com os dados disponíveis. Isto não significa ausência de risco.'));}
  else for(const item of last.alerts){
   const row=node('article','b13-item b13-'+item.severity);
   row.setAttribute('data-b13-code',item.code);
   const head=node('div','b13-item-title',item.title);
   const severity=node('span','b13-level',item.severity==='critical'?'RISCO':item.severity==='warning'?'ATENÇÃO':'INFO');
   head.prepend(severity);row.appendChild(head);
   row.appendChild(node('p','b13-msg',item.message));
   row.appendChild(node('small','b13-place','Secção: '+({inicio:'Início',estrategias:'Estratégias',mercado:'Mercado',risco:'Risco',registos:'Registos',conta:'Conta'}[item.section]||'Conta')));
   wrap.appendChild(row);
  }
  host.replaceChildren(wrap);
 }
 const ua=account.subscribe(paint),uj=journal.subscribe(paint);
 paint();
 return Object.freeze({state:()=>last,refresh:paint,
  setCapacity(next,basis){if(closed)throw Error('B13_VIEW_DISPOSED');capacity=next;capacityBasis=basis;paint();},
  dispose(){if(closed)return;closed=true;ua();uj();capacity=null;capacityBasis=null;host.replaceChildren();}});
}
return Object.freeze({create});
});