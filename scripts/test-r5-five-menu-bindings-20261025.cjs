'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const View=require('../five-menu-financial-view-v20.js');
class Element {
 constructor(doc){this.ownerDocument=doc;this.textContent='';this.value='';this.disabled=false;this.options=[];this.handlers=new Map();}
 addEventListener(event,fn){this.handlers.set(event,fn);}
 removeEventListener(event){this.handlers.delete(event);}
 send(event){return this.handlers.get(event)?.({target:this,currentTarget:this,preventDefault(){}});}
 add(o){this.options.push(o);}
 remove(i){this.options.splice(i,1);}
 querySelector(selector){return selector==='[name="password"]'?this.password:selector==='[name="email"]'?this.email:null;}
}
class FakeRoot {
 constructor(){this.doc={createElement:()=>new Element(this.doc)};this.fields={};this.wallet=new Element(this.doc);this.wallet.ownerDocument=this.doc;this.buttons={};
  for(const kind of ['wallets','refresh','signout'])this.buttons[kind]=new Element(this.doc);
  this.form=new Element(this.doc);this.form.email=new Element(this.doc);this.form.password=new Element(this.doc);
 }
 querySelectorAll(selector){const field=selector.match(/^\[data-r52-field="([^"]+)"\]$/);if(field){this.fields[field[1]]??=[new Element(this.doc),new Element(this.doc)];return this.fields[field[1]];}
  if(selector==='[data-r52-wallet-select]')return [this.wallet];
  if(selector==='[data-r52-login]')return [this.form];
  for(const kind of Object.keys(this.buttons))if(selector==='[data-r52-action="'+kind+'"]')return [this.buttons[kind]];
  return [];
 }
 querySelector(selector){return selector==='[data-r52-wallet-select]'?this.wallet:null;}
 createElement(type){return this.doc.createElement(type);}
 get(k){return (this.fields[k]||[])[0]?.textContent;}
}
const UUID='00000000-0000-4000-a000-000000000001';
const view={phase:'bookkeeping-only',authenticated:true,selectedProjectId:UUID,availableWallets:[{projectId:UUID,title:'Carteira segura'}],projection:{
 financial:{freeCashUSD:'1400',isolatedMarginUSD:'500',unrealizedPnLUSD:'-30.25',positionQuantityBTC:'0.0100'},
 shared:{revision:'3',quoteCurrent:false,rulesCurrent:false,projectId:UUID},
 plan:{version:'2'}
}};
function setup(initial={phase:'signed-out',authenticated:false,projection:null,availableWallets:[]}){
 let value=initial,subscriber=null;const calls=[];
 const bridge={state:()=>structuredClone(value),subscribe:fn=>{subscriber=fn;fn(value);return ()=>{subscriber=null;}},
 selectWallet:async id=>{calls.push(['selectWallet',id]);},listWallets:async()=>{calls.push(['listWallets']);},
 refresh:async()=>{calls.push(['refresh']);},signOut:async()=>{calls.push(['signOut']);},
 signIn:async x=>{calls.push(['signIn',x]);}};
 const root=new FakeRoot(),ui=View.create({bridge,root});
 return {root,ui,calls,set:v=>{value=v;subscriber?.(v);}};
}
const next=()=>new Promise(resolve=>setImmediate(resolve));
test('signed-out never displays previous cash, margin or project',()=>{const x=setup();assert.equal(x.root.get('freeCashUSD'),'—');assert.equal(x.root.get('projectShort'),'—');assert.match(x.root.get('status'),/Sem sessão/);x.ui.dispose();});
test('one read-only projection paints identical cash on every node, with signed loss intact',()=>{
 const x=setup(view);assert.equal(x.root.get('freeCashUSD'),'1.400 USD');
 assert.equal(x.root.fields.freeCashUSD[1].textContent,x.root.get('freeCashUSD'));
 assert.equal(x.root.get('unrealizedPnLUSD'),'−30,25 USD');
 assert.equal(x.root.get('isolatedMarginUSD'),'500 USD');
 assert.equal(x.root.get('positionQuantityBTC'),'0,0100 BTC');x.ui.dispose();
});
test('market stale flag never presents true live or official buying power',()=>{
 const x=setup(view);assert.equal(x.root.get('quoteStatus'),'Mercado ou regras desatualizados');
 assert.equal(x.root.get('riskStatus'),'Não certificado para negociar');x.ui.dispose();
});
test('switching, blocked or logout clears all monetary values synchronously',()=>{
 const x=setup(view);for(const phase of ['switching-wallet','loading','blocked','signed-out']){
 x.set({phase,authenticated:phase!=='signed-out',projection:null,availableWallets:[]});
 assert.equal(x.root.get('freeCashUSD'),'—');
 assert.equal(x.root.get('isolatedMarginUSD'),'—');
 }x.ui.dispose();
});
test('selection list uses real wallet ID and title and does not trust arbitrary user text as HTML',()=>{
 const crafted={...view,availableWallets:[{projectId:UUID,title:'<img src=x onerror=alert(1)>'}]};
 const x=setup(crafted);assert.equal(x.root.wallet.options.length,2);
 assert.equal(x.root.wallet.options[1].textContent,'<img src=x onerror=alert(1)>');
 assert.equal(x.root.wallet.options[1].value,UUID);x.ui.dispose();
});
test('selecting a wallet delegates only its trusted server ID',async()=>{
 const x=setup(view);x.root.wallet.value=UUID;x.root.wallet.send('change');await next();
 assert.deepEqual(x.calls,[['selectWallet',UUID]]);x.ui.dispose();
});
test('refresh and list actions delegate exclusively to read-only bridge',async()=>{
 const x=setup(view);x.root.buttons.wallets.send('click');await next();x.root.buttons.refresh.send('click');await next();
 assert.deepEqual(x.calls,[['listWallets'],['refresh']]);x.ui.dispose();
});
test('logging out clears inputs in external account bridge, no page-level wallet writes',async()=>{
 const x=setup(view);x.root.buttons.signout.send('click');await next();
 assert.deepEqual(x.calls,[['signOut']]);x.ui.dispose();
});
test('sign-in form delegates safely and clears password box instantly',async()=>{
 const x=setup();x.root.form.email.value='qa@example.test';x.root.form.password.value='temporary-only';
 x.root.form.send('submit');assert.equal(x.root.form.password.value,'');await next();
 assert.deepEqual(x.calls,[['signIn',{email:'qa@example.test',password:'temporary-only'}]]);x.ui.dispose();
});
test('after dispose no new private states reach the rendered nodes',()=>{
 const x=setup();x.ui.dispose();x.set(view);
 assert.equal(x.root.get('freeCashUSD'),'—');assert.equal(x.calls.length,0);
});
