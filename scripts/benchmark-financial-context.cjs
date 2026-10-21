'use strict';
// Synthetic local benchmark. This is not a hosted Deno/SQL load test.
const Core=require('../financial-engine.js'),Cycles=require('../cycle-planner.js'),f=require('./helpers/cycle-fixture.cjs');
function measure(name,run){run();const samples=[];for(let i=0;i<5;i++){const cpu=process.cpuUsage(),wall=performance.now();run();const elapsed=process.cpuUsage(cpu);samples.push({wallMs:performance.now()-wall,cpuMs:(elapsed.user+elapsed.system)/1000});}return {name,samples,maximumWallMs:Math.max(...samples.map(s=>s.wallMs)),maximumCpuMs:Math.max(...samples.map(s=>s.cpuMs))};}
const results=[];
for(const count of [100,1000,5000]){const input=f.input();for(let n=2;n<=count;n++)input.events.push(f.event(n,'capital_deposit',{amountUSD:'1',currency:'USD'}));results.push(measure('reconstruct-'+count+'-events',()=>Core.reconstruct(input)));}
results.push(measure('strict-cycle-search-limit-12',()=>Cycles.generate(f.input(),f.plan(),f.policy())));
console.log(JSON.stringify({kind:'synthetic-local-node-benchmark',recordedAt:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,iterations:5,includes:['decimal-engine','ledger-reconstruction','strict-cycle-search'],excludes:['hosted-Deno','SQL','Auth','HTTP','network','concurrent-users'],results},null,2));
