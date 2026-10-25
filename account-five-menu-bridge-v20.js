/* BTC Strategy Pro R5.2 — session-bound read-only five-menu adapter.
 * Composes existing BTCAccountSessionV20, BTCCloudClientV20, and R5.1 projections.
 * Never opens financialCloudApproved, executes orders, submits movements, or stores credentials.
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./account-session-v20.js'),require('./authenticated-dashboard-v20.js'));
 else root.BTCFiveMenuAccountBridgeV20=factory(root.BTCAccountSessionV20,root.BTCAuthenticatedDashboardV20);
})(typeof globalThis!=='undefined'?globalThis:this,function(Session,Dashboard){
 'use strict';
 const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 function error(code){return Object.assign(new Error(code),{code});}
 function assert(ok,code){if(!ok)throw error(code);}
 const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
 function create({supabase,supabaseURL,sessionFactory=Session.create,projectId,newId,fetchImpl,
   now,schedule,clock,maxQuoteAgeSeconds=90}={}){
   assert(supabase?.auth&&typeof supabase.auth.getUser==='function','R52_SUPABASE_AUTH_REQUIRED');
   assert(typeof sessionFactory==='function','R52_ACCOUNT_SESSION_FACTORY_REQUIRED');
   let generation=0,client=null,dashboard=null,knownWallets=[],projection=null,phase='initializing',lastError=null,disposed=false;
   const listeners=new Set();
   let account=null;
   function publicState(){return {phase,error:lastError,connected:!!client,selectedProjectId:client?.state()?.projectId||null,
     availableWallets:copy(knownWallets),projection:copy(projection),canTrade:false,canWrite:false,
     authenticated:account?.state()?.phase==='signed-in'||false,
     financiallyApproved:false};}
   function emit(){const v=publicState();for(const fn of listeners)fn(copy(v));}
   function invalidate(next,clearRemote=false){
     generation++;projection=null;knownWallets=[];lastError=null;phase=next;
     if(clearRemote)dashboard?.clear();
     emit();
   }
   const connection={
     attach(next){
       assert(next&&typeof next.read==='function'&&typeof next.listWallets==='function'&&typeof next.selectWallet==='function','R52_INVALID_CLOUD_CLIENT');
       invalidate('wallet-selection-required');
       client=next;
       dashboard=Dashboard.create({client,getVerifiedOwner:Dashboard.verifiedOwnerFromSupabase(supabase),
         clock,maxQuoteAgeSeconds});
       emit();
     },
     detach(){
       invalidate('signed-out',true);
       client=null;dashboard=null;
       emit();
     }
   };
   const cfg={supabase,supabaseURL,connection,...(projectId===undefined?{}:{projectId}),
     ...(newId===undefined?{}:{newId}),...(fetchImpl===undefined?{}:{fetchImpl}),
     ...(now===undefined?{}:{now}),...(schedule===undefined?{}:{schedule})};
   account=sessionFactory(cfg);
   assert(account&&typeof account.state==='function'&&typeof account.subscribe==='function'&&typeof account.start==='function'&&typeof account.signOut==='function','R52_INVALID_ACCOUNT_SESSION');
   const unsubscribe=account.subscribe(state=>{
     if(disposed)return;
     if(state.phase!=='signed-in'){
       if(projection||knownWallets.length||client)connection.detach();
       else {phase=state.phase;emit();}
     }else if(client){if(phase==='initializing'||phase==='signed-out'||phase==='unavailable')phase='wallet-selection-required';emit();}
   });
   function guard(){assert(!disposed,'R52_DISPOSED');assert(account.state().phase==='signed-in'&&!!client&&!!dashboard,'R52_SIGNED_IN_REQUIRED');}
   function ensure(token,c){assert(!disposed&&generation===token&&client===c&&account.state().phase==='signed-in','R52_SESSION_OR_WALLET_CHANGED');}
   async function start(){assert(!disposed,'R52_DISPOSED');await account.start();return publicState();}
   async function listWallets(){
     guard();const token=++generation,c=client;
     phase='loading-wallets';projection=null;lastError=null;emit();
     try{
       const response=await c.listWallets();ensure(token,c);
       assert(response&&Array.isArray(response.wallets),'R52_INVALID_WALLET_LIST');
       const seen=new Set();
       knownWallets=response.wallets.map(w=>{
         assert(w&&ID.test(w.projectId)&&['manual_long','demo_long'].includes(w.scenarioKey),'R52_INVALID_WALLET_SCOPE');
         const id=w.projectId.toLowerCase();
         assert(!seen.has(id),'R52_DUPLICATE_WALLET');seen.add(id);
         return {projectId:id,scenarioKey:w.scenarioKey,title:typeof w.title==='string'?w.title.slice(0,100):'Carteira'};
       });
       phase='wallet-selection-required';emit();return copy(knownWallets);
     }catch(e){if(generation===token){phase='blocked';lastError=e.code||'R52_WALLET_LIST_UNAVAILABLE';projection=null;emit();}throw e;}
   }
   async function selectWallet(id){
     guard();assert(typeof id==='string'&&ID.test(id),'R52_INVALID_WALLET_ID');
     const picked=knownWallets.find(w=>w.projectId===id.toLowerCase());
     assert(!!picked,'R52_WALLET_NOT_IN_AUTHENTICATED_LIST');
     const token=++generation,c=client;projection=null;lastError=null;phase='switching-wallet';emit();
     try{
       // Existing cloud-client protects pending/uncertain operations from a wallet switch.
       await c.selectWallet(picked.projectId,picked.scenarioKey);ensure(token,c);
       dashboard=Dashboard.create({client:c,getVerifiedOwner:Dashboard.verifiedOwnerFromSupabase(supabase),
         clock,maxQuoteAgeSeconds});phase='wallet-selected';emit();
       return await refresh();
     }catch(e){if(generation===token){phase='blocked';lastError=e.code||'R52_WALLET_SELECT_FAILED';projection=null;emit();}throw e;}
   }
   async function refresh(){
     guard();const token=++generation,c=client,p=dashboard;
     phase='loading';projection=null;lastError=null;emit();
     try{
       const result=await p.read();ensure(token,c);
       assert(result&&result.shared?.projectId?.toLowerCase()===c.state().projectId?.toLowerCase(),'R52_WRONG_SELECTED_WALLET');
       projection=copy(result);phase=result.status==='authenticated-bookkeeping-only'?'bookkeeping-only':'ready';
       emit();return copy(result);
     }catch(e){if(generation===token){projection=null;phase='blocked';lastError=e.code||e.message||'R52_READ_UNAVAILABLE';emit();}throw e;}
   }
   function resetPrivate(){if(disposed)return;connection.detach();}
   async function signOut(){assert(!disposed,'R52_DISPOSED');resetPrivate();await account.signOut();return publicState();}
   function dispose(){if(disposed)return;disposed=true;unsubscribe?.();connection.detach();account.dispose?.();listeners.clear();}
   return Object.freeze({start,listWallets,selectWallet,refresh,signOut,clear:resetPrivate,dispose,
     state:()=>copy(publicState()),subscribe(fn){assert(typeof fn==='function','R52_INVALID_OBSERVER');listeners.add(fn);fn(publicState());return()=>listeners.delete(fn);}});
 }
 return Object.freeze({create});
});