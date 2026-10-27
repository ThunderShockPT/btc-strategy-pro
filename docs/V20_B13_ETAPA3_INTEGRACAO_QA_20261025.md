# BTC Strategy Pro V20 — Bloco 13, Etapa 3/3 — Integração e QA (25/10/2026)

**Resultado técnico: CONCLUÍDO na branch isolada.** O Bloco 13 (3/3) fecha tecnicamente. A aceitação visual do proprietário e a aprovação financeira/lançamento permanecem pendentes.

## Continuidade e implementação real

- Partida: B13.2 concluída com 537/537 regressões na GitHub Actions e prévia offline.
- Correção de acessibilidade em `onboarding-guide-v20.js`: fechar com Escape; navegação Tab/Shift+Tab contida no diálogo; restaurar o foco após fechar; conservar foco na resposta selecionada ao re-renderizar as perguntas.
- Teste E2E unificado `scripts/test-b13-integrated-browser-20261025.cjs`: carrega a Demo histórica com alertas financeiros B13.1, injeta o **módulo educativo real** B13.2 da branch, valida abertura/fecho/foco, quiz sem registar aceite, cinco menus, risco vinculado à revisão da carteira A, troca para B sem arrastar riscos da A e logout com eliminação da apresentação de dados privados. Testa 320, 390, 393, 430, 768 e 1440 px; zero JavaScript errors e sem overflow.
- Workflow `.github/workflows/r3-risk-paths-qa.yml` ampliado para executar B13.3 com as regressões antigas R3–R5, B13.1 e B13.2. Código **não** publicado em main/produção.

## Evidência de execução

- GitHub Actions: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40232423290
- **543/543 testes PASS, 0 FAIL**, contados no log de 28 grupos Node/Playwright; testes B13.3 6/6 viewports aprovados.
- Branch `audit/v20-strategy-recovery-20261025`; PR #35 **draft**: https://github.com/ThunderShockPT/btc-strategy-pro/pull/35

## Barreiras de segurança preservadas

- Ambiente da Demo: dados sintéticos. Testes de sessão autenticada via fixtures de QA; sem credenciais Kraken, ordens, transferências reais, escrita cloud financeira, migração Supabase ou alterações a utilizadores.
- `financialCloudApproved:false`, `publicRegistrationApproved:false`, sem merge/deploy nem alteração de main. 
- O tutorial não grava aceite/termos; alertas não são notificações push nem garantem liquidação/capacidade oficial da Kraken.
- Regras Kraken locais congeladas em 20/10/2026; R1.4 e R2.4 continuam dependentes de escolha/aprovação financeira explícita.
- **Não realizado:** ensaio físico Samsung Galaxy S25, PWA instalada/offline, aceitação visual pelo proprietário e QA integrada com conta real autorizada.

## Situação

**26/34 etapas técnicas concluídas (76,5%)** pela contagem técnica do plano; R1.4 e R2.4 mantêm gates humanos pendentes. **Próximo: Bloco 14, Etapa 1/3 — auditoria independente e versão atual das regras oficiais Kraken Futures EEE/Multi-M**, apenas análise sem atualizar políticas ativas; depois B14.2 reconciliação do cálculo e B14.3 QA financeira. O Bloco 15 continua reservado para validação S25, rollout e autorização de publicação.
