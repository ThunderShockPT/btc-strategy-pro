'use strict';
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild'),Runtime=require('../backend/private-test-runtime.cjs');
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),output=path.resolve('build/private-test-runtime');Runtime.configuration(config);
if(!Array.isArray(config.origins)||config.origins[0]!=='https://btc-strategy-pro-v20-preview.wintrythyme34.chatgpt.site')throw Error('PRIVATE_TEST_ORIGINS_REQUIRED');
fs.mkdirSync(output,{recursive:true});
const entry=`import pg from 'pg';import Runtime from ${JSON.stringify(path.resolve('backend/private-test-runtime.cjs'))};const handler=Runtime.create({Pool:pg.Pool,getEnv:key=>Deno.env.get(key),...${JSON.stringify(config)}});Deno.serve((request,info)=>handler(request,info));`;
esbuild.buildSync({stdin:{contents:entry,resolveDir:path.resolve('.')},outfile:path.join(output,'index.mjs'),bundle:true,platform:'node',format:'esm',target:'es2022',minify:true,external:['pg-native','cloudflare:sockets'],banner:{js:'import {createRequire as btcCreateRequire} from "node:module";const require=btcCreateRequire(import.meta.url);import {Buffer as BTCBuffer} from "node:buffer";globalThis.Buffer??=BTCBuffer;import BTCProcess from "node:process";globalThis.process??=BTCProcess;globalThis.global??=globalThis;'},legalComments:'none'});
console.log(JSON.stringify({bundleBytes:fs.statSync(path.join(output,'index.mjs')).size,environment:'private-test',productionApproved:false}));
