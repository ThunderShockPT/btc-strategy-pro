'use strict';
// Browser + actual client/workflows/HTTP/SQL. Auth identity and market are QA fixtures.
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {chromium}=require('playwright'),{buildPreview}=require('./build-onboarding-preview.cjs'),{build}=require('./build-account-host.cjs');
const {setup}=require('./helpers/account-fixture.cjs'),f=require('./helpers/server-fixture.cjs');

test('account host preserves reviews on refresh, records only after confirmation and clears private UI on logout/recovery', {timeout:90000}, async t=>{
 const x=await setup(t,{scenarioKey:'manual_long',contextProvider:async(scope,input)=>{const at=new Date().toISOString(),rules=structuredClone(input.rules);rules.observedAt=at;rules.version='QA-BROWSER-SYNTHETIC';return {rules,valuation:{...input.valuation,kind:'synthetic',source:'qa-browser-fixture-not-live',asOf:at}};}}),before=await x.store.snapshot(f.TA,x.scope),errors=[],requests=[];
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(buildPreview().html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const page=await browser.newPage({viewport:{width:393,height:852},timezoneId:'UTC'});page.setDefaultTimeout(10000);t.after(async()=>{if(!t.passed)console.log(JSON.stringify({errors,requests,body:await page.locator('#accountOnlinePanel').innerText().catch(()=>'' )}));await browser.close();});page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://api.exchange.coinbase.com/**',route=>route.fulfill({status:503,body:'unavailable in QA'}));
 let gate=null;
 await page.route('https://oftzqqjbwonngubihrsd.supabase.co/functions/v1/btcsp-v20-api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname.split('/btcsp-v20-api/')[1];requests.push(path);
  const response=await x.handler(new Request('https://api.example.test/api/v20/'+path,{method:'POST',headers:{...req.headers(),origin:'https://btc.example.test'},body:req.postData()}),{remoteAddress:'127.0.0.1'});
  if(gate&&path==='state'){const held=gate;gate=null;held.started();await held.wait;}
await route.fulfill({status:response.status,headers:{...Object.fromEntries(response.headers),'Access-Control-Allow-Origin':'*'},body:await response.text()});
 });
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('[data-area="account"]:visible').first().click();
 await page.addScriptTag({content:build()});
 await page.evaluate(({A,B,TA,TB})=>{
  let listener,current=null;globalThis.qaAuthCalls=[];
  const s=id=>({user:{id},access_token:id===A?TA:TB,expires_at:Date.now()/1000+3600});
  globalThis.qaEmit=(name,id=A)=>{current=name==='SIGNED_OUT'?null:s(id);listener?.(name,current);};
  globalThis.qaSDK={auth:{
   onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){listener=null;}}}};},
   async getSession(){qaAuthCalls.push('getSession');return {data:{session:current}};},
   async getUser(token){qaAuthCalls.push('getUser');return {data:{user:{id:token===TA?A:B,email_confirmed_at:'2026-10-01',is_anonymous:false}}};},
   async signInWithPassword(){qaAuthCalls.push('signIn');current=s(A);return {data:{session:current}};},
   async signOut(){qaAuthCalls.push('signOut');qaEmit('SIGNED_OUT');return {};},
   async updateUser(){qaAuthCalls.push('updateUser');return {data:{user:current.user}};}
  }};
  BTCV20AccountConnection.configureSession({supabase:qaSDK,supabaseURL:'https://oftzqqjbwonngubihrsd.supabase.co'});
 },{A:f.A,B:f.B,TA:f.TA,TB:f.TB});
 assert.equal(await page.locator('[data-access-form]').count(),0);
 assert.deepEqual(await page.evaluate(()=>qaAuthCalls),[]);
 // Enable only this isolated QA page, never the shipped policy or production API.
 await page.evaluate(()=>{BTCV20ReleasePolicy.financialCloudApproved=true;BTCV20ReleasePolicy.pendingWorkflows=[];for(const k of Object.keys(BTCV20ReleasePolicy.checks))BTCV20ReleasePolicy.checks[k]=true;globalThis.qaController=BTCV20AccountConnection.configureSession({supabase:qaSDK,supabaseURL:'https://oftzqqjbwonngubihrsd.supabase.co'});});
 await page.locator('[data-access-form="sign-in"] input[name=email]').fill('qa@example.test');
 await page.locator('[data-access-form="sign-in"] input[name=password]').fill('qa-password-only');
 await page.locator('[data-access-action="sign-in"]').click();
 await page.locator('[data-account-action="wallet-list"]').click();
 await page.locator('[data-wallet-id="'+f.P+'"]').click();
 await page.getByText('Carteira atualizada',{exact:true}).waitFor();
 await page.locator('[data-account-action="movement"]').click();
 await page.locator('[data-movement-field="amountUSD"]').fill('500');
 await page.locator('[data-movement-field="effectiveAt"]').fill('2026-10-20T23:40');
 await page.locator('[data-movement-field="alreadyRecorded"]').check();
 await page.locator('[data-account-action="compare-movement"]').click();
 await page.locator('[data-account-accept]').waitFor();
 await page.locator('[data-account-accept]').check();
 assert.equal(await page.locator('[data-account-action="confirm"]').isEnabled(),true);
 const review=await page.locator('[data-access-account]').innerHTML();
 const verifications=await page.evaluate(()=>qaAuthCalls.filter(x=>x==='getUser').length);
 await page.evaluate(()=>qaEmit('TOKEN_REFRESHED'));
 await page.waitForFunction(n=>qaAuthCalls.filter(x=>x==='getUser').length>n,verifications);
 assert.equal(await page.locator('[data-access-account]').innerHTML(),review);
 assert.equal(await page.locator('[data-account-accept]').isChecked(),true);
 assert.equal(requests.filter(p=>p==='commit').length,0);
 for(const width of [280,360,393,430,1280]){await page.setViewportSize({width,height:852});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow at '+width);}
 await page.setViewportSize({width:393,height:852});if(process.env.BTCSP_QA_SCREENSHOT)await page.screenshot({path:process.env.BTCSP_QA_SCREENSHOT,fullPage:true});
 await page.locator('[data-account-action="confirm"]').click();
 await page.getByText(/Movimento registado\. Atualiza a carteira/).waitFor();
 const after=await x.store.snapshot(f.TA,x.scope);
 assert.equal(after.revision,'4');assert.equal(after.state.input.events.at(-1).facts.amountUSD,'500');
 assert.deepEqual(after.state.input.events.slice(0,3),before.state.input.events);
 assert.equal(requests.filter(p=>p==='commit').length,1);
 // A delayed private response cannot repopulate the panel after logout.
 let started,release;const seen=new Promise(r=>started=r),wait=new Promise(r=>release=r);gate={started,wait};
 await page.locator('[data-account-action="load"]').click();await seen;
 await page.locator('[data-access-action="sign-out"]').click();
 await page.locator('[data-access-form="sign-in"]').waitFor();release();
 await page.waitForTimeout(100);
 assert.equal(await page.locator('[data-account-action]').count(),0);
 assert(!await page.locator('[data-access-shell]').innerHTML().then(s=>s.includes('qa-password-only')));
 await page.evaluate(()=>qaController.signIn({email:'qa@example.test',password:'qa-password-only'}));
 await page.locator('[data-account-action="wallet-list"]').click();await page.locator('[data-wallet-id="'+f.P+'"]').click();await page.getByText('Carteira atualizada',{exact:true}).waitFor();
 await page.evaluate(id=>qaEmit('SIGNED_IN',id),f.B);
 await page.locator('[data-account-action="wallet-list"]').click();await page.locator('[data-wallet-id="'+f.PB+'"]').waitFor();
 assert.equal(await page.locator('[data-wallet-id="'+f.P+'"]').count(),0);
 assert.equal(await page.locator('[data-account-action="correction"]').count(),0);
 await page.evaluate(()=>qaEmit('PASSWORD_RECOVERY'));
 await page.locator('[data-access-form="password"]').waitFor();
 assert.equal(await page.locator('[data-account-action]').count(),0);
 await page.locator('input[name=password]').fill('new-qa-password');await page.locator('input[name=confirmation]').fill('new-qa-password');
 await page.locator('[data-access-action="password"]').click();await page.locator('[data-access-form="sign-in"]').waitFor();
 assert.equal(await page.evaluate(()=>qaAuthCalls.filter(x=>x==='updateUser').length),1);
 assert.deepEqual(errors,[]);
});
