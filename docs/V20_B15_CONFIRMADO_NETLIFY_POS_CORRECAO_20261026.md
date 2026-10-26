# BTC Strategy Pro V20 — Confirmação do utilizador após a correção dos cinco menus

**Data:** 26 de outubro de 2026
**Branch:** `audit/v20-strategy-recovery-20261025`
**Preview externo, apenas DEMO:** https://adorable-heliotrope-b8a413.netlify.app/
**PR:** #35, ainda draft; não modificar main/V19.1.

## Confirmação recebida

Após publicar a versão com a correção dos painéis repetidos e navegação, o proprietário respondeu: **«feito e testado. avancar»**.

**Interpretação restrita:** a nova versão foi publicada/testada e o utilizador autoriza continuar. É evidência de aceitação operacional da etapa de navegação visual, **não** uma assinatura dos parâmetros financeiros, nem prova de que todos os formulários e ecrãs tenham passado teste completo em Galaxy S25 físico. Os controlos de operações reais permanecem desativados.

## Evidência técnica complementar

- Defeito anterior: painéis de QA globais apareciam acima do conteúdo selecionado; todos os menus pareciam iguais no primeiro ecrã.
- Reparação: conteúdo específico dos cinco menus à frente; painel de testes abaixo; comutador rápido Demo / Carteira A / B.
- Execução CI confirmada: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40395394838 **664/664 PASS, 0 FAIL**, 38 suites, incluindo 9 novos testes reais em Chromium.
- Browser externo também confirmou que a aplicação apresenta conteúdo diferente em Início/Estratégias/Mercado/Risco/Conta.
- Não há evidência adicional de teste físico Android offline **após esta última atualização**, nem de que a simulação de compra e os alertas passaram todos os cenários manualmente.

## Passagem para fecho do plano

**33/34 etapas técnicas = 97,1%**. A última etapa pendente é o **gate humano R1.4 da estratégia original, ligado à decisão R2.4**. O utilizador já havia escolhido o **Modelo C adaptativo**, ciclos 20%/30%/50%, três perfis com pisos de stress (Seguro −40k, Equilibrado −20k, Arriscado −10k) e separação de caixa/margem isolada, mas falta validar **a grelha de entradas, o papel do clássico A–E e os critérios de segurança sem assumir que o piso impede liquidação**.

Documento de decisão: `docs/V20_R1_R2_FECHO_DECISAO_20261026.md`. Registos e política financeiros não são alterados por «avançar». Manter `financialCloudApproved:false`, `publicRegistrationApproved:false`, PR draft, sem merge, deploy financeiro ou ordens Kraken.
