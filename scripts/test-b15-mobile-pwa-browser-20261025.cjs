'use strict';
/* B15.3: Android/desktop mobile PWA install/offline QA in LOCAL Chromium.
 * No S25 physical access or production deploy; only synthetic financial data.
 */
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const qa=path.join(root,'previews/b153');
cp.execFileSync(process.execPath,[path.join(root,'scripts/build-b15-mobile-pwa-20261025.cjs')],{cwd:root});
let server,origin;
const types={'.html':'text/html; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'};
before(async()=>{server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/previews/b153/private-wallet.json'){
  res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end('{"doNotCache":"secret"}');return;
 }
 if(url.pathname==='/previews/b153/api/transaction'){
  res.writeHead(403,{'content-type':'application/json','cache-control':'no-store'});res.end('{"error":"DISABLED"}');return;
 }
 const target=path.resolve(root,'.'+url.pathname);
 if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
  res.writeHead(404,{'content-type':'text/plain'});res.end('not found');return;
 }
 res.writeHead(200,{'content-type':types[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
 fs.createReadStream(target).pipe(res);
});await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',e=>e?reject(e):resolve()));
 origin='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));});
const url=()=>origin+'/previews/b153/index.html';
const open=async(width=393)=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const mobile=width<=430;
 const context=await browser.newContext({viewport:{width,height:850},
  deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile,locale:'pt-PT'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(url(),{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>window.BTCB153PWA?.state()?.registered===true&&!!navigator.serviceWorker.controller,null,{timeout:20000});
 return {browser,context,page,errors};
};
test('B15.3 01 generated package preserves integrated V20 and offline-only assets',()=>{
 const html=fs.readFileSync(path.join(qa,'index.html'),'utf8');
 assert.ok(html.includes('window.BTCB151QA'));
 assert.ok(html.includes('id="b153-pwa-runtime"'));
 assert.ok(html.includes('rel="manifest" href="./manifest.webmanifest"'));
 assert.ok(html.includes('window.BTCB13QA'));
 assert.ok(html.includes('BTCUnifiedFiveMenusV20'));
 assert.ok(html.includes('SEM FEED AO VIVO'));
 assert.doesNotMatch(html,/<script[^>]+src=/);
 assert.ok(!html.includes('financialCloudApproved:true'));
});
test('B15.3 02 scoped manifest and real 192/512 PNG icons are valid',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(qa,'manifest.webmanifest'),'utf8'));
 assert.equal(m.id,'./index.html');assert.equal(m.start_url,'./index.html');
 assert.equal(m.scope,'./');assert.equal(m.display,'standalone');assert.equal(m.lang,'pt-PT');
 assert.deepEqual(m.icons.map(x=>x.sizes),['192x192','512x512']);
 for(const n of [192,512]){
  const b=fs.readFileSync(path.join(qa,'icons/icon-'+n+'.png'));
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(b.readUInt32BE(16),n);assert.equal(b.readUInt32BE(20),n);
 }
});
test('B15.3 03 isolated worker cannot claim main site or cache authenticated endpoints',()=>{
 const js=fs.readFileSync(path.join(qa,'sw.js'),'utf8');
 assert.ok(js.includes("const PREFIX='btcsp-v20-b153-demoqa-'"));
 assert.match(js,/request\.method!=='GET'/);
 assert.match(js,/ALLOW\.has\(canonical\)/);
 assert.match(js,/url\.pathname\.startsWith\(scope\.pathname\)/);
 assert.doesNotMatch(js,/cache\.addAll\(\[\s*['"]\/['"]/);
});
for(const width of [320,390,393,430,768,1440]){
 test('B15.3 Android-like '+width+'px manifest/mobile UI, install control, chart and five menus',async()=>{
  const {browser,context,page,errors}=await open(width);
  try{
   const manifest=await page.evaluate(async()=>{const r=await fetch('./manifest.webmanifest');return {ok:r.ok,m:await r.json()};});
   assert.equal(manifest.ok,true);assert.equal(manifest.m.display,'standalone');
   assert.equal(manifest.m.start_url,'./index.html');
   const status=await page.locator('#b153Status').textContent();
   assert.match(status,/Ligação: online/);
   assert.equal(await page.locator('#b153Install').count(),1);
   assert.equal(await page.locator('#b153OfflineHelp').count(),1);
   assert.equal(await page.locator('canvas').count()>0,true);
   const pwa=await page.evaluate(()=>window.BTCB153PWA.state());
   assert.equal(pwa.registered,true);assert.equal(pwa.accountDataUsed,false);
   assert.equal(pwa.livePriceUsed,false);assert.equal(pwa.ordersEnabled,false);
   assert.ok(pwa.scope.endsWith('/previews/b153/'));
   for(const name of ['Início','Estratégias','Mercado','Risco','Conta'])
    await page.evaluate(x=>window.BTCR43Navigation.navigate(x),name);
   await page.locator('#r54A').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).values.cash,'1.700 USD');
   await page.locator('#r54B').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).values.cash,'860 USD');
   await page.locator('#r54Logout').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).values,null);
   await page.locator('#b151DemoMode').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).mode,'demo');
   const viewport=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
    controller:!!navigator.serviceWorker.controller}));
   assert.equal(viewport.controller,true);
   assert.ok(viewport.scroll<=viewport.width+2,JSON.stringify(viewport));
   assert.deepEqual(errors,[]);
   if([393,1440].includes(width))await page.screenshot({path:'b153-mobile-'+width+'.png',fullPage:true});
  }finally{await context.close();await browser.close();}
 },{timeout:120000});
}
for(const width of [393,1440]){
 test('B15.3 offline relaunch '+width+'px loads cached Demo with charts and no cloud writes',async()=>{
  const {browser,context,page,errors}=await open(width);
  try{
   const initial=await page.evaluate(async()=>({
    caches:await caches.keys(),assets:await caches.open((await caches.keys()).find(k=>k.startsWith('btcsp-v20-b153-demoqa-'))).then(c=>c.keys()).then(rs=>rs.map(x=>x.url))
   }));
   assert.equal(initial.caches.some(k=>k.startsWith('btcsp-v20-b153-demoqa-')),true);
   assert.equal(initial.assets.length,5);
   await context.setOffline(true);
   await page.reload({waitUntil:'load',timeout:30000});
   await page.waitForFunction(()=>window.BTCB153PWA?.state().online===false);
   assert.match(await page.locator('#b153Status').textContent(),/Ligação: offline/);
   assert.equal(await page.locator('canvas').count()>0,true);
   await page.evaluate(()=>window.BTCR43Navigation.navigate('Estratégias'));
   assert.ok(await page.locator('#b151GuideLaunch').count()>0);
   await page.locator('#b151GuideLaunch').click();
   assert.equal(await page.locator('#b132Guide [role="dialog"]').count(),1);
   await page.keyboard.press('Escape');
   await page.locator('#r54A').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).values.cash,'1.700 USD');
   await page.locator('#r54Logout').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).values,null);
   await context.setOffline(false);
   await page.reload({waitUntil:'load'});
   assert.match(await page.locator('#b153Status').textContent(),/Ligação: online/);
   assert.deepEqual(errors,[]);
  }finally{await context.close();await browser.close();}
 },{timeout:120000});
}
test('B15.3 fetches private routes but never caches them in PWA CacheStorage',async()=>{
 const {browser,context,page}=await open(393);
 try{
  const result=await page.evaluate(async()=>{
   const privateGet=await fetch('./private-wallet.json'),api=await fetch('./api/transaction',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"fake":true}'});
   const names=await caches.keys(),urls=[];
   for(const n of names){const c=await caches.open(n);for(const req of await c.keys())urls.push(req.url);}
   return {privateStatus:privateGet.status,postStatus:api.status,urls};
  });
  assert.equal(result.privateStatus,200);assert.equal(result.postStatus,403);
  assert.equal(result.urls.length,5);
  assert.equal(result.urls.some(x=>/private-wallet|\/api\/|\/auth\/|access_token/.test(x)),false);
 }finally{await context.close();await browser.close();}
});
