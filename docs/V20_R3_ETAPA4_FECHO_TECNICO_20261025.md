# BTC Strategy Pro — Fecho técnico do R3 (25/10/2026)

**Bloco R3, etapa 4/4 — concluída tecnicamente, aceitação humana e política financeira pendentes.**

## Entregas confirmadas

- Teste integrado `scripts/test-r3-end-to-end-20261025.cjs` executado com o módulo V20 verdadeiro e `decimal.js@10.6.0` no GitHub Actions.
- **203 de 203 testes passam**, zero falhas, no run: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40201612516.
- Divisão: 14 R3.3 + 14 R3.4 + 35 planeador + 34 posições/risco + 51 simulador temporal + 18 regras Kraken + 18 contrato R3.1 + 19 adaptador R3.2.
- Prévia de avaliação `previews/v20-r3-functional-demo-20261025.html`. Esta página é um laboratório offline read-only e não o produto online. Reexecutados testes Chromium em **320, 390, 393, 430, 768, 1440 px**; as seis resoluções passaram, incluindo seleção de modos, 15 compras, caixa/margem, casos didáticos e questionário de revisão, sem erros JS nem overflow.
- O ZIP `BTC_Strategy_Pro_R3_Etapa4_Pacote_Teste_20261025.zip`, o relatório detalhado `BTC_Strategy_Pro_R3_Etapa4_Relatorio_Final_20261025.md` e as imagens desktop/mobile encontram-se anexados à conversa do proprietário.

## Segurança e limites

O ensaio real é sintético e usa regras antigas para verificar invariantes; a fotografia Kraken está **desatualizada** para admissão de ordens atuais. O laboratório não executa `position-risk` no próprio navegador; as simulações foram executadas em CI e os números da interface são ilustrações desses testes. Não há trading, API Kraken da conta, preços oficiais de liquidação, backtest histórico integral ou depósito real. Não há acesso ou escrita no Supabase, nem modificação de `main`, `risk-profiles.js`, `policies/profiles-beta-20261021.json`, da carteira ou dos registos. A PR #35 continua **draft** e não deve ser fundida sem revisão.

**Gates pendentes:** R1.4 apreciação humana da Demo/estratégia original, R2.4 escolha explícita de direcção financeira para Modo C, testes da conta cloud e Samsung S25 físico. O simples comando «avançar» autoriza trabalho técnico na branch de QA, **não** a aprovação automática de alterações financeiras da política.

## Continuação

**14 de 34 etapas com entrega técnica**. R3 encerrado tecnicamente, mas aceite pelo utilizador só após testar o HTML. Próximo bloco **R4, etapa 1/4 — inventário e recuperação fiel da UI Demo original** com cinco menus: Início, Estratégias, Mercado, Risco, Conta. Não substituir componentes antigos por formulários cloud genéricos. Não publicar antes de QA e aprovação.
