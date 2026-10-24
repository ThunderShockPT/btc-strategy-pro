'use strict';
// Operational admission only. Does not alter financial rules, source dates or expiry.
const DEFAULT_MINIMUM_MS=45000;
function instant(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,19)!==v.slice(0,19))throw Error('INVALID_CALCULATION_WINDOW');return Date.parse(v);}
function minimum(v){if(!Number.isInteger(v)||v<1000||v>60000)throw Error('INVALID_CALCULATION_WINDOW_BUDGET');return v;}
class WindowError extends Error{
 constructor(code,details){super(code);this.name='CalculationWindowError';this.code=code;this.details=Object.freeze(details);}
}
function requireWindow({now,expiresAt,ruleExpiresAt,historyObservedThrough=null,minimumRemainingMs=DEFAULT_MINIMUM_MS}){
 minimum(minimumRemainingMs);const at=instant(now),expiry=instant(expiresAt),rules=instant(ruleExpiresAt),history=historyObservedThrough===null?null:instant(historyObservedThrough)+60000;
 if(expiry>rules||history!==null&&expiry>history)throw Error('INVALID_CALCULATION_WINDOW');
 const remaining=expiry-at;if(remaining<=0)throw Error('CALCULATION_EXPIRED');
 if(remaining>=minimumRemainingMs)return Object.freeze({remainingMs:remaining,expiresAt});
 const rulesTooShort=rules-at<minimumRemainingMs,reason=rulesTooShort?'RULE_REVIEW_REQUIRED':history===expiry?'WAIT_FOR_CLOSED_HISTORY':'REFRESH_MARKET_CONTEXT',retryAt=reason==='WAIT_FOR_CLOSED_HISTORY'?new Date(history).toISOString():null;
 throw new WindowError(rulesTooShort?'CALCULATION_RULE_WINDOW_TOO_SHORT':'CALCULATION_WINDOW_TOO_SHORT',{reason,serverTime:new Date(at).toISOString(),expiresAt:new Date(expiry).toISOString(),minimumRemainingMs,retryAt});
}
module.exports=Object.freeze({DEFAULT_MINIMUM_MS,minimum,requireWindow,WindowError});
