# BTC Strategy Pro — Bloco R2, Etapa 1/4
**25 de outubro de 2026 | Inventário e qualificação das evidências de rentabilidade**

## Objetivo
Recuperar estudos antigos e distinguir resultados históricos, simulações incompatíveis entre si e cálculos que NÃO autorizam operar Kraken Futures isolado a 10x. Este inventário é uma base para reprodução na R2.2, não uma seleção financeira aprovada.

## Fontes recuperadas e verificadas
| ID | Fonte preservada em `historico_biblioteca/` no ZIP de 24/10 | O que demonstra | Limitação essencial |
|---|---|---|---|
| A | `BTC_Strategy_Pro_Bloco3_Relatorio_QA.md` + Demo HTML | Cinco conjuntos A–E; 20/30/50; diferença entre primeiras compras 1.000 USD e entre reforços 8.000 USD; alvos de venda +1.500/+2.500/+3.500 acima da média ponderada | Cenários alternativos e lucros ilustrativos; não são histórico da Kraken |
| B | `BTC_Relatorio_Quantitativo_2025_2026.md` | Investigação de 2.040 configurações em ~8.741 velas BTC-USD horárias; melhor classificação treino/validação #1820 | Yahoo BTC-USD e proxy **Bybit Spot Margin**, não Kraken Futures |
| C | `BTC_Estudo_2040_Estrategias_2025_2026.xlsx`, separadores RESUMO, RANKING 10, OPERACOES 1820, COMPARACAO e PRESSUPOSTOS | Métricas e limitações da investigação; últimas janelas treino/validação/teste | O relatório final não disponibiliza todas as velas OHLC usadas; não basta para recalcular o backtest desde a origem |
| D | `BTC_Operacoes_Modelo_1820.csv` | 7 posições simuladas entre 26/02/2026 e 15/07/2026; 4 positivas e 3 negativas; soma liquida **+1.186,34 USD**; 0 posições no teste final de 26/07 a 18/10 | Trade log simulado é verificável aritmeticamente, mas não a estratégia inteira sem OHLC/fonte original |
| E | `btc_backtest_reproducivel.py` + `BTC_Investigacao_Completa_2025_2026.zip` | Código antigo para repetir busca e rankings; download Yahoo ou dados horários locais | OHLC bruto não está incluído no ZIP; execução offline integral **não reproduzida** nesta etapa |
| F | `BTC_Comparacao_Anual_Bybit_vs_Kraken_Futures.xlsx` | Quatro grelhas históricas comparadas; separadores COMPARAÇÃO, PARÂMETROS, RISCO E LIQUIDAÇÃO, FONTES E LIMITES | Período/dados/funding e custos de execução não são uma auditoria oficial. A coluna P&L Kraken taker simula resultado **antes de remover liquidações**; não confundir com lucro realizável em margem isolada |
| G | `BTC_2500_PLANO_10_ESTRATEGIAS.xlsx`, `BTC_TRADING_V5_COMPRAS_LIVRES_9_ESTRATEGIAS.xlsx`, `BTC_Trading_Pro_V2_9_Estrategias.xlsx` | Planos de orçamento, variações de número de conjuntos e níveis | São planificadores/hipóteses, não evidência de rendimento real |
| H | Outras variantes anteriores do pacote, relatadas como **+412,32 USD/71 ciclos** e **+513–562 USD** em cenários residuais | Existência de valores históricos citados no contexto recuperado | **Sem tabela de operações/fonte identificada aqui para estes números**. Não os promover a resultados reprodutíveis até localizar e auditar origem |

## Diferença decisiva encontrada na comparação anual
No ficheiro `BTC_Comparacao_Anual_Bybit_vs_Kraken_Futures.xlsx`, a configuração `9 conjuntos | TP +2k/+10k/+12k` apresenta **+3.270,94 USD** de P&L Kraken teórico na aba COMPARAÇÃO. Mas a aba **RISCO E LIQUIDAÇÃO**, para a mesma família com **1.500 USD de caixa e Kraken Isolado 10x**, indica **primeira liquidação teórica em 01/02/2026 às 23:30, com BTC a 75.730 USD e P&L de -72,31 USD**. A folha avisa explicitamente que o lucro geral não desconta liquidações. Portanto, NÃO existem +3.270,94 USD demonstrados para essa execução isolada realista; são métricas de cenários diferentes.

A comparação tem ainda `10 rápidos | TP +2k/+2,5k/+3,5k`: P&L Kraken teórico de +1.177,862 USD na aba COMPARAÇÃO, mas liquidação teórica no cenário isolado a 10x, **31/01/2026 18:30, BTC 77.000 USD**, na aba de risco. Não selecionar por maior P&L bruto de cenários impossíveis.

## Auditoria numérica do candidato #1820
- CSV simulado: **7 trades**, 4 positivos / 3 negativos.
- Soma independente de `Resultado_Liquido_USD` com decimais exatos: **1.186,34 USD**, igual ao relatório.
- Comissões e juros dos registos individuais arredondados: **242,46 USD** e **45,49 USD**, enquanto o relatório global mostra 242,47 e 45,50. Diferença de 0,01 USD atribuível a arredondamento; investigar com dados não arredondados se vier a ser usado em regressões de centésimos.
- Última operação fechada em **15/07/2026**; o intervalo fora da amostra começa em **26/07/2026**, pelo que a seleção não prova eficácia nesse período.

## Limitações e requisitos de R2.2–R2.4
1. Obter/validar dados OHLC originais com fonte, timezone, janela e verificações de continuidade e qualidade; guardar amostra fixa para testes reproduzíveis.
2. Distinguir **Spot Margin Bybit**, **Kraken Futures cross** e **Kraken Futures isolado** em todas as tabelas.
3. Usar histórico de funding coerente, taxas na data, quantização, fees maker/taker, slippage/gaps, execução parcial e mark do perp, não BTC spot como mark oficial.
4. Executar treino/validação/teste temporal separados; ensaiar retornos **e perdas**, stress até o piso de perfil, falha de margens planeadas e drawdowns.
5. Comparar igual capital (1.000/1.500/2.000/2.500 USD), mesmo período e suposições e identificar explicitamente casos inviáveis/sem trades; o vencedor histórico pode ser inviável para margem isolada.
6. Não mudar perfil Equilibrado nem motor de trading até política discutida com proprietário após R2.

## Estado
**R2, etapa 1/4 — inventário concluído.** Iniciar R2.2 (reprodução verificável) em seguida. GitHub trabalho isolado: `audit/v20-strategy-recovery-20261025`. Site de produção e contas inalterados.