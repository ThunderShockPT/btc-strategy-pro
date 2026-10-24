/* BTC Strategy Pro v19 — deterministic offline wallet-plan mathematics.
 * All prices are hypothetical; no account, network or exchange access. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={};vm.runInNewContext(fs.readFileSync('wallet-planner.js','utf8'),ctx);
const plan=ctx.BTCWalletPlanner.estimate;
let count=0;function check(value,msg){assert.ok(value,msg);count++}
const base=plan({capital:2000,protectPrice:60000});
check(base.amounts.length===3,'Three stages');
check(base.amounts[0]===200&&base.amounts[1]===300&&base.amounts[2]===500,'20/30/50 ratios on 2000 USD default');
check(base.nominalTotal===5000,'Five cycles are considered');
check(base.margin===1400&&base.reserve===600,'70% stress-margin and 30% cash reserve');
check(base.bufferAtProtection>=base.minimumBuffer-.02,'Protect floor buffer guaranteed only in modeled stress');
check(base.exposureMultiple<=2.5,'Maximum nominal position relative to cash');
const low=plan({capital:2000,protectPrice:40000});
check(low.nominalTotal<base.nominalTotal,'Lower protected price produces smaller suggested exposures');
check(low.bufferAtProtection>=low.minimumBuffer-.03,'Stress buffer at the lower floor');
for(const cap of [100,500,1500,5000,10000,50000,100000]){
 for(const floor of [20000,40000,50000,60000,65000,70000]){
  const x=plan({capital:cap,protectPrice:floor});
  check(x.safeUnderAssumptions,'Stress model should pass its own floor test');
  check(x.bufferAtProtection>=x.minimumBuffer-.05,'Minimum collateral buffer retained');
  check(x.reserve>=cap*.3-.01,'Out-of-margin cash reserve');
  check(x.nominalTotal<=cap*2.5+.05,'Notional budget cap');
  check(Math.abs(x.amounts.reduce((a,b)=>a+b,0)*5-x.nominalTotal)<.01,'All 5 cycles accounted');
  check(x.amounts.every(v=>Number.isFinite(v)&&v>0),'Leg amounts positive');
 }
}
for(const bad of [
 {capital:99,protectPrice:50000},
 {capital:NaN,protectPrice:50000},
 {capital:2000,protectPrice:81000},
 {capital:2000,protectPrice:0},
 {capital:2000,protectPrice:90000},
 {capital:2000,protectPrice:60000,gap:100000}
]){assert.throws(()=>plan(bad));count++}
console.log('BTC Wallet Planner: '+count+' numeric safety checks PASS — 5 cycles, 20/30/50, capital reserve, protection floor.');
