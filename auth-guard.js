/* BTC Strategy Pro — Bloco 18: Auth callback + identity safeguards.
 * Pure utility: no credentials, network requests, storage or sensitive logs. */
(function(root){
'use strict';
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function verified(user){
 return !!(user&&typeof user==='object'&&ID.test(String(user.id||''))&&
  typeof user.email==='string'&&user.email.includes('@')&&
  typeof user.email_confirmed_at==='string'&&Number.isFinite(Date.parse(user.email_confirmed_at)));
}
function redirect(loc){
 if(!loc||typeof loc.origin!=='string'||typeof loc.pathname!=='string')throw Error('Destino de autenticação inválido.');
 if(loc.protocol!=='https:'&&!(loc.protocol==='http:'&&['localhost','127.0.0.1'].includes(loc.hostname)))throw Error('As contas requerem HTTPS.');
 // No untrusted query string, fragment, wildcard or open redirect.
 const path=loc.pathname.endsWith('/')?loc.pathname:loc.pathname;
 if(!path.startsWith('/')||path.includes('//')||path.includes('\\'))throw Error('Caminho de retorno inválido.');
 return loc.origin+path;
}
function callback(loc){
 const query=new URLSearchParams(loc?.search||'');
 const hash=new URLSearchParams(String(loc?.hash||'').replace(/^#/,''));
 const error=query.get('error')||hash.get('error');
 return {
  hasCallback:query.has('code')||hash.has('access_token')||hash.has('refresh_token')||!!error||hash.has('type'),
  isRecovery:query.get('type')==='recovery'||hash.get('type')==='recovery',
  error:!!error
 };
}
function errorText(error){
 const code=String(error?.code||'').toLowerCase();
 if(code==='email_not_confirmed')return 'Confirma o teu email antes de entrares.';
 if(code==='invalid_credentials'||code==='invalid_grant')return 'Email, password ou link inválidos.';
 if(code.includes('rate_limit')||code.includes('over_email')||code==='429')return 'Demasiadas tentativas. Volta a tentar mais tarde.';
 if(code==='otp_expired'||code==='otp_disabled')return 'O link expirou. Solicita um novo email.';
 // Do not show provider/internal traces or email addresses to end users.
 return 'Não foi possível concluir a operação. Verifica a ligação e tenta novamente.';
}
root.BTCAuthGuard=Object.freeze({verified,redirect,callback,errorText});
})(typeof window!=='undefined'?window:globalThis);
