#!/usr/bin/env python3
"""R2.2 verification of archived evidence. No network, broker orders, or full backtest."""
from __future__ import annotations
from pathlib import Path
from decimal import Decimal as D
from datetime import datetime
import csv, importlib.util, json, sys, unittest

ROOT=Path(__file__).resolve().parent.parent/'research'/'r2'

def data():
    statement=json.loads((ROOT/'annual-workbook-snapshot-20261025.json').read_text(encoding='utf-8'))
    with (ROOT/'original-simulated-1820-trades-2026.csv').open(encoding='utf-8-sig',newline='') as f:
        trades=list(csv.DictReader(f))
    return statement,trades

class R2Evidence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.statement,cls.trades=data()

    def test_original_generator_has_2040_candidates(self):
        file=ROOT/'original-bybit-spot-margin-backtest-2026.py'
        spec=importlib.util.spec_from_file_location('archived_btc_research',file)
        module=importlib.util.module_from_spec(spec)
        sys.modules[spec.name]=module
        spec.loader.exec_module(module)
        self.assertEqual(len(module.candidates()),2040)

    def test_candidate_1820_is_3pct_dip_at_5x(self):
        file=ROOT/'original-bybit-spot-margin-backtest-2026.py'
        spec=importlib.util.spec_from_file_location('archived_btc_research',file)
        module=importlib.util.module_from_spec(spec)
        sys.modules[spec.name]=module
        spec.loader.exec_module(module)
        self.assertEqual(module.candidates()[1819],{'family':'dip','lev':5,'frac':0.75,'k':4,'take':2.5,'dip':0.03,'id':1820})

    def test_archived_trades_seven_longs(self):
        self.assertEqual(len(self.trades),7)
        self.assertTrue(all(t['Lado']=='LONG' for t in self.trades))

    def test_archived_pnl_total_and_win_count(self):
        p=[D(t['Resultado_Liquido_USD']) for t in self.trades]
        self.assertEqual(sum(p,D(0)),D('1186.34'))
        self.assertEqual(sum(x>0 for x in p),4)
        self.assertEqual(sum(x<0 for x in p),3)

    def test_simulated_account_end_equity(self):
        self.assertEqual(D('1500')+sum((D(t['Resultado_Liquido_USD']) for t in self.trades),D(0)),D('2686.34'))

    def test_price_based_pnl_agrees_to_rounding(self):
        differences=[]
        for t in self.trades:
            nominal=D(t['Valor_nominal_USD'])
            pnl=nominal*(D(t['Saida_BTC'])/D(t['Entrada_BTC'])-1)-D(t['Taxas_USD'])-D(t['Juros_USD'])
            differences.append(abs(pnl-D(t['Resultado_Liquido_USD'])))
        self.assertTrue(all(x<D('.02') for x in differences))
        self.assertTrue(any(x>D('.005') for x in differences))

    def test_report_and_rounded_fees_cannot_match_exactly(self):
        self.assertEqual(sum((D(t['Taxas_USD']) for t in self.trades),D(0)),D('242.46'))
        self.assertEqual(sum((D(t['Juros_USD']) for t in self.trades),D(0)),D('45.49'))

    def test_no_closed_trades_in_final_untouched_period(self):
        dates=[datetime.strptime(t['Fecho_UTC'],'%Y-%m-%d %H:%M') for t in self.trades]
        self.assertEqual(dates,sorted(dates))
        self.assertTrue(all(t<datetime(2026,7,26) for t in dates))

    def test_annual_summary_four_scenarios_eight_risk_events(self):
        self.assertEqual(len(self.statement['comparison']),4)
        self.assertEqual(len(self.statement['risk_events']),8)

    def test_kraken_taker_net_recomputes_from_stored_summary(self):
        fee=D(self.statement['parameters']['Kraken taker por lado'])
        for row in self.statement['comparison']:
            calc=D(row['grossUSD'])-D(row['turnoverUSD'])*fee-D(row['krakenFundingClaimedUSD'])
            self.assertLessEqual(abs(calc-D(row['krakenTakerNetUSD'])),D('.011'))

    def test_bybit_net_recomputes_from_assumptions(self):
        fee=D(self.statement['parameters']['Bybit taxa atual por lado'])
        for row in self.statement['comparison']:
            calc=D(row['grossUSD'])-D(row['turnoverUSD'])*fee-D(row['bybitBorrowCostAssumedUSD'])
            self.assertLessEqual(abs(calc-D(row['bybitBaseNetUSD'])),D('.011'))

    def test_archived_isolated_liquidation_prevents_annual_profit_claim(self):
        nine=next(r for r in self.statement['comparison'] if r['label']=='9 conjuntos | TP +2k/+10k/+12k')
        self.assertEqual(D(nine['krakenTakerNetUSD']),D('3270.94'))
        ev=next(r for r in self.statement['risk_events'] if r['label']=='9 base (2/10/12k)' and r['margin']=='Isolado 10x')
        self.assertEqual(ev['btcAtEventUSD'],'75730')
        self.assertEqual(ev['reportedPnlUntilEventUSD'],'-72.31')
        self.assertIn('NO_RAW_KRAKEN_MARK_SERIES',self.statement['limitations'])

if __name__=='__main__':
    unittest.main(verbosity=2)
