# BTC Strategy Pro — Bloco R5, Etapa 2/5 (25/10/2026)

**Estado: integração de autenticação/carteiras concluída tecnicamente na branch isolada, sem ativação pública nem aprovação financeira.**

## Implementação e referência única
- `account-five-menu-bridge-v20.js`: reutiliza o **verdadeiro** `account-session-v20.js` (Supabase Auth + verificação de email), `cloud-client-v20.js` (API V20 de carteira) e `authenticated-dashboard-v20.js` (reconstrução ledger V20). A entrada, seleção de carteira, atualização, logout e troca de utilizador não persistem credenciais e não efetuam operações.
- `five-menu-financial-view-v20.js`: bind de leitura da caixa livre, margem isolada, PnL, quantidade, revisão/versão do plano e alertas **aos cinco menus** via `textContent`. Dados removidos imediatamente em logout, carteira trocada ou leitura inválida. A validação é feita pelo serviço existente, não por user_metadata ou por saldos históricos da Demo.
- Ficheiros de testes: `scripts/test-r5-session-wallet-bridge-20261025.cjs` (18 testes) e `scripts/test-r5-five-menu-bindings-20261025.cjs` (10 testes).
- HTML `previews/v20-r5-login-wallets-qa-20261025.html`: mantém Demo visual original e inclui painel de **duas contas fictícias** para revisão offline do estado e navegação. Não lê a conta real.

## QA comprovado
- GitHub Actions **run 40212597186**, commit `023e921827d25957d6c54131ebe2e49ebb87e754`, Node 24 e `decimal.js 10.6.0`: **265/265 testes PASS** (inclui 18 novos de login/carteiras, 10 do UI bind e regressões R5.1, R3 e V20), **0 falhas**. A verificação de login mais recente usa o mecanismo `BTCAccountSessionV20.signIn` sem reter password no adaptador.
- Playwright Chromium local: **6/6 viewports** (320, 390, 393, 430, 768, 1440 px), os cinco menus, alternância A/B, dados antigos, logout, **zero erros JS, zero overflow**. Estes valores são simulações de UI, não saldos da corretora.
- A falha inicial com UUID abreviado no novo adaptador foi corrigida e o teste completo reexecutado; posteriormente foi corrigida uma chave JS na camada de apresentação.

## Segurança e bloqueios que permanecem
**`policies/cloud-release-20261021.json` conserva `financialCloudApproved:false`.** Nenhuma alteração de política foi proposta ou executada. O fluxo de autenticação testado usa o caminho **privado de QA `createPrivateTest`**, não a API de produção. Nenhuma operação de escrita, migração ou alteração ao Supabase, main, site, políticas financeiras ou carteira do proprietário. PR #35 permanece **draft**.

A Demo R4 tem ferramentas históricas ainda distintas do diário autenticado. O R5.2 oferece o **módulo de ligação**, ainda **não está montado e ativo no frontend público de produção**. A próxima etapa **R5.3** tem de ligar leitura e revisão explícita de operações no frontend, permitindo alterações auditáveis e correções append-only com fluxo `prepare -> revisão -> confirm`, sem operações automáticas Kraken.

**Plano: 20/34 etapas técnicas** (R5 2/5). R1.4/R2.4 decisão financeira continua NÃO APROVADA. Teste físico Samsung S25 e QA autenticado real ainda pendentes.