# BTC Strategy Pro — R2, etapa 2/4: reprodução histórica (25/10/2026)

**Conclusão:** 12/12 testes offline passaram; consistência aritmética comprovada nos arquivos, **sem backtesting histórico integral independente**. Nenhuma alteração ao motor, à política V20, à aplicação pública ou a dados de utilizadores.

## Evidência reproduzida
1. O código original `research/r2/original-bybit-spot-margin-backtest-2026.py` gera 2040 configurações, sendo a n.º 1820 um sinal long de recuo de 3%, 5×, 75% do capital-alvo, ATR×4 e take×2,5.
2. O CSV original contém sete negócios LONG (quatro ganhos, três perdas). Soma dos P&L publicados: **+1186,34 USD**; saldo teórico **2686,34 USD** sobre 1500 USD. Com preços nominais arredondados, reconstrução por negócio diverge até 0,01 USD em duas linhas, dentro de tolerância 0,02 USD. Taxas do CSV totalizam 242,46 USD e juros 45,49 USD, enquanto o relatório mostra 242,47 e 45,50 USD (precisão bruta não preservada).
3. Nenhum dos sete negócios foi fechado no período de teste final reservado após 26/07/2026. A ausência de negócios não valida lucros fora da amostra.
4. A aritmética das quatro estratégias da comparação anual pode ser reproduzida: **P&L Kraken teórico = bruto − 0,05% × volume − funding já publicado na folha**, sem recalcular o funding. Resultados de referência:
   - 9 conjuntos +2/+10/+12k: **+3270,94 USD**;
   - 9 conjuntos +2/+3,5/+5k: **+2101,14 USD**;
   - 6 conjuntos +2/+10/+12k: **+2226,06 USD**;
   - 10 rápidos +2/+2,5/+3,5k: **+1177,86 USD**.
5. O mesmo Excel inclui, para 9 conjuntos, capital 1500 USD e margem **isolada 10×**, uma *primeira liquidação estimada*, em 01/02/2026 23:30 quando BTC ≈75730 USD, com resultado até ao evento −72,31 USD. Estes valores são outputs arquivados da simulação, **não a liquidação oficial da Kraken nem uma reconstrução independente do evento**. Logo, +3270,94 USD NÃO constitui lucro demonstrado em isolated 10×.
6. A investigação 2040 indica 8741 velas horárias, mas a comparação anual indica 8772: universos/snapshots distintos. O arquivo não contém o OHLC bruto nem a série bruta de mark ou funding; qualquer backtest histórico integral precisa de dados adquiridos, fixados, datados e verificados em R2.3.

## Ficheiros versionados
- `scripts/test-r2-reproduction-20261025.py` (12 testes; executar com `python scripts/test-r2-reproduction-20261025.py`).
- `research/r2/original-bybit-spot-margin-backtest-2026.py` (fonte histórica, não módulo produtivo).
- `research/r2/original-simulated-1820-trades-2026.csv` (histórico simulado, não conta real).
- `research/r2/annual-workbook-snapshot-20261025.json` (subconjunto declarado do XLSX original, SHA-256 do original: `30c41be687c82e8de6b512db83f8eb377467a0e5b77a948e0eeffdae6fb8d23f`).

## Critério de R2.3
Comparar A–E histórica, V20 concentrada e uma escada mais ampla sob pressupostos comuns e fontes rastreáveis. Distinguir cenário sintético de verdadeiro backtest histórico. Incluir capital 1000/1500/2000/2500 USD, execução de compras, margem isolada efetiva, liquidação, funding, taxas, gaps e falhas de reforço. Não selecionar perfis só pelo P&L de uma simulação incompatível com sua sobrevivência.

**Estado do plano:** R2.2 tecnicamente concluída; R2.3 próxima. R1.4 depende da avaliação humana para fechar R1; nenhum perfil financeiro novo foi aprovado.
