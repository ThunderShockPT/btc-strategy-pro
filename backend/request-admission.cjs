'use strict';
const {createHmac}=require('node:crypto');
const LIMITS=Object.freeze({'/api/v20/state':60,'/api/v20/prepare':12,'/api/v20/commit':12});
function create({db,key,limits=LIMITS}){
 if(!db||typeof db.transaction!=='function'||!Buffer.isBuffer(key)||key.length!==32||Object.keys(LIMITS).some(route=>!Number.isInteger(limits[route])||limits[route]<1||limits[route]>10000))throw Error('INVALID_ADMISSION_CONFIGURATION');
 const secret=Buffer.from(key);
 return async function admit({remoteAddress,route}){
  if(typeof remoteAddress!=='string'||remoteAddress.length<1||remoteAddress.length>200||!Object.hasOwn(LIMITS,route))return false;
  const subject=createHmac('sha256',secret).update(remoteAddress).digest('hex');
  return db.transaction(async tx=>{
   // The database clock is shared across workers; no client-provided time.
   const result=await tx.query(`insert into btcsp_private.request_buckets(subject_hash,route,window_start,hits)
    values($1,$2,date_trunc('minute',clock_timestamp()),1)
    on conflict(subject_hash,route,window_start) do update set hits=least(btcsp_private.request_buckets.hits+1,$3::integer+1)
    returning hits`,[subject,route,limits[route]]);
   await tx.query(`delete from btcsp_private.request_buckets where (subject_hash,route,window_start) in
    (select subject_hash,route,window_start from btcsp_private.request_buckets where window_start<date_trunc('minute',clock_timestamp())-interval '2 minutes' order by window_start limit 100 for update skip locked)`);
   return result.rows[0].hits<=limits[route];
  });
 };
}
module.exports=Object.freeze({create,LIMITS});
