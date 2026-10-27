'use strict';
/* P1.7 — official-doc source review and fail-closed invariants.
 * No HTTP exchange requests, no credentials, no trading, no configuration updates. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const document=json('policies/v20-post34-kraken-eea-risk-review-20261027.json');
const rules=json('rules/kraken/eea-pf-xbtusd-20261021.json');
const consent=json('policies/v20-model-c-architecture-owner-consent-20261026.json');
const cloud=json('policies/cloud-release-20261021.json');
const Kraken=require('../kraken-rules.js');
const Risk=require('../position-risk.js');
const source=fs.readFileSync(path.join(root,'position-risk.js'),'utf8');
const context={now:'2026-10-27T12:00:00Z',symbol:'PF_XBTUSD',jurisdiction:'EEA',marginMode:'isolated',selectedLeverage:'10',platform:'europa',clientType:'retail',collateralCurrency:'USD'};
test('P1.7 EEA reviewed sources are first-party links, never account feed',()=>{
 assert.equal(document.reviewScope,'READ_ONLY_OFFICIAL_KRAKEN_DOCS_AND_REPO; NO ACCOUNT/API/ORDER USE');
 assert.equal(document.project,'BTC Strategy Pro V20');
 assert.equal(document.sourceVersions.length,7);
 assert.ok(document.sourceVersions.every(x=>new URL(x.url).hostname==='support.kraken.com'));
 assert.equal(document.QA.liveKrakenAccountConnected,false);
});
test('P1.7 EEA archived Class A first tier matches published 10% IM 5% MM, not generic 100x',()=>{
 const entry=document.verifiedDocumentRules.eeaClassAMarginFirstTier;
 assert.deepEqual([entry.maxEntryNotionalUSD,entry.initialRate,entry.maintenanceRate,entry.initialLeverageCap],['30000000','0.10','0.05','10']);
 for(const p of ['europa','europa_crypto'])for(const type of ['retail','professional']){
  const tier=Kraken.tierAt(rules,p,type,'2000');
  assert.equal(tier.initialRate,'0.1');assert.equal(tier.maintenanceRate,'0.05');
 }
 assert.equal(document.verifiedDocumentRules.exchangeMayChangeWithoutNotice,true);
});
test('P1.7 old rule observation is STALE and never becomes executable from recent documentation alone',()=>{
 assert.equal(document.repoSnapshot.sourceObservedAt,rules.observedAt);
 assert.equal(document.repoSnapshot.status,'partial');
 const current=Kraken.assess(rules,context);
 assert.equal(current.status,'blocked');assert.equal(current.scopeReady,false);
 assert.ok(current.reasons.includes('STALE_RULES'));
 assert.equal(current.ordersAllowed,false);
 assert.equal(document.repoSnapshot.currentLiveRuleSnapshotRefreshed,false);
});
test('P1.7 inverse isolated position boundary is approximate, not a guaranteed account liquidation price',()=>{
 for(const t of ['accountWideLiquidationCanIncludeIsolatedPositions','liquidationPriceIsAnEstimateNotFixed','liquidationUsesMarkPriceAndMarginEquity','markPriceCanDifferFromLastTradedPrice']){
  assert.equal(document.verifiedDocumentRules[t],true);
 }
 assert.match(source,/officialKrakenPrice:false/);
 assert.match(source,/guaranteedProtection:false/);
 assert.ok(document.criticalDifferences.some(x=>x.id==='ISOLATED_NOT_COMPLETE_ACCOUNT_PROTECTION'));
});
test('P1.7 isolated funding can debit general wallet, not appear as free isolated collateral',()=>{
 assert.equal(document.verifiedDocumentRules.isolatedFundingChargedToGeneralWallet,true);
 assert.equal(document.verifiedDocumentRules.perpetualFundingAccruesContinuouslyAndSettlesHourlyOrOnPositionChange,true);
 assert.equal(rules.funding.settledIsolatedDebit,'general-wallet');
 assert.equal(rules.funding.accountingStatus,'needs-public-example-validation');
 assert.ok(document.criticalDifferences.some(x=>x.id==='FUNDING_GENERAL_WALLET'));
});
test('P1.7 real liquidation has maintenance tier, partial liquidation fees and mark/index price uncertainty',()=>{
 for(const k of ['perInstrumentAndNotionalTiers','partialAndFullLiquidationPossible','nonUSDCollateralMayHaveHaircutAndConversionCosts']){
  assert.equal(document.verifiedDocumentRules[k],true);
 }
 assert.ok(document.repoSnapshot.knownLimitations.includes('LIQUIDATION_EXECUTION_UNVALIDATED'));
 assert.ok(document.repoSnapshot.knownLimitations.includes('MARGIN_RECONCILIATION_PENDING'));
 assert.ok(document.criticalDifferences.some(x=>x.id==='MARK_PRICE_BASIS'));
});
test('P1.7 fee examples are not current user maker/taker tiers',()=>{
 assert.equal(document.verifiedDocumentRules.feesAreMakerTakerAndDependOn30DayVolume,true);
 assert.equal(document.verifiedDocumentRules.linearMultiMFeesDenominatedUSD,true);
 assert.equal(rules.fees.manualFeeRateRequired,true);
 assert.ok(document.repoSnapshot.knownLimitations.includes('MANUAL_FEES_REQUIRED'));
 assert.ok(document.criticalDifferences.some(x=>x.id==='FEES_LOCALE_DATE_DIVERGENCE'));
});
test('P1.7 preserves owner's Model C 20/30/50 product-only architecture',()=>{
 assert.equal(consent.consent,'APPROVED_PRODUCT_ARCHITECTURE_ONLY');
 assert.equal(consent.architecture.primaryModel,'C_ADAPTIVE');
 assert.deepEqual(consent.architecture.cycles.buySlicesPercent,[20,30,50]);
 assert.equal(consent.architecture.margin.plannedMarginAddsAreActual,false);
 assert.equal(document.approvedProductArchitectureUnchanged.changeRealTradeLevelsAuthorized,false);
 assert.equal(document.approvedProductArchitectureUnchanged.exchangeOrdersAuthorized,false);
});
test('P1.7 still fails all public, Kraken and financial gates',()=>{
 assert.equal(cloud.financialCloudApproved,false);
 assert.equal(cloud.publicRegistrationApproved,false);
 assert.ok(Object.values(cloud.checks).every(x=>x===false));
 assert.equal(rules.applicationPolicy.specificRiskRecommendationsEnabled,false);
 assert.equal(rules.applicationPolicy.orderExecutionEnabled,false);
 assert.equal(rules.applicationPolicy.transfersEnabled,false);
 assert.equal(document.release.publicFinancialRelease,'NO_GO');
 assert.equal(document.QA.productionSafe,false);
 assert.equal(document.release.ordersAllowed,false);
});
test('P1.7 is a documentation audit, not production certification',()=>{
 assert.equal(document.release.post34Status,'DOCUMENT_REVIEW_ONLY');
 assert.equal(document.release.initial34StagesRemainClosed,true);
 assert.ok(document.nextBeforeProduction.length>=5);
 assert.equal(document.QA.noPriceOrPositionExecutionGuarantee,true);
});
