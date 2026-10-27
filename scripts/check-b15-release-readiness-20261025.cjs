'use strict';
/* B15.4 — Conservative release decision, no network, secret or deployment.
 * Policy approval MUST be verified separately: this script only prevents
 * an unreviewed local/repository release from being labelled as approved.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const POLICY=path.join(root,'policies/cloud-release-20261021.json');
const EVIDENCE=path.join(root,'policies/v20-b15-release-evidence-20261025.json');
const hasOwn=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const ownerKeys=['strategyModelR14','strategyCriteriaR24','visualParityOriginalDemo',
  'galaxyS25PhysicalInstallOffline','actualPublicRegistration','actualFinancialCloud','publicRelease'];
const releaseKeys=['secureHttpsPreviewTested','productionBackupRestoreDrill',
 'productionBackupKeysAndRetention','verifiedAccountLoginRecoveryEmail',
 'ownerDataRLSIsolation','antiAbuseRateLimits','privacyAndDataRemoval',
 'currentKrakenEEARulesConfirmed','isolatedLiquidationModelApproved','rollbackExecutedInStaging'];
const requiredChecks=['smtpExclusive','confirmedAndRecoveredAccounts','realAccountIsolation',
 'productionRestore','backupRetentionAndKeys','ingressAndAbuse','financialContext',
 'onboardingAndPlans','privacyLifecycle'];
const approve=(o,k)=>hasOwn(o,k)&&o[k]===true;
const deny=(o,k)=>hasOwn(o,k)&&o[k]===false;
function assess({policy,evidence,mode='qa-review',ci={}}={}){
 if(!['qa-review','demo-preview','public-release'].includes(mode))throw Error('B154_INVALID_MODE');
 if(!policy||!evidence||typeof policy!=='object'||typeof evidence!=='object')throw Error('B154_INPUT_REQUIRED');
 const blockers=[];
 const block=(code,explain)=>blockers.push({code,explain});
 if(policy.projectRef!=='oftzqqjbwonngubihrsd'||evidence.project!=='BTC Strategy Pro V20'
 ||evidence.schemaVersion!=='v20-b15-release-evidence.1')block('PROJECT_EVIDENCE_MISMATCH','Identidade ou contrato da política de lançamento inválido.');
 if(evidence.sourceReference?.doNotMergeAutomatically!==true
 ||evidence.sourceReference?.pullRequest!==35
 ||evidence.sourceReference?.releaseBranch!=='main'
 ||evidence.auditBranch!=='audit/v20-strategy-recovery-20261025')
 block('SOURCE_BRANCH_UNKNOWN','A origem da Beta tem de ser a branch auditada e PR draft #35.');
 const qa=evidence.lastVerifiedAutomatedQA||{};
 if(!(qa.runConclusion==='success'&&Number.isSafeInteger(qa.tests)&&qa.tests>=640
 &&qa.tests===qa.passed&&qa.failed===0&&qa.androidLike===true
 &&qa.physicalAndroidDevice===false&&typeof qa.commit==='string'
 &&/^[a-f0-9]{40}$/.test(qa.commit)))
 block('QA_RUN_NOT_PROVEN','Não há evidência registada de uma suite de testes completa e aprovada.');
 if(evidence.intendedMode==='QA_ONLY_DO_NOT_DEPLOY'&&mode!=='qa-review')
 block('EXPLICIT_RELEASE_INTENT_REQUIRED','O pacote está marcado para QA: nenhum deploy autorizado.');
 if(mode==='qa-review'){
   if(!deny(policy,'financialCloudApproved')||!deny(policy,'publicRegistrationApproved'))
     block('QA_POLICY_OPEN','A revisão QA exige as duas políticas financeiras ainda fechadas.');
   if(qa.physicalAndroidDevice===true)block('PHYSICAL_DEVICE_UNVERIFIED','O CI não prova teste físico Galaxy S25.');
   if(evidence.intendedMode!=='QA_ONLY_DO_NOT_DEPLOY')block('QA_MODE_NOT_ISOLATED','Modo pretendido diferente de QA.');
   return {mode,eligible:blockers.length===0,blockers,releaseAuthorized:false,
     qaTests:qa.tests||0,physicalGalaxyS25Verified:false};
 }
 if(mode==='demo-preview'){
   if(!approve(evidence.ownerApprovals,'limitedDemoHttpsPreview'))
     block('DEMO_PREVIEW_OWNER_PERMISSION_REQUIRED','É necessária autorização explícita do proprietário para alojar a Demo.');
   if(!deny(policy,'financialCloudApproved')||!deny(policy,'publicRegistrationApproved'))
     block('DEMO_PREVIEW_POLICY_MUST_STAY_CLOSED','O preview da Demo não pode habilitar contas reais.');
   if(evidence.intendedMode!=='DEMO_PREVIEW_APPROVED')
     block('DEMO_PREVIEW_MODE_REQUIRED','Modo explícito de preview Demo não definido.');
   // HTTPS smoke evidence will be generated during deployment; not needed for preview authorization itself.
   return {mode,eligible:blockers.length===0,blockers,releaseAuthorized:false,
    qaTests:qa.tests||0,physicalGalaxyS25Verified:false};
 }
 // Public release is never inferred from passing tests, simulated login, or an "avançar".
 for(const key of ownerKeys)if(!approve(evidence.ownerApprovals,key))
   block('OWNER_'+key,'Aprovação humana explícita pendente: '+key);
 for(const key of releaseKeys)if(!approve(evidence.releaseEvidence,key))
   block('EVIDENCE_'+key,'Evidência externa ainda não validada: '+key);
 for(const key of requiredChecks)if(!approve(policy.checks,key))
   block('POLICY_'+key,'Controlos oficiais de produção pendentes: '+key);
 if(!approve(policy,'financialCloudApproved')||!approve(policy,'publicRegistrationApproved'))
   block('CLOUD_POLICY_NOT_APPROVED','A política oficial para carteira real e registos públicos continua fechada.');
 if(evidence.intendedMode!=='PUBLIC_RELEASE_APPROVED')
   block('PUBLIC_INTENT_NOT_SET','Não existe um ato explícito de aprovação de produção.');
 if(ci.ref!=='refs/heads/main'||ci.ownerConfirmation!=='CONFIRM_BTCSP_V20_PUBLIC_RELEASE')
   block('RELEASE_EXECUTION_UNAUTHORIZED','Só um processo protegido main com confirmação explícita pode prosseguir.');
 if(ci.sha!==qa.commit)block('QA_SHA_MISMATCH','Testes CI precisam de corresponder exatamente ao commit que se pretende publicar.');
 return {mode,eligible:blockers.length===0,blockers,releaseAuthorized:blockers.length===0,
  qaTests:qa.tests||0,physicalGalaxyS25Verified:approve(evidence.ownerApprovals,'galaxyS25PhysicalInstallOffline')};
}
function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
function main(){
 const mode=process.argv.find(x=>x.startsWith('--mode='))?.slice(7)||'qa-review';
 const inputs={policy:readJson(POLICY),evidence:readJson(EVIDENCE),mode,
   ci:{ref:process.env.GITHUB_REF||'',sha:process.env.GITHUB_SHA||'',
   ownerConfirmation:process.env.BTCSP_OWNER_RELEASE_CONFIRMATION||''}};
 const report=assess(inputs);
 console.log(JSON.stringify(report,null,2));
 // CLI exits nonzero for any deployment mode without ALL required approval.
 if(!report.eligible)process.exitCode=2;
 return report;
}
if(require.main===module)main();
module.exports=Object.freeze({assess,ownerKeys,releaseKeys,requiredChecks});
