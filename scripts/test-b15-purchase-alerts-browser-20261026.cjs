'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const html=fs.readFileSync(path.join(process.cwd(),'previews/v20-b15-integrated-bloco8-qa-20261025.html'),'utf8');
test('V20 B15 S25 alerts guidance + protected purchase form source integrity',()=>{
 assert.match(html,/b13GuideStatus/);assert.match(html,/b13ReturnDemo/);
 assert.match(html,/b4SaveReceipt/);assert.match(html,/b4ReceiptClose/);
 assert.match(html,/dataset.b4Transaction='editing'/);
 assert.doesNotMatch(html,/<script[^>]+src=/i);
 assert.doesNotMatch(html,/financialCloudApproved\s*:\s*true/i);
});
for(const width of [393,768,1440]){
 test('V20 B15 S25 alerts and buy receipt workflow '+width+'px',async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',route=>route.abort());
  try{
   await page.setContent(html,{waitUntil:'load',timeout:60000});
   assert.match(await page.locator('#b13AlertHost').innerText(),/Dados de conta não sincronizados/);
   await page.locator('#b13Cash').click();
   assert.match(await page.locator('#b13GuideStatus').innerText(),/SIMULAÇÃO/);
   assert.match(await page.locator('#b13AlertHost').innerText(),/Caixa insuficiente no cenário/);
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).mode,'account');
   await page.locator('#b13Margin').click();
   assert.match(await page.locator('#b13AlertHost').innerText(),/Posição em risco antes da próxima compra/);
   await page.locator('#b13Invalid').click();
   assert.match(await page.locator('#b13AlertHost').innerText(),/Capacidade de compra por recalcular/);
   await page.locator('#b13Reset').click();
   assert.match(await page.locator('#b13GuideStatus').innerText(),/Exemplo limpo/);
   await page.locator('#b13ReturnDemo').click();
   assert.equal((await page.evaluate(()=>window.BTCR54QA.status())).mode,'demo');
   await page.locator('#buyBtn').click();
   assert.equal(await page.locator('#overlay').getAttribute('data-b4-transaction'),'editing');
   await page.locator('#b4FUsd').fill('225');
   await page.locator('#b4FPrice').fill('90000');
   await page.locator('#overlay').dispatchEvent('click');
   assert.match(await page.locator('#overlay').getAttribute('class'),/open/);
   await page.keyboard.press('Escape');
   assert.match(await page.locator('#overlay').getAttribute('class'),/open/);
   await page.locator('#b4FSave').click();
   assert.match(await page.locator('#overlay').getAttribute('class'),/open/);
   assert.match(await page.locator('#b4SaveReceipt').innerText(),/Compra fictícia registada/);
   assert.match(await page.locator('#b4SaveReceipt').innerText(),/225,00 USD/);
   assert.match(await page.locator('#b4SaveReceipt').innerText(),/Sem ligação à Kraken/);
   await page.locator('#b4ReceiptClose').click();
   assert.doesNotMatch(await page.locator('#overlay').getAttribute('class'),/open/);
   await page.locator('#buyBtn').click();
   assert.equal(await page.locator('#b4FUsd').count(),1);
   await page.locator('#b4FCancel').click();
   assert.doesNotMatch(await page.locator('#overlay').getAttribute('class'),/open/);
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 },{timeout:100000});
}
