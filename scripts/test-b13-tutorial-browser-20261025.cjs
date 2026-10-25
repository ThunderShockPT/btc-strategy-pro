'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const html=fs.readFileSync(path.join(process.cwd(),'previews','v20-b13-onboarding-bloco8-qa-20261025.html'),'utf8');
for(const width of [320,390,393,430,768,1440]){
 test('B13.2 eight-step interactive tutorial and original Demo '+width+'px',async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.setContent(html,{waitUntil:'load',timeout:60000});
   await page.waitForFunction(()=>window.BTCB132QA?.gui?.state);
   const initial=await page.evaluate(()=>window.BTCB132QA);
   // State functions are not JSON serializable. Query only useful properties.
   const numbers=await page.evaluate(()=>({topics:window.BTCB132QA.plan.topicCount,
    canonical:window.BTCB132QA.plan.topics.slice(0,6).map(x=>x.kind),
    source:window.BTCB132QA.plan.sourceTutorialVersion,quiz:window.BTCB132QA.gui.state().total}));
   assert.equal(numbers.topics,8);assert.equal(numbers.quiz,9);
   assert.ok(numbers.canonical.every(x=>x==='original-versioned'));
   assert.equal(await page.locator('#b132Cash').textContent(),'1.700,00 USD');
   assert.equal(await page.locator('#b132Pnl').textContent(),'−30,00 USD');
   await page.locator('#b132Mark').fill('95000');
   assert.equal(await page.locator('#b132Pnl').textContent(),'−50,00 USD');
   assert.equal(await page.locator('#b132Cash').textContent(),'1.700,00 USD');
   assert.equal(await page.locator('#b132Equity').textContent(),'150,00 USD');
   await page.locator('#b132Cycle').fill('2500');
   assert.equal(await page.locator('#b132Buy20').textContent(),'500,00 USD');
   assert.equal(await page.locator('#b132Buy30').textContent(),'750,00 USD');
   assert.equal(await page.locator('#b132Buy50').textContent(),'1.250,00 USD');
   await page.locator('#b132Start').click();
   assert.equal(await page.locator('#b132Guide [role="dialog"]').count(),1);
   assert.equal((await page.evaluate(()=>window.BTCB132QA.gui.state())).step,0);
   for(let i=0;i<8;i++){
    assert.ok((await page.locator('#b132Guide .b132-dialog h2').textContent()).length>8);
    await page.locator('#b132Guide .b132-nav button:last-child').click();
   }
   assert.equal((await page.evaluate(()=>window.BTCB132QA.gui.state())).step,8);
   assert.equal(await page.locator('#b132Guide fieldset').count(),4);
   assert.equal(await page.locator('#b132Guide .b132-nav button:last-child').isDisabled(),true);
   // Challenge UI: check correct choices; each choice re-renders controls.
   for(const [i,answer]of [1,0,2,1].entries())await page.locator('#b132Guide fieldset').nth(i).locator('input[type="radio"]').nth(answer).check();
   assert.equal(await page.locator('#b132Guide .b132-nav button:last-child').isEnabled(),true);
   await page.locator('#b132Guide .b132-nav button:last-child').click();
   const closed=await page.evaluate(()=>window.BTCB132QA.gui.state());
   assert.equal(closed.completed,true);assert.equal(closed.persisted,false);
   assert.equal(closed.financialApproval,false);
   assert.equal(await page.locator('#b132Guide').getAttribute('hidden'),"");
   const dimensions=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:innerWidth,canvas:document.querySelectorAll('canvas').length}));
   assert.ok(dimensions.doc<=dimensions.viewport+2,JSON.stringify(dimensions));
   assert.ok(dimensions.canvas>0);
   assert.deepEqual(errors,[]);
   if(width===393||width===1440){await page.locator('#b132Quiz').click();await page.screenshot({path:'b132-preview-'+width+'.png',fullPage:true});}
  }finally{await browser.close();}
 },{timeout:115000});
}
