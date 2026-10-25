"""Audit seven historical SIMULATED trades (arithmetic only, not a Kraken backtest)."""
from decimal import Decimal
from datetime import datetime
from pathlib import Path
import csv, json, sys

file = Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1] / 'research/r2/legacy-simulated-1820-trades-20261025.csv'
with file.open(encoding='utf-8-sig', newline='') as f:
    rows = list(csv.DictReader(f))
assert len(rows)==7, f'Expected 7 simulated entries; got {len(rows)}'
pnl=[Decimal(row['Resultado_Liquido_USD']) for row in rows]
fees=[Decimal(row['Taxas_USD']) for row in rows]
interest=[Decimal(row['Juros_USD']) for row in rows]
closed=[datetime.strptime(row['Fecho_UTC'],'%Y-%m-%d %H:%M') for row in rows]
assert closed == sorted(closed)
assert sum(pnl)==Decimal('1186.34')
assert sum(x>0 for x in pnl)==4
assert all(x < datetime(2026,7,26) for x in closed)
print(json.dumps({'verified':'arithmetic-only-not-backtest','simulated_trades':len(rows),
 'wins':sum(x>0 for x in pnl),'losses':sum(x<0 for x in pnl),
 'pnl_usd':str(sum(pnl)),'fees_from_rounded_trades_usd':str(sum(fees)),
 'interest_from_rounded_trades_usd':str(sum(interest)),
 'last_close_utc':closed[-1].isoformat()+'Z'},ensure_ascii=False,indent=2))
