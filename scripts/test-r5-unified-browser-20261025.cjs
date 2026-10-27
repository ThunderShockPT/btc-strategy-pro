'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs');
const html=fs.readFileSync(path.join(process.cwd(),'previews','v20-r5-unified-five-menus-qa-20261025.html'),'utf8');
const widths=[320,390,393,430,768,1440];
for(const width of widths){
 test('R5.4 browser '+width+'px account/demo separation, five menus, revision drift and logout',async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.setContent(html,{waitUntil:'load',timeout:45000});
   await page.waitForFunction(()=>window.BTCR54QA?.status);
   const get=()=>page.evaluate(()=>window.BTCR54QA.status());
   assert.equal((await get()).mode,'demo');
   await page.locator('#r54A').click();
   assert.equal((await get()).status,'ready');assert.equal((await get()).values.cash,'1.700 USD');
   await page.evaluate(()=>window.BTCR43Navigation.navigate('Estratégias'));
   assert.equal(await page.locator('body').getAttribute('data-r54-mode'),'account');
   const consistent=await page.evaluate(()=>Object.fromEntries(['homeView','strategiesView','terminalView','riskView','accountView','journalView'].map(id=>[id,document.getElementById(id).querySelector('[data-r54-cash]')?.textContent])));
   assert.equal(Object.keys(consistent).length,6);
   assert.ok(Object.values(consistent).every(x=>x==='1.700 USD'));
   await page.locator('#r54Drift').click();assert.equal((await get()).status,'revision-mismatch');
   assert.equal(await page.locator('#strategiesView [data-r54-main]').textContent(),'—');
   await page.locator('#r54Sync').click();
   await page.waitForFunction(()=>window.BTCR54QA.status().status==='ready');
   await page.locator('#r54B').click();assert.equal((await get()).values.cash,'860 USD');
   await page.locator('#r54Logout').click();assert.equal((await get()).status,'locked');
   assert.equal(await page.locator('#homeView [data-r54-cash]').textContent(),'—');
   await page.locator('#r54Demo').click();assert.equal((await get()).mode,'demo');
   const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,
     canvases:document.querySelectorAll('canvas').length}));
   assert.ok(dimensions.scroll<=dimensions.inner+2,JSON.stringify(dimensions));
   assert.ok(dimensions.canvases>=1);
   assert.deepEqual(errors,[]);
   if(width===393||width===1440){await page.locator('#r54A').click();await page.screenshot({path:'r54-browser-'+width+'.png',fullPage:true});}
  }finally{await browser.close();}
 },{timeout:95000});
}
