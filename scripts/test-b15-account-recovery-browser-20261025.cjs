'use strict';
/* B15.2 real read-only premium account QA + financial visibility safety.
   Browser exercises 6 viewports using synthetic wallets only; release stays gated.
*/
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const Unified=require('../unified-five-menus-v20.js');
const html=fs.readFileSync(path.join(process.cwd(),'previews/v20-b15-integrated-bloco8-qa-20261025.html'),'utf8');
const ID='00000000-0000-4000-a000-000000000001',HASH='a'.repeat(64);
function account(){return {authenticated:true,connected:true,phase:'bookkeeping-only',
 selectedProjectId:ID,projection:{shared:{ownerScoped:true,projectId:ID,revision:'3',headHash:HASH,
 valuationAsOf:'2026-10-20T23:40:00Z',quoteCurrent:false,rulesCurrent:false},
 plan:{version:'2',profile:'balanced',riskFloorUSD:'60000'},
 financial:{walletUSD:'1800',freeCashUSD:'1700',isolatedMarginUSD:'200',
 protectedCashUSD:'100',positionQuantityBTC:'0.01',unrealizedPnLUSD:'-30',isolatedEquityUSD:'170'}}};}
function journal(){return {source:'V20_AUTHENTICATED_EVENT_JOURNAL',selectedProjectId:ID,revision:'3',
 sourceHeadHash:HASH,phase:'ready',needsReconciliation:false,historyCount:0,history:[]};}
