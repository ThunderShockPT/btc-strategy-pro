'use strict';
/* P1.3 — audit billing and auth guard, no Auth configuration calls, no credentials. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const review=json('policies/v20-post34-password-security-review-20261026.json');
const cloud=json('policies/cloud-release-20261021.json');
const release=json('policies/v20-b15-release-evidence-20261025.json');
const previous=json('policies/v20-post34-supabase-security-audit-20261026.json');
test('P1.3 evidence covers only the intended Supabase BTC project',()=>{
 assert.equal(review.projectRef,'oftzqqjbwonngubihrsd');
 assert.equal(review.policy.stage,'P1.3');
 assert.equal(review.observed.organizationLookupMethod.includes('read-only'),true);
 assert.equal(review.observed.dataOrUserRecordsRead,false);
});
test('Native leaked-password protection requires Pro and is unavailable on reviewed Free organization',()=>{
 assert.equal(review.observed.organizationPlan,'free');
 assert.equal(review.observed.organizationTier,'tier_free');
 assert.equal(review.observed.leakedPasswordNativeFeature.requiresPlanAtLeast,'pro');
 assert.equal(review.observed.leakedPasswordNativeFeature.availableOnCurrentPlan,false);
 assert.ok(review.observed.leakedPasswordNativeFeature.source.includes('/auth/password-security'));
});
test('The live security warning remains open — completing an assessment must not mark remediation fixed',()=>{
 assert.equal(review.observed.advisory.name,'auth_leaked_password_protection');
 assert.equal(review.observed.advisory.level,'WARN');
 assert.equal(review.observed.advisory.count,1);
 assert.equal(review.observed.advisory.enabled,false);
 assert.equal(review.observed.activeLeakedPasswordProtectionVerified,false);
 assert.equal(review.riskAcceptance.leakedPasswordProtectionRemediationOpen,true);
 assert.equal(review.policy.assessment,'ASSESSMENT_COMPLETED_REMEDIATION_BLOCKED_BY_FREE_PLAN_AND_OWNER_APPROVAL');
 assert.ok(previous.advisors.security.some(x=>x.name==='auth_leaked_password_protection'));
});
test('Do not invent current password complexity, email confirmation, or reset completion',()=>{
 for(const key of ['currentMinimumPasswordLength','currentRequiredCharacterClasses',
  'currentReauthRequirement','emailConfirmationConfigured']){
  assert.equal(review.observed[key],'UNKNOWN_NOT_READ_FROM_AUTH_CONFIG');
 }
 assert.equal(review.observed.passwordResetValidatedWithRealAccounts,false);
});
test('Owner did not approve a billing upgrade or changing real Auth configuration',()=>{
 assert.equal(review.policy.requiresExplicitBillingAndAuthChangeApproval,true);
 assert.equal(review.policy.ownerAuthorizedSubscriptionUpgrade,false);
 assert.equal(review.policy.ownerAuthorizedAuthChange,false);
 assert.equal(review.observed.actualAuthSettingChangePerformed,false);
 assert.equal(review.policy.rollback.startsWith('No rollback needed'),true);
});
test('Client-side validators cannot replace privileged provider-side security',()=>{
 assert.equal(review.policy.neverUseClientSidePasswordStrengthAsServerEnforcement,true);
 assert.ok(review.policy.freePlanGuidance.some(x=>x.includes('password managers')));
 assert.ok(review.policy.freePlanGuidance.some(x=>x.includes('compromised-password screening')));
 assert.ok(review.policy.freePlanGuidance.some(x=>x.includes('raw user passwords')));
});
test('No sign-ups, financial cloud, release or real Kraken actions get unlocked by P1.3',()=>{
 assert.equal(review.riskAcceptance.releaseDecision,'NO_GO');
 assert.equal(review.riskAcceptance.publicRegistrationApproved,false);
 assert.equal(review.riskAcceptance.financialCloudApproved,false);
 assert.equal(review.riskAcceptance.krakenOrdersApproved,false);
 assert.equal(review.policy.ownerAuthorizedPublicRegistration,false);
 assert.equal(cloud.financialCloudApproved,false);
 assert.equal(cloud.publicRegistrationApproved,false);
 assert.ok(Object.values(cloud.checks).every(x=>x===false));
 assert.equal(release.intendedMode,'QA_ONLY_DO_NOT_DEPLOY');
 assert.ok(Object.values(release.ownerApprovals).every(x=>x===false));
});
test('P1.4 two-account test still open, separate from password remediation and public launch',()=>{
 assert.equal(review.followUp.next,'P1.4');
 assert.equal(review.riskAcceptance.authenticatedCrossTenantTestingCompleted,false);
 assert.equal(review.riskAcceptance.original34StagesStillClosedTechnically,true);
 assert.match(review.followUp.reviewBeforeRelease,/Confirm account plan and Auth configuration/);
});
