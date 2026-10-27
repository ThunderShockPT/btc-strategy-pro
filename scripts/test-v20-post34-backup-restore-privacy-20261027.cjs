'use strict';
/* P1.6 — tests inspect only code and synthetic byte arrays. The real PostgreSQL
 * pg_dump/pg_restore drill is separately executed in a disposable CI container. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomBytes}=require('node:crypto');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const json=p=>JSON.parse(read(p));
const audit=json('policies/v20-post34-backup-restore-privacy-audit-20261027.json');
const cloud=json('policies/cloud-release-20261021.json');
const launch=json('policies/v20-b15-release-evidence-20261025.json');
const Backup=require('../backend/backup-envelope.cjs');
test('P1.6 knows Supabase Free does not include managed daily database backups',()=>{
 assert.equal(audit.projectRef,'oftzqqjbwonngubihrsd');
 assert.equal(audit.provider.organizationPlan,'free');
 assert.equal(audit.provider.automaticDailyBackupsIncluded,false);
 assert.equal(audit.provider.productionBackupsConfigured,'UNVERIFIED');
 assert.ok(audit.provider.source.includes('/platform/backups'));
});
test('P1.6 AES-GCM encryption authenticates a complete synthetic dump with fresh nonce',()=>{
 const key=randomBytes(32),data=Buffer.from('PGDMP: synthetic financial values €','utf8');
 const opts={key,keyId:'isolated-qa-2026',createdAt:'2026-10-27T00:30:00.000Z',sourceKind:'isolated-postgres-qa'};
 const first=Backup.seal(data,opts),second=Backup.seal(data,opts);
 assert.equal(Backup.MAX,64*1024*1024);
 assert.notDeepEqual(first,second);
 assert.equal(first.includes(data),false);
 const restored=Backup.open(first,{key,expectedKeyId:opts.keyId,expectedSourceKind:opts.sourceKind});
 assert.deepEqual(restored.dump,data);
 assert.equal(restored.metadata.projectRef,audit.projectRef);
 assert.equal(restored.metadata.sourceKind,'isolated-postgres-qa');
 key.fill(0);
});
test('P1.6 forged header, truncated contents, wrong key or wrong source cannot restore',()=>{
 const key=randomBytes(32),opts={key,keyId:'qa-temp-only',createdAt:'2026-10-27T00:30:00.000Z',sourceKind:'isolated-postgres-qa'};
 const encrypted=Backup.seal(Buffer.from('PGDMP fictitious'),opts);
 const kwargs={key,expectedKeyId:'qa-temp-only',expectedSourceKind:'isolated-postgres-qa'};
 for(const at of [0,11,encrypted.length-1]){
  const bad=Buffer.from(encrypted);bad[at]^=1;
  assert.throws(()=>Backup.open(bad,kwargs),/BACKUP_AUTHENTICATION_FAILED/);
 }
 for(const override of [{key:randomBytes(32)},{expectedKeyId:'another-key'},{expectedSourceKind:'supabase-production'}])
  assert.throws(()=>Backup.open(encrypted,{...kwargs,...override}),/BACKUP_AUTHENTICATION_FAILED/);
 assert.throws(()=>Backup.open(encrypted.subarray(0,encrypted.length-7),kwargs),/BACKUP_AUTHENTICATION_FAILED/);
 key.fill(0);
});
test('P1.6 exported wallet cannot automatically restore or approve trades',()=>{
 const code=read('scripts/check-wallet-backup.cjs');
 assert.match(code,/automaticRestoreAllowed!==false/);
 assert.match(code,/databaseWritten:false/);
 assert.match(code,/financialFactsChanged:false/);
 assert.equal(audit.code.walletExport.automaticRestoreAllowed,false);
});
test('P1.6 personal-data portability is a read-only export, NOT credential or full DB backup',()=>{
 const code=read('backend/account-portability.cjs');
 assert.match(code,/Read-only account portability/);
 assert.match(code,/automaticRestoreAllowed:false/);
 assert.equal(audit.code.accountPortability.automaticRestoreAllowed,false);
 assert.equal(audit.code.accountPortability.notOperationalBackup,true);
 assert.equal(audit.code.accountPortability.doesNotIncludeAuthCredentials,true);
 assert.equal(audit.dataGovernance.DSARDeletionCompleted,false);
});
test('P1.6 full local native PostgreSQL restore contract is separately present and reproducible',()=>{
 const sql=read('scripts/test-atomic-postgres.cjs');
 assert.match(sql,/native encrypted pg_dump restores facts, balances, plans, RLS and append-only triggers in a second database/);
 assert.match(sql,/pg_dump/);
 assert.match(sql,/pg_restore/);
 assert.match(sql,/sourceKind:'isolated-postgres-qa'/);
 assert.match(sql,/set local role authenticated/);
 assert.match(sql,/APPEND_ONLY/);
 assert.match(sql,/key\.fill\(0\)/);
 assert.equal(audit.code.operationalRestoreTest.performedOnHostedSupabase,false);
});
test('P1.6 external custody, retention and disaster recovery RTO/RPO are not fabricated',()=>{
 const x=audit.dataGovernance;
 for(const field of ['encryptionKeyCustodian','keyRotationProcedure','productionBackupSchedule','productionOffsiteRetention','retentionPeriod','restoreRtoMinutes','restoreRpoMinutes'])
  assert.equal(x[field],'NOT_DEFINED');
 assert.equal(x.hostedDatabaseDumpCreated,false);
 assert.equal(x.hostedProductionDatabaseModified,false);
 assert.equal(x.liveAccountDataExported,false);
 assert.ok(audit.risks.some(r=>r.id==='NO_FULL_STACK_RESTORE'));
});
test('P1.6 no live backup, release, registrations, or Kraken orders were authorized',()=>{
 assert.equal(audit.ownerConsent.mayRunDisposableCI,true);
 for(const [key,value] of Object.entries(audit.ownerConsent)){
  if(key.startsWith('may')&&key!=='mayRunDisposableCI'&&key!=='mayReviewCode'&&key!=='mayReadProjectMetadata')assert.equal(value,false,key);
 }
 assert.equal(cloud.financialCloudApproved,false);
 assert.equal(cloud.publicRegistrationApproved,false);
 assert.ok(Object.values(cloud.checks).every(v=>v===false));
 assert.equal(launch.intendedMode,'QA_ONLY_DO_NOT_DEPLOY');
 assert.equal(audit.acceptance.productionGoNoGo,'NO_GO');
});