function controller(){
 let a=account(),j=journal(),read=0,fail=false,gate=null,callbacks=[];
 const notify=()=>callbacks.forEach(fn=>fn());
 const bridge={state:()=>structuredClone(a),subscribe:fn=>{callbacks.push(fn);fn();return()=>callbacks=callbacks.filter(x=>x!==fn);},
 async refresh(){read++;if(gate)await gate;if(fail)throw Error('SYNTHETIC_ACCOUNT_NETWORK_DOWN');}};
 const book={state:()=>structuredClone(j),subscribe:fn=>{callbacks.push(fn);fn();return()=>callbacks=callbacks.filter(x=>x!==fn);},
 async load(){if(fail)throw Error('SYNTHETIC_JOURNAL_NETWORK_DOWN');},
 async confirm(){throw Error('SYNTHETIC_COMMIT_AMBIGUOUS');}};
 return {api:Unified.create({bridge,journal:book}),reads:()=>read,
 pause:p=>{gate=p},setFail:b=>{fail=b},refreshData:()=>notify()};
}
test('B15.2 01 - synchronization masks previously valid values during pending read',async()=>{
 const c=controller();c.api.selectMode('account');assert.equal(c.api.state().values.cash,'1.700 USD');
 let resolve;const pending=new Promise(r=>resolve=r);c.pause(pending);
 const job=c.api.refresh();assert.equal(c.api.state().status,'refresh-required');
 assert.equal(c.api.state().values,null);assert.equal(c.api.state().historyCount,0);
 resolve();await job;assert.equal(c.api.state().status,'ready');
 assert.equal(c.api.state().values.cash,'1.700 USD');c.api.dispose();
});
test('B15.2 02 - offline refresh fails closed, locks balances until independent account+journal resync',async()=>{
 const c=controller();c.api.selectMode('account');c.setFail(true);
 await assert.rejects(c.api.refresh(),/SYNTHETIC_ACCOUNT_NETWORK_DOWN/);
 assert.equal(c.api.state().status,'refresh-required');assert.equal(c.api.state().values,null);
 c.setFail(false);c.refreshData();assert.equal(c.api.state().values,null);
 await c.api.refresh();assert.equal(c.api.state().status,'ready');
 assert.equal(c.api.state().values.cash,'1.700 USD');
 assert.equal(c.reads(),2);c.api.dispose();
});
test('B15.2 03 - ambiguous commit cannot restore account figures or approve trades',async()=>{
 const c=controller();c.api.selectMode('account');
 await assert.rejects(c.api.confirm({reviewHash:'qa-fake',accepted:true}),/SYNTHETIC_COMMIT_AMBIGUOUS/);
 assert.equal(c.api.state().values,null);assert.equal(c.api.state().status,'refresh-required');
 assert.equal(c.api.state().canWrite,false);assert.equal(c.api.state().canTrade,false);
 await c.api.refresh();assert.equal(c.api.state().status,'ready');c.api.dispose();
});
for(const width of [320,390,393,430,768,1440]){
 test('B15.2 premium verified wallet and safe no-live placeholder at '+width+'px',async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width,height:900}});
  const pageerrors=[],network=[];
  page.on('pageerror',e=>pageerrors.push(String(e)));
  page.on('request',r=>network.push(r.url()));
  await page.route('**/*',r=>r.abort());
  try{
   await page.setContent(html,{waitUntil:'load',timeout:60000});
   await page.waitForFunction(()=>window.BTCB151QA?.mode);
   await page.locator('#r54A').click();
   const check=await page.evaluate(()=>({
    mode:document.body.dataset.r54Mode,
    panel:document.querySelector('#homeView .r54-panel')?.outerHTML,
    bg:getComputedStyle(document.querySelector('#homeView .r54-panel')).backgroundImage,
    chartsVisible:!!document.querySelector('#homeView .r54-chart-card'),
    chartLabel:document.querySelector('#homeView .r54-chart-card')?.getAttribute('aria-label'),
    fakeGraph:document.querySelector('#homeView .r54-chart-card canvas')?.length||0,
    footer:document.querySelector('#homeView .r54-footer')?.textContent,
    cssCount:document.querySelectorAll('#r54-safe-css').length,
    modeLabel:document.getElementById('b151ModeStatus').textContent,
    cash:document.querySelector('#homeView [data-r54-cash]')?.textContent}));
   assert.equal(check.mode,'account');
   assert.equal(check.cash,'1.700 USD');
   assert.equal(check.chartsVisible,true);
   assert.match(check.chartLabel,/gráfico não verificado/);
   assert.match(check.panel,/SEM FEED AO VIVO/);
   assert.match(check.panel,/Cotação não verificada/);
   assert.match(check.modeLabel,/premium da conta/);
   assert.equal(check.cssCount,1);
   assert.match(check.bg,/linear-gradient/);
   assert.equal(check.fakeGraph,0);
   assert.match(check.footer,/paridade visual final/i);
   const style=await page.evaluate(()=>({
    grid:getComputedStyle(document.querySelector('#homeView .r54-grid')).gridTemplateColumns,
    root:document.documentElement.scrollWidth,width:innerWidth,
    visible:!!document.querySelector('canvas'),
    hideDemo:getComputedStyle(document.querySelector('#homeView>:not(.r54-layer)')).display}));
   assert.equal(style.hideDemo,'none');
   assert.equal(style.visible,true);
   assert.ok(style.root<=style.width+2,JSON.stringify(style));
   // Click all FIVE menus; never show historical money as authenticated.
   for(const label of ['Início','Estratégias','Mercado','Risco','Conta']){
    await page.evaluate(x=>window.BTCR43Navigation.navigate(x),label);
    const z=await page.evaluate(()=>Object.fromEntries(['homeView','strategiesView','terminalView','riskView','accountView'].map(id=>[id,document.getElementById(id)?.querySelector('[data-r54-cash]')?.textContent])));
    assert.ok(Object.values(z).every(n=>n==='1.700 USD'),JSON.stringify(z));
   }
   await page.locator('#r54Drift').click();
   assert.equal(await page.locator('#homeView [data-r54-cash]').textContent(),'—');
   await page.locator('#r54Sync').click();await page.waitForFunction(()=>window.BTCR54QA.status().status==='ready');
   await page.locator('#r54B').click();
   assert.equal(await page.locator('#homeView [data-r54-cash]').textContent(),'860 USD');
   await page.locator('#r54Logout').click();
   assert.equal(await page.locator('#homeView [data-r54-cash]').textContent(),'—');
   await page.locator('#b151DemoMode').click();
   assert.equal(await page.locator('body').getAttribute('data-r54-mode'),'demo');
   assert.deepEqual(pageerrors,[]);assert.deepEqual(network,[]);
   if([393,1440].includes(width))await page.screenshot({path:'b152-premium-'+width+'.png',fullPage:true});
  }finally{await browser.close();}
 },{timeout:120000});
}
