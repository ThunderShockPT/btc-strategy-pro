'use strict';
const {createHash}=require('node:crypto'),Decimal=require('decimal.js'),Rules=require('../kraken-rules.js'),Context=require('./financial-context.cjs'),O=require('./public-observations.cjs'),Ticker=require('./public-market.cjs'),P=require('./persistence-contract.cjs'),approved=require('../policies/public-liquidity-20261021.json');
const D=Decimal.clone({precision:80,toExpNeg:-100,toExpPos:100}),clone=v=>JSON.parse(P.canonical(v)),need=(v,c)=>{if(!v)throw Error(c);},hash=v=>createHash('sha256').update(P.canonical(v)).digest('hex');
function instant(v){need(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v),'INVALID_PROFILE_CONTEXT_TIME');const n=Date.parse(v);need(Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===v.slice(0,19),'INVALID_PROFILE_CONTEXT_TIME');return n;}
function scope(s,input){need(s?.scenarioKey==='manual_long'&&input?.scenarioKey===s.scenarioKey&&input.ownerId===s.ownerId&&input.projectId===s.projectId,'MANUAL_CONTEXT_SCOPE_REQUIRED');}
const key=(s,input)=>hash({scope:s,rules:input.rules,valuation:input.valuation});
function assemble(snapshot,quote,rules,at){
 const policy=approved;need(policy.status==='owner-approved'&&policy.ownerDecision.selectedOption===1&&policy.symbol==='PF_XBTUSD'&&policy.basis==='best-visible-ask-only','LIQUIDITY_POLICY_NOT_APPROVED');
 const n=instant(at),b=snapshot?.book,h=snapshot?.history;need(b?.source===O.BOOK_URL&&h?.source===O.HISTORY_URL&&b.symbol==='PF_XBTUSD'&&h.symbol==='PF_XBTUSD'&&b.currency==='USD'&&h.currency==='USD'&&b.sizeUnit==='contract-size-as-reported'&&h.priceKind==='mark'&&h.resolutionSeconds===60,'TRUSTED_PUBLIC_OBSERVATIONS_REQUIRED');
 for(const t of [b.observedAt,h.observedThrough])need(instant(t)<=n&&n-instant(t)<=60000,'CURRENT_PUBLIC_OBSERVATIONS_REQUIRED');for(const t of [snapshot.receivedAt,b.receivedAt,h.receivedAt])need(instant(t)<=n,'FUTURE_PUBLIC_OBSERVATION_RECEIPT');
 // Revalidate the complete normalized observations; never trust a separately supplied bestAsk summary.
 const book=O.parseBook({result:'success',serverTime:b.observedAt,orderBook:{asks:b.asks.map(x=>[x.priceUSD,x.size]),bids:b.bids.map(x=>[x.priceUSD,x.size])}},at);
 need(Array.isArray(h.candles)&&h.candles.every(c=>instant(c.endAt)===instant(c.startAt)+60000),'INVALID_PUBLIC_CANDLE_BOUNDARY');
 const history=O.parseHistory({more_candles:false,candles:h.candles.map(c=>({time:instant(c.startAt),open:c.openMarkUSD,high:c.highMarkUSD,low:c.lowMarkUSD,close:c.closeMarkUSD}))},at);
 need(history.observedThrough===h.observedThrough,'PUBLIC_HISTORY_BOUNDARY_MISMATCH');
 need(quote.source===Ticker.URL_TICKER&&quote.symbol==='PF_XBTUSD'&&quote.currency==='USD','TRUSTED_PUBLIC_SOURCE_REQUIRED');
 const q=instant(quote.observedAt);need(q>=instant(book.observedAt)&&q>=instant(history.observedThrough)&&q<=n&&n-q<=60000&&instant(quote.receivedAt)>=q&&instant(quote.receivedAt)<=n,'INCOHERENT_PUBLIC_PROFILE_TIMES');
 need(rules.symbol==='PF_XBTUSD'&&rules.product==='linear-multi-m-perpetual'&&rules.base==='BTC'&&rules.quote==='USD'&&rules.instrument.contractSize===policy.supportedContractSizeBTC,'UNSUPPORTED_PUBLIC_SIZE_MAPPING');
 const price=new D(book.bestAsk.priceUSD),quantity=new D(book.bestAsk.size).mul(rules.instrument.contractSize),tick=new D(rules.instrument.priceTick),step=new D(rules.instrument.quantityStep);
 need(price.mod(tick).isZero()&&new D(book.bestBid.priceUSD).mod(tick).isZero()&&quantity.gte(rules.instrument.minQuantity)&&quantity.mod(step).isZero(),'PUBLIC_BOOK_CONTRACT_PRECISION_MISMATCH');
 const askDepthUSD=price.mul(quantity).toFixed();
 const validUntil=new Date(Math.min(q+60000,instant(book.observedAt)+60000,instant(history.observedThrough)+60000,instant(rules.observedAt)+rules.applicationPolicy.reviewMaxAgeSeconds*1000)).toISOString();
 return {kind:'manual-public-observation',symbol:'PF_XBTUSD',currency:'USD',source:O.BOOK_URL,observedAt:book.observedAt,validUntil,bidUSD:book.bestBid.priceUSD,askUSD:book.bestAsk.priceUSD,askDepthUSD,
  observations:history.candles.map(c=>({at:c.endAt,priceUSD:c.closeMarkUSD})),
  provenance:{liquidityPolicyVersion:policy.version,liquidityBasis:policy.basis,bestAskReportedSize:book.bestAsk.size,bestAskQuantityBTC:quantity.toFixed(),eligibleVisibleNotionalUSD:askDepthUSD,contractSizeBTC:rules.instrument.contractSize,ruleVersion:rules.version,
   bookSource:book.source,bookObservedAt:book.observedAt,historySource:history.source,historyObservedThrough:history.observedThrough,tickerSource:quote.source,tickerObservedAt:quote.observedAt,observationKind:'closed-one-minute-mark-candle-closes',
   limitations:[...policy.limitations,...history.limitations,'CLOSE_SAMPLES_CAN_MISS_INTRAMINUTE_DRAWDOWN','OBSERVATIONS_ARE_NOT_A_VOLATILITY_FORECAST']}};
}
function create({market,observations,rulesProvider,baseCyclePolicyProvider,now=()=>new Date().toISOString(),maxContexts=128}){
 need(typeof market?.snapshot==='function'&&typeof observations?.snapshot==='function'&&[rulesProvider,baseCyclePolicyProvider,now].every(x=>typeof x==='function')&&Number.isInteger(maxContexts)&&maxContexts>=1&&maxContexts<=1000,'PUBLIC_PROFILE_DEPENDENCIES_REQUIRED');const contexts=new Map();
 function purge(n){for(const [k,v]of contexts)if(n>=v.expires||n<v.created)contexts.delete(k);}
 async function contextProvider(s,raw){const input=clone(raw);scope(s,input);const rules=Rules.load(clone(await rulesProvider())),data=await observations.snapshot(),notBefore=new Date(Math.max(instant(rules.observedAt),instant(data.book.observedAt),instant(data.history.observedThrough))).toISOString(),quote=await market.snapshot({notBefore});
  const context=await Context.create({market:{snapshot:async()=>quote},rulesProvider:async()=>rules,now})(s,input),at=now(),publicMarket=assemble(data,quote,rules,at),n=instant(at),expires=Math.min(instant(quote.observedAt)+60000,instant(publicMarket.observedAt)+60000,instant(data.history.observedThrough)+60000,instant(rules.observedAt)+rules.applicationPolicy.reviewMaxAgeSeconds*1000);
  need(expires>n,'PUBLIC_PROFILE_CONTEXT_EXPIRED');const k=key(s,{...input,...context});purge(n);const prior=contexts.get(k);need(!prior||hash(prior.market)===hash(publicMarket),'PUBLIC_PROFILE_CONTEXT_COLLISION');need(prior||contexts.size<maxContexts,'PUBLIC_PROFILE_CONTEXT_LIMIT');
  if(!prior)contexts.set(k,{market:clone(publicMarket),created:n,expires});return context;
 }
 async function planContextProvider(s,raw){const input=clone(raw);scope(s,input);const n=instant(now());purge(n);const entry=contexts.get(key(s,input));need(entry&&n<entry.expires,'PUBLIC_PROFILE_CONTEXT_NOT_FOUND');const baseCyclePolicy=clone(await baseCyclePolicyProvider(s,clone(input)));need(instant(now())<entry.expires,'PUBLIC_PROFILE_CONTEXT_EXPIRED');return {market:clone(entry.market),baseCyclePolicy};}
 return Object.freeze({contextProvider,planContextProvider});
}
module.exports=Object.freeze({create,assemble});
