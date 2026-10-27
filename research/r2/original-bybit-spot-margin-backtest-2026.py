#!/usr/bin/env python3
"""BTC hourly backtest for Bybit-EU Spot Margin approximations.

Usage:
  python btc_backtest_reproducivel.py --csv /path/to/ohlc_hourly.csv
  python btc_backtest_reproducivel.py --download

WARNING: The model is research only. It is NOT an exchange liquidation engine.
It uses 0.25% each fill, illustrative 0.03% daily borrowing, 2% BTC
collateral haircut, adverse stop slippage, and 55,000 USD long-side stress.
Bybit EU spot margin can borrow on pending orders; this engine assumes
borrowing only after a fill. Short borrowing is simplified to USD debt.

The study's selection used 55% training, 22% validation and 23% untouched test
with 200 hourly warmup candles. The benchmark rows in the report are from the
live 8,741-hour research run; this standalone script can recreate the tests
once supplied the corresponding archived Yahoo snapshot.
"""
from __future__ import annotations
import argparse, csv, json, math, urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

FEE = .0025
DAILY_INTEREST = .0003
HAIRCUT = .02
MAX_LEVERAGE = 10
ANNUAL_URL = "https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1h&period1=1760745600&period2=1792328400"


def timestamp(t):
    return datetime.fromtimestamp(int(t), tz=timezone.utc).strftime("%Y-%m-%d %H:%M")


def load_yahoo(url=ANNUAL_URL):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=45) as f:
        obj = json.load(f)["chart"]["result"][0]
    q = obj["indicators"]["quote"][0]
    rows = []
    for i,t in enumerate(obj["timestamp"]):
        p = [q[k][i] for k in ("open","high","low","close")]
        if all(v is not None and math.isfinite(float(v)) for v in p):
            rows.append(dict(t=int(t),o=float(p[0]),h=float(p[1]),l=float(p[2]),c=float(p[3]),vol=q["volume"][i] or 0))
    return rows


