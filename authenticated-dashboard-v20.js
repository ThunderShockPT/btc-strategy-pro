/* BTC Strategy Pro R5.1 — authenticated, owner-scoped READ-ONLY dashboard projection.
 * Reuses the verified V20 CloudClient and original financial ledger, never a Demo snapshot.
 * No RPC writes, no trading and no Supabase service-role key.
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./financial-engine.js'),require('./kraken-rules.js'));
 else root.BTCAuthenticatedDashboardV20=factory(root.BTCFinancialEngine,root.BTCKrakenRules);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Rules){
 'use strict';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const SHA=/^[0-9a-f]{64}$/i;
 const VALID_SCENARIOS=['manual_long','demo_long'];
 const clone=v=>JSON.parse(JSON.stringify(v));
 function deepFreeze(v){if(v&&typeof v==='object'){for(const x of Object.values(v))deepFreeze(x);Object.freeze(v);}return v;}
 function validId(v){return typeof v==='string'&&UUID.test(v);}
 const failure=(code)=>{const e=new Error(code);e.code=code;return e;};
 function need(ok,code){if(!ok)throw failure(code);}
 const isExactMoney=s=>typeof s==='string'&&/^-?(0|[1-9]\d{0,19})(\.\d{1,24})?$/.test(s);
 function create({client,getVerifiedOwner,clock=()=>new Date().toISOString(),maxQuoteAgeSeconds=90,core=Core,rulesApi=Rules}={}){
  need(client&&typeof client.read==='function'&&typeof client.state==='function'&&typeof client.clearSession==='function','R5_CLIENT_REQUIRED');
  need(typeof getVerifiedOwner==='function'&&typeof clock==='function'&&core&&typeof core.reconstruct==='function'&&rulesApi&&typeof rulesApi.assess==='function','R5_VERIFICATION_REQUIRED');
  need(Number.isSafeInteger(maxQuoteAgeSeconds)&&maxQuoteAgeSeconds>0&&maxQuoteAgeSeconds<=3600,'R5_INVALID_AGE_LIMIT');
  let generation=0,last=null,loading=false,phase='idle';
  function clear(){generation++;last=null;phase='signed-out';client.clearSession();}
  function peek(){return deepFreeze({phase,hasVerifiedData:last!==null,data:last?clone(last):null});}
  async function verified(){
   const identity=await getVerifiedOwner();
   need(identity&&validId(identity.id)&&identity.emailConfirmed===true&&identity.isAnonymous===false,'R5_VERIFIED_USER_REQUIRED');
   return identity.id.toLowerCase();
  }
  async function read(){
   need(!loading,'R5_READ_ALREADY_RUNNING');
   const ticket=++generation;loading=true;last=null;phase='loading';
   try{
    const owner=await verified();need(ticket===generation,'R5_SESSION_CHANGED');
    const fetched=await client.read();need(ticket===generation,'R5_SESSION_CHANGED');
    const after=await verified();need(ticket===generation&&after===owner,'R5_SESSION_CHANGED');
    const cstate=client.state();
    need(cstate.status==='synced'&&!cstate.hasPending&&!cstate.hasReview,'R5_CLOUD_NOT_READY');
    const scope={ownerId:owner,projectId:cstate.projectId,scenarioKey:cstate.scenarioKey};
    need(validId(scope.projectId)&&VALID_SCENARIOS.includes(scope.scenarioKey),'R5_SCOPE_INVALID');
    need(fetched&&typeof fetched==='object'&&fetched.state&&SHA.test(fetched.headHash)&&/^(0|[1-9]\d{0,18})$/.test(fetched.revision),'R5_SERVER_SNAPSHOT_INVALID');
    const s=fetched.state;need(s.input&&s.plan&&Array.isArray(s.input.events),'R5_PROJECT_PAYLOAD_INVALID');
    need(s.input.projectId?.toLowerCase()===scope.projectId.toLowerCase()&&s.input.ownerId?.toLowerCase()===scope.ownerId&&s.input.scenarioKey===scope.scenarioKey,'R5_OWNER_SCOPE_MISMATCH');
    need(s.plan.projectId?.toLowerCase()===scope.projectId.toLowerCase()&&s.plan.ownerId?.toLowerCase()===scope.ownerId&&s.plan.scenarioKey===scope.scenarioKey,'R5_PLAN_SCOPE_MISMATCH');
    need(typeof s.plan.version==='string'&&/^[1-9]\d{0,18}$/.test(s.plan.version),'R5_PLAN_VERSION_INVALID');
    const input=clone(s.input);input.bookkeepingOnly=true;
    const ledger=core.reconstruct(input);
    need(ledger&&ledger.cash&&ledger.pnl&&ledger.margin&&ledger.position&&ledger.capital,'R5_LEDGER_INVALID');
    for(const field of ['walletUSD','spendableUSD','isolatedMarginUSD','protectedUSD'])
     need(isExactMoney(ledger.cash[field])&&!ledger.cash[field].startsWith('-'),'R5_CASH_INVALID');
    const now=clock(),observed=s.input.valuation?.asOf;
    need(typeof now==='string'&&Number.isFinite(Date.parse(now))&&typeof observed==='string'&&Number.isFinite(Date.parse(observed)),'R5_VALUATION_TIMESTAMP_INVALID');
    const quoteAgeMs=Date.parse(now)-Date.parse(observed);
    const quoteCurrent=quoteAgeMs>=0&&quoteAgeMs<=maxQuoteAgeSeconds*1000;
    let rulesCurrent=false,ruleReasons=['RULES_NOT_CHECKED'];
    try{
     const eligibility=rulesApi.assess(rulesApi.load(s.input.rules),{now,symbol:'PF_XBTUSD',jurisdiction:'EEA',marginMode:'isolated',selectedLeverage:'10',platform:s.input.platform,clientType:s.input.clientType,collateralCurrency:'USD'});
     rulesCurrent=eligibility.scopeReady===true;ruleReasons=eligibility.reasons;
    }catch{ruleReasons=['R5_RULE_VALIDATION_UNAVAILABLE'];}
    const marketCurrent=quoteCurrent&&rulesCurrent;
    const shared={ownerScoped:true,projectId:scope.projectId,scenarioKey:scope.scenarioKey,
     source:'V20_AUTHENTICATED_ATOMIC_STATE',headHash:fetched.headHash,revision:fetched.revision,
     planVersion:s.plan.version,valuationAsOf:observed,checkedAt:now,quoteCurrent,rulesCurrent,
     riskAdmissible:false,mayWriteLedger:false,maySubmitOrders:false,
     attention:marketCurrent?'FINANCIAL_POLICY_REVIEW_REQUIRED':'STALE_MARKET_OR_RULES',
     ruleReasons};
    const financial={walletUSD:ledger.cash.walletUSD,freeCashUSD:ledger.cash.spendableUSD,
     isolatedMarginUSD:ledger.cash.isolatedMarginUSD,protectedCashUSD:ledger.cash.protectedUSD,
     reservedMarginUSD:ledger.cash.reservedMarginUSD,reservedOrdersUSD:ledger.cash.reservedOrdersUSD,
     positionQuantityBTC:ledger.position.quantityBTC,averageEntryUSD:ledger.position.averageEntryUSD,
     realizedPnLUSD:ledger.pnl.realizedGrossUSD,unrealizedPnLUSD:ledger.pnl.unrealizedGrossUSD,
     isolatedEquityUSD:ledger.margin.isolatedEquityUSD,bookEquityUSD:ledger.pnl.totalEquityUSD,
     canAffordFuturePurchase:null,buyingPowerOfficialUSD:null};
    const plan={profile:s.plan.profile,riskFloorUSD:s.plan.protectionFloorUSD,
     referencePriceUSD:s.plan.referencePriceUSD,version:s.plan.version,status:'saved-not-reapproved'};
    const result=deepFreeze({schemaVersion:1,status:marketCurrent?'authenticated-historical-scope-checked':'authenticated-bookkeeping-only',
     shared,financial,plan,
     menus:{inicio:{cashUSD:financial.freeCashUSD},estrategias:{planVersion:plan.version,profile:plan.profile},mercado:{valuationAsOf:observed,quoteCurrent},risco:{isolatedEquityUSD:financial.isolatedEquityUSD,calcApproved:false},conta:{projectId:scope.projectId,revision:fetched.revision}},
     journal:{eventCount:s.input.events.length,recordedOnly:true},
     warnings:['Cash is derived from the authenticated V20 ledger and entered transactions, not a Kraken account connection.',
       'Unrealized isolated losses affect position equity and do not automatically debit free wallet cash twice.',
       'The source snapshot is read-only; there is no policy approval or confirmed exchange buying power.',
       ...(marketCurrent?[]:['Quote or Kraken rule snapshots are stale; do not treat this as current trading capacity.'])]});
    need(ticket===generation,'R5_SESSION_CHANGED');last=result;phase='ready';return clone(result);
   }catch(error){
    last=null;phase=error?.code==='R5_SESSION_CHANGED'?'session-changed':'blocked';
    throw error;
   }finally{loading=false;}
  }
  return Object.freeze({read,peek,clear});
 }
 function verifiedOwnerFromSupabase(supabase){
  need(supabase?.auth&&typeof supabase.auth.getUser==='function','R5_AUTH_REQUIRED');
  return async()=>{
   const result=await supabase.auth.getUser();if(result.error)throw failure('R5_VERIFIED_USER_REQUIRED');
   const u=result.data?.user;
   return {id:u?.id,emailConfirmed:typeof u?.email_confirmed_at==='string'&&Number.isFinite(Date.parse(u.email_confirmed_at)),
     isAnonymous:u?.is_anonymous===true};
  };
 }
 return Object.freeze({create,verifiedOwnerFromSupabase});
});