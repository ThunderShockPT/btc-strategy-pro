'use strict';
/* Regression of owner's ARCHITECTURE-ONLY signoff — this does not authorize real trading. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const audit=json('docs/V20_34_ETAPAS_AUDITORIA_FECHO_TECNICO_20261026.json');
const acceptance=json('policies/v20-model-c-architecture-owner-consent-20261026.json');
const cloud=json('policies/cloud-release-20261021.json');
const releaseEvidence=json('policies/v20-b15-release-evidence-20261025.json');
const profiles=json('policies/profiles-beta-20261021.json');
const gate=require('./check-b15-release-readiness-20261025.cjs');
test('R1.4/R2.4 has explicit owner consent strictly to Model C architecture',()=>{
 assert.equal(acceptance.consent,'APPROVED_PRODUCT_ARCHITECTURE_ONLY');
 assert.equal(acceptance.decisionDate,'2026-10-26');
 assert.equal(acceptance.source.type,'explicit-owner-in-chat');
 assert.match(acceptance.source.statement,/Aprovo explicitamente apenas a arquitetura/);
 assert.match(acceptance.source.statement,/Não autorizo alterações de parâmetros de trading reais/);
 assert.deepEqual(acceptance.appliesTo,['R1.4 architecture acceptance','R2.4 product design direction']);
 assert.equal(acceptance.architecture.primaryModel,'C_ADAPTIVE');
});
test('Model C has exactly 20/30/50 purchase fractions; reference model cannot create orders',()=>{
 assert.deepEqual(acceptance.architecture.cycles.buySlicesPercent,[20,30,50]);
 assert.equal(acceptance.architecture.cycles.buySlicesPercent.reduce((a,b)=>a+b,0),100);
 assert.equal(acceptance.architecture.comparison.classicAE.mode,'REFERENCE_ONLY');
 assert.equal(acceptance.architecture.comparison.classicAE.alwaysAvailable,true);
 assert.equal(acceptance.architecture.comparison.v20Beta.mode,'COMPARISON_ONLY');
 assert.equal(acceptance.architecture.operationMode,'MANUAL_PLANNING_AND_QA_ONLY');
});
test('Stress floor rejects purchase at or below; does not guarantee liquidation protection',()=>{
 assert.equal(acceptance.architecture.riskFloor.strict,true);
 assert.equal(acceptance.architecture.riskFloor.atOrBelowFloor,'REJECT_BUY');
 assert.equal(acceptance.architecture.riskFloor.isGuaranteedLiquidationProtection,false);
 assert.equal(acceptance.architecture.riskFloor.isMandatoryLastBuyPrice,false);
 assert.equal(acceptance.architecture.realEntryPricesApproved,false);
 assert.equal(acceptance.architecture.productionTradingConfigurationApproved,false);
});
test('Cash, allocated isolated margin and planned future margin must remain separate',()=>{
 const m=acceptance.architecture.margin;
 assert.equal(m.walletCashSeparate,true);
 assert.equal(m.allocatedIsolatedMarginSeparate,true);
 assert.equal(m.plannedMarginAddsAreActual,false);
 assert.equal(m.initialCashAdditionChangesIsolatedMargin,false);
 assert.equal(m.simulateFailedReinforcementPath,true);
});
test('No real trading, account opening, public release or financial parameters allowed by consent',()=>{
 assert.ok(Object.values(acceptance.nonAuthorizations).every(x=>x===false));
 assert.ok(acceptance.nonAuthorizations.krakenOrderPlacement===false);
 assert.ok(acceptance.nonAuthorizations.changeLiveTradingParameters===false);
 assert.ok(acceptance.nonAuthorizations.publicAccountRegistration===false);
 assert.ok(acceptance.nonAuthorizations.productionDeployOrMerge===false);
 assert.ok(acceptance.nonAuthorizations.financialCloud===false);
});
test('Official production/cloud policy remains fail-closed despite acceptance',()=>{
 assert.equal(cloud.projectRef,'oftzqqjbwonngubihrsd');
 assert.equal(cloud.financialCloudApproved,false);
 assert.equal(cloud.publicRegistrationApproved,false);
 assert.equal(Object.keys(cloud.checks).length,9);
 assert.ok(Object.values(cloud.checks).every(x=>x===false));
 assert.equal(releaseEvidence.intendedMode,'QA_ONLY_DO_NOT_DEPLOY');
 assert.equal(releaseEvidence.ownerApprovals.strategyModelR14,false,
  'Release gate is independent of product architecture approval');
 assert.equal(releaseEvidence.ownerApprovals.strategyCriteriaR24,false);
 assert.ok(Object.values(releaseEvidence.ownerApprovals).every(x=>x===false));
 assert.ok(Object.values(releaseEvidence.releaseEvidence).every(x=>x===false));
 assert.equal(gate.assess({policy:cloud,evidence:releaseEvidence,mode:'public-release'}).releaseAuthorized,false);
});
test('Prior Beta parameters remain values only for QA, not new live prices',()=>{
 assert.equal(profiles.status,'approved-for-beta');
 assert.equal(profiles.ownerDecision.publicLaunchApproved,false);
 assert.equal(profiles.approvedAdmission,'strict');
 assert.deepEqual(profiles.referenceDistancesApprovedUSD,{safe:'40000',balanced:'20000',risky:'10000'});
 assert.equal(acceptance.architecture.realEntryPricesApproved,false);
});
test('All nine roadmap blocks sum to exactly 34 distinct technical stages',()=>{
 const counts=Object.fromEntries(audit.blocks.map(x=>[x.id,x.stages]));
 assert.deepEqual(counts,{R0:3,R1:4,R2:4,R3:4,R4:4,R5:5,'13':3,'14':3,'15':4});
 assert.equal(audit.stages.length,34);assert.equal(new Set(audit.stages.map(x=>x.id)).size,34);
 assert.equal(audit.blocks.reduce((n,x)=>n+x.stages,0),34);
 assert.equal(audit.blocks.reduce((n,x)=>n+x.technicallyComplete,0),34);
 for(const item of audit.stages){
  assert.ok(fs.existsSync(path.join(root,item.evidence)),item.id+' missing '+item.evidence);
  assert.ok(['QA_TECHNICALLY_DELIVERED','OWNER_ACCEPTED_ARCHITECTURE_ONLY'].includes(item.status));
 }
 assert.equal(audit.stages.filter(x=>x.status==='OWNER_ACCEPTED_ARCHITECTURE_ONLY').length,2);
 assert.equal(audit.stages.find(x=>x.id==='R1.4').status,'OWNER_ACCEPTED_ARCHITECTURE_ONLY');
 assert.equal(audit.stages.find(x=>x.id==='R2.4').status,'OWNER_ACCEPTED_ARCHITECTURE_ONLY');
});
test('100 percent means technical/architecture delivery only, NOT Beta production-ready',()=>{
 assert.equal(audit.summary.plannedStages,34);
 assert.equal(audit.summary.technicallyDeliveredStages,34);
 assert.equal(audit.summary.percentage,100);
 assert.equal(audit.summary.productArchitectureAccepted,true);
 assert.equal(audit.summary.realMoneyTradingApproved,false);
 assert.equal(audit.summary.publicReleaseApproved,false);
 assert.equal(audit.summary.productionReadiness,'NO_GO');
 assert.equal(acceptance.plan.productionReady,false);
 assert.equal(acceptance.guardrails.releasePR,35);
 assert.equal(acceptance.guardrails.draftUntilIndependentApproval,true);
});
test('Samsung device QA does not imply live account, final physical UI review or release',()=>{
 assert.equal(audit.humanFieldEvidence.netlifyDemoVisualRetested,true);
 assert.equal(audit.humanFieldEvidence.galaxyS25PwaInstalledAndOpened,true);
 assert.equal(audit.humanFieldEvidence.latestPhysicalRetestOfEveryScreen,false);
 assert.equal(audit.humanFieldEvidence.verifiedLiveAccountData,false);
 assert.equal(audit.humanFieldEvidence.productionBackupAndRestore,false);
 assert.ok(audit.launchBlockers.length>=4);
});
