'use strict';
// Server-only authenticated encryption of a trusted pg_dump archive.
// Key custody, scheduling and off-server retention are deployment responsibilities.
const {randomBytes,createCipheriv,createDecipheriv}=require('node:crypto');
const PROJECT='oftzqqjbwonngubihrsd',MAGIC=Buffer.from('BTCSPBKP01'),MAX=64*1024*1024;
function need(v){if(!v)throw Error('INVALID_BACKUP_ENVELOPE');}
function metadata({keyId,createdAt,sourceKind}){need(typeof keyId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(keyId));need(typeof createdAt==='string'&&Number.isFinite(Date.parse(createdAt))&&new Date(createdAt).toISOString()===createdAt);need(['isolated-postgres-qa','supabase-production'].includes(sourceKind));return {format:1,projectRef:PROJECT,keyId,createdAt,sourceKind};}
function keyCheck(key){need(Buffer.isBuffer(key)&&key.length===32);}
function seal(dump,{key,keyId,createdAt,sourceKind}){
 keyCheck(key);need(Buffer.isBuffer(dump)&&dump.length>0&&dump.length<=MAX);
 const header=Buffer.from(JSON.stringify(metadata({keyId,createdAt,sourceKind}))),length=Buffer.alloc(4);length.writeUInt32BE(header.length);
 const aad=Buffer.concat([MAGIC,length,header]),nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce,{authTagLength:16});cipher.setAAD(aad);
 const encrypted=Buffer.concat([cipher.update(dump),cipher.final()]);return Buffer.concat([aad,nonce,cipher.getAuthTag(),encrypted]);
}
function open(envelope,{key,expectedKeyId,expectedSourceKind}){
 try{
  keyCheck(key);need(Buffer.isBuffer(envelope)&&envelope.length>MAGIC.length+4+28&&envelope.length<=MAX+2048&&envelope.subarray(0,MAGIC.length).equals(MAGIC));
  const size=envelope.readUInt32BE(MAGIC.length),offset=MAGIC.length+4+size;need(size>0&&size<=1024&&offset+28<envelope.length);
  const raw=JSON.parse(envelope.subarray(MAGIC.length+4,offset).toString('utf8')),expected=metadata(raw);need(JSON.stringify(expected)===JSON.stringify(raw)&&raw.projectRef===PROJECT&&raw.format===1&&raw.keyId===expectedKeyId&&raw.sourceKind===expectedSourceKind);
  const decipher=createDecipheriv('aes-256-gcm',key,envelope.subarray(offset,offset+12),{authTagLength:16});decipher.setAAD(envelope.subarray(0,offset));decipher.setAuthTag(envelope.subarray(offset+12,offset+28));
  const dump=Buffer.concat([decipher.update(envelope.subarray(offset+28)),decipher.final()]);need(dump.length<=MAX);return {metadata:expected,dump};
 }catch{throw Error('BACKUP_AUTHENTICATION_FAILED');}
}
module.exports=Object.freeze({seal,open,MAX});
