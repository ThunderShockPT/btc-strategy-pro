# BTC Strategy Pro — Plano fechado (25-10-2026)

**9 blocos, 34 etapas.** Percentagens baseadas em etapas e nao em volume de codigo. Projeto e dados existentes preservados. Source checkpoint: `checkpoint/v20-before-strategy-recovery-20261025`. Trabalho isolado: `audit/v20-strategy-recovery-20261025`.

| Bloco | Etapas | Etapas / gate |
|---|---:|---|
| R0 Auditoria/protecao | 3 | Inventario; integridade; checkpoint. **Concluido** |
| R1 Estrategia original | 4 | 1) Testes historicos A-E **feito**; 2) comparador interativo **teste pronto**; 3) caixa/margem/ticks/piso; 4) revisao do utilizador |
| R2 Estudos de lucro | 4 | Inventario historico; reproducao; stress/walk-forward; selecao de criterios |
| R3 Motor financeiro | 4 | Politica aprovada; planejador; riscos/caixa/diario; regressao |
| R4 Demo e expiracao | 4 | UI 5 menus; formularios; rascunhos sem expiracao e revisoes seguras; QA visual |
| R5 Fecho Bloco 12 | 5 | Conta e backend; execucoes e importacao; privacidade e restauro; carga; QA alojada e mobile |
| 13 Alertas/tutorial | 3 | Alertas; onboarding; QA |
| 14 Auditoria independente | 3 | Regras Kraken; reconciliacao formulas; QA financeira |
| 15 Beta | 4 | QA integrado; seguranca/rollback; S25; aprovacao e publicacao |
| **Total** | **34** | **R0 3/3; R1 2/4 tecnicamente implementada, pendente de avaliacao do utilizador** |

## Como trabalhar

Antes de cada entrega anunciar **Bloco X — Etapa Y/Z**. No fim declarar branch/commit, mudancas efetivas, testes (local/alojado/telefone fisico), demo para testar, erros e proxima etapa. Fechar bloco so apos regressao automatica e avaliacao do utilizador; nao mascarar regressao com subdivisao de blocos. Nao alterar producao, dados do proprietario, politicas financeiras, Kraken ou Supabase sem necessidade e autorizacao. Sem garantias de lucros ou liquidacao.

## R1 — Etapa 2

O comparador standalone HTML foi criado e testado localmente. Modos: V20 base (0,3%/1,5%, sem piso automatico e sem eventual ajuste por volatilidade); Demo A-E (1000/8000 USD); terceiro modo experimental (1500/7000 USD). Dados manuais, sem login, ordens, gravacao de plano ou expiracao; cada grelha e comparacao, nao recomendacao. Passaram **10/10 testes matematicos Node** e **6/6 larguras browser Chromium (320/390/393/430/768/1440 px)**, sem erro JavaScript nem overflow horizontal, incluindo alteracoes de modo/perfil/referencia. A QA fisica S25 nao foi feita. Proxima etapa: R1.3, verificar restricoes de carteira/margem/tick e piso antes de qualquer alteracao ao motor ativo.

## Ponto de situação de 25/10 — R1, etapa 3/4

Etapa R1.3 entregue como laboratório HTML offline, com quantização de 0,0001 BTC, validação de preços estritamente acima do piso, margens/reservas de stress ilustrativas e cenários de fills. Evidência: `previews/v20-r1-capacity-20261025.html`, `scripts/test-r1-capacity-20261025.cjs` e `docs/V20_R1_ETAPA3_CAIXA_MARGEM_QA_20261025.md`. Testes da entrega local 12/12 Node e 6/6 viewports Chromium aprovados. **6/34 etapas técnicas implementadas (R0 3; R1 3)**, não equivale a aprovação do proprietário ou validação financeira real. R1.4 (avaliação humana) permanece pendente; o Bloco R1 ainda está aberto.

## Ponto de situação de 25/10 (11h) — R1.4 / R2.1

