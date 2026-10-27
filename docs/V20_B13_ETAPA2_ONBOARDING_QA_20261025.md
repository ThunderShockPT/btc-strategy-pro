# BTC Strategy Pro — Bloco 13, Etapa 2/3: Tutorial interativo V20

**25/10/2026 — Concluído tecnicamente em QA isolado, não publicado.**

## Fonte original e fidelidade

A versão V20 já tinha o onboarding oficial `wallet-onboarding.js`: **6 temas versionados** e um fluxo de comprovativo/termos. Não foi reescrito nem se considerou o comprovativo aprovado sem uma ação do proprietário.

A etapa 13.2 acrescentou **ajuda complementar**, sem gravar recibo, estratégia ou dados:
- `onboarding-guide-v20.js`: tutorial educativo em 8 passos, 4 perguntas de revisão, progresso, voltar, terminar, sem aprovação financeira nem operação Kraken; integrado com `five-menu-integrated-runtime-v20.js` via `openTutorial()`.
- `guided-tutorial-v20.js`: **reutiliza os seis tópicos originais `BTCWalletOnboarding.tutorial()`**, preservando a versão de recibo. Acrescenta duas explicações: capacidade de compra após entradas executadas e alertas/revisões. O exemplo 20/30/50 é calculado com BigInt, sem taxas ou preços de liquidação fictícios.
- `guided-tutorial-view-v20.js`: componente visual de ajuda reabrível com navegação por teclado e exemplos didáticos. Não substitui o onboarding oficial nem altera os termos.
- `previews/v20-b13-onboarding-bloco8-qa-20261025.html`: HTML standalone com a **Demo Bloco 8 preservada**, 8 lições, questionário de 4 perguntas e slider didático de orçamento do ciclo/preço BTC. A Demo usa contas e dados **fictícios**.
- Ficheiros de teste: `scripts/test-b13-onboarding-20261025.cjs`, `scripts/test-b13-guided-tutorial-20261025.cjs`, `scripts/test-b13-tutorial-browser-20261025.cjs` e regressão original `scripts/test-wallet-onboarding.cjs`.

## Regras essenciais ensinadas

- As três entradas 20/30/50 são **percentagens do orçamento NOMINAL de um ciclo**, não percentagens da carteira nem transferências automáticas para margem.
- Exemplo: capital 2.000 USD − margem isolada efetivamente atribuída 200 USD − reserva 100 USD = **caixa livre 1.700 USD**.
- Long de 0,01 BTC comprado a 100.000 USD, com mark ilustrativo a 97.000 USD: **PnL isolado −30 USD, equity isolada 170 USD**, sem debitar −30 USD de novo da caixa.
- A compra seguinte pode não ser financiável ou a posição pode atingir a manutenção antes de chegar a esse preço; o tutorial **não valida trades nem liquidação oficial**.
- Regras desatualizadas, correções append-only e revisão antes de confirmar.
- Não implica aprovação do perfil Equilibrado ou seleção financeira definitiva; a Demo não lê a conta Kraken real.

## QA comprovado

**GitHub Actions final aprovado:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40225067023 — **537/537 testes aprovados, zero falhas**; Node24, `decimal.js@10.6.0`. Inclui os regressos completos R3–R5, PostgreSQL de QA, 30 testes originais do onboarding, 15 verificações educativas, 18 testes do catálogo e matemática, **6/6 testes Chromium B13.2** e as suítes anteriores.

Falhas temporárias corrigidas durante a etapa:
1. Dois pressupostos dos testes (nome dos perfis presente no título e capitalização de aviso) não correspondiam ao texto, corrigidos sem alterar a política.
2. O HTML da preview tinha um script e o diálogo com o mesmo ID `b132Guide`; corrigido para `b132GuideSource` e executados **6/6 testes de browser** aprovados na versão final.

**QA local adicional** sobre o HTML da conversa: Chromium/Playwright em **320,390,393,430,768,1440 px**, 6/6 aprovados, 0 JavaScript errors, 0 overflow; oito lições, quatro perguntas com correção, slider de ciclo 1.000→2.500 USD, BTC 97k→95k com alteração de PnL e manutenção da caixa. Capítulos e prints incluídos no ZIP `BTC_Strategy_Pro_Bloco13_Etapa2_Pacote_Teste_20261025.zip`.

## Limites e próximo passo

- QA é offline/sintético; não valida a conta privada nem o Samsung Galaxy S25 físico.
- `financialCloudApproved:false`, `publicRegistrationApproved:false`, `main` e produção não foram alterados. PR #35 mantém-se draft; nenhum deploy, migração, operação ou alteração de carteira.
- Os gates R1.4/R2.4 continuam **financeiramente NÃO APROVADOS** e o tutorial não desbloqueia esses gates.
- **25/34 etapas técnicas concluídas (Bloco 13: 2/3).** Próximo **Bloco 13.3: QA final conjunta dos alertas, tutorial e navegação original**, seguida da auditoria financeira independente do Bloco 14.
