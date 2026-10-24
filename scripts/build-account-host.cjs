'use strict';
// Separate explicit host bundle. The Demo never loads an Auth SDK or this bundle.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
function build(){const policy=JSON.stringify(require('../policies/cloud-release-20261021.json')).replace(/</g,'\\u003c');return 'globalThis.BTCV20ReleasePolicy='+policy+';\n'+['cloud-client-v20.js','account-session-v20.js','account-access-view-v20.js'].map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('\n');}
module.exports={build};
if(require.main===module){const text=build(),output=path.join(root,'build/v20-account-host.js');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,text);console.log(JSON.stringify({output,bytes:Buffer.byteLength(text),cloudEnabled:require('../account-session-v20.js').approved(require('../policies/cloud-release-20261021.json'))}));}
