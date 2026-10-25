'use strict';
// Diagnostic golden tests, NOT a Kraken compliance or liquidation oracle.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../previews/v20-r1-capacity-20261025.html'),'utf8');
const ctx=vm.createContext({});
for(const id of ['calculation-engine','capacity-engine']) {
 const match=html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'));
 assert.ok(match,'missing '+id); vm.runInContext(match[1],ctx);
}
const E=ctx.BTCStrategyCompare,C=ctx.R1Capacity;
const run=(mode='classic',wallet=2000,profile='balanced',scenario='all')=>C.evaluate(E.generate({reference:80000,wallet,profile,pattern:mode,perCycle:1000,cycles:5}),{scenario,fundingReserveUSD:10});
const approx=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.02,'expected '+expected+' got '+actual);
test('lot and tick reference is 0.0001 BTC / 1 USD; 10x isolated assumptions',()=>{assert.equal(C.LOT,.0001);assert.equal(C.TICK,1);assert.equal(C.LEVERAGE,10);assert.equal(C.MAINT,.05)});
test('historical grid has a level AT the floor, rejected by the V20 strict rule',()=>{const x=run();assert.equal(x.orders,15);assert.equal(x.invalidFloor,1);assert.equal(x.verdict,'rejeitado-pelas-regras')});
test('clustered V20 is above stress floor but suffers larger model drawdown',()=>{const v=run('v20'),c=run();assert.equal(v.invalidFloor,0);assert.ok(v.estimatedLossAtFloorUSD<c.estimatedLossAtFloorUSD);approx(v.estimatedLossAtFloorUSD,-1143.27)});
test('conservative lot truncation never exceeds nominal entry allocation',()=>{for(const mode of ['v20','classic','spread'])for(const o of run(mode).levels){assert.ok(o.executableNominalUSD<=o.targetNominalUSD+1e-8);approx(o.quantityBTC/.0001,Math.round(o.quantityBTC/.0001));}});
test('1000 USD wallet cannot fully fund concentrated ladder and floor reserves',()=>{const x=run('v20',1000);assert.equal(x.verdict,'caixa-insuficiente');approx(x.cashShortfallUSD,558.77);approx(x.initialMarginUSD,496.53)});
test('2000 USD wallet covers modeled budget, not Kraken feasibility',()=>{const x=run('v20',2000);assert.equal(x.verdict,'cabe-nas-hipoteses');approx(x.requiredIsolatedMarginUSD,1356.28);approx(x.totalWalletRequiredUSD,1768.77)});
test('scenario of missed margin transfers does not invent trades',()=>{const x=run('v20',2000,'balanced','none');assert.equal(x.orders,0);assert.equal(x.requiredIsolatedMarginUSD,0);assert.equal(x.verdict,'sem-execucao')});
test('only initial buys may fill, with different exposure from all buys',()=>{const x=run('v20',2000,'balanced','first');assert.equal(x.orders,5);assert.ok(x.nominalUSD<run('v20').nominalUSD)});
test('the reserve percentage derives from selected profile',()=>{assert.equal(run('v20',2000,'safe').protectedCashUSD,600);assert.equal(run('v20',2000,'balanced').protectedCashUSD,400);assert.equal(run('v20',2000,'risky').protectedCashUSD,200)});
test('risky classic grid below floor is rejected even when budget might fit',()=>{const x=run('classic',2000,'risky');assert.ok(x.invalidFloor>0);assert.equal(x.verdict,'rejeitado-pelas-regras')});
