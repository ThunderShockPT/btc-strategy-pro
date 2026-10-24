'use strict';
// Deliberately separate from the production release gate. Authentication alone
// never admits a visitor: both a server allowlist and live immutable app metadata
// are required, including inside every financial transaction.
const {createHmac}=require('node:crypto'),HTTP=require('./http-api.cjs'),Auth=require('./supabase-auth.cjs'),Database=require('./pg-database.cjs'),Admission=require('./request-admission.cjs'),Store=require('./atomic-store.cjs'),Checkpoints=require('./calculation-checkpoints.cjs'),Jobs=require('./calculation-jobs.cjs');
const Public=require('./public-profile-context.cjs'),Market=require('./public-market.cjs'),Observations=require('./public-observations.cjs'),Rules=require('./public-rules.cjs'),Core=require('../financial-engine.js'),baseCyclePolicy=require('../policies/manual-cycle-base-20261024.json');
const PREFIX='/functions/v1/btcsp-v20-private-test',ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function configuration({ownerIds,accessTag}){if(!Array.isArray(ownerIds)||ownerIds.length<1||ownerIds.length>10||ownerIds.some(x=>!ID.test(x))||new Set(ownerIds).size!==ownerIds.length||typeof accessTag!=='string'||!/^[a-f0-9]{32}$/.test(accessTag))throw Error('PRIVATE_TEST_CONFIGURATION_REQUIRED');}
function create({getEnv,Pool,ownerIds,accessTag,origins,fetchImpl=globalThis.fetch,now=()=>new Date().toISOString()}){
 configuration({ownerIds,accessTag});const allowed=new Set(ownerIds);let services=null;
 function live(){
  if(services)return services;if(getEnv('SUPABASE_URL')!==Auth.URL_BASE)throw Error('CLOUD_CONFIGURATION_INCOMPLETE');
  const secret=getEnv('SUPABASE_SERVICE_ROLE_KEY');if(typeof secret!=='string'||secret.length<32)throw Error('CLOUD_CONFIGURATION_INCOMPLETE');
  const derive=label=>createHmac('sha256',secret).update('btcsp-private-test:'+accessTag+':'+label).digest();
  const keys=JSON.parse(getEnv('SUPABASE_PUBLISHABLE_KEYS')||'{}'),publishableKey=keys.default||getEnv('SUPABASE_ANON_KEY'),verified=Auth.create({publishableKey,fetchImpl,now:()=>Date.parse(now())});
  const auth={authenticate:async token=>{const u=await verified.authenticate(token);if(!allowed.has(u.id))throw Error('SESSION_NOT_VALID');return u;},assertSession:async(tx,u,s)=>{await verified.assertSession(tx,u,s);const r=await tx.query("select id from auth.users where id=$1 and id=any($2::uuid[]) and raw_app_meta_data->>'btcsp_private_test'=$3 for share",[u.id,ownerIds,accessTag]);if(r.rows.length!==1)throw Error('SESSION_NOT_VALID');}};
  const connection=new URL(getEnv('SUPABASE_DB_URL'));if(['disable','prefer'].includes(connection.searchParams.get('sslmode')))connection.searchParams.set('sslmode','verify-full');
  const db=Database.create({Pool,connectionString:connection.toString()}),admit=Admission.create({db,key:derive('admission')}),signingKey=derive('calculation');
  const rules=Rules.create({fetchImpl,now}),market=Market.create({fetchImpl,now}),observations=Observations.create({fetchImpl,now});
  function providers(){
   const pair=Public.create({market,observations,rulesProvider:rules.snapshot,baseCyclePolicyProvider:async()=>({...baseCyclePolicy}),now});
   const setupContextProvider=async()=>{const r=await rules.snapshot(),data=await observations.snapshot(),notBefore=new Date(Math.max(Date.parse(data.book.observedAt),Date.parse(data.history.observedThrough))).toISOString(),q=await market.snapshot({notBefore}),at=now();return {now:at,rules:r,valuation:{kind:'public_mark',source:q.source,markPriceUSD:q.markPriceUSD,asOf:q.observedAt},market:Public.assemble(data,q,r,at),baseCyclePolicy:{...baseCyclePolicy}};};
   return {...pair,setupContextProvider};
  }
  services={db,auth,admit,signingKey,providers};return services;
 }
 return async(request,info)=>{
  const url=new URL(request.url),base=[PREFIX,'/btcsp-v20-private-test'].find(p=>url.pathname===p||url.pathname.startsWith(p+'/'));
  if(!base)return Response.json({code:'API_ROUTE_NOT_FOUND'},{status:404,headers:{'Cache-Control':'no-store'}});
  let response;try{const service=live(),context=service.providers(),{db,auth,admit,signingKey}=service;
   const calculationJobsFactory=options=>{const store=Store.create({...options,...context});const checkpoints=Checkpoints.create({key:signingKey,enabled:true,now,loadSnapshot:(t,s)=>store.calculationSnapshot(t,s),loadBasis:(t,s)=>store.calculationBasis(t,s),contextProvider:context.contextProvider,policyProvider:async(s,i)=>{const p=await context.planContextProvider(s,i);return p.cyclePolicy;},profileContextProvider:context.planContextProvider});return Jobs.create({...options,checkpoints,enabled:true});};
   const handler=HTTP.create({db,auth,...context,calculationJobsFactory,availability:()=>true,observeError:event=>console.warn(JSON.stringify({kind:"btcsp-private-error",...event})),now,admit,origins,enabled:true});url.pathname='/api/v20'+url.pathname.slice(base.length);response=await handler(new Request(url,request),{remoteAddress:info?.remoteAddr?.hostname});
   if(response.ok&&url.pathname==='/api/v20/state'&&request.method==='POST'){
    const body=await response.json(),input=body.result.state.input,ledger=Core.reconstruct({...input,bookkeepingOnly:true});
    body.result.recordedSummary={capitalUSD:ledger.capital.netContributedUSD,walletUSD:ledger.cash.walletUSD,marginUSD:ledger.cash.isolatedMarginUSD,spendableUSD:ledger.cash.spendableUSD,quantityBTC:ledger.position.quantityBTC,averageEntryUSD:ledger.position.averageEntryUSD,ordersReserveUSD:ledger.cash.orderReserveUSD??input.reservations.ordersUSD,marginReserveUSD:input.reservations.marginUSD,protectedUSD:ledger.cash.protectedUSD,realizedGrossUSD:ledger.pnl.realizedGrossUSD,feesPaidUSD:ledger.pnl.feesPaidUSD,valuationAsOf:input.valuation.asOf,markPriceUSD:input.valuation.markPriceUSD};
    response=Response.json(body,{status:response.status,headers:response.headers});
   }
  }catch{return Response.json({code:'PRIVATE_TEST_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
  response.headers.set('X-BTCSP-Environment','private-test');response.headers.set('X-BTCSP-Production-Approved','false');return response;
 };
}
module.exports=Object.freeze({create,configuration,PREFIX});
