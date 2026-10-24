'use strict';
(async()=>{for(let n=0;n<60;n++){try{const r=await fetch('http://127.0.0.1:9999/health',{signal:AbortSignal.timeout(1000)});if(r.status===200){console.log('Loopback Auth health passed.');return;}}catch{}await new Promise(r=>setTimeout(r,1000));}throw Error('LOCAL_AUTH_HEALTH_TIMEOUT');})().catch(e=>{console.error(e.message);process.exitCode=1;});
