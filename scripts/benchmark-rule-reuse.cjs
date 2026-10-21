'use strict';
// The argument must point to a separate checkout of the documented reference commit.
// No performance threshold is asserted: Node timings do not approve hosted Deno load.
const path=require('node:path'),crypto=require('node:crypto'),before=require(path.resolve(process.argv[2]||'missing-reference-checkout','cycle-planner.js')),after=require('../cycle-planner.js'),f=require('./helpers/cycle-fixture.cjs');
function canonical(v){return v&&typeof v==='object'?Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);}
const hash=v=>crypto.createHash('sha256').update(canonical(v)).digest('hex');
const results=[];
for(const capital of ['2000','50000']){
 const input=f.input(capital),plan=f.plan(),policy=f.policy(),expected=hash(before.generate(input,plan,policy));
 if(hash(after.generate(input,plan,policy))!==expected)throw Error('BASELINE_RESULT_MISMATCH');
 const samples=[];
 for(const implementation of ['before','after','after','before','before','after']){const fn=implementation==='before'?before:after,cpu=process.cpuUsage(),wall=performance.now(),result=fn.generate(input,plan,policy),elapsed=process.cpuUsage(cpu);samples.push({implementation,wallMs:performance.now()-wall,cpuMs:(elapsed.user+elapsed.system)/1000});if(hash(result)!==expected)throw Error('PAIRED_RESULT_MISMATCH');}
 const summary=implementation=>{const s=samples.filter(v=>v.implementation===implementation);return{maximumCpuMs:Math.max(...s.map(v=>v.cpuMs)),meanCpuMs:s.reduce((n,v)=>n+v.cpuMs,0)/s.length,maximumWallMs:Math.max(...s.map(v=>v.wallMs))};};
 const a=summary('before'),b=summary('after');results.push({capitalUSD:capital,configuredLimit:12,outputSHA256:expected,before:a,after:b,meanCpuReductionPercent:100*(1-b.meanCpuMs/a.meanCpuMs),samples});
}
console.log(JSON.stringify({kind:'paired-synthetic-local-node-benchmark',referenceCommit:'d4731ee408dcd11ea20c043c499e7eb924aef88b',recordedAt:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,iterationsPerImplementation:3,fullOutputsEqual:true,excludes:['hosted-Deno','SQL','Auth','HTTP','network','concurrent-users','large-preexisting-journal'],results},null,2));
