# BTC Strategy Pro — Bloco R4, Etapa 1/4 — Recuperação fiel da Demo

**25 de outubro de 2026** · Implementação de referência visual e testes de browser concluídos. Não é publicação nem ligação ao motor financeiro ativo.

## Fonte visual oficialmente recuperada
- `BTC_Strategy_Pro_Bloco8_Beta_Publica_Demo.html` do arquivo da continuidade de 24/10, **174.262 bytes**, SHA-256 `275a6bf18f753c883564187dd9e097b98e6932e747df429d70f6f548c18801f4`.
- Esta é a **Demo do Trading Command Center** com painel escuro azul-petróleo, ciano, gráfico candlestick BTC, radar 20/30/50, cartões, tabelas, terminal de trading, registos, risco e conta. Fonte **local histórica**, não a interface cloud simplificada ou as últimas páginas R3 de diagnóstico.
- A prévia V20 posterior (`gerados/previa_v20_demo.html`) contém o esquema de cinco menus mas substituiu a Home rica em gráficos por um formulário de configuração. Não voltar a fazer essa substituição.

## Alteração efetiva
- Código de pré-visualização isolado: `previews/v20-r4-bloco8-faithful-home-20261025.html`, iniciado por **cópia do Bloco8** e adição de um módulo visual de caixa.
- Em PC: painel **«Caixa livre estimada»** acima do radar, mantendo gráfico de velas intacto; em mobile, este painel surge **antes do gráfico**.
- Detalhes de risco/capacidade expansíveis: capital declarado, margem transferida, caixa protegida, taxas/funding pagos, quantidade BTC existente, compra e preço seguinte, piso, buffer. Modelo de UI exibe caixa e um bloqueio explícito quando a posição existente alcançaria a manutenção **antes** da próxima compra.
- KPI antigos de capital/PnL/nominal continuam disponíveis dentro de **«Ver indicadores históricos da Demo»**, fechado de origem.
- Corrigida a fonte histórica de overflow horizontal de um atalho no cabeçalho em 320 px.

## Limite obrigatório: demonstração, não finanças reais
- O cálculo interativo da UI R4.1 é **simplificado e independente**: inicial 10%, manutenção ilustrativa 5%, taxa 0,05%, lote 0,0001 BTC, sem simulador temporal de liquidação, funding real, gaps nem escalões por conta. Usa exemplos editáveis **não sincronizados** com o diário histórico da Demo nem com o Supabase/Kraken.
- Não o apresentar como *quantidade máxima oficial possível na Kraken*. A etapa **R4.2** deverá substituir a lógica ilustrativa pelo motor real V20 (`financial-engine.js`, `position-risk.js`, `architecture/next-buy-capacity.cjs`) e recalcular a sequência de compras a cada movimento contabilístico.
- O perfil Equilibrado, as regras de piso e a política financeira definitiva **não foram alterados nem aprovados**. O snapshot de regras Kraken atual do projeto foi identificado anteriormente como desatualizado para validar admissões de hoje.

## Testes
- Chromium local Playwright: **6/6 resoluções** aprovadas (320, 390, 393, 430, 768, 1440 px), com **0 erros JS** e **0 scroll horizontal do documento**.
- Testados: canvas/radar originais presentes; 1.700 USD de caixa no cenário exemplo, descida para 1.650 USD após declarar 50 USD de custos; previsão de bloqueio junto de 80.001 USD pela manutenção antes da entrada; voltar a 97.000 USD; cartão expandido testado sem overflow em mobile.
- Não testado: sessão real, Samsung S25 físico, posições reais, ligação ao motor V20 na própria interface, backtest, cotação Kraken atualizada, publicação.

## Estado e próximos passos
**15/34 etapas com entrega técnica** (R0 3, R1 3, R2 4, R3 4, R4 1), com gates humanos R1.4/R2.4 e aprovação financeira por concluir.

- **R4.2:** integrar saldo e capacidade **por cada compra** a partir do motor financeiro real, sem duplicar PnL negativo na caixa.
- **R4.3:** alinhar cinco menus definitivos Início | Estratégias | Mercado | Risco | Conta; preservar terminal, histórico e registos dentro das secções; rever linguagem de formulários, estado e rascunhos.
- **R4.4:** QA de fidelidade, jornadas funcionais, mobile real e aceite do utilizador.

**Branch:** `audit/v20-strategy-recovery-20261025`, PR #35 mantém-se **draft**; sem merge, deploy, migração, escrita na conta ou alteração ao site.
