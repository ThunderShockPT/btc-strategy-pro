'use strict';
/* B15.4 provenance for offline/manual QA. No publishing, cloud auth or orders. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),child=require('node:child_process');
const Gate=require('./check-b15-release-readiness-20261025.cjs');
const root=path.resolve(__dirname,'..'),pkg=path.join(root,'previews/b153');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const policy=JSON.parse(read('policies/cloud-release-20261021.json'));
const evidence=JSON.parse(read('policies/v20-b15-release-evidence-20261025.json'));
const gate=Gate.assess({policy,evidence,mode:'qa-review'});
if(!gate.eligible||gate.releaseAuthorized)throw Error('B154_QA_ONLY_GATE_FAILED');
const files=['index.html','manifest.webmanifest','offline.html','sw.js',
 'connectivity-probe.txt','icons/icon-192.png','icons/icon-512.png','README.md'];
const hashes={};
for(const rel of files){
 const p=path.resolve(pkg,rel);
 if(!p.startsWith(pkg+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile())
  throw Error('B154_MISSING_QA_ASSET_'+rel);
 const bytes=fs.readFileSync(p);
 if(bytes.length<10)throw Error('B154_EMPTY_QA_ASSET_'+rel);
 hashes[rel]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
const manifest=JSON.parse(fs.readFileSync(path.join(pkg,'manifest.webmanifest'),'utf8'));
if(manifest.scope!=='./'||manifest.start_url!=='./index.html')throw Error('B154_SCOPE_NOT_ISOLATED');
const cacheScript=fs.readFileSync(path.join(pkg,'sw.js'),'utf8');
if(!cacheScript.includes('btcsp-v20-b153-demoqa-')||cacheScript.includes('api/transaction'))throw Error('B154_CACHE_UNSAFE');
const record={
 type:'BTCSP_V20_B15_DEMO_CANDIDATE_QA_ONLY',version:1,
 package:'previews/b153/',
 buildCommit:process.env.GITHUB_SHA||'LOCAL_UNVERIFIED',
 lastPreviouslyVerifiedCI:{runId:evidence.lastVerifiedAutomatedQA.runId,
  commit:evidence.lastVerifiedAutomatedQA.commit,tests:evidence.lastVerifiedAutomatedQA.tests},
 security:{financialCloudApproved:false,publicRegistrationApproved:false,realKrakenOrders:false,
  deployed:false,physicalGalaxyS25Tested:false,ownerPublicReleaseApproved:false},
 releaseStatus:'BLOCKED_PENDING_HUMAN_AND_PRODUCTION_GATES',
 files:hashes,
 source:'scripts/build-b15-mobile-pwa-20261025.cjs',
 instructions:'Serve isolated package from localhost or explicitly approved HTTPS QA preview; do not merge/deploy to main.'
};
fs.writeFileSync(path.join(pkg,'release-candidate-attestation.json'),JSON.stringify(record,null,2)+'\n');
console.log('B15.4 QA candidate:',files.length,'assets checksummed, ALL public release gates CLOSED.');
console.log('Run SHA:',record.buildCommit,'status:',record.releaseStatus);
