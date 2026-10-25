'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Guide=require('../onboarding-guide-v20.js');
test('the V20 tutorial has exactly eight educational lessons and a four-question check',()=>{
 assert.equal(Guide.lessons.length,8);assert.equal(Guide.quiz.length,4);
 assert.deepEqual(Guide.lessons.map(x=>x.section),['Início','Início','Estratégias','Estratégias','Risco','Registos','Risco','Conta']);
});
test('the tutorial shows nominal 20/30/50 allocations per cycle rather than whole account',()=>{
 const text=Guide.lessons[2].example;
 assert.match(text,/1.000 USD/);for(const x of ['200 USD','300 USD','500 USD'])assert.ok(text.includes(x));
});
test('the free-wallet example never double-charges isolated unrealized losses',()=>{
 const x=Guide.lessons[1].example;
 assert.match(x,/1.700 USD/);assert.match(x,/−30 USD/);assert.match(x,/permanece 1.700 USD/);
});
test('entry exactly at floor is identified as blocked, never recommended',()=>{
 assert.match(Guide.lessons[3].example,/60.000 USD/);assert.match(Guide.lessons[3].example,/bloqueada/);
});
test('margin maintenance can occur before the next reinforcement despite positive cash',()=>{
 assert.match(Guide.lessons[4].example,/manutenção/);
});
test('the historical tutorial is independent from the old forced wallet configuration',()=>{
 const ctrl=Guide.create();const state=ctrl.state();
 assert.equal(state.persisted,false);assert.equal(state.canTrade,false);assert.equal(state.canWrite,false);
 assert.equal(state.financialApproval,false);assert.equal(state.visible,false);
});
test('tutorial does not open a new screen without a browser document',()=>{
 const ctrl=Guide.create();assert.throws(()=>ctrl.show(),/B132_DOCUMENT_REQUIRED/);
});
test('only step indexes from 0 to quiz are accepted',()=>{
 const ctrl=Guide.create();for(const i of [-1,9,1.2,'2'])assert.throws(()=>ctrl.go(i),/B132_INVALID_STEP/);
 assert.equal(ctrl.go(8).step,8);
});
test('quiz answers reject malformed indexes and remain in session only',()=>{
 const ctrl=Guide.create();
 for(const args of [[-1,0],[0,-1],[4,1],[0,3],['1',0]])assert.throws(()=>ctrl.choose(...args),/B132_INVALID_ANSWER/);
 assert.equal(ctrl.choose(0,1).answers[0],1);assert.equal(ctrl.state().persisted,false);
});
test('default check is unanswered, and answer sequence is per question',()=>{
 const ctrl=Guide.create();
 assert.deepEqual(ctrl.state().answers,[null,null,null,null]);
 for(const [i,v] of [1,0,2,1].entries())ctrl.choose(i,v);
 assert.deepEqual(ctrl.state().answers,[1,0,2,1]);
});
test('incorrect choices do not get silently overwritten by the correct answers',()=>{
 const ctrl=Guide.create();ctrl.choose(1,2);assert.equal(ctrl.state().answers[1],2);
 assert.notEqual(ctrl.state().answers[1],Guide.quiz[1].correct);
});
test('reset removes educational quiz answers and does not set profile or wallet',()=>{
 const ctrl=Guide.create();ctrl.choose(0,1);ctrl.go(5);
 const x=ctrl.reset();assert.deepEqual(x.answers,[null,null,null,null]);assert.equal(x.step,0);
 assert.equal(Object.prototype.hasOwnProperty.call(x,'profile'),false);
});
test('tutorial includes actual manual correction, no API order or trading output',()=>{
 assert.match(Guide.lessons[5].text,/preservar o original/);
 assert.equal(Object.keys(Guide).sort().join(','),'create,lessons,quiz');
});
test('profiles are illustrated only, with explicit non-approval',()=>{
 const text=Guide.lessons[6].text;assert.match(text,/aprovação financeira explícita/);
 for(const x of ['Seguro','Equilibrado','Arriscado'])assert.ok(text.includes(x));
});
test('real Kraken rule staleness and absence of push are explained',()=>{
 assert.match(Guide.lessons[7].text,/não são notificações em segundo plano/);
});
