'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const html=fs.readFileSync(path.join(process.cwd(),'previews','v20-b13-alerts-bloco8-qa-20261025.html'),'utf8');
for(const width of [320,390,393,430,768,1440]){
 test('B13.1 alerts on premium demo '+width+'px',async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.setContent(html,{waitUntil:'load',timeout:45000});
   await page.waitForFunction(()=>window.BTCB13QA?.alertView?.state);
   assert.equal(await page.locator('[data-b13-code="REVIEW_ACCOUNT_SYNC"]').count(),1);
   await page.locator('#r54A').click();
   assert.equal(await page.locator('[data-b13-code="STALE_MARKET_OR_RULES"]').count(),1);
   await page.locator('#b13Cash').click();
   assert.equal(await page.locator('[data-b13-code="NEXT_BUY_NOT_FUNDED"]').count(),1);
   await page.locator('#b13Margin').click();
   assert.equal(await page.locator('[data-b13-code="EXISTING_MARGIN_AT_RISK"]').count(),1);
   assert.equal(await page.locator('[data-b13-code="NEXT_BUY_NOT_FUNDED"]').count(),0);
   await page.locator('#b13Invalid').click();
   assert.equal(await page.locator('[data-b13-code="CAPACITY_REQUIRES_RECALCULATION"]').count(),1);
   await page.locator('#r54B').click();
   assert.equal(await page.locator('[data-b13-code="CAPACITY_REQUIRES_RECALCULATION"]').count(),1);
   await page.locator('#r54Logout').click();
   assert.equal(await page.locator('[data-b13-code="REVIEW_ACCOUNT_SYNC"]').count(),1);
   assert.equal(await page.locator('[data-b13-code="EXISTING_MARGIN_AT_RISK"]').count(),0);
   const size=await page.evaluate(()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,
     canvases:document.querySelectorAll('canvas').length}));
   assert.ok(size.doc<=size.inner+2,JSON.stringify(size));
   assert.ok(size.canvases>0);
   assert.deepEqual(errors,[]);
   if([393,1440].includes(width)){await page.locator('#r54A').click();await page.locator('#b13Margin').click();
    await page.screenshot({path:'b13-alerts-'+width+'.png',fullPage:true});
   }
  }finally{await browser.close();}
 },{timeout:110000});
}