- R1.4 revisão técnica realizada: 28/28 verificações Node em execução separada (6 + 10 + 12). O **gate de aceitação do proprietário e a escolha da política financeira permanecem abertos**; não marcar R1 como aprovado financeiramente por simples «avançar». Ficheiro: `docs/V20_R1_ETAPA4_REVIEW_20261025.md`.
- R2.1 inventário e qualificação das fontes históricas concluídos: `docs/V20_R2_ETAPA1_INVENTARIO_ESTUDOS_20261025.md`. Trade log #1820 preservado em `research/r2/legacy-simulated-1820-trades-20261025.csv` e auditor de aritmética em `scripts/check-r2-legacy-evidence-20261025.py`.
- Resultado histórico #1820: sete operações simuladas, quatro positivas, três negativas, total +1.186,34 USD; custo/juros do CSV arredondado difere do relatório por 0,01 USD cada. Estudo Spot Margin não determina Kraken Futures.
- Revisão anual mostra que lucro teórico de estratégia Kraken Cross/ignorando liquidação não vale como lucro realizável em Isolated 10x. As cifras de +412,32/71 ciclos e +513–562 ainda não têm proveniência reconstituída neste inventário.
- Contagem de etapas: **7 etapas confirmadas tecnicamente (R0.1–0.3, R1.1–1.3, R2.1), mais R1.4 preparado mas a aguardar revisão humana**. R2.2 é próximo objetivo de trabalho, em branch isolada; sem deploy, mudanças de política, migrações ou alterações de conta.

## Progresso de 25/10 — R2, etapa 2/4

Verificação da reprodução dos registos históricos feita com **12/12 testes offline**. Evidência versionada: `docs/V20_R2_ETAPA2_REPRODUCAO_HISTORICA_20261025.md`, `scripts/test-r2-reproduction-20261025.py` e os 3 ficheiros `research/r2/` (código histórico, CSV histórico e snapshot do XLSX). Reprodução aritmética, **não** backtest integral com OHLC/mark/funding nem aprovação de lucro Kraken. R1.4 continua dependente de revisão humana. **8/34 etapas técnicas confirmadas** (R0.1–3, R1.1–3, R2.1–2); a R2.3 é a próxima. Nenhuma alteração a carteira, políticas Beta, main ou produção.

## R2 — Etapa 3/4 concluída tecnicamente (25/10)

Laboratório comparativo sem trading concluído: **120 cenários sintéticos** em matriz 3 grelhas × 4 capitais (1000/1500/2000/2500 USD) × 5 trajetórias × 2 modos de margem. Comparação com 5 ciclos × 1000 USD nominais, 20/30/50, 10× isolado; taxa taker 0,05%, manutenção ilustrativa 5%, funding hipotético explicitado. No cenário 80k→60k→85k e carteira de 2000 USD, V20 concentrada apresenta perda teórica ao fundo de -1143,27 USD e margem necessária de 1372,35 USD; A–E apresenta -516,90 USD e 779,45 USD respetivamente, mas a A–E infringe a regra atual do piso (uma entrada a 60k). Nem ganhos contrafactuais nem estado "resiste no modelo" demonstram sobrevivência Kraken real.

**QA:** 26/26 verificações Python e 6/6 larguras Chromium (320/390/393/430/768/1440), sem erros JS/overflow, exportação CSV aprovada. Relatório `docs/V20_R2_ETAPA3_COMPARACAO_QA_20261025.md`, prévia `previews/v20-r2-synthetic-comparison-20261025.html`, dados `research/r2/r2-stage3-synthetic-matrix-20261025.csv`. O pacote de conversa contém também motor Python e testes originais para reprodução offline.

**Contagem:** 9/34 etapas técnicas concluídas (R0 3, R1 3, R2 3), com gate humano R1.4 pendente. Próxima etapa **R2.4** sintetizar critérios, apresentar alternativas e obter validação; ainda NÃO aprovar nem aplicar política financeira. Sem publicação, migração ou alterações à carteira do proprietário.

## R2 — Etapa 4/4: síntese técnica e painel de decisão (25/10)

