# BTC Strategy Pro — R3.2: validação de ordens e margem (25/10/2026)

**Estado:** etapa técnica concluída; o Bloco R3 permanece aberto em 2/4. Sem publicação, sem alteração de políticas Beta e sem operações reais.

## Entregas

- `architecture/strategy-preview-bridge.cjs`: interface exclusivamente de leitura entre o contrato R3.1 e o módulo V20 **real** `kraken-rules.js`. Usa `load`, `validateOrder` e `assess`, sem duplicar a política Kraken.
- `scripts/test-r3-preview-bridge-20261025.cjs`: 19 testes Node aprovados, validando os 15 níveis, repartição 20/30/50, arredondamento para baixo ao lote mínimo 0,0001 BTC, bloqueios do piso e de tick, staleness e ausência de acesso a ledger ou corretora.
- HTML autónomo, disponibilizado na conversa como `BTC_Strategy_Pro_R3_Etapa2_Validador_20261025.html`, com três modos (A–E, V20 base e configurável), CSV, estado das regras e quantidades.
- QA visual Chromium local com seis larguras: **320, 390, 393, 430, 768, 1440 px**; 6/6 passaram, incluindo mudanças do modo, parâmetros, reset e download de CSV. Corrigida a largura de cartão mobile; zero erros JS e zero overflow da página.

## Resultados que alteram o entendimento do projeto

Exemplo clássico a BTC 80.000 USD e orçamento nominal de 1.000 USD por ciclo:
- 200 USD a 80.000 → `0.0025 BTC` = 200 USD executáveis;
- 300 USD a 72.000 → `0.0041 BTC` = 295,20 USD executáveis;
- 500 USD a 64.000 → `0.0078 BTC` = 499,20 USD executáveis.
- A quinta sequência termina com uma compra **exatamente no piso de 60.000 USD**, bloqueada no contrato V20.
- A V20 Equilibrada de base termina a 76.640 USD, mas não inclui a alteração de espaçamento por volatilidade da política V20 completa.

**Bloqueio de segurança real:** o snapshot `kraken-eea-pf-xbtusd-2026-10-21.2` foi observado em 20/10/2026; com data de avaliação 25/10/2026, `kraken-rules.assess` devolve `STALE_RULES`, portanto o adaptador **não chama** o motor de risco. As limitações oficiais de conciliação (financiamento, regras de margem, liquidação) continuam explícitas.

## Limitação do ambiente e teste da integração

O ponto de ligação à função `position-risk.js:requiredMarginForFloor` foi criado, mas a dependência Node `decimal.js` do motor completo não estava instalada no container offline. O teste do adaptador com stub confere apenas **encaminhamento de parâmetros**, não a correção do cálculo real de liquidação. Nenhuma estimativa oficial Kraken é apresentada; mesmo um cálculo completo da função seria estático sob todas as entradas preenchidas, não simulação temporal.

## Próximo gate: R3.3

Validar trajectórias de ordens, transferências falhadas, gaps, fills parciais e posições existentes usando o motor V20 completo num ambiente com dependências e regras válidas. Não alterar `policies/profiles-beta-20261021.json` ou `risk-profiles.js` sem aprovação explícita de direção financeira (R1.4/R2.4). Manter R4 de recuperação da Demo como etapa posterior.

**Contagem:** 12/34 etapas técnicas entregues. Testes físicos Samsung S25 e integração da app real pendentes.
