/* BTC Strategy Pro — B13.2: tutorial V20, only educational.
 * Does not connect to Kraken/Supabase, write wallet data, choose risk profiles,
 * grant financial approval or store completion persistently.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BTCOnboardingGuideV20=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const lessons=Object.freeze([
 {title:'Bem-vindo à BTC Strategy Pro',section:'Início',text:'A aplicação organiza registos manuais e compara cenários. Não compra ou vende BTC automaticamente. A estratégia financeira definitiva continua por aprovar.',example:'A Demo usa dados fictícios. Uma conta autenticada só apresenta saldos quando a carteira e o diário estão sincronizados.'},
 {title:'Caixa livre e margem isolada',section:'Início',text:'Dinheiro já transferido para margem isolada não está na caixa livre. Uma perda não realizada reduz a equity da posição isolada; não deve ser novamente descontada da caixa livre. Comissões, funding pago e transferências reais contam como saídas.',example:'Capital 2.000 USD − margem transferida 200 USD − reserva 100 USD = caixa livre 1.700 USD. Long de 0,01 BTC desce de 100.000 para 97.000: perda não realizada −30 USD na posição, mas a caixa permanece 1.700 USD antes de mais custos.'},
 {title:'Compras de 20% · 30% · 50%',section:'Estratégias',text:'Cada ciclo divide o orçamento NOMINAL em três etapas. Essas percentagens são do ciclo, não da carteira inteira, e não significam dinheiro automaticamente entregue como margem.',example:'Um ciclo com orçamento nominal de 1.000 USD tem compras teóricas de 200 USD, 300 USD e 500 USD. A quantidade real depende do preço, dos lotes e da margem.'},
 {title:'Comprar na descida e respeitar o piso',section:'Estratégias',text:'Os reforços planeados são estudados a preços inferiores, mas só poderão ocorrer se o capital, a margem e a segurança das posições anteriores permitirem. Não assumes como executada uma ordem apenas planeada.',example:'Na grelha histórica A–E existe uma entrada a 60.000 USD. Com a regra estrita de piso em 60.000 USD, a compra nesse valor fica bloqueada. Piso de teste não é preço garantido de liquidação.'},
 {title:'Risco de margem isolada com 10×',section:'Risco',text:'Mesmo havendo caixa livre, a posição pode chegar à manutenção antes da compra seguinte. O modelo tem de verificar esse percurso e considerar mark price, funding, comissões, manutenção e regras Kraken válidas.',example:'Ter 1.700 USD na caixa não prova que um reforço mais abaixo seja possível: a posição existente pode já ter atingido a margem de manutenção.'},
 {title:'Registar e corrigir movimentos',section:'Registos',text:'Regista apenas compras, vendas, depósitos, taxas e margem que já ocorreram. Uma compra parcialmente executada usa só a quantidade executada. Correções e anulações devem preservar o original no histórico.',example:'Para corrigir uma compra mal digitada: preparar correção com motivo → rever antes/depois → confirmar expressamente. O tutorial não grava movimentos.'},
 {title:'Perfis Seguro, Equilibrado e Arriscado',section:'Risco',text:'Os pisos e números de ciclos são critérios de estudo. Não são garantias de proteção ou lucro. A seleção da estratégia permanece pendente de aprovação financeira explícita.',example:'Referências de estudo: Seguro −40.000 USD, Equilibrado −20.000 USD, Arriscado −10.000 USD em relação ao preço BTC de referência.'},
 {title:'Alertas e dados atualizados',section:'Conta',text:'Os avisos in-app distinguem falta de caixa, risco num cenário, cotação/regras antigas e movimentos por confirmar. Não são notificações em segundo plano ou sinais da Kraken.',example:'Ao terminar sessão ou trocar de carteira, desaparecem os alertas pessoais antigos. Sem regras Kraken atuais, não interpretar uma compra como autorizada.'}
]);
const quiz=Object.freeze([
 {question:'Uma perda não realizada na posição isolada deve sair novamente da caixa livre?',choices:['Sim, sempre','Não, reduz a equity da posição','A caixa duplica'],correct:1,why:'A perda não realizada não é uma segunda saída contabilística da caixa livre.'},
 {question:'A parcela de 50% num ciclo de 1.000 USD representa:',choices:['500 USD nominais do ciclo','50% de toda a carteira','500 USD transferidos automaticamente'],correct:0,why:'A distribuição 20/30/50 é relativa ao orçamento nominal de cada ciclo.'},
 {question:'Quando há risco de manutenção antes do reforço seguinte, o sistema deve:',choices:['Admitir automaticamente a compra','Ignorar o risco se houver caixa','Bloquear a hipótese e rever margem'],correct:2,why:'Não se pode contar com uma transferência ou compra que ainda não ocorreu.'},
 {question:'Uma compra mal registada deve ser corrigida através de:',choices:['Apagar o histórico original','Revisão e confirmação auditável','Uma nova ordem Kraken automática'],correct:1,why:'As correções mantêm o historial original e exigem aprovação explícita.'}
]);
const clone=x=>JSON.parse(JSON.stringify(x));
const css='.b132-root[hidden]{display:none!important}.b132-root{position:fixed;inset:0;z-index:2147483000;color:#ecfcff;font:14px system-ui,sans-serif}.b132-root *{box-sizing:border-box}.b132-back{background:rgba(0,10,20,.85);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:9px}.b132-dialog{width:min(680px,100%);max-height:calc(100dvh - 18px);overflow:auto;background:linear-gradient(125deg,#092434,#123f48);border:1px solid #4f9eab;border-radius:16px;padding:22px;box-shadow:0 25px 80px #0009}.b132-header{display:flex;justify-content:space-between;align-items:center;gap:10px;color:#8fe0e9;font-size:11px;letter-spacing:.1em}.b132-dialog h2{font-size:clamp(20px,4vw,27px);margin:12px 0}.b132-dialog p{line-height:1.6;color:#d1e2e4}.b132-meter{height:5px;background:#284d58;margin:16px 0;border-radius:5px;overflow:hidden}.b132-fill{display:block;height:100%;background:#63d5e4}.b132-example{background:#102f3b;border:1px solid #357484;border-radius:12px;padding:14px;margin:20px 0}.b132-example strong{color:#95edf4}.b132-nav{display:flex;gap:10px;justify-content:space-between;margin-top:22px}.b132-dialog button{border:1px solid #4c9aa7;border-radius:9px;background:#175364;color:#fff;padding:10px 16px;cursor:pointer}.b132-nav button{flex:1}.b132-nav button:last-child{background:#04879a;font-weight:750}.b132-dialog button:disabled{opacity:.4;cursor:not-allowed}.b132-question{border:1px solid #386879;border-radius:11px;margin:13px 0;padding:13px}.b132-question legend{font-weight:700;line-height:1.4}.b132-option{display:flex;gap:9px;align-items:flex-start;margin:10px 0;cursor:pointer}.b132-option input{accent-color:#6cdded;margin-top:4px}.b132-good{color:#80e4b7!important}.b132-bad{color:#ffb6ad!important}.b132-note{font-size:11px;color:#9fb6be!important}@media(max-width:540px){.b132-dialog{padding:14px;border-radius:11px}.b132-nav button{padding:10px 6px}}';
function create({document:doc=typeof document==='undefined'?null:document,onClose=null}={}){
 let step=0,visible=false,completed=false,answers=quiz.map(()=>null),host=null,priorOverflow='',priorFocus=null;
 const state=()=>({step,visible,completed,answers:clone(answers),total:lessons.length+1,persisted:false,canTrade:false,canWrite:false,financialApproval:false});
 function element(tag,cls,text){const el=doc.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
 function render(){
  if(!visible||!host)return;host.replaceChildren();
  const back=element('div','b132-back'),dialog=element('section','b132-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Tutorial BTC Strategy Pro');
  const header=element('div','b132-header'),exit=element('button',null,'Fechar');exit.type='button';exit.onclick=hide;
  header.appendChild(element('span',null,'TUTORIAL V20 · '+(step+1)+' DE '+(lessons.length+1)));header.appendChild(exit);dialog.appendChild(header);
  const meter=element('div','b132-meter'),fill=element('span','b132-fill');fill.style.width=(100*(step+1)/(lessons.length+1))+'%';meter.appendChild(fill);dialog.appendChild(meter);
  if(step<lessons.length){
   const v=lessons[step];dialog.appendChild(element('small',null,v.section));dialog.appendChild(element('h2',null,v.title));dialog.appendChild(element('p',null,v.text));
   const demo=element('section','b132-example');demo.appendChild(element('strong',null,'Exemplo prático'));demo.appendChild(element('p',null,v.example));dialog.appendChild(demo);
  }else{
   dialog.appendChild(element('h2',null,'Confirmar a aprendizagem'));
   dialog.appendChild(element('p',null,'Quatro perguntas educativas. Concluir este guia não aprova a estratégia, não grava alterações e não desbloqueia a conta.'));
   quiz.forEach((q,i)=>{
    const field=element('fieldset','b132-question');field.appendChild(element('legend',null,(i+1)+'. '+q.question));
    q.choices.forEach((answer,k)=>{
     const label=element('label','b132-option'),radio=element('input');radio.type='radio';radio.name='b132-'+i;radio.checked=answers[i]===k;radio.onchange=()=>choose(i,k);
     label.appendChild(radio);label.appendChild(element('span',null,answer));field.appendChild(label);
    });
    if(answers[i]!==null){const ok=answers[i]===q.correct;field.appendChild(element('p',ok?'b132-good':'b132-bad',(ok?'Correto. ':'A rever. ')+q.why));}
    dialog.appendChild(field);
   });
  }
  const nav=element('div','b132-nav'),prev=element('button',null,step===0?'Mais tarde':'Anterior'),next=element('button',null,step===lessons.length?'Concluir guia':'Seguinte');
  prev.type=next.type='button';prev.onclick=()=>step===0?hide():go(step-1);next.disabled=step===lessons.length&&!answers.every((a,i)=>a===quiz[i].correct);
  next.onclick=()=>{if(step<lessons.length)go(step+1);else if(answers.every((a,i)=>a===quiz[i].correct)){completed=true;hide();}};
  nav.appendChild(prev);nav.appendChild(next);dialog.appendChild(nav);
  dialog.appendChild(element('p','b132-note','Guia informativo, sem simulação de lucros garantidos, gravações financeiras ou operações na Kraken.'));
  back.appendChild(dialog);host.appendChild(back);exit.focus();
 }
 function ensure(){
  if(!doc?.body||typeof doc.createElement!=='function')throw Error('B132_DOCUMENT_REQUIRED');
  if(host)return;host=element('div','b132-root');host.id='b132Guide';host.hidden=true;doc.body.appendChild(host);
  if(!doc.getElementById('b132GuideCss')){const style=element('style');style.id='b132GuideCss';style.textContent=css;doc.head.appendChild(style);}
 }
 function show({initialStep=0}={}){
  if(!Number.isInteger(initialStep)||initialStep<0||initialStep>lessons.length)throw Error('B132_INVALID_STEP');
  ensure();if(!visible){priorFocus=doc.activeElement;priorOverflow=doc.body.style.overflow;}
  step=initialStep;visible=true;host.hidden=false;doc.body.style.overflow='hidden';render();return state();
 }
 function hide(){if(!visible)return state();visible=false;host.hidden=true;doc.body.style.overflow=priorOverflow;
  if(priorFocus?.isConnected&&typeof priorFocus.focus==='function')priorFocus.focus();if(typeof onClose==='function')onClose(state());return state();}
 function go(n){if(!Number.isInteger(n)||n<0||n>lessons.length)throw Error('B132_INVALID_STEP');step=n;render();return state();}
 function choose(i,k){if(!Number.isInteger(i)||i<0||i>=quiz.length||!Number.isInteger(k)||k<0||k>=quiz[i].choices.length)throw Error('B132_INVALID_ANSWER');answers[i]=k;render();return state();}
 function reset(){answers=quiz.map(()=>null);step=0;completed=false;render();return state();}
 function dispose(){hide();host?.remove();host=null;}
 return Object.freeze({show,hide,go,choose,reset,state,dispose});
}
return Object.freeze({create,lessons:clone(lessons),quiz:clone(quiz)});
});