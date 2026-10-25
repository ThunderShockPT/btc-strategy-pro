'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Presentation=require('../previews/plan-presentation.js'),UI=require('./helpers/account-ui-fixture.cjs'),App=require('../previews/app-workflows.js'),Wallet=require('../wallet-onboarding.js'),f=require('./helpers/onboarding-fixture.cjs');
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const view=Presentation.create({esc,money:v=>String(v)+' USD',line:(k,v)=>'<p>'+esc(k)+': '+esc(v)+'</p>',stat:(k,v)=>'<p>'+esc(k)+': '+esc(v)+'</p>',warning:v=>'<p>'+esc(v)+'</p>'});
test('the same recorded facts produce identical Demo/account plan, chart and capital presentation',async()=>{
 const privateState=UI.state(),demo=UI.equivalentDemo(privateState),before=JSON.stringify({privateState,demo});
 const demoSnapshot=await App.dispatch('snapshot',demo),account=privateState.dashboard;
 assert.equal(view.saved(account),view.saved(demoSnapshot));assert.equal(view.capital(account.ledger),view.capital(demoSnapshot.ledger));
 const html=view.saved(account);assert.match(html,/297 USD/);assert.match(html,/499.8 USD/);assert.match(html,/0.00300000 BTC/);assert.match(html,/Orçamento da etapa preenchido/);
 assert.match(html,/Mapa das compras em descida/);assert.match(html,/Tabela Chaves/);assert.match(html,/sem escala de tempo/);
 assert.equal(JSON.stringify({privateState,demo}),before);
});
test('a frozen server proposal uses the same full presentation as the Demo calculation',()=>{
 const state=UI.state(),demo=UI.equivalentDemo(state),request={...f.request(),capitalUSD:'1000',mode:'review-existing',positionStatus:'use-recorded-history',floorMode:'preserve'};
 // Both adapters receive one completed shared-engine result, never two searches
 // with potentially different contexts. Rendering must leave it unchanged.
 const r=Wallet.calculate(f.context(),request,demo),copy=JSON.stringify(r),review={type:'profile-review',baseRevision:state.revision,candidatePlan:r.candidatePlan,result:r.profile};
 const reviewedSnapshot={...state,dashboard:{...state.dashboard,ledger:r.before,risk:r.risk,asOf:r.context.valuation.asOf}};
 const demoModel=view.demoModel(r),accountModel=view.accountModel(review,reviewedSnapshot);
 assert.equal(view.proposal(accountModel),view.proposal(demoModel));assert.equal(JSON.stringify(r),copy);
 assert.equal(accountModel.selected,r.profile.cycles.selected);
 assert.match(view.proposal(accountModel),/Margem adicional prevista nesta etapa/);
 assert.doesNotMatch(view.proposal(accountModel),/data-account-action|data-account-accept|checked/);
});
test('a changed head cannot be mixed into an immutable review display, and saved plans do not invent per-stage margin',()=>{
 const state=UI.state(),demo=UI.equivalentDemo(state),r=Wallet.calculate(f.context(),{...f.request(),capitalUSD:'1000',mode:'review-existing',positionStatus:'use-recorded-history',floorMode:'preserve'},demo);
 const model=view.accountModel({baseRevision:'999',candidatePlan:r.candidatePlan,result:r.profile},state);
 assert.equal(model.summary.walletUSD,undefined);assert.equal(model.summary.actualQuantityBTC,undefined);
 assert.doesNotMatch(view.saved(state.dashboard),/Margem adicional prevista nesta etapa/);
 const html=view.proposal({...model,profileLabel:'<script>bad</script>'});assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
});
