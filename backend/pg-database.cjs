'use strict';
const PROJECT='oftzqqjbwonngubihrsd';
function validateConnection(value){
 try{const u=new URL(value),host=u.hostname,user=decodeURIComponent(u.username);if(!['postgres:','postgresql:'].includes(u.protocol)||!u.password||u.hash||!['','5432','6543'].includes(u.port)||u.pathname!=='/postgres')throw Error();
  if(!(host==='db.'+PROJECT+'.supabase.co'||(host.endsWith('.pooler.supabase.com')&&['postgres.'+PROJECT,'btcsp_backend.'+PROJECT].includes(user))))throw Error();
  for(const [k,v]of u.searchParams)if(k!=='sslmode'||!['require','verify-full'].includes(v))throw Error();
  return value;
 }catch{throw Error('BTC_DATABASE_CONFIGURATION_REQUIRED');}
}
function fromPool(pool){
 if(!pool||typeof pool.connect!=='function')throw Error('DATABASE_POOL_REQUIRED');
 return Object.freeze({transaction:async fn=>{const client=await pool.connect();let failure=null;try{await client.query('begin');await client.query("set local statement_timeout='10s'");await client.query("set local lock_timeout='2s'");const result=await fn(client);await client.query('commit');return result;}catch(err){failure=err;try{await client.query('rollback');}catch{failure=Error('DATABASE_ROLLBACK_FAILED');}throw failure;}finally{client.release(failure?.message==='DATABASE_ROLLBACK_FAILED'?failure:undefined);}},close:()=>pool.end()});
}
function create({Pool,connectionString}){
 validateConnection(connectionString);if(typeof Pool!=='function')throw Error('DATABASE_DRIVER_REQUIRED');
 const clean=new URL(connectionString);clean.searchParams.delete('sslmode');
 const pool=new Pool({connectionString:clean.toString(),max:1,connectionTimeoutMillis:3000,idleTimeoutMillis:10000,ssl:{rejectUnauthorized:true}});
 return fromPool(pool);
}
module.exports=Object.freeze({validateConnection,fromPool,create});
