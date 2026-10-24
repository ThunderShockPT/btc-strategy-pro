'use strict';
const fs=require('node:fs'),{buildPreview}=require('./build-onboarding-preview.cjs'),host=require('./build-account-host.cjs').build(),fixture=require('./helpers/account-ui-fixture.cjs');
function build({snapshot=fixture.state(),networkAPI=false}={}){
const intro="globalThis.BTCV20PrivateTest=true;globalThis.BTC_UI_QA_SYNTHETIC=true;globalThis.WebSocket=class{close(){}};const qaOriginalFetch=globalThis.fetch;globalThis.fetch=(url,options)=>String(url).startsWith('https://futures.kraken.com/')?Promise.resolve(new Response('{}',{status:503})):qaOriginalFetch(url,options);";
const html=buildPreview().html.replace('<script>const BTCPreviewWorkerSource=','<script>'+intro+'</script><script>'+host+'</script><script>const BTCPreviewWorkerSource=').replace('</body>','<script>'+fixture.bootstrap(snapshot,{networkAPI})+'</script></body>').replace(/<footer class="bottom-note">[\s\S]*?<\/footer>/,'<footer class="bottom-note">QA SINTÉTICO LOCAL · Dados inventados para verificar a interface. Esta página não é publicada e não usa credenciais ou contas reais.</footer>');
return html;}
module.exports={build};
if(require.main===module){const output=process.argv[2];if(!output||!output.endsWith('/index.html'))throw Error('LOCAL_PREVIEW_INDEX_REQUIRED');fs.writeFileSync(output,build());console.log(JSON.stringify({output,synthetic:true,mutationsEnabled:false}));}
