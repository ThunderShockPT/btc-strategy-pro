'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const html=fs.readFileSync(path.join(process.cwd(),'previews/v20-b15-integrated-bloco8-qa-20261025.html'),'utf8');
const routes=[['Início','homeView'],['Estratégias','strategiesView'],['Mercado','terminalView'],['Risco','riskView'],['Conta','accountView']];
test('QA global cards no longer precede or mask actual five menu views',()=>{
 assert.match(html,/<script id="v20-nav-visibility-fix-runtime">/);
 assert.match(html,/main\.append\(separator\)/);
 assert.match(html,/originalHome\.append\(oldLab\)/);
 assert.match(html,/window\.scrollTo\(\{top:0,behavior:'instant'\}\)/);
 assert.doesNotMatch(html,/financialCloudApproved\s*:\s*true/i);
});
for(const width of [320,390,393,430,768,1440]){
 test('B15 live browser real clicks show distinct first-screen contents '+width,async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',r=>r.abort());
  try{
   await page.setContent(html,{waitUntil:'load',timeout:60000});
   await page.waitForFunction(()=>window.BTCV20NavigationQA?.reordered===true&&window.BTCR54QA);
   const ids=await page.evaluate(()=>[...document.querySelector('main').children].map(x=>x.id||x.className));
   assert.ok(ids.indexOf('homeView')<ids.indexOf('r54-qa-menu'));
   assert.ok(ids.indexOf('accountView')<ids.indexOf('b13Labs'));
   assert.ok(ids.indexOf('accountView')<ids.indexOf('r54-qa-menu'));
   assert.equal(await page.locator('#homeView').evaluate(x=>x.children[x.children.length-1].id),'r52QA');
   for(const [route,elId] of routes){
    await page.locator('[data-r43-nav="'+route+'"]:visible').last().click();
    assert.equal(await page.evaluate(()=>window.BTCR43Navigation.current()),route);
    const view=await page.locator('#'+elId).evaluate(e=>({top:e.getBoundingClientRect().top,
      visible:getComputedStyle(e).display!=='none',text:e.innerText.trim().slice(0,400)}));
    assert.ok(view.visible,route);
    assert.ok(view.top>=-20&&view.top<510,JSON.stringify({route,top:view.top}));
   }
   const scroll=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(scroll.scroll<=scroll.width+3,JSON.stringify(scroll));
   await page.locator('#v20QuickMode [data-for="r54A"]').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).values.cash,'1.700 USD');
   await page.locator('[data-r43-nav="Estratégias"]:visible').last().click();
   assert.match(await page.locator('#strategiesView').innerText(),/Plano guardado/);
   await page.locator('#v20QuickMode [data-for="r54B"]').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).values.cash,'860 USD');
   await page.locator('#v20QuickMode [data-for="r54Demo"]').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).mode,'demo');
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 },{timeout:115000});
}
for(const width of [393,1440]){
 test('B15 live browser alerts tutorial purchase receipt still usable '+width,async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',r=>r.abort());
  try{
   await page.setContent(html,{waitUntil:'load',timeout:60000});
   await page.waitForFunction(()=>!!window.BTCV20NavigationQA);
   await page.locator('#b13Cash').click();
   assert.match(await page.locator('#b13AlertHost').innerText(),/Caixa insuficiente no cenário/);
   await page.locator('#b13Reset').click();
   await page.locator('#b151GuideLaunch').click();
   assert.equal(await page.locator('#b132Guide [role="dialog"]').count(),1);
   await page.keyboard.press('Escape');
   await page.locator('#b13ReturnDemo').click();
   await page.locator('[data-r43-nav="Início"]:visible').last().click();
   await page.locator('#buyBtn').click();
   await page.locator('#b4FUsd').fill('225');
   await page.locator('#b4FPrice').fill('90000');
   await page.locator('#overlay').dispatchEvent('click');
   assert.match(await page.locator('#overlay').getAttribute('class'),/open/);
   await page.keyboard.press('Escape');
   assert.match(await page.locator('#overlay').getAttribute('class'),/open/);
   await page.locator('#b4FSave').click();
   assert.match(await page.locator('#b4SaveReceipt').innerText(),/Compra fictícia registada/);
   await page.locator('#b4ReceiptClose').click();
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 },{timeout:115000});
}