- Comparação de três grelhas, 120 cenários e resultados das investigações antigas documentada em `docs/V20_R2_ETAPA4_CONCLUSOES_20261025.md`. Nenhuma grelha de compra foi aprovada para alterar o motor.
- Painel HTML autónomo `previews/v20-r2-strategy-decision-20261025.html`: carteira/trajectória/margem, três grelhas, estados diferenciados e proposta copiável. Não tem ligação a conta ou corretora.
- QA em `docs/V20_R2_ETAPA4_QA_20261025.md`: **15/15** testes aritméticos de evidência e **6/6** tamanhos Chromium (320/390/393/430/768/1440) com alterações de controlos e sem erros/overflow. Fonte do teste em `scripts/test-r2-strategy-decision-20261025.py`.
- **10/34 etapas com entrega técnica** (R0.1–3, R1.1–3, R2.1–4), **duas avaliações humanas pendentes**: aceitação R1.4 e direção/política financeira R2.4. R2 não equivale a backtest Kraken real (faltam mark/funding/ordens e liquidação cronológica).
- **R3.1 é o próximo bloco técnico permitido em modo apenas de conceção e testes**. Não alterar `policies/profiles-beta-20261021.json`, `risk-profiles.js`, `cycle-planner.js`, autenticado, produção ou carteiras até decisão financeira explícita e verificações.

## R3.1 — Etapa técnica concluída em 25/10

Contrato apenas de comparação em `architecture/strategy-comparison-contract.cjs`, com 18 testes locais aprovados (`scripts/test-r3-strategy-contract-20261025.cjs`). Código e testes versionados na branch isolada. As políticas V20, carteiras e produção não foram modificadas. 11/34 etapas técnicas implementadas. A validação humana de R1.4 e R2.4 continua pendente; próximo trabalho: R3.2, pré-visualização e validação integrada sem alterações financeiras ativas. Relatório: `docs/V20_R3_ETAPA1_ARQUITETURA_QA_20261025.md`.

## R3.2 — Validação de níveis, lotes e regras Kraken (25/10)

O adaptador read-only `architecture/strategy-preview-bridge.cjs` integra o contrato R3.1 com o módulo V20 `kraken-rules.js` (`validateOrder`, `assess`), quantiza nominal para lotes executáveis e bloqueia preços iguais/inferiores ao piso. Os **19/19 testes Node** passaram em ambiente local; navegador Chromium **6/6 tamanhos** (320–1440 px) aprovado, sem erros JS/overflow. HTML offline e pacote de testes entregues ao proprietário na conversa; relatório `docs/V20_R3_ETAPA2_VALIDACAO_DE_ORDENS_QA_20261025.md`.

A fotografia das regras é antiga (`STALE_RULES`), impedindo avaliação financeira. Dependência `decimal.js` ausente no ambiente offline impede executar o motor V20 completo; testes do encaminhamento usam stub e não validam liquidação. **12/34 etapas técnicas entregues**, R3 2/4. Gates R1.4 e R2.4 do proprietário pendentes. Próxima R3.3: integração do motor financeiro em ambiente com dependências e testes de trajetórias, sem mutações à produção.

## R3.3 — Testes adversos preparados, execução total pendente (25/10)

Reexecutados **55 testes** na sessão (R3.1: 18, R3.2: 19, regras Kraken: 18), **55 aprovados, 0 falhas**. Preparados e versionados **14 novos testes** para o motor V20 real, em `scripts/test-r3-risk-paths-20261025.cjs`. Apenas sintaxe validada no ambiente local, **não reportar estes 14 como aprovados**. A dependência `decimal.js` não está instalada e o npm está indisponível (`EAI_AGAIN`). Código preservado em GitHub e ZIP; relatório `docs/V20_R3_ETAPA3_ENSAIOS_RISCO_20261025.md`. Instruções de repetição: `npm ci --ignore-scripts; node --test scripts/test-r3-risk-paths-20261025.cjs`. A política financeira, main, produção e carteiras continuam intactos. **Contagem mantém-se 12/34** enquanto R3.3 aguarda testes reais; só então avançar para R3.4. Gates R1.4 e R2.4 continuam pendentes.
