'use strict';
// Builds the existing application for its existing owner-private Site. Public
// configuration only; neither credentials nor provisioning capabilities belong
// in the archive. The production release policy remains unchanged.
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),SITE='https://btc-strategy-pro-v20-preview.wintrythyme34.chatgpt.site';
function build({publishableKey,output,sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}){
 if(typeof publishableKey!=='string'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)||!path.isAbsolute(output)||!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('PUBLIC_TEST_CONFIGURATION_REQUIRED');
 fs.mkdirSync(output,{recursive:true});
 const sdk=esbuild.buildSync({stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:root},bundle:true,platform:'browser',format:'iife',globalName:'BTCV20AuthSDK',target:'es2022',minify:true,write:false,legalComments:'none'}).outputFiles[0].text;
 const host=require('./build-account-host.cjs').build(),hostName='account-host-v20.'+sourceCommit.slice(0,12)+'.js',sdkName='auth-sdk-v20.2-118-0.js';
 const fragment=`const btcFirstAccess=new URLSearchParams(location.hash.slice(1));const btcRecovery=btcFirstAccess.get('type')==='recovery'?btcFirstAccess.get('token_hash'):null;if(btcFirstAccess.has('token_hash'))history.replaceState(null,'',location.pathname+location.search);globalThis.BTCV20PrivateTest=true;`;
 const bootstrap=`(()=>{const sdk=BTCV20AuthSDK.createClient('https://oftzqqjbwonngubihrsd.supabase.co',${JSON.stringify(publishableKey)},{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'btcsp:v20:private-test:auth'}});const controller=BTCV20AccountConnection.configureSession({supabase:sdk,supabaseURL:'https://oftzqqjbwonngubihrsd.supabase.co',privateTest:true});if(btcRecovery)controller.redeemRecovery(btcRecovery).catch(()=>{});if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw-v20.js').catch(()=>{});})();`;
 let html=require('./build-onboarding-preview.cjs').buildPreview().html;html=html.replace('App atual ↗','V19.1 ↗');
 html=html.replace('<title>','<meta name="referrer" content="no-referrer"><link rel="manifest" href="/manifest-v20.webmanifest"><link rel="icon" href="/icon-v20.svg"><title>');
 html=html.replace('<script>const BTCPreviewWorkerSource=',`<script>${fragment}</script><script src="/${sdkName}"></script><script src="/${hostName}"></script><script>const BTCPreviewWorkerSource=`);
 html=html.replace('</body>',`<script>${bootstrap}</script></body>`);
 html=html.replace(/<footer class="bottom-note">[\s\S]*?<\/footer>/,'<footer class="bottom-note">Prévia privada V20 · Registos manuais no servidor BTC. A Demo fica neste navegador. Não são executadas ordens ou transferências. Email e lançamento ainda por validar.</footer>');
 html=html.replace(/<dialog id="legal">[\s\S]*?<\/dialog>/,'<dialog id="legal"><h2>Termos e privacidade da prévia privada</h2><p>A Demo usa dados fictícios neste navegador. A conta privada guarda os registos introduzidos por ti no serviço BTC Supabase. Não introduzas credenciais de corretoras.</p><p>O primeiro acesso é fornecido por ligação privada; envio de email, eliminação integral da conta e restauro operacional ainda não estão validados para lançamento. Podes exportar cada carteira e terminar todas as sessões. Usa dados de teste durante esta validação.</p><p>Perfis e liquidação são estimativas do modelo. Nenhum plano garante proteção ou rendimentos.</p><button class="primary" id="closeLegal">Fechar</button></dialog>');
 fs.writeFileSync(path.join(output,'index.html'),html);fs.writeFileSync(path.join(output,sdkName),sdk);fs.writeFileSync(path.join(output,hostName),host);
 const manifest={id:'/v20-private-test',name:'BTC Strategy Pro V20',short_name:'BTC Strategy',lang:'pt-PT',start_url:'/',scope:'/',display:'standalone',background_color:'#08141d',theme_color:'#08141d',icons:[{src:'/icon-v20.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]};
 fs.writeFileSync(path.join(output,'manifest-v20.webmanifest'),JSON.stringify(manifest));
 fs.writeFileSync(path.join(output,'icon-v20.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="42" fill="#08141d"/><rect x="27" y="27" width="138" height="138" rx="30" stroke="#71dedb" fill="#153b40" stroke-width="3"/><text x="96" y="131" font-family="sans-serif" font-size="106" text-anchor="middle" fill="#71dedb">₿</text></svg>');
 // No navigation, Auth, API or user-data caching. The private host still checks
 // audience for every document. Only these public, content-independent assets
 // can be cached. Offline account access stays unavailable.
 fs.writeFileSync(path.join(output,'sw-v20.js'),`const CACHE='btcsp-v20-assets-${sourceCommit.slice(0,12)}',ASSETS=['/icon-v20.svg','/manifest-v20.webmanifest','/${sdkName}','/${hostName}'];self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);for(const p of ASSETS){const r=await fetch(p,{cache:'reload',redirect:'error'});if(r.ok&&new URL(r.url).origin===self.location.origin)await c.put(p,r);}})()));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('btcsp-v20-assets-')&&k!==CACHE).map(k=>caches.delete(k))))));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method==='GET'&&u.origin===self.location.origin&&!u.search&&ASSETS.includes(u.pathname))e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});`);
 fs.writeFileSync(path.join(output,'version-v20.json'),JSON.stringify({project:'ThunderShockPT/btc-strategy-pro',branch:'qa/v20-block12-recovery-20261022',sourceCommit,environment:'private-test',productionApproved:false,site:SITE},null,2)+'\n');
 return {sourceCommit,output,bytes:Buffer.byteLength(html),productionApproved:false};
}
module.exports={build};
if(require.main===module){const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));console.log(JSON.stringify(build(config)));}
