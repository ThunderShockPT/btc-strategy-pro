'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),esbuild=require('esbuild'),{execFileSync}=require('node:child_process'),Capacity=require('../helpers/real-auth-capacity-fixture.cjs');
const dir=process.argv[2],caseName=process.argv[3]||'baseline',capacity=Capacity.configuration(caseName),out=process.argv[4]||path.resolve('build/hosted-public-account');
if(!dir||!path.isAbsolute(dir)||!path.isAbsolute(out))throw Error('ABSOLUTE_PRIVATE_DIRECTORY_REQUIRED');
const variant=process.argv[5]||'original';if(!['original','floor-room','floor-room-v2'].includes(variant))throw Error('QA_VARIANT_REQUIRED');
const existing=fs.existsSync(path.join(dir,'run.json'));
execFileSync(process.execPath,['scripts/qa/build-hosted-account.cjs',dir,out,...(existing?['reuse','renew']:[])],{stdio:'pipe'});
const file=path.join(dir,'run.json'),run=JSON.parse(fs.readFileSync(file,'utf8'));
if(run.config.caseName&&(run.config.caseName!==caseName||(run.config.variant||'original')!==variant))run.config.accounts[0].projectId=crypto.randomUUID();
Object.assign(run.config,{caseName,variant,maxCycles:capacity.maxCycles});
const fixtureFile=path.join(dir,'fixture-'+caseName+(variant==='original'?'':'-'+variant)+'.json');let fixture;
if(fs.existsSync(fixtureFile)){fixture=JSON.parse(fs.readFileSync(fixtureFile,'utf8'));run.config.accounts[0].projectId=fixture.input.projectId;}
else{fixture=Capacity.state(caseName,{ownerId:run.config.accounts[0].id,projectId:run.config.accounts[0].projectId,scenarioKey:'manual_long'},new Date().toISOString());if(variant.startsWith('floor-room'))fixture.plan.protectionFloorUSD='60000';fs.writeFileSync(fixtureFile,JSON.stringify(fixture),{mode:0o600});}
fs.writeFileSync(file,JSON.stringify(run),{mode:0o600});
fs.writeFileSync(path.join(out,'public-entry.mjs'),`import pg from 'pg';import Handler from ${JSON.stringify(path.resolve('scripts/qa/hosted-public-account.cjs'))};const handler=Handler.create({config:${JSON.stringify(run.config)},fixture:${JSON.stringify(fixture)},Pool:pg.Pool,getEnv:k=>Deno.env.get(k),memory:()=>Deno.memoryUsage()});Deno.serve(handler);`);
esbuild.buildSync({entryPoints:[path.join(out,'public-entry.mjs')],outfile:path.join(out,'index.mjs'),bundle:true,nodePaths:[path.resolve('node_modules')],platform:'node',format:'esm',target:'es2022',minify:true,external:['pg-native','cloudflare:sockets'],banner:{js:'import {createRequire as btcCreateRequire} from "node:module";const require=btcCreateRequire(import.meta.url);import {Buffer as BTCBuffer} from "node:buffer";globalThis.Buffer??=BTCBuffer;import BTCProcess from "node:process";globalThis.process??=BTCProcess;globalThis.global??=globalThis;'},legalComments:'none'});
console.log(JSON.stringify({caseName,variant,runId:run.config.runId,events:fixture.input.events.length,maxCycles:capacity.maxCycles,bundleBytes:fs.statSync(path.join(out,'index.mjs')).size,bundleSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'index.mjs'))).digest('hex')}));
