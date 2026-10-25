'use strict';
/* B13.3: combined, offline, public Demo QA. Never uses a real wallet, Kraken,
 * user credentials, network orders, live cloud writes or financial approval. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const html=fs.readFileSync(path.join(process.cwd(),'previews','v20-b13-alerts-bloco8-qa-20261025.html'),'utf8');
const tutorialSource=fs.readFileSync(path.join(process.cwd(),'onboarding-guide-v20.js'),'utf8');
for(const width of [320,390,393,430,768,1440]){
 test('B13.3 combined alerts/tutorial/navigation/security '+width+'px',async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  try{
   await page.setContent(html,{waitUntil:'load',timeout:60000});
   await page.waitForFunction(()=>window.BTCB13QA?.alertView?.state&&window.BTCR54QA?.status);
   await page.addScriptTag({content:tutorialSource});
   await page.evaluate(()=>{
    const btn=document.createElement('button');
    btn.type='button';btn.id='b133GuideLaunch';btn.textContent='Abrir tutorial B13.3';
    btn.style.cssText='position:fixed;bottom:120px;right:12px;z-index:50000;background:#175364;color:#fff;border:2px solid #8fe0e9;border-radius:8px;padding:10px';
    document.body.appendChild(btn);
    window.BTCB133Guide=window.BTCOnboardingGuideV20.create({document});
    btn.addEventListener('click',()=>window.BTCB133Guide.show());
   });
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).mode,'demo');
   assert.equal(await page.locator('[data-b13-code="REVIEW_ACCOUNT_SYNC"]').count(),1);
   await page.locator('#r54A').click();
   const before=await page.evaluate(()=>window.BTCR54QA.status());
   assert.equal(before.status,'ready');
   assert.equal(before.values.cash,'1.700 USD');
   await page.locator('#b13Margin').click();
   assert.equal(await page.locator('[data-b13-code="EXISTING_MARGIN_AT_RISK"]').count(),1);
   await page.locator('#b133GuideLaunch').click();
   assert.equal(await page.locator('#b132Guide [role="dialog"]').count(),1);
   assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Fechar');
   await page.keyboard.press('Shift+Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Seguinte');
   await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Fechar');
   await page.evaluate(()=>window.BTCB133Guide.go(8));
   const question=page.locator('#b132Guide fieldset').nth(1);
   await question.locator('input[type="radio"]').first().check();
   assert.equal((await page.evaluate(()=>window.BTCB133Guide.state())).answers[1],0);
   assert.equal(await page.evaluate(()=>document.activeElement.name),'b132-1');
   assert.equal((await page.evaluate(()=>window.BTCB133Guide.state())).financialApproval,false);
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#b132Guide').isHidden(),true);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'b133GuideLaunch');
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).values.cash,before.values.cash);
   assert.equal(await page.locator('[data-b13-code="EXISTING_MARGIN_AT_RISK"]').count(),1);
   for(const section of ['Início','Estratégias','Mercado','Risco','Conta']){
    await page.evaluate(x=>window.BTCR43Navigation.navigate(x),section);
    assert.equal(await page.locator('body').getAttribute('data-r54-mode'),'account');
   }
   await page.locator('#r54B').click();
   const other=await page.evaluate(()=>window.BTCR54QA.status());
   assert.equal(other.status,'ready');
   assert.equal(other.values.cash,'860 USD');
   assert.equal(await page.locator('[data-b13-code="EXISTING_MARGIN_AT_RISK"]').count(),0);
   await page.locator('#b133GuideLaunch').click();
   await page.evaluate(()=>document.getElementById('r54Logout').click());
   const out=await page.evaluate(()=>window.BTCR54QA.status());
   assert.equal(out.status,'locked');
   assert.equal(await page.locator('[data-b13-code="EXISTING_MARGIN_AT_RISK"]').count(),0);
   assert.equal(await page.locator('[data-b13-code="REVIEW_ACCOUNT_SYNC"]').count(),1);
   assert.equal((await page.evaluate(()=>window.BTCB133Guide.state())).persisted,false);
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#b132Guide').isHidden(),true);
   assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
   const size=await page.evaluate(()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,
    canvas:document.querySelectorAll('canvas').length}));
   assert.ok(size.doc<=size.inner+2,JSON.stringify(size));
   assert.ok(size.canvas>0);
   assert.deepEqual(errors,[]);
   if([393,1440].includes(width))
    await page.screenshot({path:'b133-integration-'+width+'.png',fullPage:true});
  }finally{await browser.close();}
 },{timeout:125000});
}
