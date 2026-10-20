/* BTC Strategy Pro — public-demo release gate, no external npm dependencies. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),sw=read('service-worker.js'),manifest=JSON.parse(read('manifest.webmanifest'));
const version=JSON.parse(read('version.json')),workflow=read('.github/workflows/pages.yml');
let count=0;
function check(condition,message){assert.ok(condition,message);count++}
check(/window\.BTC_BETA_AUTH_ENABLED=false\b/.test(html),'Auth must stay gated during Demo QA');
check(version.cloud_auth===false,'Version metadata must not claim real login available');
check(!/\bsb_secret_|\bservice_role\s*[:=]\s*['"]/i.test(html),'No secret Supabase keys in public HTML');
check(html.includes('Sem ligação a corretoras'),'Explicit fictitious-trading warning required');
check(html.includes('Preços e resultados fictícios'),'Disclaimers visible to users');
check(html.includes('Preço BTC/USD hipotético'),'Scenario price must not imply a real quote');
check(html.includes('cloud-sync.js')&&html.includes('pwa-controller.js'),'Cloud and PWA scripts linked');
check(sw.includes("'/cloud-sync.js'")||sw.includes("'./cloud-sync.js'"),'Service Worker precaches cloud module');
check(workflow.includes('cloud-sync.js version.json _site/'),'Workflow must ship cloud module and version');
check(workflow.includes('node scripts/test-cloud-sync.cjs'),'Workflow must gate on optimistic concurrency tests');
check(manifest.start_url==='./'&&manifest.scope==='./'&&manifest.display==='standalone','Manifest must support installation under subpath');
check(html.includes('BTC Strategy Pro')&&version.mode==='demo','App retains Demo identity');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
for(const [i,script] of inline.entries()){new vm.Script(script,{filename:'inline-script-'+(i+1)+'.js'});count++}
new vm.Script(read('cloud-sync.js'),{filename:'cloud-sync.js'});count++;
new vm.Script(read('pwa-controller.js'),{filename:'pwa-controller.js'});count++;
new vm.Script(sw,{filename:'service-worker.js'});count++;
console.log('Release gate: '+count+' checks PASS — UI, safety, scripts, PWA, auth and CI.');
