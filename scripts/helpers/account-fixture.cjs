'use strict';
const assert=require('node:assert/strict'),Client=require('../../cloud-client-v20.js'),Account=require('../../account-workflow-v20.js'),Store=require('../../backend/atomic-store.cjs'),Jobs=require('../../backend/calculation-jobs.cjs'),CP=require('../../backend/calculation-checkpoints.cjs'),HTTP=require('../../backend/http-api.cjs'),f=require('./server-fixture.cjs'),of=require('./onboarding-fixture.cjs');
async function setup(t){
 const x=await f.setup(t,{liveCalculationClock:true}),options={...x,authenticate:x.auth.authenticate,authorizeTransaction:x.auth.assertSession,enabled:true},store=Store.create(options),scope={ownerId:f.A,projectId:f.P,scenarioKey:'demo_long'};
 const checkpoints=CP.create({key:Buffer.alloc(32,41),enabled:true,now:()=>new Date().toISOString(),loadSnapshot:(token,s)=>store.snapshot(token,s),contextProvider:x.contextProvider,policyProvider:async(s,input)=>({...require('./cycle-fixture.cjs').policy(),maxCycles:1,protectedCashUSD:input.reservations.protectedUSD}),profileContextProvider:async(s,input)=>{const c=of.context();return {market:require('./live-clock-qa.cjs').market(c.market,input.valuation.asOf),baseCyclePolicy:{...c.baseCyclePolicy,maxCycles:1}};}});
 const jobs=Jobs.create({...options,checkpoints}),h=HTTP.create({...x,calculationJobs:jobs,origins:['https://btc.example.test'],admit:async()=>true,enabled:true});
 let id=3000,lostRoute=null,session={ownerId:f.A,accessToken:f.TA},timeOffset=0,afterRequest=null;const requests=[],requestBodies=[];
 const client=Client.create({baseURL:'https://api.example.test',projectId:f.P,scenarioKey:'demo_long',enabled:true,getSession:async()=>session,newId:()=>f.uuid(id++),fetchImpl:async(url,opts)=>{requests.push(url);requestBodies.push(JSON.parse(opts.body));const response=await h(new Request(url,{...opts,headers:{...opts.headers,origin:'https://btc.example.test'}}),{remoteAddress:'127.0.0.1'});if(afterRequest)await afterRequest(url);if(url.endsWith('/'+lostRoute)){lostRoute=null;throw Error('lost response after server accepted request');}return response;}});
 const workflow=Account.create({client,newId:()=>f.uuid(id++),now:()=>Date.now()+timeOffset});
 return {...x,scope,store,jobs,client,workflow,requests,requestBodies,lose:route=>lostRoute=route,setSession:s=>session=s,offset:v=>timeOffset=v,after:fn=>afterRequest=fn};
}
module.exports={setup};
