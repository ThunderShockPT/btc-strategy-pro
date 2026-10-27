"""R2.4 offline evidence-only verification; not a Kraken risk audit."""
import json, re, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'previews/v20-r2-strategy-decision-20261025.html'
REPORT=ROOT/'docs/V20_R2_ETAPA4_CONCLUSOES_20261025.md'
class Tests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  h=HTML.read_text(encoding='utf-8')
  cls.rows=json.loads(re.search(r'<script type="application/json" id="dataset">(.*?)</script>',h,re.S).group(1))['rows']
 def ref(self,m,s='floor',w='2000',p='planned'):
  return next(x for x in self.rows if (x['model'],x['scenario'],x['wallet'],x['policy'])==(m,s,w,p))
 def test_120_scenarios(self): self.assertEqual(len(self.rows),120)
 def test_unique_scenarios(self): self.assertEqual(len(set((x['model'],x['wallet'],x['scenario'],x['policy']) for x in self.rows)),120)
 def test_three_models(self): self.assertEqual(set(x['model'] for x in self.rows),{'classic','v20','spread'})
 def test_four_wallets(self): self.assertEqual(set(x['wallet'] for x in self.rows),{'1000','1500','2000','2500'})
 def test_five_scenarios(self): self.assertEqual(set(x['scenario'] for x in self.rows),{'up','mild','moderate','floor','crash'})
 def test_two_margin_cases(self): self.assertEqual(set(x['policy'] for x in self.rows),{'initial','planned'})
 def test_stress_v20_loss(self): self.assertEqual(self.ref('v20')['loss_at_low'],'-1143.27')
 def test_stress_classic_loss(self): self.assertEqual(self.ref('classic')['loss_at_low'],'-516.9')
 def test_required_margins(self):
  self.assertEqual(self.ref('v20')['required_isolated'],'1372.35')
  self.assertEqual(self.ref('classic')['required_isolated'],'779.45')
 def test_total_cash(self):
  self.assertEqual(self.ref('v20')['budget_total'],'1774.83')
  self.assertEqual(self.ref('classic')['budget_total'],'1181.93')
 def test_strict_floor(self):
  self.assertEqual(self.ref('v20')['floor_violations'],'0')
  self.assertEqual(self.ref('classic')['floor_violations'],'1')
  self.assertEqual(self.ref('spread')['floor_violations'],'1')
 def test_initial_only_stress_at_60k(self):
  for m in ('classic','v20','spread'):
   self.assertEqual(self.ref(m,p='initial')['status'],'risco_liquidacao')
 def test_v20_crash_cash_insufficient(self):
  self.assertEqual(self.ref('v20',s='crash')['status'],'caixa_insuficiente')
  self.assertEqual(self.ref('v20',s='crash')['budget_total'],'2075.91')
 def test_five_vs_fifteen_entries(self):
  self.assertEqual(self.ref('v20',s='mild')['filled_count'],'15')
  self.assertEqual(self.ref('classic',s='mild')['filled_count'],'5')
 def test_controls_and_guardrails(self):
  h=HTML.read_text(encoding='utf-8'); md=REPORT.read_text(encoding='utf-8')
  for v in ('id="wallet"','id="scenario"','id="policy"','id="review"','id="copy"','name="direction"'):
   self.assertIn(v,h)
  for v in ('não executa ordens','aprovação financeira','não é um backtest','R1','R2','R3'):
   self.assertIn(v.lower(),(h+md).lower())
if __name__=='__main__':unittest.main(verbosity=2)
