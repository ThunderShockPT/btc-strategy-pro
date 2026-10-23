'use strict';
const esbuild=require('esbuild'),fs=require('node:fs');
fs.mkdirSync('build/edge-runtime',{recursive:true});
esbuild.buildSync({entryPoints:['supabase/functions/btcsp-v20-api/entry.mjs'],outfile:'build/edge-runtime/index.mjs',bundle:true,platform:'node',format:'esm',target:'es2022',external:['pg-native','cloudflare:sockets'],banner:{js:'import { createRequire as btcCreateRequire } from "node:module"; import { Buffer as BTCBuffer } from "node:buffer"; const require = btcCreateRequire(import.meta.url); globalThis.Buffer ??= BTCBuffer; import BTCProcess from "node:process"; globalThis.process ??= BTCProcess; globalThis.global ??= globalThis;'},legalComments:'none'});
console.log('Edge runtime bundle:',fs.statSync('build/edge-runtime/index.mjs').size,'bytes; financial cloud gate closed.');
