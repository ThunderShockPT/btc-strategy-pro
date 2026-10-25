'use strict';
// Offline staging only. Never connects, imports, activates a plan or writes data.
const fs=require('node:fs'),{createHash}=require('node:crypto'),P=require('../backend/persistence-contract.cjs');
function check(raw){
 if(!raw||raw.format!=='btcsp-wallet-export-v20.1'||raw.projectRef!=='oftzqqjbwonngubihrsd'||raw.automaticRestoreAllowed!==false)throw Error('UNSUPPORTED_WALLET_BACKUP');
 const scope=raw.envelope?.payload?.scope,result=P.restore(raw.envelope,scope),source=result.source;
 const hash=createHash('sha256').update(P.canonical(source)).digest('hex'),revision=source.input.events.reduce((n,e)=>BigInt(e.revision)>BigInt(n)?e.revision:n,'0');
 if(raw.headHash!==hash||raw.revision!==revision)throw Error('BACKUP_HEAD_MISMATCH');
 return {format:raw.format,status:'validated-offline-staging-only',events:source.input.events.length,planVersions:source.planHistory.length+1,revision,headHash:hash,scopeVerifiedAgainstAccount:false,automaticRestoreAllowed:false,databaseWritten:false,financialFactsChanged:false};
}
module.exports={check};
if(require.main===module){try{const file=process.argv[2];if(!file||fs.statSync(file).size>P.MAX_BYTES+100000)throw Error('BACKUP_FILE_LIMIT');console.log(JSON.stringify(check(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));}catch(error){console.error(JSON.stringify({status:'rejected',code:/^[A-Z][A-Z0-9_]+$/.test(error.message)?error.message:'INVALID_BACKUP_FILE',databaseWritten:false}));process.exitCode=1;}}
