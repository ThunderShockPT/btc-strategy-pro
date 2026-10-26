'use strict';
/* Post-34 stage P1.1: evidence assertions, not live RLS penetration tests.
 * Intentional NO_GO: tests pass when dangerous launch gates stay closed. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const audit=json('policies/v20-post34-supabase-security-audit-20261026.json');
const policy=json('policies/cloud-release-20261021.json');
const release=json('policies/v20-b15-release-evidence-20261025.json');
const consent=json('policies/v20-model-c-architecture-owner-consent-20261026.json');
test('P1.1 audit is read only and linked to correct BTC Strategy Pro project',()=>{
 assert.equal(audit.project.id,'oftzqqjbwonngubihrsd');
 assert.equal(audit.project.status,'ACTIVE_HEALTHY');
 assert.equal(audit.provenance.noWriteOps,true);
 assert.equal(audit.provenance.actualAuthenticatedCrossTenantRlsTest,false);
 assert.equal(audit.provenance.actualEncryptedRestoreTest,false);
 assert.equal(audit.release.stage,'P1.1_SAFETY_AUDIT_ONLY');
});
test('All observed 8 public and 6 private tables have RLS enabled',()=>{
 const c=audit.catalog;
 assert.equal(c.tables,14);assert.equal(c.publicTables,8);assert.equal(c.privateTables,6);
 assert.equal(c.publicRlsEnabledCount,8);assert.equal(c.privateRlsEnabledCount,6);
 assert.equal(c.privateTablesWithNoPolicies,6);
 assert.equal(c.privateSchemaAnonUsage,false);
 assert.equal(c.privateSchemaAuthenticatedUsage,false);
 assert.equal(c.anonDirectTableGrants,0);
});
test('Financial tables are SELECT-own only in the reviewed snapshot; legacy projects still have owner CRUD',()=>{
 const c=audit.catalog;
 assert.deepEqual(c.publicDataTablesReadOnlyByOwner,[
  'btcsp_calculation_runs','btcsp_financial_events','btcsp_legacy_imports','btcsp_plan_versions',
  'btcsp_preference_versions','btcsp_tutorial_receipts']);
 assert.deepEqual(c.legacyProjectCrudTablesWithOwnerRls,['projects','project_snapshots']);
 assert.equal(c.exposedViewsInReviewedSchemas,0);
 assert.equal(c.publicSecurityDefinerFunctions,0);
});
test('All five active Edge Functions require authentication review because platform JWT check is off',()=>{
 const e=audit.edgeFunctions;
 assert.equal(e.activeCount,5);assert.equal(e.verifyJwtDisabledCount,5);
 assert.equal(e.names.length,5);
 assert.deepEqual(e.inspectedApplicationAuth,['btcsp-v20-api','btcsp-v20-account-qa']);
 assert.equal(e.remainingFunctionAuditRequired.length,3);
 assert.equal(e.productionAuthSafetyUnverified,true);
 assert.ok(/NOT proof/.test(e.inspectedApplicationAuthFindings));
});
test('Leak-password protection warning must not be interpreted as remediation',()=>{
 const a=audit.advisors.security;
 assert.equal(a.length,2);
 assert.equal(a.find(x=>x.name==='auth_leaked_password_protection').count,1);
 assert.equal(a.find(x=>x.name==='auth_leaked_password_protection').severity,'WARN');
 assert.equal(a.find(x=>x.name==='rls_enabled_no_policy').count,6);
 assert.equal(audit.advisors.performance.find(x=>x.name==='unindexed_foreign_keys').count,9);
});
test("P1.1 cannot open release gates even with owner's architecture approval",()=>{
 assert.equal(consent.consent,'APPROVED_PRODUCT_ARCHITECTURE_ONLY');
 assert.equal(policy.financialCloudApproved,false);
 assert.equal(policy.publicRegistrationApproved,false);
 assert.ok(Object.values(policy.checks).every(x=>x===false));
 assert.equal(release.intendedMode,'QA_ONLY_DO_NOT_DEPLOY');
 assert.ok(Object.values(release.ownerApprovals).every(x=>x===false));
 assert.ok(Object.values(release.releaseEvidence).every(x=>x===false));
 assert.equal(audit.release.productionGoNoGo,'NO_GO');
 assert.equal(audit.release.publicDeployApproved,false);
 assert.equal(audit.release.userAuthorizedLiveKraken,false);
});
test('All subsequent real-account tasks are pending owner-gated review',()=>{
 const tasks=audit.tasks;
 assert.equal(tasks.length,7);
 assert.deepEqual(tasks.map(x=>x.id),['P1.2','P1.3','P1.4','P1.5','P1.6','P1.7','P1.8']);
 assert.ok(tasks.every(x=>x.status==='PENDING'&&x.blocksRelease===true));
});
test('SQL auditor remains READ ONLY, contains no business-data reads or DDL',()=>{
 const sql=fs.readFileSync(path.join(root,'scripts/v20-post34-supabase-readonly-audit.sql'),'utf8');
 const withoutComments=sql.split('\n').filter(l=>!l.trim().startsWith('--')).join('\n');
 assert.ok((withoutComments.match(/\bselect\b/gi)||[]).length>=6);
 assert.doesNotMatch(withoutComments,/\b(?:update|delete|insert|alter|drop|create|truncate|grant|revoke|copy|call|do)\b/i);
 assert.doesNotMatch(withoutComments,/\b(?:auth\.users|auth\.identities|btcsp_financial_events)\b/i,
  'Do not read personal or financial source tables for an infrastructure audit');
});
