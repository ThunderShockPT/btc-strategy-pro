/* BTC Strategy Pro R5.5 — session-to-journal integration of R5.2, R5.3 and R5.4.
 * Default login uses the existing V20 RELEASE POLICY (financialCloudApproved:false).
 * The injected sessionFactory is QA-only: production must not use createPrivateTest.
 * No exchange connections, app database migration, or direct ledger writes.
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(
  require('./account-session-v20.js'),
  require('./account-five-menu-bridge-v20.js'),
  require('./account-workflow-v20.js'),
  require('./five-menu-journal-v20.js'),
  require('./unified-five-menus-v20.js'));
 else root.BTCFiveMenuIntegratedRuntimeV20=factory(
  root.BTCAccountSessionV20,root.BTCFiveMenuAccountBridgeV20,
  root.BTCAccountWorkflowV20,root.BTCFiveMenuJournalV20,root.BTCUnifiedFiveMenusV20);
})(typeof globalThis!=='undefined'?globalThis:this,function(Session,Account,Workflows,Journal,Unified){
'use strict';
function fail(code){const e=new Error(code);e.code=code;throw e;}
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function create({supabase,supabaseURL,projectId,fetchImpl,clock,
  newId,now,document:doc=null,sessionFactory=Session.create,onOpenReview=null}={}){
 if(!Session||!Account||!Workflows||!Journal||!Unified)fail('R55_REQUIRED_V20_MODULES_MISSING');
 if(typeof sessionFactory!=='function')fail('R55_SESSION_REQUIRED');
 let generation=0,closed=false,masked=true,sourceClient=null,workflow=null,journal=null;
 let unsubscribeJournal=null;
 const listeners=new Set();
 const locked=()=>({phase:'signed-out',source:'NONE',selectedProjectId:null,revision:null,
   sourceHeadHash:null,history:[],historyCount:0,needsReconciliation:false});
 const status=()=>masked||!journal?locked():journal.state();
 function notify(){if(closed)return;for(const l of listeners)l(clone(status()));}
 const proxy=Object.freeze({state:()=>clone(status()),subscribe(fn){
  if(typeof fn!=='function')fail('R55_SUBSCRIBER_REQUIRED');
  listeners.add(fn);fn(clone(status()));return()=>listeners.delete(fn);
 },async load(){if(!journal||masked)fail('R55_NO_WALLET_SELECTED');return journal.load();},
 async confirm(x){if(!journal||masked)fail('R55_NO_WALLET_SELECTED');return journal.confirm(x);}});
 function drop(){
  generation++;masked=true;
  unsubscribeJournal?.();unsubscribeJournal=null;
  journal?.dispose();journal=null;workflow=null;sourceClient=null;notify();
 }
 function attach(client){
  if(closed)fail('R55_DISPOSED');drop();
  sourceClient=client;
  workflow=Workflows.create({client,...(newId?{newId}:{}),...(now?{now}:{})});
  journal=Journal.create({workflow,...(now?{now}:{})});
  unsubscribeJournal=journal.subscribe(notify);notify();
 }
 let account;
 const delegatedSessionFactory=(config)=>sessionFactory({
  ...config,connection:{
   attach(client){attach(client);config.connection.attach(client);},
   detach(){drop();config.connection.detach();}
  }
 });
 account=Account.create({supabase,supabaseURL,projectId,fetchImpl,newId,now,clock,
   sessionFactory:delegatedSessionFactory});
 const menus=Unified.create({bridge:account,journal:proxy,document:doc,onOpenReview});
 const detachAccount=account.subscribe(()=>notify());
 function guard(){if(closed)fail('R55_DISPOSED');}
 function epoch(ticket,client){if(ticket!==generation||client!==sourceClient||closed)fail('R55_SESSION_CHANGED');}
 async function start(){guard();await account.start();return state();}
 async function listWallets(){guard();return account.listWallets();}
 async function selectWallet(id){
  guard();const ticket=++generation,client=sourceClient;masked=true;notify();
  try{
   // R5.2 uses one V20 client for the wallet selection and the balance read.
   await account.selectWallet(id);epoch(ticket,client);
   if(!journal)fail('R55_NO_JOURNAL');
   const result=await journal.load();epoch(ticket,client);
   masked=false;notify();
   return {result:clone(result),status:state()};
  }catch(e){masked=true;notify();throw e;}
 }
 async function refresh(){
  guard();if(!journal)fail('R55_NO_JOURNAL');
  masked=true;notify();const ticket=++generation,client=sourceClient;
  try{
   await account.refresh();epoch(ticket,client);
   await journal.load();epoch(ticket,client);masked=false;notify();return state();
  }catch(e){masked=true;notify();throw e;}
 }
 async function prepare(kind,fields){
  guard();if(masked||!journal||menus.state().status!=='ready')fail('R55_NEEDS_RECONCILED_WALLET');
  return journal.prepare(kind,fields);
 }
 async function confirm(input){
  guard();if(masked||!journal)fail('R55_NEEDS_RECONCILED_WALLET');
  if(input?.accepted!==true)fail('R55_EXPLICIT_CONFIRM_REQUIRED');
  masked=true;notify();const ticket=++generation,client=sourceClient;
  let committed=false;
  try{
   const result=await journal.confirm(input);committed=!!result.receipt;
   epoch(ticket,client);
   if(!result.fresh)fail('R55_COMMIT_UNVERIFIED');
   await account.refresh();epoch(ticket,client);
   // R5.3 journal.confirm already reloaded journal after receipt.
   masked=false;notify();
   if(menus.state().status!=='ready')fail('R55_DIFFERENT_REVISIONS');
   return {receipt:clone(result.receipt),state:state()};
  }catch(e){
   // Never show stale balances, especially after ambiguous commit responses.
   masked=true;notify();
   if(committed&&!e.committed)Object.defineProperty(e,'committed',{value:true,enumerable:false});
   throw e;
  }
 }
 async function signOut(){guard();drop();await account.signOut();return state();}
 function state(){const ui=menus.state(),session=account.state();return clone({
  phase:session.phase,authenticated:session.authenticated,selectedProjectId:session.selectedProjectId,
  mode:ui.mode,status:ui.status,financial:ui.values,revision:ui.revision,
  sourceMatched:ui.status==='ready',canTrade:false,canWriteDirectly:false,
  financialCloudApproved:false,
  statusText:ui.status==='ready'?'Diário autenticado coerente':
   'Sem valores autenticados verificados: não usar saldos anteriores'
 });}
 function dispose(){if(closed)return;drop();detachAccount();menus.dispose();account.dispose();closed=true;listeners.clear();}
 return Object.freeze({start,listWallets,selectWallet,refresh,prepare,confirm,signOut,
  signIn:args=>account.signIn(args),mount:()=>menus.mount(),selectMode:value=>menus.selectMode(value),
  state,dispose});
}
return Object.freeze({create});
});