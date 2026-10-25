'use strict';
// Reconstruct declared, complete manual facts. This never admits a strategy.
const {createHash}=require('node:crypto'),Decimal=require('decimal.js').clone({precision:80}),Core=require('../financial-engine.js'),Rules=require('../kraken-rules.js'),P=require('./persistence-contract.cjs'),Setup=require('../wallet-onboarding.js'),PublicRules=require('./public-rules.cjs');
const baseline=require('../rules/kraken/eea-pf-xbtusd-20261021.json'),capture=require('../rules/kraken/pf-xbtusd-public-20261024.json');
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const clone=v=>JSON.parse(P.canonical(v)),hash=v=>createHash('sha256').update(P.canonical(v)).digest('hex');
function need(ok,code){if(!ok)throw Error(code);}
function fields(v,required,optional=[]){need(v&&typeof v==='object'&&!Array.isArray(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k)),'INVALID_IMPORT_REQUEST');}
function amount(v,positive=false){need(typeof v==='string'&&/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/.test(v),'INVALID_IMPORT_AMOUNT');const n=new Decimal(v);need(positive?n.gt(0):n.gte(0),'INVALID_IMPORT_AMOUNT');return n;}
function time(v){need(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,19)===v.slice(0,19),'INVALID_IMPORT_TIME');return Date.parse(v);}
function assess(r,at){return Rules.assess(r,{now:at,symbol:'PF_XBTUSD',jurisdiction:'EEA',marginMode:'isolated',selectedLeverage:'10',platform:'europa',clientType:'retail',collateralCurrency:'USD'}).scopeReady;}
function build(c,r){
 fields(r,['mode','projectTitle','capitalUSD','openingAt','statementAt','statement','profile','floorUSD','completeHistory','contractConfirmed','history']);
 need(r.mode==='import'&&r.completeHistory===true&&r.contractConfirmed===true,'COMPLETE_IMPORT_HISTORY_REQUIRED');
 need(['safe','balanced','risky'].includes(r.profile),'INVALID_IMPORT_REQUEST');
 need(typeof r.projectTitle==='string'&&r.projectTitle.trim().length>=2&&r.projectTitle.length<=65&&!/[\u0000-\u001f\u007f]/.test(r.projectTitle),'INVALID_PROJECT_TITLE');amount(r.capitalUSD,true);
 const at=time(c.valuation.asOf),now=time(c.now),statement=time(r.statementAt);need(time(r.openingAt)<=statement&&statement<=at&&at<=now&&now-at<=60000,'INVALID_IMPORT_TIME');
 need(c.mode==='manual'&&['public_mark','manual_mark'].includes(c.valuation.kind)&&assess(c.rules,c.valuation.asOf),'CURRENT_MANUAL_CONTEXT_REQUIRED');
 const floor=amount(r.floorUSD,true);need(floor.lt(c.valuation.markPriceUSD)&&floor.mod(c.rules.instrument.priceTick).eq(0),'INVALID_IMPORT_FLOOR');
 fields(r.statement,['walletUSD','marginUSD','quantityBTC','basisUSD']);Object.values(r.statement).forEach(v=>need(typeof v==='string'&&/^(0|[1-9]\d{0,19})(\.\d{1,24})?$/.test(v),'INVALID_IMPORT_AMOUNT'));need(new Decimal(r.statement.quantityBTC).gt(0),'OPEN_POSITION_REQUIRED');
 need(Array.isArray(r.history)&&r.history.length>=2&&r.history.length<=250,'IMPORT_HISTORY_LIMIT');
 const ids=new Set([c.planId,c.receiptId,c.openingEventId]);need(ids.size===3&&[...ids].every(id=>ID.test(id)),'INVALID_IMPORT_REQUEST');
 const input={ownerId:c.ownerId,projectId:c.projectId,scenarioKey:'manual_long',platform:'europa',clientType:'retail',rules:clone(c.rules),valuation:clone(c.valuation),reservations:{ordersUSD:'0',marginUSD:'0',protectedUSD:'0'},events:[],buyRulesByEvent:{}};
 function event(id,type,effectiveAt,facts){need(ID.test(id)&&(!ids.has(id)||id===c.openingEventId&&input.events.length===0),'DUPLICATE_IMPORT_ID');ids.add(id);input.events.push({id,owner_id:c.ownerId,project_id:c.projectId,scenario_key:'manual_long',origin:'manual',schema_version:1,revision:String(input.events.length+1),idempotency_key:'open-position-import-'+id,event_type:type,effective_at:effectiveAt,recorded_at:c.now,facts});}
 event(c.openingEventId,'opening_balance',r.openingAt,{amountUSD:r.capitalUSD,currency:'USD',source:'user-declared-complete-import-history'});
 const sources=[baseline,PublicRules.normalize(capture,capture.serverTime).rules,c.rules],evidence=[];let prior=time(r.openingAt);
 for(let index=0;index<r.history.length;index++){
  try{
  const row=r.history[index];fields(row,['id','type','effectiveAt'],['amountUSD','quantityBTC','priceUSD','cycle','purpose','direction','reference','pnlDestination','feeUSD','feeId']);
  const rowTime=time(row.effectiveAt);need(rowTime>=prior&&rowTime<=statement,'IMPORT_CHRONOLOGY_REQUIRED');prior=rowTime;
  const basic=['capital_deposit','capital_withdrawal','margin_add','margin_remove'];let facts;
  if(basic.includes(row.type)){fields(row,['id','type','effectiveAt','amountUSD'],row.type==='margin_add'?['purpose']:[]);amount(row.amountUSD,true);facts={amountUSD:row.amountUSD,currency:'USD'};if(row.type==='margin_add'){need(['initial','additional'].includes(row.purpose),'INVALID_IMPORT_REQUEST');facts.purpose=row.purpose;}}
  else if(['trade_buy','trade_sell'].includes(row.type)){
   fields(row,['id','type','effectiveAt','quantityBTC','priceUSD','cycle','feeUSD','feeId'],row.type==='trade_sell'?['pnlDestination']:[]);amount(row.quantityBTC,true);amount(row.priceUSD,true);amount(row.feeUSD);need(/^cycle-[1-9]\d{0,5}$/.test(row.cycle),'INVALID_CYCLE');
   const historical=sources.filter(rules=>assess(rules,row.effectiveAt)).sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt))[0];
   if(!historical){const error=Error('IMPORT_HISTORICAL_RULES_REQUIRED');error.importRow=index+1;error.effectiveAt=row.effectiveAt;throw error;}
   need(Rules.validateOrder(historical,{quantityBTC:row.quantityBTC,priceUSD:row.priceUSD,orderType:'limit'}).metadataValid,'INVALID_FILL_PRECISION_OR_INSTRUMENT');
   facts={symbol:'PF_XBTUSD',quantityBTC:row.quantityBTC,priceUSD:row.priceUSD,cycle:row.cycle,executionStatus:'executed'};
   if(row.type==='trade_sell'){need(['wallet','isolated'].includes(row.pnlDestination),'PNL_DESTINATION_REQUIRED');facts.pnlDestination=row.pnlDestination;}else input.buyRulesByEvent[row.id]=clone(historical);
   evidence.push({row:index+1,eventId:row.id,ruleVersion:historical.version,observedAt:historical.observedAt,sha256:hash(historical)});
   event(row.id,row.type,row.effectiveAt,facts);event(row.feeId,'fee',row.effectiveAt,{amountUSD:row.feeUSD,currency:'USD',category:'trading',tradeEventId:row.id});continue;
  }else if(row.type==='funding'){fields(row,['id','type','effectiveAt','amountUSD','direction','reference']);amount(row.amountUSD);need(['paid','received'].includes(row.direction)&&typeof row.reference==='string'&&row.reference.trim().length>0&&row.reference.length<=128,'INVALID_IMPORT_REQUEST');facts={amountUSD:row.amountUSD,currency:'USD',direction:row.direction,settlementId:row.reference};}
  else if(row.type==='fee'){fields(row,['id','type','effectiveAt','amountUSD']);amount(row.amountUSD);facts={amountUSD:row.amountUSD,currency:'USD',category:'other'};}
  else throw Error('INVALID_IMPORT_REQUEST');
  event(row.id,row.type,row.effectiveAt,facts);
  }catch(error){error.importRow=index+1;throw error;}
 }
 let ledger;try{ledger=Core.reconstruct(input);}catch(error){const index=r.history.findIndex(row=>row.id===error.eventId||row.feeId===error.eventId);if(index>=0)error.importRow=index+1;throw error;}
 const actual={walletUSD:ledger.cash.walletUSD,marginUSD:ledger.cash.isolatedMarginUSD,quantityBTC:ledger.position.quantityBTC,basisUSD:ledger.position.remainingBasisUSD};
 const reconciliation=Object.keys(actual).map(key=>({key,declared:r.statement[key],reconstructed:actual[key],difference:new Decimal(actual[key]).sub(r.statement[key]).toFixed(),matches:new Decimal(actual[key]).eq(r.statement[key])}));
 const reconciled=reconciliation.every(item=>item.matches),summary={...actual,capitalUSD:ledger.capital.netContributedUSD,averageEntryUSD:ledger.position.averageEntryUSD,feesPaidUSD:ledger.pnl.feesPaidUSD,fundingNetUSD:ledger.pnl.fundingNetUSD,realizedGrossUSD:ledger.pnl.realizedGrossUSD,eventCount:input.events.length,statementAt:r.statementAt};
 const plan={id:c.planId,ownerId:c.ownerId,projectId:c.projectId,scenarioKey:'manual_long',version:'1',profile:r.profile,referencePriceUSD:c.valuation.markPriceUSD,referenceAt:c.valuation.asOf,protectionFloorUSD:r.floorUSD,configuration:{title:r.projectTitle.trim(),cycleInventory:[],importReconciliation:{version:'v20-open-position-import-1',status:'facts-only-plan-review-required',statementAt:r.statementAt,historyHash:hash(r.history)},profileAdmission:'not-reviewed',profileBaseCyclePolicy:clone(c.baseCyclePolicy)}};
 return {input,plan,summary,reconciliation,evidence,reconciled};
}
async function prepare(context,request){const c=clone(context),r=clone(request),built=build(c,r),body={type:'open-position-import-review',workflowVersion:'v20-open-position-import-1',context:c,request:r,preparedAt:c.now,canApply:built.reconciled,reconciliation:built.reconciliation,summary:built.summary,evidence:built.evidence,sourceState:{input:built.input,plan:built.plan,planHistory:[],receipts:[]},databaseWritten:false,planApplied:false,planReviewRequired:true};return {...body,reviewHash:hash(body)};}
async function confirm(context,review,{confirmedReviewHash,acknowledgment,confirmedAt}){
 const {reviewHash,...body}=review;need(confirmedReviewHash===reviewHash&&hash(body)===reviewHash,'REVIEW_CHANGED_OR_TAMPERED');need(P.canonical(context)===P.canonical(review.context),'REVIEW_CHANGED_OR_TAMPERED');
 const now=time(confirmedAt);need(now>=time(review.preparedAt)&&now-time(context.valuation.asOf)<=60000,'WALLET_REVIEW_EXPIRED');need(assess(context.rules,confirmedAt),'CURRENT_RULES_REQUIRED');need(review.canApply&&review.reconciliation.every(r=>r.matches),'IMPORT_RECONCILIATION_FAILED');
 const tutorial=Setup.tutorial();fields(acknowledgment,['tutorialVersion','completedTopicIds','understoodRisk','termsVersion','privacyVersion','acceptedAt']);need(acknowledgment.tutorialVersion===tutorial.version&&acknowledgment.termsVersion===tutorial.termsVersion&&acknowledgment.privacyVersion===tutorial.privacyVersion&&acknowledgment.understoodRisk===true,'CURRENT_TUTORIAL_AND_TERMS_REQUIRED');need(Array.isArray(acknowledgment.completedTopicIds)&&acknowledgment.completedTopicIds.length===tutorial.topics.length&&new Set(acknowledgment.completedTopicIds).size===tutorial.topics.length&&tutorial.topics.every(t=>acknowledgment.completedTopicIds.includes(t.id)),'ALL_TUTORIAL_TOPICS_REQUIRED');need(time(acknowledgment.acceptedAt)>=time(review.preparedAt)&&time(acknowledgment.acceptedAt)<=now,'INVALID_ACKNOWLEDGMENT_TIME');
 const fresh=await prepare(context,review.request);need(fresh.reviewHash===reviewHash,'REVIEW_CHANGED_OR_TAMPERED');
 return {nextInput:clone(review.sourceState.input),nextPlan:clone(review.sourceState.plan),tutorialReceipt:{id:context.receiptId,ownerId:context.ownerId,projectId:context.projectId,...clone(acknowledgment),recordedAt:confirmedAt,reviewHash,sourceMode:'manual',documentsStatus:'beta-review-pending'}};
}
module.exports=Object.freeze({prepare,confirm});
