# BTC Strategy Pro — Recuperação histórica (R0/R1)

**Data:** 25-10-2026  
**Âmbito:** comparação entre Demo histórica e motor/política V20, sem executar ordens ou publicar alterações.

## R0 — Origem e preservação

- Arquivo de 24/10: integridade verificada pelo `RETOMAR_PROJETO.py`: **436 ficheiros SHA-256 e 332 blobs Git**; snapshot `f78a53bc4c4acda479c4e0d6a2af9d9c633f7afc`.
- GitHub V20: `qa/v20-block12-recovery-20261022` com head **`f72da684379665ae2eca1b3eb4b8cc6df97665c5`** na inspeção; PR #34 aberto e draft. O head já avançou desde o ZIP, que é histórico.
- Criada branch de segurança `checkpoint/v20-before-strategy-recovery-20261025` no head acima.
- Criada branch isolada `audit/v20-strategy-recovery-20261025` para testes e documentação, sem editar a política Beta.
- `main` continua na linhagem V19.1, segundo documentação e PR; não foi realizado merge, deploy, alteração à Supabase ou uso de carteiras particulares.

## R1 — Diferença encontrada nos preços

A **Demo clássica** (fonte: `historico_biblioteca/BTC_Strategy_Pro_Bloco3_Relatorio_QA.md`) especifica cinco conjuntos A–E: primeiro nível deslocado em **1.000 USD** entre conjuntos, reforços deslocados em **8.000 USD** dentro de cada conjunto; **20/30/50** da dotação nominal do conjunto. Exemplo A: 82.000 / 74.000 / 66.000 USD; objetivos após cada fase: preço médio ponderado +1.500 / +2.500 / +3.500 USD.

Já a política Beta V20 `policies/profiles-beta-20261021.json` fixa `balanced.cycleSpacingFraction=0.003` e `balanced.reinforcementFraction=0.015`. O motor `risk-profiles.js` converte esses parâmetros em distâncias e `cycle-planner.js` deriva os três níveis por ciclo. Com referência e primeira compra hipotéticas de **80.000 USD**, ignorando filtros adicionais de mercado e orçamento: intervalos-base de 240 e 1.200 USD, produzindo 15 níveis entre **80.000 e 76.640 USD**. A Demo clássica transladada para 80.000 USD produziria 15 níveis entre **80.000 e 60.000 USD**.

**Atenção:** `referenceDistancesApprovedUSD.balanced=20000` é a distância de referência do *piso de risco* (na hipótese de 80k, 60k), não uma instrução para colocar automaticamente uma compra nesse piso. A zona de compras requer decisão própria e verificação de viabilidade financeira.

## Testes dourados executados

Foi executado `node --test scripts/test-strategy-recovery-golden.cjs` sobre o código do snapshot com **6 testes aprovados, 0 falhas**, cobrindo:

1. Níveis originais dos cinco conjuntos A–E;
2. translação exata da grelha para 80.000 USD;
3. distribuição nominal de 200/300/500 num orçamento de 1.000 USD;
4. preços médios históricos 82.000 / 77.005,08 / 71.079,09 e alvos 83.500 / 79.505,08 / 74.579,09;
5. separação entre piso de risco e níveis de compra;
6. discrepância diagnóstica do espaçamento V20 (240/1.200 USD), incluindo último nível de 76.640 USD.

Estes testes são **oráculos de regressão de preços e aritmética ilustrativa**, não integração ao vivo, nem backtest de lucro, nem validação da liquidação Kraken; não alteram o gerador atual.

## O que deve acontecer a seguir

- **R1, antes de mudar política:** construir na aplicação *Modo Clássico Demo* comparável ao *Modo C* e apresentar alternativas de escada `concentrada`, `histórica` e `ampla`, sem aplicar ou gravar a sugestão automaticamente; testar regras de piso e caixa/margem/quantização.
- **R2:** recuperar e reproduzir estudos de seis meses e a investigação de 2.040 configurações, separar mercados/proxies, mostrar ganhos **e** perdas, custos e teste fora da amostra; efetuar novo backtest reprodutível adequado ao contrato declarado antes de recomendar distribuição.
- **R3:** só após aprovação explícita da regra financeira alterar o planeador e integrar com o motor de risco único; não mudar historial factual.
- **R4:** recuperar o aspeto fiel da Demo e separar rascunhos sem prazo de revisões transacionais. Não desativar proteção contra dados obsoletos/concorrência.
- **R5:** ensaiar em conta QA e dispositivos, nunca usar operações particulares do proprietário nos testes.

**Sem publicação ou alterações financeiras em produção. O Bloco 12 permanece aberto.**