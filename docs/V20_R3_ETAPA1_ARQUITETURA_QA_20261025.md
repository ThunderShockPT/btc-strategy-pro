# BTC Strategy Pro — R3, Etapa 1/4 (25-10-2026)

## Implementação real na branch isolada
- `architecture/strategy-comparison-contract.cjs` — contrato de comparação de grelhas sem dependências, CommonJS e aritmética decimal com BigInt (precisão fixa de seis casas). Não acede ao ledger, exchange, Supabase ou rede; não tem funções de escrita ou execução.
- `scripts/test-r3-strategy-contract-20261025.cjs` — 18 testes automáticos que passaram na execução local Node 22.
- Branch: `audit/v20-strategy-recovery-20261025`. Produção, `main`, perfis Beta, `risk-profiles.js`, `cycle-planner.js`, carteiras e históricos **não foram modificados**.

## Contrato e limites

O input requer `schemaVersion=1`, `mode` (`classic-demo`, `v20-base-illustrative` ou `adjustable-preview`), `profile` (Seguro/Equilibrado/Arriscado), `referencePriceUSD`, `firstEntryPriceUSD`, `riskFloorUSD`, `buyLadderLowerBoundUSD`, `cycleFirstEntryGapUSD`, `withinCycleReinforcementGapUSD`, `maxCycles`, `nominalCycleBudgetUSD`, `walletCashUSD`, `reportedIsolatedMarginUSD`, `plannedMarginAddsUSD` e `protectedCashUSD`. Todos os preços e quantias em strings decimais; campos adicionais são rejeitados. Não realiza quantização Kraken de lotes/ticks — isso pertence ao motor de risco único.

O output retorna apenas `status=comparison-only`, `canApply=false`, `mayWriteLedger=false`, `maySubmitOrders=false`, `mayCallExchange=false`. Enumera 3 níveis por ciclo com orçamento nominal 20/30/50, assinala entradas no/abaixo do piso ou abaixo do limite da escada, diferenças do piso de referência do perfil, e reservas superiores à caixa. **Margem futura prevista nunca é contabilizada como margem já depositada.**

Modo clássico A–E: 1000 USD entre primeiras entradas, 8000 USD entre reforços, valores fixos e inalteráveis. Modo V20-base: apenas os 0,3%/1,5% base (80000 USD -> 240/1200), exclui o alargamento por volatilidade e não pretende reproduzir o cálculo completo ativo. Modo ajustável: distâncias distintas mas sempre como pré-visualização não executável.

## Testes realizados

- 18/18 casos Node aprovados (0 falhas): histórico A–E, três reforços, 20/30/50, compra no piso, piso separado da escada, 0,3%/1,5%, presets imutáveis, custom não executável, caixa/margem separadas, perfil/distâncias, entradas inválidas, números decimais, erros explícitos, não mutação e ausência de operações de escrita.
- Os artefactos guardados no GitHub foram verificados por SHA do blob, correspondente aos ficheiros testados localmente:
  - código: `0b8c23e71d5f92910aa95d908b6defa9d5ee6ef9`
  - testes: `b8768686c5bca0e7d7f4b134515df35c8ee14efe`
- **Não** foram efetuados testes na aplicação real, sessão Supabase, Kraken, cálculos oficiais de liquidação ou Galaxy S25 físico nesta etapa. Esta fase prepara o contrato, não substitui a validação de risco.

## Etapa seguinte — R3 2/4
Construir um adaptador de pré-visualização com mensagens humanas e incorporar a verificação Kraken através de módulos financeiros V20 existentes, mantendo o novo contrato sempre separado de comandos de escrita. Só iniciar alterações à política financeira ativa depois de aprovação explícita da direção do modelo, ainda pendente nos gates R1.4/R2.4.

**Plano:** 11 das 34 entregas técnicas produzidas (R0 3, R1 3, R2 4, R3 1); dois gates de aceitação do utilizador continuam pendentes. Sem publicação em produção.