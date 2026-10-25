'use strict';
// Failure-only service logs, stripped of environment values and JWTs before output.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),dir=process.env.RUNNER_TEMP;
if(!dir||!path.isAbsolute(dir))throw Error('PRIVATE_QA_DIRECTORY_REQUIRED');
const envPath=path.join(dir,'btcsp-auth-qa.env'),values=fs.existsSync(envPath)?fs.readFileSync(envPath,'utf8').trim().split('\n').map(x=>x.slice(x.indexOf('=')+1)).filter(x=>x.length>=8):[];
const r=spawnSync('docker',['logs','--tail','40','btcsp-auth-qa'],{encoding:'utf8',maxBuffer:100000});let output=(r.stdout||'')+(r.stderr||'');for(const v of values)output=output.split(v).join('[QA_ENV_REDACTED]');output=output.replace(/[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,'[JWT_REDACTED]').replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[DATABASE_URL_REDACTED]');console.log(output.slice(-8000)||'No Auth service log available.');
