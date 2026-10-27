/* BTC Strategy Pro B13.2 — interactive help overlay, not an acceptance/receipt form.
 * No financial operations, user credentials, network, notifications or persistence.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./guided-tutorial-v20.js'));else root.BTCGuidedTutorialViewV20=factory(root.BTCGuidedTutorialV20);})(typeof globalThis!=='undefined'?globalThis:this,function(Guide){
'use strict';
const styles=[
'#b132Tutorial[hidden]{display:none!important}#b132Tutorial{position:fixed;inset:0;z-index:100000;background:#030b13e8;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto;font-family:system-ui,sans-serif}',
'#b132Tutorial *{box-sizing:border-box}#b132Tutorial .b132-card{width:min(620px,100%);max-height:95dvh;overflow:auto;background:linear-gradient(145deg,#0f2533,#09202b);border:1px solid #3d7d8c;border-radius:18px;box-shadow:0 24px 100px #000a;padding:clamp(14px,3vw,25px);color:#ecfaff}',
'#b132Tutorial .b132-top{display:flex;justify-content:space-between;align-items:center;gap:12px}#b132Tutorial .b132-mini{font-size:11px;letter-spacing:.08em;color:#77d5e0;font-weight:750}',
'#b132Tutorial h2{font-size:clamp(19px,3vw,24px);margin:15px 0 9px}#b132Tutorial p{font-size:13px;line-height:1.55;color:#bad4da}',
'#b132Tutorial .b132-example{background:#0a3440;border-left:3px solid #19bfe1;padding:10px;border-radius:7px}#b132Tutorial .b132-tip{background:#30291e;border-left:3px solid #edb95a;padding:10px;border-radius:7px}',
'#b132Tutorial button,#b132Launch{cursor:pointer;border:1px solid #377d8c;background:#164958;color:white;padding:9px 13px;border-radius:9px;font:600 13px system-ui}#b132Tutorial button:disabled{opacity:.35;cursor:not-allowed}',
'#b132Tutorial .b132-controls{display:flex;justify-content:space-between;gap:9px;margin-top:15px}#b132Tutorial .b132-progress{height:6px;border-radius:12px;background:#234354;margin-top:12px;overflow:hidden}#b132Tutorial .b132-progress span{display:block;height:100%;background:#22bfda}',
'#b132Tutorial .b132-sim{border:1px solid #365d67;padding:10px;border-radius:9px;margin:10px 0}#b132Tutorial .b132-sim label{display:block;font-size:12px;color:#cee4e7;margin:10px 0}#b132Tutorial input[type=range]{width:100%;accent-color:#21c1d8}',
'#b132Tutorial .b132-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}#b132Tutorial .b132-stat{min-width:0;border:1px solid #235062;padding:8px;border-radius:7px}#b132Tutorial .b132-stat small{display:block;color:#9db7c1;font-size:10px}#b132Tutorial .b132-stat strong{display:block;font-size:15px;overflow-wrap:anywhere}',
'#b132Launch{position:fixed;right:13px;bottom:83px;z-index:2000;border-color:#21c4dc;background:#0f4757;box-shadow:0 8px 22px #0008}',
'#b132Tutorial .b132-footnote{font-size:11px;color:#8bb8c2}#b132Tutorial button:focus-visible,#b132Launch:focus-visible,#b132Tutorial input:focus-visible{outline:3px solid #46d6f0;outline-offset:2px}',
'@media(max-width:520px){#b132Tutorial{padding:6px}#b132Tutorial .b132-card{max-height:97dvh}#b132Launch{right:8px;bottom:83px;font-size:12px}}'
].join('\n');
function create({document:doc=typeof document==='undefined'?null:document,catalog,entry='help'}={}){
 if(!doc?.body||!doc.createElement||!doc.addEventListener||!Guide?.plan)throw Error('B132_DOCUMENT_REQUIRED');
 const p=Guide.plan(catalog);
 let index=0,opened=false,closed=false,oldFocus=null;
 const el=(tag,cls,value)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
 const style=el('style');style.id='b132Style';style.textContent=styles;doc.head.appendChild(style);
 const overlay=el('section');overlay.id='b132Tutorial';overlay.hidden=true;overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Guia de ajuda BTC Strategy Pro');
 const card=el('div','b132-card');overlay.appendChild(card);doc.body.appendChild(overlay);
 const launcher=el('button',null,'📘 Tutorial');launcher.type='button';launcher.id='b132Launch';
 launcher.setAttribute('aria-label','Abrir tutorial interativo da estratégia');doc.body.appendChild(launcher);
 function demo(container){
  const block=el('div','b132-sim');block.appendChild(el('strong',null,'Exemplo didático — sem operações reais'));
  const cycle=el('label',null,'Orçamento nominal do ciclo: 1.000 USD');
  const c=el('input');c.type='range';c.min='100';c.max='5000';c.step='100';c.value='1000';c.id='b132Budget';cycle.appendChild(c);block.appendChild(cycle);
  const mark=el('label',null,'Preço BTC ilustrativo: 97.000 USD');
  const m=el('input');m.type='range';m.min='90000';m.max='110000';m.step='1000';m.value='97000';m.id='b132Mark';mark.appendChild(m);block.appendChild(mark);
  const grid=el('div','b132-stats');block.appendChild(grid);
  function update(){
   const v=Guide.example({cycleNominalUSD:c.value,btcMarkUSD:m.value});
   cycle.firstChild.textContent='Orçamento nominal do ciclo: '+Number(c.value).toLocaleString('pt-PT')+' USD';
   mark.firstChild.textContent='Preço BTC ilustrativo: '+Number(m.value).toLocaleString('pt-PT')+' USD';
   grid.replaceChildren();
   for(const [title,amount]of [
    ['Compra 20%',v.buy20USD],['Reforço 30%',v.buy30USD],['Reforço 50%',v.buy50USD],
    ['Caixa livre',v.freeCashUSD],['PnL isolado',v.unrealizedPnLUSD],['Equity isolada',v.isolatedEquityUSD]
   ]){const x=el('div','b132-stat');x.append(el('small',null,title),el('strong',null,amount+' USD'));grid.appendChild(x);}
  }
  c.addEventListener('input',update);m.addEventListener('input',update);update();container.appendChild(block);
 }
 function render(){
  const t=p.topics[index];card.replaceChildren();
  const top=el('div','b132-top');top.appendChild(el('span','b132-mini','TUTORIAL V20 · '+(index+1)+' / '+p.topicCount));
  const closeButton=el('button',null,'Fechar');closeButton.type='button';closeButton.id='b132Close';closeButton.addEventListener('click',close);top.appendChild(closeButton);
  card.appendChild(top);
  const progress=el('div','b132-progress'),bar=el('span');bar.style.width=((index+1)/p.topicCount*100).toFixed(2)+'%';progress.appendChild(bar);card.appendChild(progress);
  const title=el('h2',null,t.title);title.id='b132Title';card.appendChild(title);
  card.append(el('p',null,t.summary),el('p','b132-example','Exemplo: '+t.example),el('p','b132-tip','Atenção: '+t.reminder));
  if(index===0||t.id==='cash-margin'||t.id==='future-buying-power')demo(card);
  card.appendChild(el('p','b132-footnote','Ajuda adicional, sem guardar aceitação. O comprovativo oficial dos seis temas V20 continua no onboarding existente.'));
  const footer=el('div','b132-controls'),prev=el('button',null,'Anterior'),
   next=el('button',null,index===p.topicCount-1?'Concluir guia':'Seguinte');
  prev.id='b132Previous';next.id='b132Next';prev.type=next.type='button';
  prev.disabled=index===0;prev.addEventListener('click',()=>go(index-1));
  next.addEventListener('click',()=>index===p.topicCount-1?close():go(index+1));
  footer.append(prev,next);card.appendChild(footer);next.focus();
 }
 function open(step=0){if(closed)throw Error('B132_DISPOSED');if(!Number.isInteger(step)||step<0||step>=p.topicCount)throw Error('B132_INVALID_STEP');
  oldFocus=doc.activeElement;index=step;opened=true;overlay.hidden=false;render();}
 function close(){if(closed)return;opened=false;overlay.hidden=true;if(oldFocus?.isConnected)oldFocus.focus();}
 function go(step){if(closed)throw Error('B132_DISPOSED');if(!opened||!Number.isInteger(step)||step<0||step>=p.topicCount)throw Error('B132_INVALID_STEP');index=step;render();}
 function key(e){if(!opened)return;if(e.key==='Escape'){e.preventDefault();close();}
  else if(e.key==='ArrowRight'&&index<p.topicCount-1){e.preventDefault();go(index+1);}
  else if(e.key==='ArrowLeft'&&index>0){e.preventDefault();go(index-1);}
  else if(e.key==='Tab'){const buttons=Array.from(card.querySelectorAll('button:not([disabled])'));
   const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus();}}
 }
 launcher.addEventListener('click',()=>open(0));doc.addEventListener('keydown',key);
 const api=Object.freeze({open,close,go,plan:()=>p,
  state:()=>Object.freeze({open:opened,index,topic:p.topics[index].id,topicCount:p.topicCount,receiptSaved:false}),
  dispose(){if(closed)return;close();closed=true;doc.removeEventListener('keydown',key);launcher.remove();overlay.remove();style.remove();}});
 if(entry==='auto-preview')open(0);
 return api;
}
return Object.freeze({create});
});