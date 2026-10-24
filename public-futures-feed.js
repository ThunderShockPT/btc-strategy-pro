/* Public PF_XBTUSD mark only. Quotes are observations, never account data. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BTCFuturesFeed=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const WS='wss://futures.kraken.com/ws/v1',REST='https://futures.kraken.com/derivatives/api/v3/tickers/PF_XBTUSD',MAX_AGE=15000;
function price(v){const s=String(v);if(!/^(0|[1-9]\d{0,19})(?:\.\d{1,18})?$/.test(s)||!/[1-9]/.test(s))throw Error('INVALID_PUBLIC_MARK');return s;}
function parse(body,receivedAt,kind='websocket'){
 let value,at;if(kind==='websocket'){
  if(body?.feed!=='ticker'||body.product_id!=='PF_XBTUSD'||!Number.isSafeInteger(body.time)||body.suspended===true)throw Error('WRONG_PUBLIC_MARK_FRAME');
  value=body.markPrice;at=body.time;
 }else{
  const t=body?.ticker;if(body?.result!=='success'||String(t?.symbol).toUpperCase()!=='PF_XBTUSD'||t.pair!=='XBT:USD'||t.tag!=='perpetual'||t.suspended!==false||t.postOnly!==false)throw Error('WRONG_PUBLIC_MARK_FRAME');value=t.markPrice;at=Date.parse(body.serverTime);
 }
 if(!Number.isFinite(at)||at>receivedAt||receivedAt-at>MAX_AGE)throw Error('STALE_OR_FUTURE_PUBLIC_MARK');
 return Object.freeze({priceUSD:price(value),asOf:new Date(at).toISOString(),receivedAt:new Date(receivedAt).toISOString(),kind:'public_mark',symbol:'PF_XBTUSD',source:'Kraken Futures · PF_XBTUSD mark',transport:kind,sourceURL:kind==='websocket'?WS:REST});
}
function create({WebSocketImpl=globalThis.WebSocket,fetchImpl=globalThis.fetch,now=()=>Date.now(),onChange=()=>{},schedule=globalThis.setTimeout,unschedule=globalThis.clearTimeout,interval=globalThis.setInterval,uninterval=globalThis.clearInterval}={}){
 let active=false,closed=false,socket=null,reconnect=null,controller=null,latest=null,attempt=0,lastRest=0,epoch=0;
 const fresh=()=>latest&&now()>=Date.parse(latest.asOf)&&now()-Date.parse(latest.asOf)<=MAX_AGE?latest:null;
 const emit=()=>onChange(fresh());
 function accept(q){if(!active||closed||latest&&Date.parse(q.asOf)<Date.parse(latest.asOf))return;latest=q;emit();}
 function connect(){if(!active||closed||socket||typeof WebSocketImpl!=='function')return;const ticket=epoch;let ws;try{ws=new WebSocketImpl(WS);}catch{retry();return;}socket=ws;
  ws.onopen=()=>{if(ticket!==epoch||!active)return;attempt=0;ws.send(JSON.stringify({event:'subscribe',feed:'ticker',product_ids:['PF_XBTUSD']}));};
  ws.onmessage=event=>{if(ticket!==epoch||!active||typeof event.data!=='string'||event.data.length>65536)return;try{accept(parse(JSON.parse(event.data),now()));}catch{/* Control frames, lite/spot/last and incomplete marks cannot refresh age. */}};
  ws.onerror=()=>{ws.close();};ws.onclose=()=>{if(ticket!==epoch)return;socket=null;retry();};
 }
 function retry(){if(active&&!closed&&reconnect===null)reconnect=schedule(()=>{reconnect=null;connect();},Math.min(30000,1000*2**Math.min(attempt++,5)));}
 async function rest(){if(!active||closed||controller||fresh()?.transport==='websocket'||now()-lastRest<5000)return;lastRest=now();const ticket=epoch,abort=new AbortController();controller=abort;const timeout=schedule(()=>abort.abort(),4000);
  try{const response=await fetchImpl(REST,{signal:abort.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});if(!response.ok)throw Error('PUBLIC_MARK_UNAVAILABLE');const text=await response.text();if(text.length>64000)throw Error('PUBLIC_MARK_TOO_LARGE');if(ticket===epoch)accept(parse(JSON.parse(text),now(),'rest'));}catch{/* Expiry clears the previous mark; no spot/last substitution. */}finally{unschedule(timeout);if(controller===abort)controller=null;emit();}
 }
 const timer=interval(()=>{emit();void rest();},1000);timer?.unref?.();
 function setActive(value){if(closed||active===value)return;active=value;epoch++;controller?.abort();controller=null;if(reconnect!==null)unschedule(reconnect);reconnect=null;const previous=socket;socket=null;previous?.close();latest=null;emit();if(active){lastRest=0;connect();void rest();}}
 return Object.freeze({setActive,snapshot:fresh,close(){setActive(false);closed=true;uninterval(timer);}});
}
return Object.freeze({create,parse,MAX_AGE,WS,REST});
});
