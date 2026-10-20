/* BTC Strategy Pro · First-run wallet planner v19
 * Educational cash/margin stress model; NO exchange quotes or order placement.
 * Each 20/30/50% leg is repeated for all FIVE A–E cycles.
 */
(function(root){
'use strict';
const round=v=>Math.round(v*100)/100;
function estimate({capital,protectPrice,referencePrice=82000,entries=null,gap=8000,marginShare=.70,safetyShare=.30,maintenanceRate=.05,exitFeeRate=.0005,entryFeeRate=.0005,funding8h=.0001,days=14,maxExposureMultiple=2.5}={}){
 const cash=Number(capital),floor=Number(protectPrice),ref=Number(referencePrice),stepGap=Number(gap);
 if(!Number.isFinite(cash)||cash<100||cash>1000000000)throw Error('Introduz uma caixa entre 100 e 1 000 000 000 USD.');
 if(!Number.isFinite(ref)||ref<1000||ref>250000)throw Error('O preço de referência simulado é inválido.');
 if(!Number.isFinite(floor)||floor<1000||floor>=ref*.98)throw Error('O preço de proteção deve estar pelo menos 2% abaixo do preço de referência.');
 if(!Number.isFinite(stepGap)||stepGap<=0||stepGap>=ref/2)throw Error('A distância dos reforços é inválida.');
 if(![marginShare,safetyShare,maintenanceRate,exitFeeRate,entryFeeRate,funding8h,days,maxExposureMultiple].every(x=>Number.isFinite(x)))throw Error('Pressupostos inválidos.');
 const cycleEntries=entries&&Array.isArray(entries)&&entries.length===5?entries.map(Number):Array.from({length:5},(_,i)=>ref-1000*i);
 if(cycleEntries.some(v=>!Number.isFinite(v)||v-stepGap*2<=1000))throw Error('Os preços de entrada têm reforços inválidos.');
 const weights=[.2,.3,.5],fundingRate=funding8h*days*3;
 const legs=cycleEntries.flatMap((entry,i)=>weights.map((weight,j)=>{
   const buyPrice=entry-stepGap*j,ratio=floor/buyPrice;
   const loss=Math.max(0,1-ratio);
   const cost=loss+maintenanceRate*ratio+exitFeeRate*ratio+fundingRate*ratio+entryFeeRate;
   return {cycle:'ABCDE'[i],stage:j,weight:weight/5,buyPrice,ratio,cost};
 }));
 const unitCost=legs.reduce((sum,l)=>sum+l.weight*l.cost,0);
 const margin=cash*marginShare,reserve=cash-margin,minBuffer=margin*safetyShare;
 // Use worst-case five full cycles. Never spend more than leverage-limited
 // nominal exposure AND never consume a modeled 30% isolated-margin buffer.
 const maxFromStress=(margin-minBuffer)/unitCost;
 const maximum=Math.min(cash*maxExposureMultiple,maxFromStress);
 if(!(maximum>=5))throw Error('Esta configuração não permite criar um plano com margem de segurança.');
 const whole=Math.floor(maximum*100)/100;
 const perCycle=whole/5;
 let amounts=[round(perCycle*.2),round(perCycle*.3)];
 amounts.push(round(perCycle-amounts[0]-amounts[1]));
 const nominal=5*amounts.reduce((a,b)=>a+b,0);
 const qty=legs.reduce((a,l)=>a+amounts[l.stage]/l.buyPrice,0);
 const feesIn=nominal*entryFeeRate;
 const valueAtFloor=qty*floor;
 const unreal=valueAtFloor-nominal;
 const maintenance=valueAtFloor*maintenanceRate,exitFee=valueAtFloor*exitFeeRate,funding=valueAtFloor*fundingRate;
 const buffer=margin+unreal-feesIn-maintenance-exitFee-funding;
 const denominator=qty*(1-maintenanceRate-exitFeeRate-fundingRate);
 const liq=denominator>0?(nominal-margin+feesIn)/denominator:null;
 const estimatedLiq=liq!==null&&liq>0?round(liq):null;
 return {
  capital:cash,referencePrice:ref,protectPrice:floor,margin:round(margin),reserve:round(reserve),
  marginShare,safetyShare,amounts,perCycle:round(amounts.reduce((a,b)=>a+b,0)),
  nominalTotal:round(nominal),bufferAtProtection:round(buffer),
  minimumBuffer:round(minBuffer),estimatedLiquidation:estimatedLiq,
  leverageEquivalent:round(nominal/margin),exposureMultiple:round(nominal/cash),
  feesIn:round(feesIn),funding:round(funding),maintenance:round(maintenance),
  safeUnderAssumptions:buffer>=minBuffer-1,
  inputs:{gap:stepGap,cycleEntries,entryFeeRate,exitFeeRate,maintenanceRate,funding8h,days}
 };
}
root.BTCWalletPlanner=Object.freeze({estimate});
})(typeof window!=='undefined'?window:globalThis);
