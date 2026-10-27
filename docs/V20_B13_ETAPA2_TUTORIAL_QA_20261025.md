# BTC Strategy Pro — Bloco 13, Etapa 2/3 — Tutorial interativo (25/10/2026)

**Estado: implementação técnica e validação automatizada concluídas na branch isolada. A política financeira continua NÃO APROVADA.**

## Continuidade do projeto

A etapa foi retomada da documentação e do código V20 original, **sem recriar a carteira nem apagar a Demo Bloco 8**.

- `wallet-onboarding.js` continua como o catálogo oficial versionado de **seis temas**, com eventual recibo/termos próprio e sua política intacta.
- `guided-tutorial-v20.js` reutiliza os **seis temas originais na mesma ordem**, acrescentando apenas duas lições **help-only**: «Caixa disponível depois de compras» e «Alertas e revisão antes de gravar». Não altera a versão do recibo nem a lista oficial de aceitação.
- `guided-tutorial-view-v20.js` disponibiliza tutorial sobreposto com navegação e exemplos de caixa, margem e compras nominais em formato premium, sem autenticação de conta nem gravação de aceite.
- `onboarding-guide-v20.js` disponibiliza um percurso educativo paralelo de **oito lições e quatro perguntas de avaliação**, inteiramente local, sem `upsert`, ordens ou aprovação financeira.
- `previews/v20-b13-onboarding-bloco8-qa-20261025.html` é a prévia de QA na branch com a Demo histórica preservada.

## Conteúdos funcionais

1. Caixa livre contabilística vs. equity da posição isolada; **não descontar duas vezes o PnL não realizado**.
2. Distribuição nominal 20/30/50 do orçamento de cada ciclo.
3. Compras planeadas durante uma descida BTC e piso estrito: compra exactamente a 60.000 USD bloqueada quando o piso é 60.000 USD.
4. Margem isolada 10×, manutenção, funding/taxas, reforço que pode chegar tarde e liquidação real não garantida.
5. Registo somente de compras e transferências já efetuadas, fills parciais, correções e anulações append-only com revisão e confirmação.
6. Perfis Seguro/Equilibrado/Arriscado como **alternativas de estudo não aprovadas**.
7. Alertas in-app, regras Kraken/cotações desatualizadas, troca de conta e privacidade.
8. Exemplo didático: capital 2.000 USD, margem transferida 200 USD, reserva 100 USD → 1.700 USD de caixa livre; com 0,01 BTC comprado a 100.000 USD e preço de 97.000 USD → PnL isolado −30 USD e equity 170 USD, **sem diminuir novamente a caixa livre**.

## Testes reproduzidos

**GitHub Actions — execução aprovada:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40225067023

- **537/537 testes aprovados**, zero falhas, em Node 24 com `decimal.js@10.6.0`.
- Os testes incluem onboarding V20 original, as duas extensões educativas B13.2, questionário, valores de exemplo, precisão em BigInt, proteção de aceite/termos e regressões financeiras, API, PostgreSQL temporário e serviços de conta.
- Chromium Playwright oficial da branch: **6/6 larguras** (320, 390, 393, 430, 768, 1440 px) em `scripts/test-b13-tutorial-browser-20261025.cjs`, com fluxo de oito lições, questionário, caixa/PnL corretos e sem JavaScript errors ou overflow.
- Prévia offline da conversa `BTC_Strategy_Pro_Bloco13_Etapa2_Tutorial_Interativo_20261025.html` reexecutada localmente com `test_b13_2_local.py`: **6/6 larguras**, 0 JavaScript errors, 0 overflow; screenshots 393/1440 px. Esta prévia replica o conteúdo educativo a partir do arquivo oficial e é **um laboratório**, não o frontend financeiro autenticado.

## Bloqueios mantidos

- **Não** existe login Kraken, execução de ordens, notificações externas, recolha de credenciais nem escrita de movimentos na prévia HTML.
- O tutorial **não** regista aceite formal, não altera carteiras nem perfis e não autoriza utilização financeira, embora permita terminar uma avaliação educativa.
- `financialCloudApproved:false` e `publicRegistrationApproved:false` continuam as políticas de produção; PR #35 aberta em **draft**, sem merge ou deploy; sem alteração a `main`, Supabase de produção ou saldos.
- **Samsung S25 físico, modo PWA, instalação/offline e aceitação visual do proprietário ainda não foram ensaiados nesta etapa.**
- Regras de margem Kraken precisam de auditoria atual no Bloco 14 antes de qualquer recomendação para trading; piso de risco não é piso garantido de liquidação.
- **Decisão financeira definitiva NÃO APROVADA**, gates R1.4/R2.4 ainda dependentes de decisão expressa do proprietário.

## Estado e próximos passos

**Bloco 13: 2/3 etapas técnicas concluídas; 25/34 etapas técnicas do plano.** A próxima etapa é **13.3 QA do onboarding e dos alertas em conjunto**, incluindo navegação/foco e conservação de estado da Demo, segurança em sessão/logout, testes na resolução e no Galaxy S25 físico pelo proprietário quando disponível. A publicação está reservada para o Bloco 15, e nunca é automática.