def load_csv(path):
    out=[]
    with open(path, newline='', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            def any_col(*names):
                for n in names:
                    if n in r and r[n] not in ('', None): return r[n]
                raise ValueError('Missing column '+str(names))
            raw = any_col('timestamp','time','t','date','Date')
            try: t=int(raw)
            except ValueError: t=int(datetime.fromisoformat(raw.replace('Z','+00:00')).timestamp())
            out.append(dict(t=t,o=float(any_col('open','o','Open')),h=float(any_col('high','h','High')),l=float(any_col('low','l','Low')),c=float(any_col('close','c','Close')),vol=float(r.get('volume',0) or 0)))
    return sorted(out,key=lambda x:x['t'])


def indicators(B):
    O=[]
    for i,b in enumerate(B):
        prev=O[-1] if O else None
        p=B[i-1] if i else b
        z={}
        for n in (9,21,50,200):
            k=f'e{n}'; alpha=2/(n+1)
            z[k]=prev[k]*(1-alpha)+b['c']*alpha if prev else b['c']
        tr=max(b['h']-b['l'],abs(b['h']-p['c']),abs(b['l']-p['c']))
        z['atr']=(prev['atr']*13/14+tr/14) if prev else tr
        change=b['c']-p['c']
        z['up']=(prev['up']*13/14+max(0,change)/14) if prev else 0
        z['dn']=(prev['dn']*13/14+max(0,-change)/14) if prev else 0
        z['rsi']=100 if z['dn']==0 else 100-100/(1+z['up']/z['dn'])
        closes=[x['c'] for x in B[max(0,i-19):i+1]]
        avg=sum(closes)/len(closes)
        z['avg20']=avg
        z['sd20']=math.sqrt(max(0,sum(x*x for x in closes)/len(closes)-avg*avg))
        for n in (20,48):
            hist=B[max(0,i-n):i]
            z[f'hh{n}']=max((x['h'] for x in hist), default=b['h'])
            z[f'll{n}']=min((x['l'] for x in hist), default=b['l'])
        O.append(z)
    return O


def signal(c,i,B,I):
    v=I[i]; z=I[i-1]; p=B[i]; bp=B[i-1]
    family=c['family']; trend=v['e21']>v['e50']; filt=v['e50']>v['e200']
    if family=='emaCross':
        return 1 if v['e9']>v['e21'] and z['e9']<=z['e21'] and (c.get('variant')=='unfiltered' or filt) else 0
    if family=='rsi':
        return 1 if v['rsi']<c['rsi'] and z['rsi']>=c['rsi'] and (c.get('variant')=='any' or trend) else 0
    if family=='boll':
        return 1 if p['c']<v['avg20']-c['bb']*v['sd20'] and bp['c']>=z['avg20']-c['bb']*z['sd20'] else 0
    if family=='breakout':
        n=c['window'];return 1 if p['c']>v[f'hh{n}'] and (n==20 or filt) else 0
    if family=='emaTrend':
        if c['variant']=='follow':
            return 1 if v['e21']>v['e50'] and p['c']>v['e21'] and bp['c']<=z['e21'] else 0
        return 1 if trend and filt and p['c']>v['e9'] and bp['c']<=z['e9'] else 0
    if family=='dip':
        window=48 if c['dip']>.02 else 20
        return 1 if p['c']<v[f'hh{window}']*(1-c['dip']) and v['rsi']>24 and (c['dip']>=.05 or trend) else 0
    if family=='shortBreakout':
        n=c['window'];return -1 if p['c']<v[f'll{n}'] and (n==20 or v['e50']<v['e200']) else 0
    return 0


def candidates():
    a=[]
    def add(**x): x['id']=len(a)+1;a.append(x)
    for leverage in (1,2,3,5,10):
      for frac in (.25,.5,.75,1):
       for k in (1.5,2.5,4):
        for take in (1.2,2,3.5):
         for variant in ('trend','unfiltered'):
          add(family='emaCross',lev=leverage,frac=frac,k=k,take=take,variant=variant)
    for leverage in (1,2,3,5):
     for frac in (.25,.5,.75):
      for rsi in (22,28,34,40):
       for take in (1,1.7,2.5,4):
        for variant in ('trend','any'):
         add(family='rsi',lev=leverage,frac=frac,rsi=rsi,k=2,take=take,variant=variant)
    for leverage in (1,2,3,5):
     for frac in (.25,.5,.75):
      for bb in (1.5,2,2.5):
       for k in (1.5,2.5,3.5):
        for take in (1.2,2,3): add(family='boll',lev=leverage,frac=frac,bb=bb,k=k,take=take)
    for leverage in (1,2,3,5):
     for frac in (.25,.5,.75):
      for k in (1.3,2,3):
       for take in (1.5,3,5):
        for window in (20,48): add(family='breakout',lev=leverage,frac=frac,k=k,take=take,window=window)
    for leverage in (1,2,3,5):
     for frac in (.25,.5,.75):
      for k in (1.3,2,3):
       for take in (1.2,2.2,3.5):
        for variant in ('follow','pullback'):add(family='emaTrend',lev=leverage,frac=frac,k=k,take=take,variant=variant)
    for leverage in (1,2,3,5):
     for frac in (.25,.5,.75):
      for k in (1.5,2.5,4):
       for take in (1.5,2.5,4):
        for dip in (.015,.03,.05):add(family='dip',lev=leverage,frac=frac,k=k,take=take,dip=dip)
    for leverage in (1,2,3,5):
     for frac in (.25,.5,.75):
      for k in (1.5,2.5,4):
       for take in (1.5,2.5,4):
        for window in (20,48):add(family='shortBreakout',lev=leverage,frac=frac,k=k,take=take,window=window)
    return a


def simulate(c,start,end,B,I,detail=False):
    cash=1500.; pos=None; fees=interest=0.; maxdd=0.; peak=1500.; worstmmr=0.; liq=stressfails=rejected=0
    wins=losses=0; profit_wins=loss_abs=0.; trades=[]; curve=[]; avgdays=0.; maxnot=0.; ymonth=''
    def state(P):
        if pos is None:return cash,cash,0.
        pnl=pos['dir']*pos['not']*(P/pos['entry']-1)
        haircut=HAIRCUT*(pos['not']*P/pos['entry'] if pos['dir']==1 else 0)
        return cash+pnl,cash+pnl-haircut,pos['borrow']*.04
    def exit_trade(P,t,reason,slip=0):
        nonlocal cash,pos,fees,wins,losses,profit_wins,loss_abs,avgdays
        if not pos:return
        px=P*(1-pos['dir']*slip)
        gross=pos['dir']*pos['not']*(px/pos['entry']-1)
        exfee=pos['not']*(px/pos['entry'])*FEE
        cash+=gross-exfee;fees+=exfee
        profit=gross-exfee-pos['entryFee']-pos['interest']
        if profit>=0:wins+=1;profit_wins+=profit
        else:losses+=1;loss_abs+=-profit
        trades.append(dict(open=timestamp(pos['start']),close=timestamp(t),side='LONG' if pos['dir']>0 else 'SHORT',entry=round(pos['entry'],2),exit=round(px,2),notional=round(pos['not'],2),fees=round(pos['entryFee']+exfee,2),interest=round(pos['interest'],2),net=round(profit,2),reason=reason))
        avgdays+=(t-pos['start'])/86400
        pos=None
    for i in range(start,end):
        b=B[i]
        if pos:
            charge=pos['borrow']*DAILY_INTEREST/24
            pos['interest']+=charge;cash-=charge;interest+=charge
        if pos:
            if pos['dir']==1:
                if b['o']<=pos['stop']:exit_trade(b['o'],b['t'],'gap stop',.002)
                elif b['o']>=pos['tp']:exit_trade(b['o'],b['t'],'gap take',.0005)
                elif b['l']<=pos['stop']:exit_trade(pos['stop'],b['t'],'stop',.0015)
                elif b['h']>=pos['tp']:exit_trade(pos['tp'],b['t'],'take',.0005)
            else:
                if b['o']>=pos['stop']:exit_trade(b['o'],b['t'],'gap stop',.002)
                elif b['o']<=pos['tp']:exit_trade(b['o'],b['t'],'gap take',.0005)
                elif b['h']>=pos['stop']:exit_trade(pos['stop'],b['t'],'stop',.0015)
                elif b['l']<=pos['tp']:exit_trade(pos['tp'],b['t'],'take',.0005)
        if not pos and i>200 and i<end-1:
            sig=signal(c,i-1,B,I)
            if sig:
                entry=b['o'];stopdist=max(I[i-1]['atr']*c['k'],entry*.003)
                notional=min(max(0,c['frac']*cash*c['lev']),MAX_LEVERAGE*cash,cash/(FEE+.003))
                if notional>=20 and cash>=30:
                    borrow=notional*(1-1/c['lev'])
                    entryfee=FEE*notional
                    stress=55000 if sig==1 else max(entry*1.5,entry+40000)
                    sh=HAIRCUT*notional*stress/entry if sig==1 else 0
                    stresspnl=sig*notional*(stress/entry-1)
                    if cash-entryfee+stresspnl-sh>2*.04*borrow and cash-entryfee>.1*notional/c['lev']:
                        cash-=entryfee;fees+=entryfee
                        pos={"dir":sig,"not":notional,"borrow":borrow,"entry":entry,"stop":entry-sig*stopdist,"tp":entry+sig*stopdist*c["take"],"entryFee":entryfee,"interest":0,"start":b["t"]}
                        maxnot=max(maxnot,notional)
                    else:stressfails+=1
                else:rejected+=1
        if pos:
            stress=55000 if pos['dir']==1 else max(b['c']*1.5,pos['entry']*1.5)
            eq,adj,mm=state(stress)
            if adj<=2*mm or eq<=0:exit_trade(b['c'],b['t'],'risk trim',.002)
        for p in (b['o'],b['l'],b['h'],b['c']):
            eq,adj,mm=state(p)
            peak=max(peak,eq);maxdd=max(maxdd,peak-eq)
            if mm>0:
                worstmmr=max(worstmmr,mm/max(.01,adj))
                if adj<=mm:liq+=1
        mon=timestamp(b['t'])[:7]
        if mon!=ymonth:
            ymonth=mon;curve.append(dict(date=mon,equity=round(state(b['c'])[0],2),exposure=round(pos['not'],2) if pos else 0))
        if cash<=0:break
    if pos:exit_trade(B[end-1]['c'],B[end-1]['t'],'period end',.001)
    return dict(id=c['id'],family=c['family'],lev=c['lev'],frac=c['frac'],k=c['k'],take=c['take'],profit=round(cash-1500,2),final=round(cash,2),fees=round(fees,2),interest=round(interest,2),trades=len(trades),winrate=round(100*wins/max(wins+losses,1),2),pf=round(profit_wins/max(loss_abs,.0000001),2),drawdown=round(maxdd,2),worstmmr=round(100*worstmmr,2),maxnot=round(maxnot,2),liquidations=liq,stressfails=stressfails,avgdays=round(avgdays/max(len(trades),1),2),log=trades if detail else [],curve=curve if detail else [])


def main():
    ap=argparse.ArgumentParser(description='Research BTC 1h strategies')
    ap.add_argument('--csv',help='Local OHLC CSV, UTC hourly');ap.add_argument('--download',action='store_true')
    ap.add_argument('--output',default='btc_reproduced')
    a=ap.parse_args()
    if not (a.csv or a.download):ap.error('Supply --csv or --download')
    B=load_csv(a.csv) if a.csv else load_yahoo()
    I=indicators(B)
    n=len(B); cuts=[200,int(n*.55),int(n*.77),n]
    if n<1000:raise ValueError('Need >=1000 hourly candles for this research')
    results=[]
    for c in candidates():
        train=simulate(c,cuts[0],cuts[1],B,I)
        val=simulate(c,cuts[1],cuts[2],B,I)
        ok=(val['liquidations']==0 and train['liquidations']==0 and val['trades']>=3 and train['trades']>=3 and val['drawdown']<450 and train['drawdown']<600)
        score=val['profit']+.2*train['profit']-.15*val['drawdown'] if ok else -1e9
        results.append((score,c,train,val,ok))
    ranked=sorted((x for x in results if x[-1]),key=lambda x:-x[0])[:10]
    print('Source candles',len(B),'From',timestamp(B[0]['t']),'to',timestamp(B[-1]['t']))
    print('Evaluated',len(results),'Qualified',sum(x[-1] for x in results))
    root=Path(a.output);root.mkdir(parents=True,exist_ok=True)
    with (root/'ranking.csv').open('w',newline='') as f:
        W=csv.writer(f);W.writerow(('rank','id','family','params','train_USD','val_USD','test_USD','full_USD','test_trades','test_liquidations'))
        for i,(_,c,tr,v,_) in enumerate(ranked):
            te=simulate(c,cuts[2],cuts[3],B,I);full=simulate(c,cuts[0],cuts[3],B,I)
            W.writerow([i+1,c['id'],c['family'],json.dumps(c,sort_keys=True),tr['profit'],v['profit'],te['profit'],full['profit'],te['trades'],te['liquidations']])
            print(i+1,c['id'],c['family'],'train',tr['profit'],'validation',v['profit'],'test',te['profit'],'full',full['profit'])
    winner=ranked[0][1]
    full=simulate(winner,cuts[0],cuts[3],B,I,detail=True)
    with (root/'strategy_trades.csv').open('w',newline='') as f:
        cols=list(full['log'][0].keys()) if full['log'] else []
        if cols:W=csv.DictWriter(f,fieldnames=cols);W.writeheader();W.writerows(full['log'])
    with (root/'study_summary.json').open('w') as f:json.dump(dict(params=winner,top=full,period=[timestamp(B[0]['t']),timestamp(B[-1]['t'])]),f,indent=2,ensure_ascii=False)
    print('Files:',root.resolve())

if __name__=='__main__':main()