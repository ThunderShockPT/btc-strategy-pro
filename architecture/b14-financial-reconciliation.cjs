'use strict';
/*
 * B14.2 — read-only independent arithmetic reconciliation against V20 ledger.
 * Never changes a plan, executes a trade, accepts orders, saves a wallet or
 * estimates an official Kraken liquidation price.
 * Inputs are vetted by Core; oracle replay independently rebuilds accounting
 * from Core's audited effective event journal (corrections projected once).
 */
const Decimal=require('decimal.js'),Core=require('../financial-engine.js'),Risk=require('../position-risk.js');
const D=Decimal.clone({precision:80,rounding:Decimal.ROUND_HALF_EVEN,toExpNeg:-100,toExpPos:100});
const Z=new D(0),TOL=new D('0.000000000000000000001'),freeze=x=>Object.freeze(x);
const n=x=>new D(x);
const out=x=>x.toDecimalPlaces(18,D.ROUND_HALF_EVEN).toFixed();
function check(label,actual,expected){
 const delta=n(actual).sub(expected);
 return freeze({name:label,pass:delta.abs().lte(TOL),differenceUSD:out(delta),
  expectedUSD:out(expected),actualUSD:out(n(actual))});
}
function audit(input){
 const before=JSON.stringify(input);
 const {ledger,effectiveEvents}=Core.reconstructWithEvents(input);
 if(!ledger.ruleAssessment.scopeReady||ledger.ruleAssessment.syntheticFrozenRules)
  return freeze({status:'blocked-unverified-rules',reason:'FINANCIAL_RULES_NOT_CURRENT_OR_SYNTHETIC',
   checks:freeze([]),officialKrakenLiquidation:false,financialRecommendation:false,
   ordersAllowed:false,source:ledger.ruleVersion});
 const events=[...effectiveEvents].sort((a,b)=>
  Date.parse(a.effective_at)-Date.parse(b.effective_at)||
  (BigInt(a.revision)<BigInt(b.revision)?-1:BigInt(a.revision)>BigInt(b.revision)?1:0));
 let wallet=Z,margin=Z,quantity=Z,basis=Z,realized=Z,fees=Z,funding=Z,capital=Z;
 for(const e of events){
  const f=e.facts;switch(e.event_type){
   case 'opening_balance':wallet=wallet.add(f.amountUSD);capital=capital.add(f.amountUSD);break;
   case 'capital_deposit':wallet=wallet.add(f.amountUSD);capital=capital.add(f.amountUSD);break;
   case 'capital_withdrawal':wallet=wallet.sub(f.amountUSD);capital=capital.sub(f.amountUSD);break;
   case 'margin_add':wallet=wallet.sub(f.amountUSD);margin=margin.add(f.amountUSD);break;
   case 'margin_remove':margin=margin.sub(f.amountUSD);wallet=wallet.add(f.amountUSD);break;
   case 'trade_buy':{
    const q=n(f.quantityBTC);quantity=quantity.add(q);basis=basis.add(q.mul(f.priceUSD));break;
   }
   case 'trade_sell':{
    const q=n(f.quantityBTC),share=q.div(quantity),cost=basis.mul(share),gain=q.mul(f.priceUSD).sub(cost);
    quantity=quantity.sub(q);basis=quantity.eq(0)?Z:basis.sub(cost);
    realized=realized.add(gain);if(f.pnlDestination==='wallet')wallet=wallet.add(gain);else margin=margin.add(gain);
    break;
   }
   case 'fee':fees=fees.add(f.amountUSD);wallet=wallet.sub(f.amountUSD);break;
   case 'funding':{
    const flow=n(f.amountUSD).mul(f.direction==='paid'?-1:1);
    funding=funding.add(flow);wallet=wallet.add(flow);break;
   }
   default:throw Error('B142_UNSUPPORTED_EFFECTIVE_EVENT');
  }
 }
 const p=n(input.valuation.markPriceUSD),unrealized=quantity.mul(p).sub(basis);
 const equity=wallet.add(margin).add(unrealized),isolatedEquity=margin.add(unrealized);
 const tiers=input.rules.margin.schedules[input.platform][input.clientType];
 const tier=tiers.reduce((acc,x)=>basis.gte(x.lowerBoundUSD)?x:acc,tiers[0]);
 const im=basis.mul(D.max(n(tier.initialRate),new D('0.1')));
 const mm=basis.mul(tier.maintenanceRate),buffer=isolatedEquity.sub(mm);
 const reserve=input.reservations||{ordersUSD:'0',marginUSD:'0',protectedUSD:'0'};
 const free=wallet.sub(reserve.ordersUSD).sub(reserve.marginUSD).sub(reserve.protectedUSD);
 const boundary=quantity.gt(0)?basis.add(mm).sub(margin).div(quantity):null;
 const risk=Risk.estimate(input);
 const checks=[
  check('wallet-book-usd',ledger.cash.walletUSD,wallet),
  check('isolated-margin-usd',ledger.cash.isolatedMarginUSD,margin),
  check('net-capital-usd',ledger.capital.netContributedUSD,capital),
  check('remaining-basis-usd',ledger.position.remainingBasisUSD,basis),
  check('quantity-btc',ledger.position.quantityBTC,quantity),
  check('realized-pnl-usd',ledger.pnl.realizedGrossUSD,realized),
  check('fees-usd',ledger.pnl.feesPaidUSD,fees),
  check('settled-funding-usd',ledger.pnl.fundingNetUSD,funding),
  check('unrealized-pnl-usd',ledger.pnl.unrealizedGrossUSD,unrealized),
  check('account-equity-usd',ledger.pnl.totalEquityUSD,equity),
  check('isolated-equity-usd',ledger.margin.isolatedEquityUSD,isolatedEquity),
  check('maintenance-margin-usd',ledger.margin.maintenanceRequiredUSD,mm),
  check('initial-margin-usd',ledger.margin.initialRequiredUSD,im),
  check('maintenance-buffer-usd',ledger.margin.maintenanceBufferUSD,buffer),
  check('spendable-after-reservations-usd',ledger.cash.spendableUSD,D.max(Z,free)),
  check('conservation-usd',equity,capital.add(realized).add(unrealized).sub(fees).add(funding)),
  check('risk-maintenance-buffer-usd',risk.maintenanceBufferUSD,buffer)
 ];
 if(boundary!==null&&boundary.gt(0)&&risk.estimatedPriceUSD!==null)
  checks.push(check('model-maintenance-boundary-usd',risk.estimatedPriceUSD,boundary));
 else if(quantity.eq(0)&&risk.estimatedPriceUSD!==null)
  throw Error('B142_EMPTY_POSITION_HAS_BOUNDARY');
 else if(boundary!==null&&boundary.lte(0)&&risk.estimatedPriceUSD!==null)
  throw Error('B142_NONPOSITIVE_BOUNDARY_FABRICATED');
 if(JSON.stringify(input)!==before)throw Error('B142_INPUT_MUTATED');
 return freeze({status:checks.every(c=>c.pass)?'model-arithmetic-consistent':'model-arithmetic-mismatch',
  checks:freeze(checks),summary:freeze({walletUSD:out(wallet),isolatedMarginUSD:out(margin),
   freeCashUSD:out(D.max(Z,free)),positionQuantityBTC:out(quantity),
   remainingBasisUSD:out(basis),markPriceUSD:out(p),realizedPnLUSD:out(realized),
   unrealizedPnLUSD:out(unrealized),feesPaidUSD:out(fees),
   settledFundingNetUSD:out(funding),maintenanceUSD:out(mm),maintenanceBufferUSD:out(buffer),
   estimatedMaintenanceBoundaryUSD:boundary!==null&&boundary.gt(0)?out(boundary):null}),
  riskFlags:freeze(['MARK_NOT_VERIFIED','FUTURE_FUNDING_UNKNOWN','EEA_TIERS_ONLY_IN_DECLARED_SCENARIO',
   'PARTIAL_LIQUIDATION_AND_FEES_NOT_MODELED','GLOBAL_COLLATERAL_AND_FX_NOT_RECONCILED',
   'RULES_REQUIRE_LIVE_REVALIDATION']),
  officialKrakenLiquidation:false,financialRecommendation:false,ordersAllowed:false,
  accountConnection:false});
}
module.exports=freeze({audit});
