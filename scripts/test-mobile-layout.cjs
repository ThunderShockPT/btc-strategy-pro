/* Browser layout QA across phones, foldables, tablets, desktop and landscape.
 * Runs against served static files; no real Supabase account or financial API. */
'use strict';
const {chromium}=require('playwright-core');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const f=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(f,(err,buf)=>{if(err){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(buf)})
});
const cases=[[280,600],[320,700],[360,780],[390,850],[430,932],[600,800],[768,1024],[1024,768],[844,390],[1440,900]];
async function metrics(page,tag,w,h){
 const m=await page.evaluate(()=>{
  const doc=document.documentElement;
  const viewport=window.innerWidth;
  const nav=document.querySelector('.bottomnav');
  const navStyle=nav?getComputedStyle(nav):null;
  const sidebar=document.querySelector('.sidebar');
  const sidebarVisible=!!sidebar&&getComputedStyle(sidebar).display!=='none';
  const navVisible=!!nav&&navStyle.display!=='none';
  const rect=nav?.getBoundingClientRect();
  return {viewport,scrollWidth:doc.scrollWidth,bodyScroll:document.body.scrollWidth,navVisible,sidebarVisible,
    navRight:rect?.right??0,navLeft:rect?.left??0,tabCount:nav?.querySelectorAll('.tab').length??0,
    documentHeight:doc.scrollHeight};
 });
 if(m.scrollWidth>m.viewport+2||m.bodyScroll>m.viewport+2)throw Error(tag+': horizontal page overflow '+JSON.stringify(m));
 if(w<=1023){
  if(!m.navVisible||m.sidebarVisible||m.tabCount!==5)throw Error(tag+': expected 5-tab mobile navigation '+JSON.stringify(m));
  if(m.navLeft< -2||m.navRight>w+2)throw Error(tag+': bottom navigation outside viewport '+JSON.stringify(m));
 }else if(m.navVisible||!m.sidebarVisible)throw Error(tag+': expected desktop sidebar '+JSON.stringify(m));
 return m;
}
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address(),url='http://127.0.0.1:'+address.port+'/';
 const exe=process.env.CHROME_BIN||'/usr/bin/google-chrome';
 const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(exe)?exe:chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage']});
 let n=0;
 try{
  for(const [w,h] of cases){
   const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:w<=430?2:1,isMobile:w<=430,hasTouch:w<=430});
   const page=await context.newPage();
   let errors=[];page.on('pageerror',e=>errors.push(String(e)));
   const resp=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
   assert.equal(resp.status(),200);
   await page.waitForFunction(()=>!!window.BTCBlock7&&!!window.BTCBlock6,{timeout:12000});
   await page.waitForTimeout(120);
   await metrics(page,w+'x'+h+' home',w,h);n++;
   const nav=await page.evaluate(()=>{
    const a=[...document.querySelectorAll('[data-nav="Estratégias"]')];
    const el=a.find(e=>e.offsetWidth>0&&e.offsetHeight>0);
    if(el){el.click();return true}return false;
   });
   if(nav){await page.waitForTimeout(70);await metrics(page,w+'x'+h+' strategies',w,h);n++}
   page.evaluate(()=>window.BTCBlock7.open());await page.waitForTimeout(70);
   await metrics(page,w+'x'+h+' projects',w,h);n++;
   const rename=page.locator('.b7project button[data-paction="rename"]').first();
   await rename.click();
   const modal=page.locator('#overlay.open .dialog');await modal.waitFor({timeout:5000});
   const box=await modal.boundingBox();
   if(!box||box.x< -2||box.x+box.width>w+2)throw Error(w+'x'+h+': modal outside horizontal viewport '+JSON.stringify(box));
   n++;
   await page.locator('#closeDialog').click();await page.waitForTimeout(30);
   if(errors.length)throw Error(w+'x'+h+': page JavaScript errors: '+errors.slice(0,4).join('; '));
   await context.close();
   console.log(w+'x'+h+': PASS (home, strategies, projects, modal)');
  }
  console.log('Responsive browser QA: '+n+' layout checks PASS across '+cases.length+' viewports.');
 }finally{await browser.close();server.close();}
}
run().catch(e=>{console.error(e);server.close();process.exitCode=1});
