# BTC Strategy Pro — R5, Etapa 1/5 · Leitura autenticada, fonte única para os cinco menus

**25/10/2026 · Etapa técnica concluída em QA isolado. Não publicada.**

## Descobertas verificadas
- Projeto Supabase `oftzqqjbwonngubihrsd` encontra-se `ACTIVE_HEALTHY`.
- As tabelas `projects`, `project_snapshots`, `btcsp_financial_events`, `btcsp_plan_versions`, `btcsp_calculation_runs`, `btcsp_preference_versions` e `btcsp_tutorial_receipts` têm **RLS habilitada** segundo os metadados SQL. Nenhum registo privado foi consultado e não houve mutações.
- O projeto **já contém** `account-session-v20.js`, `cloud-client-v20.js`, API autenticada `backend/http-api.cjs` e o `financial-engine.js`. Reutilizar a API existente, não criar segundo diário.
- Documentação Supabase consultada: `auth.getUser()` verifica remotamente a identidade; novas tabelas não terão exposição implícita na Data API a partir de 2026 (não foram criadas tabelas).

## Implementação real
- `authenticated-dashboard-v20.js`: adaptador autónomo CommonJS/UMD, **somente leitura**. Usa leitura do CloudClient autenticado, verificação remota da identidade e motor financeiro V20. Exige scope de utilizador/projeto/cenário/plano, email confirmado, hash e revisão válidos; nunca aceita saldo fornecido pela UI como verdade do servidor.
- A mesma versão/hash alimenta **Início, Estratégias, Mercado, Risco e Conta**. `freeCashUSD` vem do `ledger.cash.spendableUSD`, margem de `ledger.cash.isolatedMarginUSD`, perdas não realizadas de `ledger.pnl.unrealizedGrossUSD`, sem duplicar deduções. Não concede capacidade de compra da corretora ou aprovação financeira.
- Valida idade de quote/regras Kraken; quando faltam ou estão desatualizadas expõe informação como **`authenticated-bookkeeping-only`** e risco/compra indisponíveis.
- Invalida dados privados ao mudar/terminar sessão e descarta respostas tardias. Falhas deixam UI privada vazia, sem valores stale tratados como válidos. Não tem comandos de escrita, depósitos ou ordens.

## QA
- `scripts/test-r5-authenticated-dashboard-20261025.cjs`: **18/18** testes de owner scope, troca de conta, sessão, leitura concorrente, revisões, as cinco vistas, cash e fees, rejeição de dados e bloqueio de quote stale.
- GitHub Actions run: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40209849132
- **237/237 testes aprovados** na regressão total, sem falhas, `decimal.js@10.6.0`.
- Laboratório HTML reproduz a Demo Bloco 8 e oferece alternância entre **contas fictícias** A/B, dados antigos e saída: **6/6 viewports Chromium** (320/390/393/430/768/1440), zero erros/overflow, mesmo identificador de revisão em cada menu. HTML, screenshots e QA incluidos no ZIP de conversa.

## Limites e gate seguinte

**Este bloco não ligou ainda o adaptador aos formulários autenticados da app alojada.** A pré-visualização R5.1 usa contas simuladas, sem acesso à conta real, e o diário da Home histórica continua de demonstração. A integração UI real e testes de sessão Supabase na app (sem alterar saldos) pertencem à R5.2.

- Política financeira expressamente **NÃO APROVADA** na avaliação do utilizador (R1.4/R2.4 pendentes).
- PR #35 draft, sem merge, deploy, Supabase schema, entrada real ou carteira afetada.
- **19/34 etapas técnicas entregues**. Próxima: **R5.2**, ligação do adaptador à conta real e cinco vistas com uma única fonte financeira, não reusar Demo fictícia como carteira autenticada.
