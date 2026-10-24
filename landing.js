/* BTC Strategy Pro · Bloco 17 — first-visit gateway and auth routing.
   This is a route/view controller only. User records stay in BTCBlock7.
   No fake accounts, no credential collection, no forced localData reset. */
(()=>{'use strict';
const KEY='btcsp_entry_mode_v17';
const root=document.documentElement,landing=()=>document.getElementById('btcLanding');
function cloudAvailable(){return window.BTCBlock7?.cloudEnabled===true}
function statusMessage(){const note=document.getElementById('btcLandingAuthNotice');if(note)note.hidden=cloudAvailable()}
function remember(mode){try{sessionStorage.setItem(KEY,mode)}catch(e){console.info('Session preference unavailable');}}
function read(){try{return sessionStorage.getItem(KEY)}catch(e){return null}}
function show(){
 root.classList.add('btc-landing-active');
 const page=landing();if(page)page.hidden=false;
 window.scrollTo(0,0);
 statusMessage();
}
function hide(){
 root.classList.remove('btc-landing-active');
 const page=landing();if(page)page.hidden=true;
 window.scrollTo(0,0);
}
function enter(mode){
 const workspace=window.BTCBlock7;
 if(mode==='demo'){
   remember('demo');hide();
   if(document.getElementById('accountView')?.hidden===false)workspace?.leave('Início');
   window.dispatchEvent(new CustomEvent('btc-demo-entered'));
   return true;
 }
 if(mode==='login'||mode==='signup'||mode==='recover'){
   remember('auth');hide();
   if(workspace?.authSelect)workspace.authSelect(mode==='signup'?'registar':mode==='recover'?'recuperar':'entrar');
   else if(workspace?.open)workspace.open();
   return true;
 }
 return false;
}
function leaveWorkspace(){
 // Do not sign out or erase the project — simply return to introductory page.
 try{sessionStorage.removeItem(KEY)}catch(e){}
 document.getElementById('accountView')?.setAttribute('hidden','');
 show();
}
function ensureReturn(){
 const top=document.querySelector('#accountView .accounttop');
 if(!top||document.getElementById('btcReturnLanding'))return;
 const button=document.createElement('button');
 button.id='btcReturnLanding';button.type='button';button.className='btn neutral';
 button.textContent='⌂ Página inicial';button.setAttribute('aria-label','Voltar à página de boas-vindas');
 button.onclick=leaveWorkspace;
 top.append(button);
}
function initialize(){
 if(!landing())return;
 const query=new URLSearchParams(location.search);
 const authCallback=query.has('code')||query.has('error')||location.hash.includes('access_token=')||location.hash.includes('type=recovery')||location.hash.includes('type=signup');
 const explicit=query.get('inicio');
 const choice=read();
 if(authCallback){remember('auth');hide();window.BTCBlock7?.open()}
 else if(explicit==='1'){show()}
 else if(choice==='demo'){hide()}
 else if(choice==='auth'){hide();window.BTCBlock7?.open()}
 else show();
 for(const el of document.querySelectorAll('[data-entry-action]')){
  el.addEventListener('click',()=>enter(el.getAttribute('data-entry-action')));
 }
 const account=document.getElementById('accountView');
 if(account){
  new MutationObserver(ensureReturn).observe(account,{childList:true,subtree:false});
  ensureReturn();
 }
 document.addEventListener('btc-auth-session-changed',e=>{
  if(e?.detail?.authenticated){remember('auth');hide()}
 });
 statusMessage();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
else initialize();
window.BTCLanding={open:show,enter,back:leaveWorkspace};
})();