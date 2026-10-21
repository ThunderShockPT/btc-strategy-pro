'use strict';
const fs=require('node:fs'),{createHash}=require('node:crypto');
const files=['backend/calculation-checkpoints.cjs','backend/persistence-contract.cjs','cycle-planner.js','position-risk.js','financial-engine.js','kraken-rules.js','journal-projection.js','package-lock.json'];
const manifest={version:'v20-checkpoint-build-12d3.1',dependencies:{'decimal.js':require('../package-lock.json').packages['node_modules/decimal.js'].version},files:Object.fromEntries(files.map(path=>[path,createHash('sha256').update(fs.readFileSync(path)).digest('hex')]))};
fs.writeFileSync('policies/calculation-checkpoint-build-20261021.json',JSON.stringify(manifest,null,2)+'\n');
