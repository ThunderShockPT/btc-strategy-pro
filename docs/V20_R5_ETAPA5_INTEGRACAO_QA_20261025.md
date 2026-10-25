# BTC Strategy Pro — R5.5 — Fecho da integração técnica (25/10/2026)

**Estado: percurso integrado executado em QA; aprovação financeira, cloud pública e teste físico ainda pendentes.**

## Implementação
Novo `five-menu-integrated-runtime-v20.js` agrega **os módulos originais do projeto**: `account-session-v20.js` (Supabase Auth), `account-five-menu-bridge-v20.js` (seleção de carteiras / projeção), `account-workflow-v20.js` + `five-menu-journal-v20.js` (diário e revisão), e `unified-five-menus-v20.js` (cinco menus, uma revisão).

**Um único cliente cloud V20 por sessão.** O estado financeiro é apresentado apenas quando a carteira, o diário, a revisão e o hash do histórico são compatíveis. Antes de apresentar saldos após um movimento confirmado, faz nova leitura. Em caso de logout, mudança de utilizador, conflito, erro de autenticação, resposta atrasada ou escrita incerta, os saldos não são considerados sincronizados.

## Segurança e autorização
- A política de produção `policies/cloud-release-20261021.json` mantém `financialCloudApproved:false`. Com a factory normal `Session.create`, `start()` rejeita `CLOUD_NOT_ENABLED`: **nenhuma conta de produção foi ativada**.
- Exclusivamente na suite de QA, a factory privada `Session.createPrivateTest` injeta uma sessão simulada que permite testar a infraestrutura já existente **com respostas HTTP fictícias**. Não são credenciais reais nem leitura/escrita do Supabase do proprietário.
- Apenas movimentos já executados podem ser propostos. Preparação exige revisão do servidor. Confirmação só com aceite explícito e token correto; tentativas sem aceite, ID incorreto ou quando a política QA rejeita o commit não alteram um saldo confirmado.
- Este módulo não expõe `placeOrder`, operações Kraken, alteração de política financeira, escrita direta no diário nem alterações arbitrárias a carteiras.

## Testes
- `scripts/test-r5-integrated-runtime-20261025.cjs`: **14 casos de ponta a ponta** com módulos V20 originais e mock HTTP/Supabase. PASS no GitHub Actions https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40218096079.
- `scripts/test-r5-unified-five-menus-20261025.cjs`: 22 testes, anteriormente aprovados.
- Browser local Chromium sobre `BTC_Strategy_Pro_R5_Etapa5_Teste_Integrado_20261025.html`: **6/6 resoluções** (320,390,393,430,768,1440), cada uma com **6/6 verificações de interface**, sem erro JS nem deslocamento horizontal. A página é um laboratório **offline de duas carteiras fictícias** e não usa o endpoint real.
- CI financeira/DB/PostgreSQL nativo da branch permanece protegida; consultar **conclusão da execução mais recente** antes de citar os números agregados. As regressões anteriores R5.4 tinham 427 testes aprovados no run 40217248802.

## Limites e aceitação
- O laboratório não testa autenticação real do utilizador: essa ativação está **explicitamente bloqueada**.
- **Samsung Galaxy S25 físico ainda não foi testado por esta sessão**. Chromium em resolução 393px não valida instalação PWA, toque, desempenho Android, background e offline.
- A estratégia financeira definitiva permanece **NÃO APROVADA**; os gates R1.4/R2.4 continuam pendentes. As regras Kraken arquivadas podem estar desatualizadas.
- `main`, site público, Supabase e carteiras reais não foram alterados; PR #35 continua draft, sem merge ou deploy.

**Roadmap técnico:** R5.5 implementado em ambiente de QA, 23/34 etapas técnicas trabalhadas; a aceitação funcional física e autorização financeira permanecem gates abertos. **Próximo: Bloco 13**, com QA de lançamento, regras Kraken atuais, segurança cloud e UX fidelidade visual antes de qualquer publicação.
