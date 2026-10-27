'use strict';
/* BTC Strategy Pro P1.5 — offline, read-only Auth email/recovery controls.
 * NO real registration, SMTP requests, Supabase network calls or secrets. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),load=p=>fs.readFileSync(path.join(root,p),'utf8');
const review=JSON.parse(load('policies/v20-post34-email-auth-recovery-review-20261027.json'));
const cloud=JSON.parse(load('policies/cloud-release-20261021.json'));
const release=JSON.parse(load('policies/v20-b15-release-evidence-20261025.json'));
const ctx={URLSearchParams};vm.runInNewContext(load('auth-guard.js'),ctx);const guard=ctx.BTCAuthGuard;
const session=load('account-session-v20.js'),html=load('previews/v20-r5-login-wallets-qa-20261025.html');
test('P1.5 Auth guard safely validates callback destinations and removes query/fragment',()=>{
 assert.equal(guard.redirect({origin:'https://thundershockpt.github.io',protocol:'https:',hostname:'thundershockpt.github.io',pathname:'/btc-strategy-pro/',search:'?code=sensitive',hash:'#access_token=secret'}),'https://thundershockpt.github.io/btc-strategy-pro/');
 assert.throws(()=>guard.redirect({origin:'http://evil.example',protocol:'http:',hostname:'evil.example',pathname:'/callback'}),/HTTPS/);
 assert.throws(()=>guard.redirect({origin:'https://btc.example',protocol:'https:',hostname:'btc.example',pathname:'//evil.example'}),/Caminho/);
 assert.throws(()=>guard.redirect({origin:'https://btc.example',protocol:'https:',hostname:'btc.example',pathname:'/\\evil'}),/Caminho/);
});
test('P1.5 callback recognizes code, recovery, expired/error and normal visit without exposing tokens',()=>{
 assert.equal(guard.callback({search:'?code=redacted',hash:''}).hasCallback,true);
 assert.equal(guard.callback({search:'',hash:'#type=recovery&access_token=redacted'}).isRecovery,true);
 assert.equal(guard.callback({search:'?error=access_denied',hash:''}).error,true);
 assert.equal(guard.callback({search:'',hash:''}).hasCallback,false);
});
test('P1.5 error messages hide arbitrary internal provider message and sensitive email',()=>{
 const secret='somebody@example.invalid token SECRET';
 const e=guard.errorText({code:'server_internal_error',message:secret});
 assert.equal(e.includes(secret),false);
 assert.equal(e.includes('somebody@example.invalid'),false);
 assert.match(guard.errorText({code:'email_not_confirmed'}),/Confirma/);
 assert.match(guard.errorText({code:'over_email_send_rate_limit'}),/tentativas/);
 assert.match(guard.errorText({code:'otp_expired'}),/expirou/);
});
test('P1.5 session module requires confirmed user and prevents financial panel during recovery',()=>{
 assert.match(session,/email_confirmed_at/);
 assert.match(session,/user\.is_anonymous===true/);
 assert.match(session,/if\(recovery\|\|locked\)return/);
 assert.match(session,/PASSWORD_RECOVERY/);
 assert.match(session,/clear\('recovery'\)/);
});
test('P1.5 password reset flow verifies token hash then globally logs out',()=>{
 assert.match(session,/redeemRecovery:tokenHash/);
 assert.match(session,/auth\.verifyOtp\(\{token_hash:tokenHash,type:'recovery'\}\)/);
 assert.match(session,/auth\.updateUser\(\{password\}\)/);
 assert.match(session,/scope:'global'/);
});
test('P1.5 legacy Preview has signup/recovery hooks, but public controls gated by beta flag',()=>{
 assert.match(html,/const hasCloud=Boolean\(window\.BTC_BETA_AUTH_ENABLED\)/);
 assert.match(html,/disabled=hasCloud\?'':'disabled'/);
 assert.match(html,/c\.auth\.signUp\(\{email,password/);
 assert.match(html,/c\.auth\.resetPasswordForEmail\(email,\{redirectTo:location\.origin\+location\.pathname\}\)/);
 assert.match(html,/emailRedirectTo:location\.origin\+location\.pathname/);
 assert.equal(cloud.publicRegistrationApproved,false);
});
test('P1.5 source flags password length mismatch; does not silently claim it fixed',()=>{
 assert.match(html,/minlength="8"/);
 assert.match(session,/password\.length<10/);
 assert.ok(review.riskRegister.some(x=>x.id==='PASSWORD_UI_MIN_LENGTH_DRIFT'));
});
test('P1.5 not authorized to claim provider SMTP, redirect allowlist, rate limits or delivery are verified',()=>{
 const c=review.liveConfiguration;
 for(const key of ['smtpProvider','customSmtpEnabled','siteUrl','redirectAllowList','emailRateLimits','authEmailConfirmationsEnabled','realEmailDeliverabilityTest'])
  assert.match(c[key],/NOT_VERIFIED|NOT_PERFORMED/);
 assert.equal(review.outcome.emailsSent,0);
 assert.equal(review.outcome.userRecordsRead,0);
 assert.equal(review.outcome.supabaseWrites,0);
});
test('P1.5 app auth/cloud/public gates remain closed and PR is review only',()=>{
 assert.equal(cloud.financialCloudApproved,false);
 assert.equal(cloud.publicRegistrationApproved,false);
 assert.ok(Object.values(cloud.checks).every(v=>v===false));
 assert.equal(release.intendedMode,'QA_ONLY_DO_NOT_DEPLOY');
 assert.equal(review.outcome.releaseDecision,'NO_GO');
 assert.equal(review.outcome.hostedAcceptance,'PENDING');
});
