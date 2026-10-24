'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Handler=require('./qa/hosted-account-handler.cjs'),Runtime=require('../backend/edge-runtime.cjs'),f=require('./helpers/server-fixture.cjs'),{setup}=require('./helpers/account-fixture.cjs'),release=require('../policies/cloud-release-20261021.json');
const cap='a'.repeat(64),runId='a'.repeat(12),base='https://oftzqqjbwonngubihrsd.supabase.co';
const config=()=>({capHash:crypto.createHash('sha256').update(cap).digest('hex'),runId,expiresAt:new Date(Date.now()+10*60000).toISOString(),accounts:[{alias:'owner',id:f.A,projectId:f.P,email:`btc-qa-${runId}-owner@btcsp-qa.invalid`},{alias:'other',id:f.B,projectId:f.PB,email:`btc-qa-${runId}-other@btcsp-qa.invalid`}]});
const request=(path,body={},token=f.TA,capability=cap)=>new Request(base+Handler.PREFIX+path,{method:'POST',headers:{'Content-Type':'application/json','X-BTCSP-QA-Capability':capability,Authorization:'Bearer '+token,origin:'https://thundershockpt.github.io'},body:JSON.stringify(body)});
function env(k){return {SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:'synthetic-server-only-key',SUPABASE_DB_URL:'postgresql://postgres:qa@db.oftzqqjbwonngubihrsd.supabase.co:5432/postgres?sslmode=disable'}[k];}
test('QA requires its capability, expiry and fixed demo scope before runtime or administration',async()=>{
 let calls=0;const c=config(),h=Handler.create({config:c,getEnv:env,runtimeFactory:()=>{calls++;return async()=>Response.json({});},fetchImpl:async()=>{calls++;throw Error('no admin access expected');}});
 assert.equal((await h(request('/api/state',{projectId:f.P,scenarioKey:'demo_long'},f.TA,'b'.repeat(64)))).status,401);
 for(const body of [{projectId:f.uuid(999),scenarioKey:'demo_long'},{projectId:f.P,scenarioKey:'manual_long'}])assert.equal((await h(request('/api/state',body))).status,403);
 assert.equal((await h(request('/api/prepare',{projectId:f.P,scenarioKey:'demo_long',request:{workflow:'wallet-create',command:{setup:{projectTitle:'ordinary wallet'}}}}))).status,403);
 const expired=Handler.create({config:c,getEnv:env,now:()=>Date.parse(c.expiresAt)});assert.equal((await expired(request('/api/state'))).status,503);assert.equal(calls,0);assert.equal(release.financialCloudApproved,false);
});
test('QA administration creates only configured IDs without email and bans only accounts carrying the server run marker',async()=>{
 const c=config(),calls=[],users=new Map(),h=Handler.create({config:c,getEnv:env,fetchImpl:async(url,options)=>{assert(url.startsWith(base+'/auth/v1/admin/users'));assert.equal(options.headers.Authorization,'Bearer synthetic-server-only-key');const body=options.body?JSON.parse(options.body):null;calls.push({url,method:options.method,body});if(options.method==='POST'){users.set(body.id,body);return Response.json(body);}const id=url.split('/').at(-1);if(options.method==='GET')return users.has(id)?Response.json(users.get(id)):Response.json({error:'missing'},{status:404});return Response.json({...users.get(id),...body});}});
 const result=await h(request('/bootstrap',{passwords:['private-password-'.repeat(3),'another-password-'.repeat(3)]}));assert.equal(result.status,200);assert.equal((await result.json()).emailDeliveryTested,false);assert.deepEqual([...users.keys()],[f.A,f.B]);assert(calls.filter(c=>c.method==='POST').every(c=>c.body.email_confirm===true&&c.body.app_metadata.btcsp_qa_run===runId));
 const finished=await h(request('/finish'));assert.equal(finished.status,200);const puts=calls.filter(c=>c.method==='PUT');assert.equal(puts.length,2);assert(puts.every(c=>c.body.ban_duration==='876000h'));assert(!(await finished.text()).includes('password'));
 users.get(f.A).app_metadata.btcsp_qa_run='other';assert.equal((await h(request('/finish'))).status,503);assert.equal(calls.filter(c=>c.method==='PUT').length,2);
});
test('QA composes synthetic providers and per-run distinct keys without changing the actual public policy',async()=>{
 let options;const h=Handler.create({config:config(),getEnv:env,runtimeFactory:o=>{options=o;return async req=>{assert.equal(new URL(req.url).pathname,Runtime.PREFIX+'/state');assert.equal(req.headers.get('X-BTCSP-QA-Capability'),null);return Response.json({result:{qa:true}});};}});
 assert.equal((await h(request('/api/state',{projectId:f.P,scenarioKey:'demo_long'}),{remoteAddr:{hostname:'127.0.0.1'}})).status,200);
 const short=request('/api/state',{projectId:f.P,scenarioKey:'demo_long'});assert.equal((await h(new Request(base+'/btcsp-v20-account-qa/api/state',short),{remoteAddr:{hostname:'127.0.0.1'}})).status,200);
 assert.notEqual(options.getEnv('BTCSP_ADMISSION_KEY'),options.getEnv('BTCSP_CALCULATION_KEY'));assert.equal(Buffer.from(options.getEnv('BTCSP_ADMISSION_KEY'),'base64').length,32);assert.match(options.getEnv('SUPABASE_DB_URL'),/sslmode=verify-full/);
 const c=await options.setupContextProvider();assert.equal(c.valuation.kind,'synthetic');assert.equal(c.rules.qaFixture.kind,'synthetic-not-Kraken-verification');assert.equal(c.baseCyclePolicy.maxCycles,1);assert.equal(release.financialCloudApproved,false);assert.equal(release.checks.smtpExclusive,false);
 const plan=await options.planContextProvider({scenarioKey:'demo_long'},{valuation:c.valuation,reservations:{protectedUSD:'100'}});assert.equal(plan.cyclePolicy.requireFailedMarginSurvival,true);assert.equal(plan.cyclePolicy.protectedCashUSD,'100');assert.equal(plan.cyclePolicy.maxCycles,1);
});
test('QA forwards real reviewed HTTP/SQL operations and cannot expose another owner wallet',async t=>{
 const x=await setup(t),before=await x.store.snapshot(f.TA,x.scope),h=Handler.create({config:config(),getEnv:env,runtimeFactory:()=>async(req)=>{const headers=new Headers(req.headers);headers.set('origin','https://btc.example.test');return x.handler(new Request('https://api.example.test/api/v20'+new URL(req.url).pathname.slice(Runtime.PREFIX.length),{...{method:req.method,headers},body:await req.text()}),{remoteAddress:'127.0.0.1'});}});
 const call=(path,body={},token=f.TA)=>h(request('/api/'+path,{projectId:f.P,scenarioKey:'demo_long',...body},token));
 assert.equal((await call('state',{},f.TB)).status,404);const initial=await call('state');assert.equal(initial.status,200);assert.equal((await initial.json()).result.headHash,before.headHash);
 const command=f.movement(4100),prepared=await call('prepare',{request:command}),proposal=(await prepared.json()).result;assert.equal(prepared.status,200);const confirmation={headHash:proposal.headHash,reviewHash:proposal.reviewHash,idempotencyKey:'hosted-wrapper-retry'};
 const committed=await call('commit',{request:command,confirmation});assert.equal(committed.status,200);assert.equal((await (await call('commit',{request:command,confirmation})).json()).result.replayed,true);assert.equal((await x.store.snapshot(f.TA,x.scope)).revision,'4');
});
test('actual Edge bundle boots without Node fixture paths and refuses a request without capability',async t=>{
 const fs=require('node:fs'),path=require('node:path'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'btc-account-bundle-')),output=path.join(dir,'bundle');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 require('node:child_process').execFileSync(process.execPath,['scripts/qa/build-hosted-account.cjs',path.join(dir,'private'),output],{cwd:path.resolve(__dirname,'..')});
 const code=fs.readFileSync(path.join(output,'index.mjs'),'utf8');assert(!code.includes('__dirname'),'no dynamic Node-only fixture lookup');
 const saved=globalThis.Deno;let handler;globalThis.Deno={env:{get(){throw Error('No configuration read before capability admission');}},memoryUsage:()=>({}),serve(fn){handler=fn;}};
 try{await import(require('node:url').pathToFileURL(path.join(output,'index.mjs')).href);assert.equal(typeof handler,'function');const response=await handler(new Request(base+Handler.PREFIX+'/api/state',{method:'POST',body:'{}'}));assert.equal(response.status,401);}finally{if(saved===undefined)delete globalThis.Deno;else globalThis.Deno=saved;}
});
