/* Append-only local journal projection. Corrections replace the accounting view,
 * never delete source facts or reverse a trade at an exchange. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BTCJournalProjection=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 class JournalError extends Error{constructor(code,eventId=null){super(code);this.name='JournalError';this.code=code;this.eventId=eventId;}}
 const need=(ok,code,id)=>{if(!ok)throw new JournalError(code,id);};
 function canonical(o){
  if(o===null||typeof o==='string'||typeof o==='boolean')return JSON.stringify(o);
  if(typeof o==='number'){need(Number.isSafeInteger(o),'INVALID_JOURNAL_JSON');return JSON.stringify(o);}
  if(Array.isArray(o))return '['+o.map(canonical).join(',')+']';
  need(o&&typeof o==='object','INVALID_JOURNAL_JSON');return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')+'}';
 }
 const clone=o=>JSON.parse(canonical(o));
 function freeze(o){if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
 function fields(o,keys){need(o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k)),'INVALID_CORRECTION_FIELDS');}
 function project(events){
  need(Array.isArray(events)&&events.length<=10000,'INVALID_EVENT_COUNT');
  const sorted=[...events].sort((a,b)=>BigInt(a.revision)<BigInt(b.revision)?-1:1),records=new Map(),changes=new Map();
  for(const e of sorted){
   const id=e.id.toLowerCase();
   if(!['correction','void','reversal'].includes(e.event_type)){
    const original=clone(e);
    records.set(id,{original,version:'1',state:{active:true,record:{facts:original.facts,effective_at:original.effective_at}},lastCorrectionId:null,history:[]});continue;
   }
   const f=e.facts;fields(f,['expectedVersion','action','previous','next','reversesCorrectionId']);
   need(typeof e.target_event_id==='string','CORRECTION_TARGET_REQUIRED',e.id);const target=e.target_event_id.toLowerCase(),r=records.get(target);
   need(r&&['trade_buy','trade_sell','fee','funding'].includes(r.original.event_type),'CORRECTION_TARGET_UNSUPPORTED',e.id);
   need(e.project_id.toLowerCase()===r.original.project_id.toLowerCase()&&e.owner_id.toLowerCase()===r.original.owner_id.toLowerCase()&&e.scenario_key===r.original.scenario_key&&e.origin===r.original.origin,'CORRECTION_SCOPE_MISMATCH',e.id);
   need(typeof e.correction_reason==='string'&&e.correction_reason.trim().length>=3&&e.correction_reason.length<=1000&&!/[\u0000-\u001f\u007f]/.test(e.correction_reason),'CORRECTION_REASON_REQUIRED',e.id);
   need(f.expectedVersion===r.version,'CORRECTION_VERSION_CONFLICT',e.id);
   need(Date.parse(e.recorded_at)>=Date.parse(r.original.recorded_at)&&(!r.lastCorrectionId||Date.parse(e.recorded_at)>=Date.parse(changes.get(r.lastCorrectionId).recorded_at))&&e.effective_at===e.recorded_at,'CORRECTION_RECORDING_ORDER',e.id);
   fields(f.previous,['active','record']);fields(f.next,['active','record']);fields(f.next.record,['facts','effective_at']);
   need(typeof f.next.active==='boolean'&&canonical(f.previous)===canonical(r.state),'CORRECTION_BEFORE_MISMATCH',e.id);
   need(Date.parse(f.next.record.effective_at)<=Date.parse(e.recorded_at),'FUTURE_CORRECTED_EXECUTION',e.id);
   const old=clone(r.state),sameRecord=canonical(f.next.record)===canonical(old.record);
   if(f.action==='replace')need(e.event_type==='correction'&&old.active&&f.next.active&&!sameRecord&&f.reversesCorrectionId===null,'INVALID_REPLACEMENT',e.id);
   else if(f.action==='void')need(e.event_type==='void'&&old.active&&!f.next.active&&sameRecord&&f.reversesCorrectionId===null,'INVALID_VOID',e.id);
   else if(f.action==='restore')need(e.event_type==='correction'&&!old.active&&f.next.active&&sameRecord&&f.reversesCorrectionId===null,'INVALID_RESTORE',e.id);
   else if(f.action==='revert'){
    const prior=changes.get(f.reversesCorrectionId);
    need(e.event_type==='reversal'&&f.reversesCorrectionId===r.lastCorrectionId&&prior&&canonical(f.next)===canonical(prior.facts.previous),'INVALID_CORRECTION_REVERSAL',e.id);
   }else need(false,'INVALID_CORRECTION_ACTION',e.id);
   r.state=clone(f.next);r.version=(BigInt(r.version)+1n).toString();r.lastCorrectionId=id;r.history.push(id);changes.set(id,clone(e));
  }
  const rows=[...records.values()];
  return freeze({events:rows.filter(r=>r.state.active).map(r=>({...r.original,...r.state.record})),records:rows.map(r=>({...r,localJournalAdjustment:true,exchangeTradeChanged:false})),correctionCount:changes.size});
 }
 return Object.freeze({JournalError,canonical,clone,freeze,project});
});
