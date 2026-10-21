'use strict';
const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs');
const Store=require('../../backend/atomic-store.cjs'),Auth=require('../../backend/supabase-auth.cjs'),f=require('./onboarding-fixture.cjs');
const uuid=n=>'00000000-0000-4000-a000-'+String(n).padStart(12,'0');
const A=uuid(2),B=uuid(90),P=uuid(1),PB=uuid(91),SA=uuid(201),SB=uuid(202);
const now=()=>Date.parse('2026-10-21T14:00:00Z');
const claims=(id=A,session=SA)=>({iss:Auth.URL_BASE+'/auth/v1',sub:id,session_id:session,aud:'authenticated',role:'authenticated',iat:Math.floor(now()/1000)-60,exp:Math.floor(now()/1000)+3600});
const token=c=>Buffer.from('{"alg":"ES256","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify(c)).toString('base64url')+'.test_signature_fixture';
const TA=token(claims()),TB=token(claims(B,SB));
const user=id=>({id,email_confirmed_at:'2026-10-20T00:00:00Z',is_anonymous:false,user_metadata:{ownerId:'not-used'}});
const movement=(n=600,revision='3')=>({workflow:'movement',command:{id:uuid(n),idempotencyKey:'deposit-'+n,expectedRevision:revision,kind:'capital_deposit',mode:'recorded',amountUSD:'500',currency:'USD',effectiveAt:f.existing().input.valuation.asOf,recordedAt:f.existing().input.valuation.asOf}});
async function setup(t){
 const db=await PGlite.create();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;
 create table public.projects(id uuid primary key,owner_id uuid not null references auth.users(id),name text,capital numeric,unique(id,owner_id));`);
 await db.query("insert into auth.users(id,email_confirmed_at) values($1,'2026-10-20'),($2,'2026-10-20')",[A,B]);await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)',[SA,A,SB,B]);await db.query("insert into public.projects values($1,$2,'A',2000),($3,$4,'B',2000)",[P,A,PB,B]);
 for(const name of fs.readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort())await db.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'));
 for(const [ownerId,projectId]of [[A,P],[B,PB]]){const state={...f.existing(),planHistory:[],receipts:[]};Object.assign(state.input,{ownerId,projectId});Object.assign(state.plan,{ownerId,projectId,id:ownerId===A?uuid(20):uuid(920)});state.input.events.forEach((e,n)=>{e.owner_id=ownerId;e.project_id=projectId;if(ownerId===B)e.id=uuid(930+n);});state.plan.configuration.cycleInventory[0].entries[0].fillEventIds=[state.input.events[2].id];await Store.initialize(db,{ownerId,projectId,scenarioKey:'demo_long'},state);}
 let calls=0;const fetchAuth=async(url,options)=>{calls++;if(url!==Auth.URL_BASE+'/auth/v1/user')throw Error('unexpected auth destination');const t=options.headers.Authorization.slice(7);return new Response(JSON.stringify(t===TA?user(A):t===TB?user(B):{error:'invalid'}),{status:[TA,TB].includes(t)?200:401});};
 const auth=Auth.create({publishableKey:'test-publishable-fixture',fetchImpl:fetchAuth,now});
 return {db,auth,authCalls:()=>calls,contextProvider:async(s,input)=>({rules:input.rules,valuation:input.valuation})};
}
module.exports={setup,uuid,A,B,P,PB,SA,SB,TA,TB,now,claims,token,user,movement};
