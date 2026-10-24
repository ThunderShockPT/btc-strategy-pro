/* Adaptive layout release checks: safeguard responsive assets and phone sizes. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const read=path=>fs.readFileSync(path,'utf8');
const css=read('responsive.css'),html=read('index.html'),js=read('adaptive-viewport.js');
const sw=read('service-worker.js'),wf=read('.github/workflows/pages.yml');
const manifest=JSON.parse(read('manifest.webmanifest'));const version=JSON.parse(read('version.json'));
let passed=0;
function verify(ok,msg){assert.ok(ok,msg);passed++;}
verify(html.includes('rel="stylesheet" href="./responsive.css"'),'Responsive CSS is linked');
verify(html.includes('src="./adaptive-viewport.js"'),'Viewport logic is linked');
verify(/@media\s*\(max-width:340px\)/.test(css),'Small 280–340px viewport layout');
verify(/@media\s*\(max-width:400px\)/.test(css),'Small 341–400px viewport layout');
verify(/@media\s*\(max-width:600px\)/.test(css),'Phone layout');
verify(/@media\s*\(max-width:1023px\)/.test(css),'Tablet and foldable layout');
verify(/orientation:landscape/.test(css),'Landscape mode layout');
verify(/safe-area-inset/.test(css),'Notch/gesture navigation safe area');
verify(/btc-keyboard-open/.test(css)&&js.includes('visualViewport'),'On-screen keyboard support');
verify(/overscroll-behavior-inline:contain/.test(css)&&/overflow-x:auto/.test(css),'Wide tables scroll within container');
verify(/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/.test(css),'Five mobile navigation slots');
verify(css.includes('touch-action:manipulation'),'Touch-first interaction');
verify(css.includes('prefers-reduced-motion'),'Reduced-motion support');
verify(/ResizeObserver/.test(js),'Responsive chart update observer');
verify(sw.includes("'./responsive.css'")&&sw.includes("'./adaptive-viewport.js'"),'Offline PWA caches responsive assets');
verify(wf.includes('responsive.css adaptive-viewport.js'),'Published site contains responsive assets');
verify(manifest.orientation==='any','PWA permits landscape');
verify(version.cloud_auth===false&&version.mode==='demo','Accounts remain disabled');
verify(/window\.BTC_BETA_AUTH_ENABLED=false/.test(html),'Guard flag remains closed');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
for(const [i,script] of inline.entries()){new vm.Script(script[1],{filename:'inline-'+i+'.js'});passed++;}
new vm.Script(js,{filename:'adaptive-viewport.js'});passed++;
// Simple balanced-delimiter smoke check (CSS blocks are nested media rules).
let balance=0;for(const ch of css){if(ch==='{')balance++;if(ch==='}')balance--;assert.ok(balance>=0,'Unbalanced CSS');}verify(balance===0,'Responsive CSS braces balanced');
console.log('Adaptive viewport release checks: '+passed+' PASS.');
