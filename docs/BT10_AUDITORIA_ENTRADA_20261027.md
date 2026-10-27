# BTC Strategy Pro · BT-1.0 — Auditoria de entrada (27/10/2026)

Estado: **auditoria técnica e ensaios estáticos preliminares; backtests históricos ainda não executados**.

## Origem preservada
- Base: `audit/v20-strategy-recovery-20261025`. `main` continua a servir V19.1.
- Não altera motores, regras financeiras, Supabase, Kraken, Vercel/Netlify, UI nem decisões de produção.
- Relatório de QA R5.3 (25/10/2026): 399/399 regressões aprovadas; equivalem a testes de software e cenários sintéticos, não à validação de rentabilidade histórica.
- PR #35 mantém-se draft (NÃO FUNDIR). Gates R1.4/R2.4 e S25 físicos pendentes.

## Componentes V20 identificados
- `financial-engine.js`: contabilidade de posições long, quantidade, base de custo e conservação.
- `position-risk.js`: estimativa local de manutenção, comparação de trajetórias e reforços; sem preço oficial de liquidação.
- `temporal-simulator.js`: eventos temporais, funding e ações hipotéticas, custos; testes existentes.
- `cycle-planner.js`: gerador de três compras ponderadas 20/30/50, sujeito a limites e quantização; atualmente recebe espaçamentos em USD por política, não garante por si só o espaçamento percentual da nova BT-1.0.
- `rules/kraken/eea-pf-xbtusd-20261021.json`: fotografia de regras PARTIAL de 21/10/2026, não equivalente a cotação atual/entitlement do cliente.
- Collector público de 1m criado previamente (PR #29), com validações de gaps; não é arquivo plurianual certificado.

## Correção de fonte EEE
A tabela oficial EEE atualizada em 07/10/2026 para Class A <= 30M USD estabelece **IM 10% / MM 5%**. Esta prevalece para o caso do projeto face a uma tabela global com outros escalões. O PF_XBTUSD foi identificado nas especificações EEE como Class A (10x), lote 0,0001 BTC e tick 1 USD (especificações 22/10/2026).

- https://support.kraken.com/pt/articles/derivatives-margin-schedule-and-maximum-leverage-eea
- https://support.kraken.com/pt/articles/perpetual-contract-specifications-for-clients-in-the-eea
- https://docs.kraken.com/api-reference/candles/market-candles
- https://docs.kraken.com/api-reference/historical-funding-rates/historical-funding-rates

## Exigências BT-2 / BT-3
1. Recolher candles originais **trade e mark** com proveniência UTC, sem lacunas e sem confundir OHLC com sequência intravela.
2. Recolher funding real, distinguir taxas relativas e absolutas, provar cobertura temporal.
3. Adaptar 10 ciclos e espaçamento percentual em **módulo separado**, não trocar silenciosamente o planeador de produção.
4. Confrontar as regras de fecho/reabertura com decisões anteriores; testar execuções parciais, saldo, taxas, cross vs isolated, funding e alterações de margem.
5. Reservar cash para funding/comissões/ordens antes de declarar capital totalmente alocado à margem.
6. Relatórios históricos só depois de backtest cronológico reprodutível e validação fora da amostra.

## Pré-ensaio offline
Um pacote BT-1/BT-2 independente foi gerado e ensaiado nesta conversa: matriz de 3 perfis x 4 capitais x 10 ciclos x 3 compras = 360 slots teóricos, 7/7 testes de pré-verificação Python aprovados. **Não foi integrado neste branch, não foi executado com séries de Kraken e não permite eleger um melhor método**.

Sem ordens, deploy, migrações, alteração de gates ou comunicação com carteiras reais.
