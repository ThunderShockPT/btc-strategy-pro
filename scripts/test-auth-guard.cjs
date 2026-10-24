/* BTC Strategy Pro Bloco 18 — authentication safety checks.
   Uses mocked identities/locations only; never creates or emails real users. */
'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const ctx={URLSearchParams};vm.runInNewContext(fs.readFileSync('auth-guard.js','utf8'),ctx);
const g=ctx.BTCAuthGuard;let passes=0;
function check(test,msg){assert.ok(test,msg);passes++}
const user={id:'e4ebd22c-f647-4ffb-8422-8532bc777777',email:'qa@example.invalid',email_confirmed_at:'2026-10-20T21:00:00.000Z'};
check(g.verified(user),'Confirmed user should be accepted');
check(!g.verified({...user,email_confirmed_at:null}),'Unconfirmed users blocked');
check(!g.verified({...user,email_confirmed_at:'invalid'}),'Malformed confirmation blocked');
check(!g.verified({...user,id:'not-uuid'}),'Malformed user ID blocked');
check(!g.verified({...user,email:''}),'Missing email blocked');
check(!g.verified(null),'Absent user blocked');
const origin='https://thundershockpt.github.io',path='/btc-strategy-pro/';
check(g.redirect({origin,protocol:'https:',hostname:'thundershockpt.github.io',pathname:path})===origin+path,'Exact GitHub Pages callback');
check(g.redirect({origin,protocol:'https:',hostname:'thundershockpt.github.io',pathname:path,search:'?next=https://evil.test',hash:'#token'})===origin+path,'No query or token in auth redirect');
check(g.redirect({origin:'http://localhost:4000',protocol:'http:',hostname:'localhost',pathname:path})==='http://localhost:4000'+path,'Local QA permitted');
assert.throws(()=>g.redirect({origin:'http://untrusted.example',protocol:'http:',hostname:'untrusted.example',pathname:'/'}),/HTTPS/);passes++;
assert.throws(()=>g.redirect({origin,protocol:'https:',hostname:'thundershockpt.github.io',pathname:'//evil.test'}),/inválido/);passes++;
check(g.callback({search:'?code=redacted',hash:''}).hasCallback,'PKCE callback');
check(g.callback({search:'',hash:'#access_token=redacted&type=signup'}).hasCallback,'Implicit signup callback');
check(g.callback({search:'',hash:'#type=recovery&access_token=redacted'}).isRecovery,'Recovery mode');
check(g.callback({search:'?error=access_denied',hash:''}).error,'Error mode');
check(!g.callback({search:'',hash:''}).hasCallback,'Normal visit is not a callback');
check(g.errorText({code:'invalid_credentials'}).includes('inválidos'),'Login error has generic text');
check(g.errorText({code:'over_email_send_rate_limit'}).includes('tentativas'),'Rate limiting message');
check(!g.errorText({code:'INTERNAL',message:'user secret@example.com 500 server password abc'}).includes('secret@example.com'),'Internal errors should not leak PII');
console.log('BTC Auth safety: '+passes+' checks PASS. Cloud auth still disabled on public release.');
