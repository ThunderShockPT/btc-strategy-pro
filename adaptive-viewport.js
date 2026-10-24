/* BTC Strategy Pro — adaptive viewport and graphics resize support (v15).
 * No device/OS sniffing; use measured CSS viewport and available browser APIs. */
(()=>{'use strict';
const root=document.documentElement;
const VV=window.visualViewport;
let raf=0,lastHeight=0;
function applyViewport(){
 const vh=VV?.height||window.innerHeight||document.documentElement.clientHeight;
 if(Number.isFinite(vh)&&vh>100&&Math.abs(vh-lastHeight)>.75){
  lastHeight=vh;root.style.setProperty('--btc-visible-height',Math.round(vh)+'px');
 }
 const field=document.activeElement;
 const typing=!!field&&(field.matches?.('input,textarea,select,[contenteditable="true"]')??false);
 const layoutHeight=window.innerHeight||vh;
 const keyboardGap=Math.max(0,layoutHeight-vh-(VV?.offsetTop||0));
 document.body.classList.toggle('btc-keyboard-open',typing&&keyboardGap>Math.max(120,layoutHeight*.17));
}
function schedule(){
 if(raf)return;
 raf=requestAnimationFrame(()=>{raf=0;applyViewport()});
}
function init(){
 if(!document.body)return;
 applyViewport();
 VV?.addEventListener('resize',schedule,{passive:true});
 VV?.addEventListener('scroll',schedule,{passive:true});
 document.addEventListener('focusin',schedule);
 document.addEventListener('focusout',schedule);
 window.addEventListener('orientationchange',()=>{schedule();requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')))},{passive:true});
 window.addEventListener('resize',schedule,{passive:true});
 if('ResizeObserver' in window){
  const last=new WeakMap();
  const ro=new ResizeObserver(entries=>{
   let didChange=false;
   for(const item of entries){
    const box=item.contentRect,old=last.get(item.target);
    const current=[Math.round(box.width),Math.round(box.height)];
    if(!old||old[0]!==current[0]||old[1]!==current[1]){last.set(item.target,current);didChange=true}
   }
   if(didChange)requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  });
  // Underlying pages are created lazily; observe stable root containers.
  for(const sel of ['#chartbox','#terminalView','#riskView']){
   const item=document.querySelector(sel);if(item)ro.observe(item);
  }
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();