'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Rules=require('../backend/public-rules.cjs'),Feed=require('../public-futures-feed.js'),Private=require('../backend/private-test-runtime.cjs');
const captured=require('../rules/kraken/pf-xbtusd-public-20261024.json'),clone=v=>structuredClone(v),time=Date.parse(captured.serverTime);
test('fresh public instrument evidence preserves timestamps, partial status and documentary limits',()=>{
 const r=Rules.normalize(captured,new Date(time+1000).toISOString()).rules,b=require('../rules/kraken/eea-pf-xbtusd-20261021.json');assert.equal(r.observedAt,captured.serverTime);assert.equal(r.reviewedOn,b.reviewedOn);assert.equal(r.status,'partial');assert.deepEqual(r.applicationPolicy,b.applicationPolicy);assert.deepEqual(r.margin,b.margin);assert.equal(r.sources.find(s=>s.id==='instrument-api').observedAt,captured.serverTime);
});
test('changed or missing explicit EEE rules never fall back to global retail leverage',()=>{
 for(const mutate of [b=>delete b.instrument[0].marginSchedules.europa,b=>b.instrument[0].marginSchedules.europa.retail[0].initialMargin=0.01,b=>b.instrument[0].contractSize=10,b=>b.instrument[0].suspended=true,b=>b.instrument[0].contractValueTradePrecision=3,b=>b.serverTime=new Date(time+2000).toISOString()]){const b=clone(captured);mutate(b);assert.throws(()=>Rules.normalize(b,new Date(time+1000).toISOString()));}
 assert.throws(()=>Rules.normalize(captured,new Date(time+60001).toISOString()),/CURRENT_PUBLIC_RULES_REQUIRED/);
});
test('mark feed cannot substitute last, spot, wrong instruments, future or stale frames',()=>{
 const frame={feed:'ticker',product_id:'PF_XBTUSD',time,markPrice:68000,last:69000};assert.equal(Feed.parse(frame,time+1).priceUSD,'68000');
 for(const patch of [{markPrice:undefined},{feed:'ticker_lite'},{product_id:'PI_XBTUSD'},{time:time+2},{time:time-15001},{markPrice:-1},{suspended:true}])assert.throws(()=>Feed.parse({...frame,...patch},time+1));
 const r={result:'success',serverTime:new Date(time).toISOString(),ticker:{symbol:'pf_xbtusd',tag:'perpetual',pair:'XBT:USD',suspended:false,postOnly:false,markPrice:68000,last:69000}};assert.equal(Feed.parse(r,time,'rest').priceUSD,'68000');
});
test('hidden/offline feed clears the last mark and ignores late frames, reconnect requires new evidence',async()=>{
 let n=time,tick,seen,socket,requests=0;class Socket{constructor(){socket=this;}send(v){this.subscription=JSON.parse(v);}close(){this.onclose?.();}}
 const feed=Feed.create({WebSocketImpl:Socket,now:()=>n,onChange:v=>seen=v,interval:f=>{tick=f;return 1;},uninterval:()=>{},schedule:()=>1,unschedule:()=>{},fetchImpl:async()=>{requests++;throw Error('offline');}});
 feed.setActive(true);socket.onopen();assert.deepEqual(socket.subscription.product_ids,['PF_XBTUSD']);socket.onmessage({data:JSON.stringify({feed:'ticker',product_id:'PF_XBTUSD',time,markPrice:'68000'})});assert.equal(seen.priceUSD,'68000');n+=15001;tick();assert.equal(seen,null);const old=socket;feed.setActive(false);old.onmessage({data:JSON.stringify({feed:'ticker',product_id:'PF_XBTUSD',time:n,markPrice:'69000'})});assert.equal(seen,null);feed.setActive(true);assert.equal(feed.snapshot(),null);assert(requests>=1);feed.close();
});
test('private test requires a bounded server-owned allowlist and leaves production release unapproved',()=>{
 const c={ownerIds:['00000000-0000-4000-a000-000000000001'],accessTag:'a'.repeat(32)};assert.doesNotThrow(()=>Private.configuration(c));for(const patch of [{ownerIds:[]},{ownerIds:[...c.ownerIds,...c.ownerIds]},{ownerIds:['wrong']},{accessTag:'secret'}])assert.throws(()=>Private.configuration({...c,...patch}));assert.equal(require('../backend/edge-runtime.cjs').approved(require('../policies/cloud-release-20261021.json')),false);
});
test('first-access operator route keeps the generated token when Auth also returns a user, without sending email',async()=>{
 const Provision=require('../backend/private-test-provision.cjs'),{createHash}=require('node:crypto'),cap='1'.repeat(64),id='00000000-0000-4000-a000-000000000001',tag='a'.repeat(32),email='owner@example.test',requests=[];
 const handler=Provision.create({config:{capabilityHash:createHash('sha256').update(cap).digest('hex'),accessTag:tag,expiresAt:new Date(time+10000).toISOString(),accounts:[{id,email,qa:false},{qa:true},{qa:true}],onlyOwnerLink:true},now:()=>time,getEnv:key=>key==='SUPABASE_URL'?'https://oftzqqjbwonngubihrsd.supabase.co':'server-secret-placeholder',fetchImpl:async(url,options)=>{requests.push({url,method:options.method});return Response.json(url.endsWith('/generate_link')?{user:{id},hashed_token:'a'.repeat(56)}:{id,email,app_metadata:{btcsp_private_test:tag}});}});
 const request=route=>new Request('https://oftzqqjbwonngubihrsd.supabase.co/functions/v1/btcsp-v20-private-provision/'+route,{method:'POST',headers:{'X-BTCSP-Provision':cap},body:'{}'});
 assert.equal((await handler(request('bootstrap'))).status,404);const response=await handler(request('owner-link'));assert.equal(response.status,200);assert.equal((await response.json()).tokenHash,'a'.repeat(56));assert.equal(requests.length,2);assert(requests.every(r=>r.url.includes('/auth/v1/admin/')));
});
test('QA-only provisioner cannot create an owner or generate first-access links',async()=>{
 const P=require('../backend/private-test-provision.cjs'),{createHash}=require('node:crypto'),cap='2'.repeat(64),config={capabilityHash:createHash('sha256').update(cap).digest('hex'),accessTag:'b'.repeat(32),expiresAt:new Date(time+1000).toISOString(),qaOnly:true,accounts:[{qa:true},{qa:true}]};
 assert.throws(()=>P.create({config:{...config,accounts:[{qa:false},{qa:true}]}}),/CONFIGURATION/);
 const h=P.create({config,now:()=>time,getEnv:()=>{throw Error('MUST_NOT_ACCESS_AUTH');}});const r=await h(new Request('https://example.test/owner-link',{method:'POST',headers:{'X-BTCSP-Provision':cap},body:'{}'}));assert.equal(r.status,404);
});
