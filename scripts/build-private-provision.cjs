'use strict';
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),esbuild=require('esbuild');
const {capability,...config}=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));config.capabilityHash=createHash('sha256').update(capability).digest('hex');
if(Date.parse(config.expiresAt)<=Date.now()||Date.parse(config.expiresAt)>Date.now()+21*60000)throw Error('BOUNDED_PROVISION_WINDOW_REQUIRED');
const contents=`import Provision from ${JSON.stringify(path.resolve('backend/private-test-provision.cjs'))};const handler=Provision.create({config:${JSON.stringify(config)},getEnv:key=>Deno.env.get(key)});Deno.serve(handler);`;
esbuild.buildSync({stdin:{contents,resolveDir:process.cwd()},outfile:'build/private-provision.mjs',bundle:true,platform:'node',format:'esm',target:'es2022',minify:true,banner:{js:'import {createRequire as btcCreateRequire} from "node:module";const require=btcCreateRequire(import.meta.url);import {Buffer as BTCBuffer} from "node:buffer";globalThis.Buffer??=BTCBuffer;'},legalComments:'none'});
console.log(JSON.stringify({bundleBytes:fs.statSync('build/private-provision.mjs').size,expiresAt:config.expiresAt}));
