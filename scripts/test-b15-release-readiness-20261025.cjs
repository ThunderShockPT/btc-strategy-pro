'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
const R=require('./check-b15-release-readiness-20261025.cjs');
const root=path.resolve(__dirname,'..');
const policy=JSON.parse(fs.readFileSync(path.join(root,'policies/cloud-release-20261021.json'),'utf8'));
const evidence=JSON.parse(fs.readFileSync(path.join(root,'policies/v20-b15-release-evidence-20261025.json'),'utf8'));
const copy=x=>JSON.parse(JSON.stringify(x));
const assess=(mode='qa-review',p=policy,e=evidence,ci={})=>R.assess({policy:p,evidence:e,mode,ci});
test('B15.4 baseline QA evidence is valid, without interpreting it as public authorization',()=>{
 const r=assess();assert.equal(r.eligible,true);assert.equal(r.releaseAuthorized,false);
 assert.equal(r.qaTests,640);assert.equal(r.physicalGalaxyS25Verified,false);
 assert.deepEqual(r.blockers,[]);
});
test('B15.4 public release is blocked by human, compliance and production gates',()=>{
 const r=assess('public-release');
 assert.equal(r.eligible,false);assert.equal(r.releaseAuthorized,false);
 assert.ok(r.blockers.length>=26,JSON.stringify(r.blockers));
 for(const code of ['OWNER_strategyModelR14','OWNER_strategyCriteriaR24',
  'OWNER_galaxyS25PhysicalInstallOffline','OWNER_visualParityOriginalDemo',
  'EVIDENCE_productionBackupRestoreDrill','POLICY_privacyLifecycle',
  'CLOUD_POLICY_NOT_APPROVED','RELEASE_EXECUTION_UNAUTHORIZED',
  'QA_SHA_MISMATCH','PUBLIC_INTENT_NOT_SET']){
   assert.ok(r.blockers.some(b=>b.code===code),code);
 }
});
test('B15.4 passing 640 automated tests cannot substitute for S25 or risk-profile approval',()=>{
 const e=copy(evidence);e.lastVerifiedAutomatedQA.tests=64000;e.lastVerifiedAutomatedQA.passed=64000;
 const r=assess('public-release',policy,e);
 assert.equal(r.eligible,false);
 assert.ok(r.blockers.some(x=>x.code==='OWNER_galaxyS25PhysicalInstallOffline'));
 assert.ok(r.blockers.some(x=>x.code==='OWNER_strategyModelR14'));
});
test('B15.4 release stays blocked even if an attacker flips owner evidence but not policy',()=>{
 const e=copy(evidence);Object.keys(e.ownerApprovals).forEach(k=>e.ownerApprovals[k]=true);
 Object.keys(e.releaseEvidence).forEach(k=>e.releaseEvidence[k]=true);
 e.intendedMode='PUBLIC_RELEASE_APPROVED';
 const r=assess('public-release',policy,e,{ref:'refs/heads/main',
  sha:e.lastVerifiedAutomatedQA.commit,ownerConfirmation:'CONFIRM_BTCSP_V20_PUBLIC_RELEASE'});
 assert.equal(r.eligible,false);assert.ok(r.blockers.some(x=>x.code==='CLOUD_POLICY_NOT_APPROVED'));
 assert.ok(r.blockers.some(x=>x.code==='POLICY_smtpExclusive'));
});
test('B15.4 protected branch and exact CI SHA must match even with synthetic approvals',()=>{
 const p=copy(policy),e=copy(evidence);
 Object.keys(e.ownerApprovals).forEach(k=>e.ownerApprovals[k]=true);
 Object.keys(e.releaseEvidence).forEach(k=>e.releaseEvidence[k]=true);
 Object.keys(p.checks).forEach(k=>p.checks[k]=true);
 p.publicRegistrationApproved=true;p.financialCloudApproved=true;e.intendedMode='PUBLIC_RELEASE_APPROVED';
 const invalid=assess('public-release',p,e,{ref:'refs/heads/audit/v20-strategy-recovery-20261025',
 sha:'f'.repeat(40),ownerConfirmation:'CONFIRM_BTCSP_V20_PUBLIC_RELEASE'});
 assert.equal(invalid.eligible,false);
 assert.ok(invalid.blockers.some(x=>x.code==='RELEASE_EXECUTION_UNAUTHORIZED'));
 assert.ok(invalid.blockers.some(x=>x.code==='QA_SHA_MISMATCH'));
 // Synthetic isolated path exists for a future *separately approved* real gate.
 const valid=assess('public-release',p,e,{ref:'refs/heads/main',
 sha:e.lastVerifiedAutomatedQA.commit,ownerConfirmation:'CONFIRM_BTCSP_V20_PUBLIC_RELEASE'});
 assert.equal(valid.eligible,true);assert.equal(valid.releaseAuthorized,true);
});
test('B15.4 no release can be inferred from missing security fields',()=>{
 const p=copy(policy),e=copy(evidence);
 delete p.checks.productionRestore;delete e.ownerApprovals.publicRelease;
 delete e.releaseEvidence.productionBackupRestoreDrill;
 const r=assess('public-release',p,e);
 assert.equal(r.eligible,false);assert.ok(r.blockers.some(x=>x.code==='POLICY_productionRestore'));
});
test('B15.4 replacing source provenance or physical QA flag invalidates audit',()=>{
 const e=copy(evidence);e.lastVerifiedAutomatedQA.physicalAndroidDevice=true;
 e.sourceReference.releaseBranch='stolen-branch';
 const r=assess('qa-review',policy,e);
 assert.equal(r.eligible,false);
 assert.ok(r.blockers.some(x=>x.code==='PHYSICAL_DEVICE_UNVERIFIED'));
 assert.ok(r.blockers.some(x=>x.code==='SOURCE_BRANCH_UNKNOWN'));
});
test('B15.4 demo-only HTTPS preview cannot go live without owner opt-in',()=>{
 const r=assess('demo-preview');
 assert.equal(r.eligible,false);
 assert.ok(r.blockers.some(x=>x.code==='DEMO_PREVIEW_OWNER_PERMISSION_REQUIRED'));
 assert.ok(r.blockers.some(x=>x.code==='EXPLICIT_RELEASE_INTENT_REQUIRED'));
});
test('B15.4 one synthetic demo preview approval cannot enable registration/cloud/trades',()=>{
 const e=copy(evidence);e.ownerApprovals.limitedDemoHttpsPreview=true;
 e.intendedMode='DEMO_PREVIEW_APPROVED';
 const r=assess('demo-preview',policy,e);
 assert.equal(r.eligible,true);assert.equal(r.releaseAuthorized,false);
 const p=copy(policy);p.financialCloudApproved=true;
 assert.equal(assess('demo-preview',p,e).eligible,false);
});
test('B15.4 mode typo throws and execution CLI refuses public release',()=>{
 assert.throws(()=>assess('ship-it'),/B154_INVALID_MODE/);
 const s=spawnSync(process.execPath,['scripts/check-b15-release-readiness-20261025.cjs',
  '--mode=public-release'],{cwd:root,encoding:'utf8'});
 assert.equal(s.status,2);assert.match(s.stdout,/"releaseAuthorized": false/);
 assert.match(s.stdout,/"eligible": false/);
});
test('B15.4 QA code cannot mutate official release JSON to mark production approved',()=>{
 assert.equal(policy.financialCloudApproved,false);assert.equal(policy.publicRegistrationApproved,false);
 assert.ok(Object.values(policy.checks).every(v=>v===false));
 assert.equal(evidence.intendedMode,'QA_ONLY_DO_NOT_DEPLOY');
 assert.ok(Object.values(evidence.ownerApprovals).every(v=>v===false));
 assert.ok(Object.values(evidence.releaseEvidence).every(v=>v===false));
});
