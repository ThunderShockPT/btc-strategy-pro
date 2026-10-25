/* BTC Strategy Pro V20 B15.3 — SW EXCLUSIVO da DEMO QA.
 * Não reutilizar como Service Worker de carteiras/finanças autenticadas.
 * Cache explícita apenas de shell, manifesto, ícones e fallback públicos fictícios.
 */
'use strict';
const PREFIX='btcsp-v20-b153-demoqa-';
const CACHE=PREFIX+'20261025-1';
const ASSETS=['./index.html','./manifest.webmanifest','./offline.html','./icons/icon-192.png','./icons/icon-512.png'];
const ALLOW=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
const ENTRY=new URL('./index.html',self.registration.scope).href;
const ROOT=new URL('./',self.registration.scope).href;
const OFFLINE=new URL('./offline.html',self.registration.scope).href;
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(
  keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k))
 )).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const u=new URL(request.url),scope=new URL(self.registration.scope);
 if(u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname))return;
 const canonical=new URL(u.pathname,u.origin).href;
 const navigation=request.mode==='navigate';
 if(navigation&&(canonical===ENTRY||canonical===ROOT)){
  event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{
   // Cache only same-origin verified static entry — never API or authenticated responses.
   if(response.ok&&response.type==='basic'){
    const copy=response.clone();
    event.waitUntil(caches.open(CACHE).then(c=>c.put(ENTRY,copy)));
   }
   return response;
  }).catch(()=>caches.match(ENTRY).then(cached=>cached||caches.match(OFFLINE))));
  return;
 }
 if(navigation){
  event.respondWith(fetch(request).catch(()=>caches.match(OFFLINE)));
  return;
 }
 if(ALLOW.has(canonical)){
  event.respondWith(caches.match(canonical).then(cached=>cached||fetch(request)));
 }
});
