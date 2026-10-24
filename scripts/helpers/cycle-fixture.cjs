const path=require('node:path').resolve(__dirname,'../..')+'/';
const rules=require(path+'rules/kraken/eea-pf-xbtusd-20261021.json');
const uuid=n=>'00000000-0000-4000-a000-'+String(n).padStart(12,'0'),now='2026-10-20T23:40:00Z';
function event(n,type,facts){return {id:uuid(n+100),project_id:uuid(1),owner_id:uuid(2),scenario_key:'manual_long',origin:'manual',schema_version:1,revision:String(n),idempotency_key:'event-'+n,event_type:type,effective_at:'2026-10-20T23:35:00Z',recorded_at:'2026-10-20T23:35:00Z',facts};}
const input=(capital='2000')=>({projectId:uuid(1),ownerId:uuid(2),scenarioKey:'manual_long',platform:'europa',clientType:'retail',rules,valuation:{kind:'synthetic',source:'test',markPriceUSD:'100000',asOf:now},events:[event(1,'opening_balance',{amountUSD:capital,currency:'USD'})],reservations:{ordersUSD:'0',marginUSD:'0',protectedUSD:'100'}});
const plan=()=>({id:uuid(20),projectId:uuid(1),ownerId:uuid(2),scenarioKey:'manual_long',version:'1',profile:'balanced',referencePriceUSD:'100000',referenceAt:'2026-10-20T23:35:00Z',protectionFloorUSD:'80000',configuration:{cycleInventory:[]}});
const policy=()=>({maxCycles:12,nominalCycleBudgetUSD:'1000',firstEntryPriceUSD:'100000',reinforcementSpacingUSD:'1000',cycleSpacingUSD:'100',feeRate:'0.0005',upPriceUSD:'120000',minimumBufferUSD:'10',protectedCashUSD:'100',fundingReserveUSD:'10',externalOrderReserveUSD:'0',externalMarginReserveUSD:'0',marginPlacement:'before-each-buy',requireFailedMarginSurvival:true});
module.exports={uuid,event,input,plan,policy,now};
