# BTC Strategy Pro — R5.3 · Diário manual auditável e confirmação autenticada (25/10/2026)

**Estado:** etapa técnica concluída em QA isolado; **NÃO** publicada e **NÃO** aprovada a política financeira.

## Entregas reais

- `five-menu-journal-v20.js`: adaptador seguro dos cinco menus para o **AccountWorkflow V20 original**. Permite preparar movimentos manualmente já ocorridos e correções, exige `reviewHash` exato e **aceitação humana explícita**, valida expiração e consistência de carteira/revisão. Só delega ao `workflow.confirm()` do V20; não faz `upsert`, não modifica o diário diretamente e não envia ordens à Kraken.
- `scripts/test-r5-journal-five-menu-20261025.cjs`: **16 testes novos** de rascunho, confirmação, duplicação, troca de revisão, logout, perda de ligação e impossibilidade de gravar uma operação apenas preparada.
- `previews/v20-r5-journal-review-demo-20261025.html`: Demo Bloco8 restaurada com um **laboratório offline fictício** para preparar, rever, confirmar, anular e corrigir registos. O registo no HTML é temporário e **não modifica saldos da Home nem consulta a conta real**.

## QA

**GitHub Actions aprovado:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40214643413 — **399/399 testes aprovados**, zero falhas; Node 24 e `decimal.js@10.6.0` versionada.

Inclui 16 testes novos R5.3, 20 do execution-workflow real, 45 de corrections append-only, 11 de persistence-contract, **18 testes da API autenticada com PGlite efémero e 24 testes PostgreSQL nativo** com contentor de serviço GitHub Actions, incluindo concorrência, RLS, transações, cópia e restauro, além dos testes R3, R5.1 e R5.2 já existentes.

**Browser QA:** 6/6 larguras Chromium (320, 390, 393, 430, 768, 1440); zero erros JS, zero overflow. Cenários: depósito recusado sem confirmação, registo só depois de revisão explícita, separação de contas A/B, anulação preservando original, logout, valor de comissão inválido, descarte e atualização do estado. Screenshots e relatório QA entregues no ZIP da conversa.

**Histórico do CI:** primeira ampliação a Postgres nativo falhou apenas porque o teste exigia `BTCSP_TEST_PG_URL` / `BTCSP_TEST_PG_CONTAINER`; foi instalado contentor **isolado GitHub Actions**, transmitido o ID do serviço e reexecutada toda a suite: 399/399 passou. O backend financeiro e a base de produção **não sofreram alterações**.

## Limites e próximos passos

1. O motor V20 e o caminho prepare→review→confirm foram realmente exercitados em QA; o HTML é apenas a demonstração interativa da experiência de utilizador com dados fictícios e independente do ledger da Demo.
2. **Não houve login em conta verdadeira**, alteração no Supabase do utilizador, atualização de `main`, merge, deploy, pedido de ordens ou operação de carteira.
3. `policies/cloud-release-20261021.json` conserva `financialCloudApproved:false`. As regras Kraken arquivadas não são atuais; qualquer recomendação de compra futura continua bloqueada.
4. R1.4/R2.4 e aceitação visual/financeira **NÃO APROVADAS**. PR #35 permanece **draft**.
5. **21/34 etapas técnicas concluídas; R5 3/5.** Próximo: **R5.4**, ligar o adaptador autenticado ao UI definitivo, unificar os ecrãs históricos que ainda têm ledger demo separado e executar QA num dispositivo físico, sem expor dados reais antes da autorização.
