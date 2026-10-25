/* BTC Strategy Pro — B13.2 help catalog, separate from six-topic official V20 tutorial receipt. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./wallet-onboarding.js'));else root.BTCGuidedTutorialV20=factory(root.BTCWalletOnboarding||null);})(typeof globalThis!=='undefined'?globalThis:this,function(Wallet){
'use strict';
const EXTRAS=[
{id:'future-buying-power',title:'Caixa disponível depois de compras',summary:'Depois de compras reais, taxas e transferências para margem, a caixa livre pode diminuir. Uma perda não realizada de uma posição isolada diminui a equity dessa posição, mas não é debitada novamente da caixa.',example:'Se tens 2 000 USD, transferes 200 USD para margem e proteges 100 USD, restam 1 700 USD livres. Quando 0,01 BTC comprado a 100 000 USD desce para 97 000 USD, o PnL da posição é −30 USD e a equity isolada passa a 170 USD.',reminder:'Na próxima compra, a caixa pode ser insuficiente e a posição pode atingir manutenção antes do reforço. O sistema deve simular essas duas restrições separadamente.'},
{id:'alerts-and-reviews',title:'Alertas e revisão antes de gravar',summary:'Os alertas apresentam dados desatualizados, caixa insuficiente, risco de margem no cenário e operações pendentes de confirmação. Não são ordens nem sinais de negociação.',example:'Se uma compra prevista não cabe na caixa, a app mostra um aviso. Se corriges uma compra lançada erradamente, o original continua no histórico auditável.',reminder:'Regras e preços precisam de confirmação. A estratégia financeira não fica aprovada por concluir este guia.'}
];
function fail(code){throw Object.assign(new Error(code),{code});}
function freeze(x){if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;}
function plan(catalog){
 const c=catalog||Wallet?.tutorial?.();
 if(!c||typeof c.version!=='string'||!Array.isArray(c.topics)||c.topics.length!==6)fail('B132_ORIGINAL_SIX_TOPICS_REQUIRED');
 const found=new Set(),topics=[];
 for(const t of c.topics){
  if(!t||typeof t.id!=='string'||found.has(t.id)||!t.title||!t.summary||!t.example||!t.reminder)fail('B132_INVALID_V20_TOPIC');
  found.add(t.id);topics.push({...t,kind:'original-versioned'});
 }
 for(const t of EXTRAS){if(found.has(t.id))fail('B132_DUPLICATE_TOPIC');topics.push({...t,kind:'help-only'});}
 return freeze({guideVersion:'b13-2-help-20261025',sourceTutorialVersion:c.version,
   receiptUntouched:true,financialApproval:false,termsStatus:c.documentsStatus,
   topics,topicCount:topics.length});
}
const VALID=/^(0|[1-9]\d{0,8})(\.\d{1,6})?$/;
const SCALE=1000000n;
function toUnits(value){if(typeof value!=='string'||!VALID.test(value))fail('B132_INVALID_EXAMPLE_VALUE');const [a,b='']=value.split('.');return BigInt(a)*SCALE+BigInt((b+'000000').slice(0,6));}
function fmt(v){const sign=v<0n?'−':'',p=v<0n?-v:v;return sign+(p/SCALE).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+(p%SCALE).toString().padStart(6,'0').slice(0,2);}
function example({capitalUSD='2000',marginTransferredUSD='200',reserveUSD='100',paidCostsUSD='0',cycleNominalUSD='1000',btcBought='0.01',btcEntryUSD='100000',btcMarkUSD='97000'}={}){
 const capital=toUnits(capitalUSD),margin=toUnits(marginTransferredUSD),reserve=toUnits(reserveUSD),costs=toUnits(paidCostsUSD),cycle=toUnits(cycleNominalUSD),bought=toUnits(btcBought),entry=toUnits(btcEntryUSD),mark=toUnits(btcMarkUSD);
 if(capital<=0n||cycle<=0n||entry<=0n||mark<=0n||bought<=0n)fail('B132_INVALID_EXAMPLE_VALUE');
 const free=capital-margin-reserve-costs,pnl=bought*(mark-entry)/SCALE;
 return freeze({buy20USD:fmt(cycle*20n/100n),buy30USD:fmt(cycle*30n/100n),buy50USD:fmt(cycle*50n/100n),
 freeCashUSD:fmt(free),unrealizedPnLUSD:fmt(pnl),isolatedEquityUSD:fmt(margin+pnl),freeCashNegative:free<0n,
 exampleOnly:true,liquidationVerified:false,buyingPowerOfficial:false,mayTrade:false,receiptStored:false});
}
return Object.freeze({plan,example});
});