# BTC Strategy Pro V20 — Bloco 14 · Etapa 3/3 — QA financeira adversa (25/10/2026)

**Estado: CONCLUÍDA TECNICAMENTE em QA isolado. Bloco 14 (3/3) fechado tecnicamente; política financeira, publicação e operações reais NÃO aprovadas.**

## Continuidade segura
Branch `audit/v20-strategy-recovery-20261025`; PR #35 **draft / DO NOT MERGE**. Não houve merge, deploy, alteração em `main`, Supabase, carteiras, Kraken API, autenticação real ou política financeira. Demo premium, os 5 menus e as regras de reserva/dinheiro permanecem intactos.

## Implementação e testes reais
- Novo ficheiro `scripts/test-b14-financial-adversarial-20261025.cjs` — **24 testes** sobre o V20 original: `financial-engine.js`, `position-risk.js`, `temporal-simulator.js`, `cycle-planner.js` e `architecture/b14-financial-reconciliation.cjs`. Sem substituir Decimal.js por floats para cálculos financeiros.
- Adicionado o comando `node --test scripts/test-b14-financial-adversarial-20261025.cjs` ao workflow `.github/workflows/r3-risk-paths-qa.yml` e respetivo gatilho de alteração de ficheiro.
- Gaps com preço de chegada sem inventar preço de execução de liquidação; cruzamento de manutenção antes de compra ou margem tardia; margem concluída em tempo vs falhada; depósito geral não contado como garantia isolada; operações múltiplas atómicas.
- Liquidação parcial **apenas quando explicitamente declarada no cenário** e com fee declarado; parcial insuficiente continua em risco, sem preenchimentos fictícios; fills não desencadeados são rejeitados.
- Adição de margem inversa é **proposta não executada** e não pode recuperar uma posição já em manutenção; reservas excessivas não criam capital.
- Três percursos de ciclos: ordem perdida sem posição; gap sem preencher reforços que não ocorreram; fill parcial com apenas comissão da execução realizada.
- Funding pendente ≠ liquidação financeira: débito não feito duas vezes, crédito futuro não disponibilizado antes de liquidar, esgotamento de caixa geral antes do depósito futuro, liquidação/manutenção antes de uma venda planeada.
- Precisão de fill parcial e taxa; insuficiência de caixa para fee impede a compra em conjunto, sem posição fictícia.
- Regras observadas em 20/10/2026 continuam vencidas em 25/10/2026 e não autorizam cálculo específico nem confiança em uma estratégia; cenários com regras sintéticas congeladas não são classificados como risco confirmado.
- Matriz com 7 preços ilustrativos confirma que PnL não realizado altera equity e não volta a descontar a caixa.
- Não há API para efetuar ordens, nem probabilidades de lucro inventadas, nem preço oficial de liquidação.

## Evidência verificável
**GitHub Actions:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40235131471

- **591/591 testes aprovados, 0 falhas** (31 conjuntos de testes Node e Playwright, com PostgreSQL temporário de QA e 6 resoluções de Chromium nos fluxos UI existentes).
- **24/24 casos B14.3 aprovados**.
- Regressões B14.2, B14.1, B13, R3–R5 e motor V20 preservadas.
- Scripts e relatório versionados na mesma branch de QA; sem interface de negociação real nem escritas remotas na suite adversa.

## O que esta QA NÃO demonstra
1. Não verifica o preço exato de liquidação real da Kraken ou qualquer proteção garantida (a fronteira calculada é apenas manutenção num modelo simplificado).
2. Não reconcilia as taxas atuais de cada conta, a história real de funding, preço mark oficial ou eventuais conversões de colateral em EUR.
3. Não garante execução dos reforços, alavancagem, liquidez, slippage real, liquidações parciais reais nem lucros futuros.
4. Não testa fisicamente o Samsung Galaxy S25 nem confirma PWA instalada/offline ou conta real do proprietário na cloud.
5. Não substitui as decisões R1.4/R2.4 do proprietário nem constitui aceite formal de risco. `financialCloudApproved:false` e `publicRegistrationApproved:false` continuam em vigor.

## Progresso e próximo objetivo
**29/34 etapas técnicas entregues (~85,3%). Bloco 14 3/3 fechado tecnicamente.** Restam as **quatro etapas do Bloco 15 (QA integrado, segurança/rollback, S25, autorização/publicação)** mais o gate humano R1.4 ainda pendente no plano de 34. R2.4 também tem aceitação financeira humana pendente, sem etapa técnica extra contabilizada.

**Próximo passo: Bloco 15 — Etapa 1/4 (QA integrada final da Demo/V20 e preservação de estados), apenas em branch e sem publicação automática.**
