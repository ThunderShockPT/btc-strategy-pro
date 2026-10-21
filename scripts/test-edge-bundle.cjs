'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
test('the packaged Edge entry starts and keeps all financial requests closed without credentials',async()=>{
 let handler,starts=0;const original=globalThis.Deno;globalThis.Deno={env:{get:()=>{throw Error('Closed deployment must not read credentials');}},serve:fn=>{starts++;handler=fn;}};
 try{await import(pathToFileURL(path.resolve('build/edge-runtime/index.mjs')).href+'?qa='+Date.now());assert.equal(starts,1);assert.equal(typeof handler,'function');const r=await handler(new Request('https://oftzqqjbwonngubihrsd.supabase.co/functions/v1/btcsp-v20-api/health'));assert.equal(r.status,200);assert.equal((await r.json()).cloudAvailable,false);const blocked=await handler(new Request('https://oftzqqjbwonngubihrsd.supabase.co/functions/v1/btcsp-v20-api/commit',{method:'POST',body:'{}'}));assert.equal(blocked.status,503);assert.equal((await blocked.json()).code,'CLOUD_NOT_ENABLED');}finally{if(original===undefined)delete globalThis.Deno;else globalThis.Deno=original;}
});
