'use strict';
/* B15.1: real standalone combined UI regression in Chromium, six layouts.
 * All data are synthetic; does not connect to Kraken/Supabase or send orders.
 */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const folder=path.join(process.cwd(),'previews');
const html=fs.readFileSync(path.join(folder,'v20-b15-integrated-bloco8-qa-20261025.html'),'utf8');
const original=fs.readFileSync(path.join(folder,'v20-r4-bloco8-faithful-home-20261025.html'),'utf8');
const baseCSS=s=>s.match(/<style>([\s\S]*?)<\/style>/i)?.[1].split('</style>')[0];
test('B15.1 original Bloco 8 root visual tokens remain identical',()=>{
 const a=baseCSS(original),b=baseCSS(html);
 assert.ok(a&&b&&a.length>4000&&b.length>4000);
 assert.ok(a.startsWith(':root{--bg:#0B1018;--surface:#131B27;'));
 assert.ok(b.startsWith(a.slice(0,2500)), 'Original palette/grid/navigation style changed');
 assert.match(html,/<html lang="pt-PT">/);
 assert.match(html,/<title>BTC Strategy Pro V20 — Beta QA integrada · Demo original<\/title>/);
});
test('B15.1 preview bundles guides and alerts as standalone document without remote scripts',()=>{
 assert.match(html,/<script id="b151-original-guide">/);
 assert.match(html,/<script id="b151-assembly">/);
 assert.match(html,/<script id="b13-core">/);
 assert.match(html,/<script id="b13-view">/);
 assert.match(html,/<script id="r54-unified-production">/);
 assert.doesNotMatch(html,/<script[^>]+src=/i);
 assert.doesNotMatch(html,/<link[^>]+rel=["']stylesheet/i);
 assert.doesNotMatch(html,/financialCloudApproved\s*:\s*true/i);
});
for(const width of [320,390,393,430,768,1440]){
 test('B15.1 single-file end-to-end demo/alerts/tutorial/account safety '+width+'px',async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  const errors=[],network=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>network.push(r.url()));
  await page.route('**/*',route=>route.abort());
  try{
   await page.setContent(html,{waitUntil:'load',timeout:60000});
   await page.waitForFunction(()=>window.BTCB151QA?.guide&&window.BTCR54QA?.status&&window.BTCB13QA?.alertView?.state);
   let s=await page.evaluate(()=>window.BTCB151QA);
   assert.equal(await page.evaluate(()=>window.BTCB151QA.visualParityOfAccountApproved),false);
   assert.equal(await page.evaluate(()=>window.BTCB151QA.ordersEnabled),false);
   assert.equal(await page.evaluate(()=>window.BTCB151QA.financialCloudApproved),false);
   assert.equal(await page.locator('body').getAttribute('data-r54-mode'),'demo');
   assert.match(await page.locator('#b151ModeStatus').textContent(),/Demo original/);
   assert.ok(await page.locator('canvas').count()>0,'Historical Demo lost its charts');
   const css=await page.evaluate(()=>({bg:getComputedStyle(document.body).backgroundColor,
      hasSidebar:!!document.querySelector('.sidebar'),style:!!document.getElementById('b151-ui')}));
   assert.equal(css.style,true);assert.equal(css.hasSidebar,true);
   assert.equal(await page.locator('[data-b13-code="REVIEW_ACCOUNT_SYNC"]').count(),1);
   await page.locator('#b151GuideLaunch').click();
   assert.equal(await page.locator('#b132Guide [role="dialog"]').count(),1);
   assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Fechar');
   await page.keyboard.press('Shift+Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Seguinte');
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#b132Guide').isHidden(),true);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'b151GuideLaunch');
   await page.locator('#b151QuizLaunch').click();
   assert.equal((await page.evaluate(()=>window.BTCB151QA.guide.state())).step,8);
   assert.equal((await page.evaluate(()=>window.BTCB151QA.guide.state())).financialApproval,false);
   for(const [i,answer] of [1,0,2,1].entries())
    await page.locator('#b132Guide fieldset').nth(i).locator('input[type="radio"]').nth(answer).check();
   assert.equal(await page.locator('#b132Guide .b132-nav button:last-child').isEnabled(),true);
   await page.locator('#b132Guide .b132-nav button:last-child').click();
   const tutorial=await page.evaluate(()=>window.BTCB151QA.guide.state());
   assert.equal(tutorial.completed,true);assert.equal(tutorial.persisted,false);
   assert.equal(tutorial.financialApproval,false);
   await page.locator('#r54A').click();
   let a=await page.evaluate(()=>window.BTCR54QA.status());
   assert.equal(a.status,'ready');assert.equal(a.mode,'account');
   assert.equal(a.values.cash,'1.700 USD');
   assert.equal(await page.locator('#homeView [data-r54-cash]').textContent(),'1.700 USD');
   assert.match(await page.locator('#b151ModeStatus').textContent(),/simplificados/);
   await page.locator('#b13Margin').click();
   assert.equal(await page.locator('[data-b13-code="EXISTING_MARGIN_AT_RISK"]').count(),1);
   for(const menu of ['Início','Estratégias','Mercado','Risco','Conta']){
    await page.evaluate(x=>window.BTCR43Navigation.navigate(x),menu);
    assert.equal(await page.locator('body').getAttribute('data-r54-mode'),'account');
   }
   const balance=await page.evaluate(()=>Object.fromEntries(['homeView','strategiesView','terminalView','riskView','accountView'].map(id=>
     [id,document.getElementById(id).querySelector('[data-r54-cash]')?.textContent])));
   assert.ok(Object.values(balance).every(v=>v==='1.700 USD'),JSON.stringify(balance));
   await page.locator('#r54Drift').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).status,'revision-mismatch');
   assert.equal(await page.locator('#homeView [data-r54-cash]').textContent(),'—');
   await page.locator('#r54Sync').click();
   await page.waitForFunction(()=>window.BTCR54QA.status().status==='ready');
   await page.locator('#r54B').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).values.cash,'860 USD');
   assert.equal(await page.locator('[data-b13-code="EXISTING_MARGIN_AT_RISK"]').count(),0);
   await page.locator('#r54Logout').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).status,'locked');
   assert.equal(await page.locator('#homeView [data-r54-cash]').textContent(),'—');
   await page.locator('#b151DemoMode').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).mode,'demo');
   await page.evaluate(()=>window.BTCR43Navigation.navigate('Mercado'));
   assert.ok(await page.locator('canvas').count()>0);
   const scroll=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,
    canvas:document.querySelectorAll('canvas').length,overflow:document.body.style.overflow}));
   assert.ok(scroll.document<=scroll.viewport+2,JSON.stringify(scroll));
   assert.notEqual(scroll.overflow,'hidden');
   assert.deepEqual(errors,[]);
   assert.deepEqual(network,[], 'Standalone QA generated external network requests');
   if([393,1440].includes(width))await page.screenshot({path:'b151-integrated-'+width+'.png',fullPage:true});
  }finally{await browser.close();}
 },{timeout:125000});
}
