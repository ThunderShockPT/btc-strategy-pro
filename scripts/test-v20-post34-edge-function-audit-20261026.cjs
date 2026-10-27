'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),json=p=>JSON.parse(read(p));
const audit=json('policies/v20-post34-edge-functions-audit-20261026.json');
const cloud=json('policies/cloud-release-20261021.json');
const release=json('policies/v20-b15-release-evidence-20261025.json');
const stage1=json('policies/v20-post34-supabase-security-audit-20261026.json');
const prod=read('backend/edge-runtime.cjs');
const privateRuntime=read('backend/private-test-runtime.cjs');
const provision=read('backend/private-test-provision.cjs');
test('P1.2 covers exactly the five Supabase-deployed functions without disclosing capability data',()=>{
 assert.equal(audit.projectRef,'oftzqqjbwonngubihrsd');
 assert.equal(audit.scope,'READ_ONLY_SOURCE_REVIEW_NO_LIVE_REQUESTS');
 assert.equal(audit.edgeFunctions.length,5);
 assert.equal(new Set(audit.edgeFunctions.map(x=>x.slug)).size,5);
 assert.deepEqual(audit.edgeFunctions.map(x=>x.slug),stage1.edgeFunctions.names);
 assert.ok(audit.edgeFunctions.every(x=>x.platformVerifyJwt===false&&/^[a-f0-9]{64}$/.test(x.sha256)));
 assert.doesNotMatch(JSON.stringify(audit),/accessTag\s*:\s*["'][a-f0-9]{32}|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']{20}/i);
});
test('Retired QA runtime/provision functions are explicitly closed without business routes',()=>{
 const a=audit.edgeFunctions.find(x=>x.slug==='btcsp-v20-runtime-qa');
 const b=audit.edgeFunctions.find(x=>x.slug==='btcsp-v20-private-provision');
 assert.equal(a.classification,'RETIRED_CLOSED_STUB');
 assert.equal(b.classification,'RETIRED_CLOSED_STUB');
 assert.ok(a.sourceChecks.some(x=>x.includes('QA_COMPLETE_CLOSED')));
 assert.ok(b.sourceChecks.some(x=>x.includes('PRIVATE_PROVISION_CLOSED')));
 assert.ok(a.sourceChecks.some(x=>x.includes('503')));
 assert.ok(b.sourceChecks.some(x=>x.includes('503')));
});
test('Account QA capability expired and cannot be used to authorize real-account Beta',()=>{
 const x=audit.edgeFunctions.find(x=>x.slug==='btcsp-v20-account-qa');
 assert.equal(x.classification,'EPHEMERAL_QA_EXPIRED');
 assert.ok(x.sourceChecks.some(y=>y.includes('2026-10-25T09:57:44.973Z')));
 assert.ok(Date.parse('2026-10-25T09:57:44.973Z')<Date.parse('2026-10-26T00:00:00Z'));
 assert.ok(x.sourceChecks.some(y=>/capability/i.test(y)));
 assert.ok(x.sourceChecks.some(y=>/temporary permissive policy/.test(y)));
 assert.equal(x.currentlySupportsRealTrading,false);
});
test('Production Edge source requires nine policy checks and pinned project identifier',()=>{
 assert.match(prod,/const CHECKS=\[/);
 assert.match(prod,/financialCloudApproved===true/);
 assert.match(prod,/CHECKS\.every\(k=>p\.checks\?\.\[k\]===true\)/);
 assert.match(prod,/Auth\.PROJECT/);
 assert.match(prod,/enabled=approved\(release\)/);
 assert.equal(audit.edgeFunctions.find(x=>x.slug==='btcsp-v20-api').classification,'PRODUCTION_API_CLOUD_DISABLED');
});
test('Production source binds confirmed authentication to financial DB transactions',()=>{
 assert.match(prod,/authorizeTransaction:auth\.assertSession/);
 assert.match(prod,/Auth\.create/);
 assert.match(prod,/if\(!enabled\)throw Error\('CLOUD_NOT_ENABLED'\)/);
});
test('Private test source has server-side owner allowlist and live session controls',()=>{
 assert.match(privateRuntime,/const allowed=new Set\(ownerIds\)/);
 assert.match(privateRuntime,/allowed\.has\(u\.id\)/);
 assert.match(privateRuntime,/verified\.assertSession\(tx,u,s\)/);
 assert.match(privateRuntime,/raw_app_meta_data/);
 assert.match(privateRuntime,/PRIVATE_TEST_UNAVAILABLE/);
 assert.equal(audit.edgeFunctions.find(x=>x.slug==='btcsp-v20-private-test').classification,'RESTRICTED_TEST_API_ACTIVE');
});
test('Provision source was short-lived QA capability and cannot be assumed production-safe',()=>{
 assert.match(provision,/capabilityHash/);
 assert.match(provision,/timingSafeEqual/);
 assert.match(provision,/qaOnly===true/);
 assert.equal(audit.edgeFunctions.find(x=>x.slug==='btcsp-v20-private-provision').classification,'RETIRED_CLOSED_STUB');
});
test('No deployed source review authorizes public registrations or live Kraken',()=>{
 assert.ok(audit.edgeFunctions.every(x=>x.currentlySupportsRealTrading===false));
 assert.equal(audit.policyGuards.financialCloudApproved,false);
 assert.equal(audit.policyGuards.publicRegistrationApproved,false);
 assert.equal(cloud.financialCloudApproved,false);
 assert.equal(cloud.publicRegistrationApproved,false);
 assert.ok(Object.values(cloud.checks).every(v=>v===false));
 assert.equal(release.intendedMode,'QA_ONLY_DO_NOT_DEPLOY');
 assert.equal(audit.policyGuards.goNoGo,'NO_GO');
});
test('Dynamic adversarial security tests remain mandatory, not inferred from source inspection',()=>{
 assert.ok(audit.crossCuttingFindings.some(x=>x.id==='JWT_PLATFORM_OFF'));
 assert.ok(audit.crossCuttingFindings.some(x=>x.id==='PRIVATE_TEST_ACTIVE'));
 assert.ok(audit.crossCuttingFindings.some(x=>x.id==='UNKNOWN_RUNTIME_TEST'));
 assert.equal(audit.stage.status,'CODE_REVIEW_COMPLETE_DYNAMIC_SECURITY_TESTS_STILL_PENDING_IN_P1.4');
 assert.equal(audit.stage.next,'P1.3');
});
test('P1.2 evidence does not change technical plan 34/34 or close production GO gates',()=>{
 const initial=json('docs/V20_34_ETAPAS_AUDITORIA_FECHO_TECNICO_20261026.json');
 assert.equal(initial.summary.technicallyDeliveredStages,34);
 assert.equal(initial.summary.productionReadiness,'NO_GO');
 assert.equal(audit.policyGuards.pr35Draft,true);
 assert.equal(release.sourceReference.doNotMergeAutomatically,true);
});
