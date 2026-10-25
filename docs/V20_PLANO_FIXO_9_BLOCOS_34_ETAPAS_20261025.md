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

## R3.3 tecnicamente concluída — CI real 25/10

A Etapa R3.3 passou em GitHub Actions com `decimal.js 10.6.0` fixado e Node 24: **189/189 testes aprovados**, incluindo **14/14 novos testes adversos** do motor financeiro V20. Execução verificada: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40200460740. PR draft #35 exclusivamente para QA, não integrar automaticamente. Os dois primeiros erros eram apenas pressupostos errados dos novos testes (funding parcialmente pendente e nome do erro de regras desatualizadas); foram corrigidos nos testes, **sem alteração dos motores financeiros ou dos dados**. Relatório: `docs/V20_R3_ETAPA3_ENSAIOS_RISCO_20261025.md`.

**Progresso: 13/34 etapas técnicas concluídas; R3.4 é a próxima etapa**, destinada ao fecho técnico do Bloco R3 e teste funcional. R1.4/R2.4 continuam pendentes da avaliação e escolha financeira do proprietário; a nova política financeira não está aprovada nem publicada.

## R3.4 — Fecho técnico (25/10/2026)

R3 etapa 4/4 executada com o motor financeiro real V20 no GitHub Actions: **203/203 testes aprovados** em https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40201612516 (14 novos cenários R3.4, além dos 189 já validados em R3.3). Dependência `decimal.js@10.6.0` confirmada. Laboratório HTML autónomo `previews/v20-r3-functional-demo-20261025.html` validado novamente em 6 resoluções Chromium com mudança de modo, margem e revisão, zero erros/overflow. Relatório `docs/V20_R3_ETAPA4_FECHO_TECNICO_20261025.md`.

**Contagem: 14/34 etapas com entrega técnica. R3 tecnicamente fechado, mas aprovação funcional do proprietário pendente.** R1.4/R2.4 continuam por validar antes de qualquer alteração à política financeira. PR #35 permanece draft, sem merge, deploy, migração ou alterações à produção/contas.

**Próximo bloco: R4 1/4**, recuperar a interface da Demo histórica (cinco menus e gráficos), sem impor layouts cloud genéricos e com checkpoints visuais/testáveis.

## Feedback do proprietário R3.4 — caixa e compras futuras (25/10/2026)

O proprietário validou visualmente 20/30/50, entrada no piso bloqueada e caixa vs margem, mas **rejeitou aprovação financeira definitiva** e pediu uma apresentação com **um único valor principal de caixa disponível** e cálculo dinâmico da capacidade de compra após operações anteriores e desvalorização BTC.

Foi entregue um módulo **apenas de QA, sem escrita** em `architecture/next-buy-capacity.cjs`: usa o motor V20 real para calcular caixa livre, perda na posição ao nível seguinte, margem adicional necessária e estimativa de nominal executável, bloqueando quando a manutenção seria atingida antes da compra; o novo cálculo não desconta perdas não realizadas duas vezes da caixa. `scripts/test-next-buy-capacity-20261025.cjs`: 16/16 testes aprovados; conjunto completo de regressões **219/219**, https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40203983744, com `decimal.js@10.6.0`.

Requisito UX R4: cartão grande «Caixa livre estimada para novas compras» e estado por cada próxima compra (montante nominal, margem requerida, fees, caixa restante, bloqueios), mantendo detalhes contabilísticos em secção expansível. **NÃO sincroniza saldo Kraken**, não calcula poder de compra oficial nem garante que uma compra seja executável. A fonte de regras Kraken tem de ser atualizada antes de qualquer validação corrente.

Relatório detalhado: `docs/V20_R3_OWNER_FEEDBACK_CAIXA_COMPRA_DINAMICA_20261025.md`. Sem alteração da política financeira, sem merge/deploy/Supabase ou dados de utilizador. **14/34 etapas permanecem concluídas**; o feedback é correção da revisão R3 e será integrado visualmente em R4.1–R4.2; R1.4/R2.4 pendem aprovação explícita.

## R4.1 — Recuperação fiel da Demo Bloco 8 (25/10/2026)

Foi localizada a fonte histórica da **Demo Bloco8** (dashboard com candlesticks, radar de estratégias e cartões premium), distinta do ecrã de configuração simplificado da prévia V20. Restaurado o HTML visual em `previews/v20-r4-bloco8-faithful-home-20261025.html` com o cartão em destaque «Caixa livre estimada», detalhes financeiros expansíveis e prioridade da caixa antes do gráfico no telemóvel. Corrigido overflow de 320px já presente na Demo histórica. **6/6 viewports Chromium** passaram com inputs de cenário, zero erros JS e zero overflow; relatório `docs/V20_R4_ETAPA1_RECUPERACAO_VISUAL_QA_20261025.md`.

**Atenção:** o widget R4.1 demonstra a UI com números editáveis independentes do ledger real e usa simplificação de manutenção 5%; não é poder de compra Kraken nem integra compras da conta. **R4.2** deve ligar a Home ao motor V20 testado (caixa disponível por fase de compra, perdas isoladas, funding e bloqueios) e a navegação final; não publicar a prévia como app final. **15/34 etapas técnicas entregues**; gates de aprovação financeira R1.4/R2.4 pendentes. Sem merge, deploy ou alterações a contas.

## Bloco R4 — Etapa 2/4, Demo ligada ao motor V20 (25/10/2026)

A Demo Bloco 8, com gráficos e radar preservados, ganhou cálculo **real do ledger manual V20** no próprio HTML offline em `previews/v20-r4-bloco8-real-engine-ledger-20261025.html`. Não é a app autenticada. O painel destaca só **Caixa livre estimada** e permite abrir detalhes, registar **movimentos fictícios** (compra, venda, depósito, margem, taxas, funding) e obter capacidade por próxima entrada usando `financial-engine`, `position-risk` e `kraken-rules`. A caixa livre contabilística não é debitada novamente por perda isolada não realizada; a margem de stress pode impedir a compra mesmo com caixa positiva.

**QA:** seis larguras Chromium (320/390/393/430/768/1440), sequência de seis movimentos e de mark 100k→97k, compra/venda parcial, bloqueio de risco antes da entrada, reset; 6/6 PASS, 0 JS errors, 0 overflow. Três movimentos errados rejeitados sem tocar no saldo. Corrigido adaptador para aceitar a precisão de 24 casas decimais do motor; motor V20 original intacto. Detalhes: `docs/V20_R4_ETAPA2_MOTOR_REAL_CAIXA_QA_20261025.md`. A base tinha 219/219 regressões CI em execução anterior. Não claim que a nova UI já esteja em produção ou em CI.

**Limitações:** dados de diário local temporário, snapshot Kraken congelado em 20/10/2026, dados do gráfico/radar antigos ilustrativos e separados, sem Supabase / conta Kraken / dados reais ou garantia de execução/liquidação; sem alteração financeira aprovada. **16/34 etapas técnicas entregues**, gates R1.4/R2.4 ainda pendentes. Próximo: **R4.3**, cinco menus e UX da Demo.

## R4.3 — Navegação final de cinco menus concluída tecnicamente (25/10/2026)

Prévia autónoma em `previews/v20-r4-five-tab-bloco8-dashboard-20261025.html` implementa **Início | Estratégias | Mercado | Risco | Conta** em desktop/mobile, reaproveitando páginas e funções históricas da Demo Bloco8. Terminal de trading reside em Mercado; Diário de operações continua acessível por Estratégias e pela lateral no desktop. Gráfico de velas, radar, painel de caixa com motor V20 e movimentos fictícios mantidos. Avisos nas páginas deixam claro que os subsistemas antigos ainda **não são sincronizados** com o diário local V20 da Home.

**6/6 tamanhos Chromium QA** (320/390/393/430/768/1440): cinco menus, diário contextual, estados de navegação, um único painel visível por percurso, caixa inicial 1700 USD, PnL da queda separado da caixa, comissão de 50 USD diminuindo a caixa para 1650 USD e reset; **zero JS errors e zero overflow**. Report `docs/V20_R4_ETAPA3_CINCO_MENUS_QA_20261025.md`, scripts e screenshots anexos no pacote da conversa.

**Progresso: 17/34 etapas com entrega técnica** (R0 3, R1 3, R2 4, R3 4, R4 3); R1.4/R2.4 ainda pendentes de aprovação humana/financeira. **R4.4** seguirá com QA final de fidelidade visual e integração segura dos módulos; nenhum merge/deploy/alteração às contas, ao Supabase ou às políticas financeiras foi efetuado.

## R4.4 — Auditoria final técnica da Demo aprovada nos testes (25/10/2026)

Prévia final `previews/v20-r4-final-five-tab-audit-20261025.html`. **6/6 resoluções Chromium Playwright** (320/390/393/430/768/1440) aprovadas: cinco menus mais Diário, caixa 1700, comissão 50→1650, erro negativo rejeitado seguido de comissão válida 10→1640, preço inválido bloqueia valores antigos, correção recupera e reset→1700. **0 erros JS e 0 overflow**. Corrigido erro de numeração do diário após valor inválido e estado stale quando o motor não consegue recalcular. Histórico Demo e motor local V20 permanecem **separados**, com avisos explícitos e sem falsa sincronização.

**18/34 etapas técnicas produzidas (R4 4/4)**. O proprietário ainda não aceitou a versão final e assinalou **Decisão financeira definitiva NÃO APROVADA**; R1.4/R2.4 exigem avaliação e decisão expressa. Relatório `docs/V20_R4_ETAPA4_AUDITORIA_FINAL_20261025.md`. **Próximo: Bloco R5**, unificação segura do diário autenticado, backend e funcionalidades do Bloco12 na interface original, com testes completos. Continua sem merge, deploy, Supabase, alterações a carteiras ou mudança da política financeira ativa.

## R5.1 — Integração inicial de conta e diário autenticado (25/10/2026)

Verificadas em `oftzqqjbwonngubihrsd` as tabelas financeiras V20 existentes e **RLS ativada**, sem ler movimentos privados nem executar alterações. A arquitetura atual já possui `account-session-v20.js`, `cloud-client-v20.js`, API autenticada e motor `financial-engine.js`.

**Código novo:** `authenticated-dashboard-v20.js` — fonte única **somente de leitura** de dados da API V20 existente para os cinco menus (Início, Estratégias, Mercado, Risco, Conta), scope de owner/projeto/plano/revisão e identity remoto, limpeza de sessão, valores monetários reconstruídos do diário validado; compra/risco não aprovados com regras/quote stale. Testes `scripts/test-r5-authenticated-dashboard-20261025.cjs`: **18/18 casos**, suíte CI total **237/237 aprovados**, https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40209849132. Relatório `docs/V20_R5_ETAPA1_FONTE_UNICA_AUTENTICADA_QA_20261025.md`.

**Prévia de utilizador:** HTML da Demo Bloco8, entregue na conversa, com simulação de mudança entre contas fictícias A/B, estado stale e logout; seis viewports Chromium sem erros ou overflow. **Este painel de laboratório NÃO está ligado à conta real**, não substitui os restantes módulos e não indica saldos Supabase reais. R5.2 fará a ligação à UI autenticada real, revendo diferenças de planos e fontes, antes de qualquer dado live. Nenhum merge, deploy, alteração a conta ou política foi efetuado.

**19/34 etapas técnicas concluídas** (R0 3; R1 3; R2 4; R3 4; R4 4; R5 1). R1.4/R2.4 e aprovação financeira definitiva continuam pendentes.

## R5.2 — Login, seleção de carteira e indicadores financeiros ligados em QA (25/10/2026)

A infraestrutura original Supabase Auth + cliente cloud V20 + diário de eventos foi ligada na **branch isolada de recuperação** aos cinco menus através de `account-five-menu-bridge-v20.js` e `five-menu-financial-view-v20.js`. Foi mantida a autorização por proprietário, a escolha de carteira devolvida pela API, e a limpeza imediata de saldos em logout, mudança de conta ou leitura falhada. Todos os indicadores têm a mesma revisão de fonte; poder de compra Kraken e preço de liquidação oficiais **não** são inferidos do diário nem de regras antigas.

**CI GitHub Actions:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40212597186 — **265/265 testes aprovados**, zero falhas (18 testes de sessão/carteiras, 10 da apresentação e regressões anteriores). HTML de QA da Demo Bloco 8 `previews/v20-r5-login-wallets-qa-20261025.html` testado em seis larguras Chromium (320,390,393,430,768,1440) com duas **contas fictícias**, troca entre cinco menus, dados desatualizados e logout: 6/6 PASS, sem erro JS/overflow. Documentação `docs/V20_R5_ETAPA2_AUTENTICACAO_CARTEIRAS_QA_20261025.md`.

**Progresso 20/34 etapas técnicas entregues; R5 2/5.** A política `financialCloudApproved` permanece `false`, portanto a integração **não está ativa na aplicação pública** nem há ligação a carteiras reais no HTML offline. PR #35 continua draft; sem merge, deploy, migração, alterações a saldos ou aprovação financeira. Próximo: **R5.3**, revisão/validação/auditoria de operações através do fluxo autenticado já existente, preservando a Demo. R1.4/R2.4 pendentes de decisão explícita.

## R5.3 — Diário manual, correções append-only e confirmação auditada (25/10/2026)

`five-menu-journal-v20.js` disponibiliza na branch QA o fluxo existente **`AccountWorkflow.editMovement/editExecution → prepare → comparação autenticada → accepted:true + reviewHash exato → confirm → nova leitura`**. Operações já executadas e correções são preparadas e confirmadas explicitamente, com controlo de carteira/revisão, TTL e bloqueio de comandos incertos. Nenhuma escrita direta ou operação Kraken está exposta na nova interface. Testes específicos: `scripts/test-r5-journal-five-menu-20261025.cjs` (16/16), mais os testes originais de execução, correções e persistência.

**CI final:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40214643413 — **399/399 testes passaram**, sem falhas. Incluiu **18 testes da API autenticada em PGlite efémero e 24 de PostgreSQL nativo** no contentor temporário GitHub Actions: transações, concorrência, RLS, cópia e restauração. Sem acesso à base Supabase de produção. Demo de QA `previews/v20-r5-journal-review-demo-20261025.html` com dados fictícios, anulação preservando original e confirmação dupla: **6/6 ecrãs Chromium** (320–1440 px), 0 erros JS e 0 overflow. O HTML é um laboratório **não autenticado** e não sincroniza os saldos históricos da Home.

Relatório: `docs/V20_R5_ETAPA3_DIARIO_AUDITAVEL_QA_20261025.md`. **21/34 etapas técnicas com entrega; R5 3/5**. Gates financeiros R1.4/R2.4 **não aprovados**. `financialCloudApproved:false` preservado. PR #35 draft, sem merge, deploy, migração, alterações à carteira ou ordens. **R5.4**: ligar o diário autenticado aos menus finais com uma única fonte de saldos/posições, controlo de conflitos e QA de mobile.

## R5.4 — Cinco menus com uma única revisão autenticada (25/10/2026)

Criado o adaptador `unified-five-menus-v20.js`: Início, Estratégias, Mercado, Risco, Conta e Registos consomem exclusivamente a **mesma carteira UUID, a mesma revisão do diário e o mesmo `headHash` de estado V20**. O modo de conta oculta visualmente saldos/formulários históricos da Demo; o modo Demo preserva a identidade visual Bloco 8 com preços/gráficos ilustrativos. Divergências, falta de sessão, dados inválidos, comandos incertos e logout retiram todos os valores até reconciliação; sem trading ou escrita direta.

Bug de integração encontrado na primeira QA Chromium: a navegação antiga reconstruía o `innerHTML` de um menu, removendo o painel autenticado; **corrigido com reinserção segura do painel durante mudanças DOM**. O primeiro browser CI falhou 6/6, o final passou 6/6. Testes do motor e do backend sem regressões.

**GitHub Actions FINAL:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40217248802 — **427/427 testes aprovados, 0 falhas**, incluindo 22 novos testes de unificação e 6 Chromium (320,390,393,430,768,1440), 0 erros JS/overflow. Prévia integrada `previews/v20-r5-unified-five-menus-qa-20261025.html`; relatório `docs/V20_R5_ETAPA4_MENUS_UNIFICADOS_QA_20261025.md`. HTML offline de QA e ZIP anexados ao chat, sempre com carteiras **fictícias**.

**22/34 etapas técnicas concluídas; Bloco R5: 4/5.** R5.5 é a próxima. A política `financialCloudApproved:false` permanece intacta, a PR #35 mantém-se draft, sem merge/deploy, sem alterações ao Supabase de produção e sem acesso a conta Kraken. O proprietário **não aprovou** a decisão financeira definitiva (gates R1.4/R2.4); QA em Samsung S25 e aceitação visual/funcional ainda pendentes.

## R5.5 — Integração de ponta a ponta em QA isolado (25/10/2026)

Novo `five-menu-integrated-runtime-v20.js` utiliza a **mesma instância do cliente V20** desde `AccountSession` até `AccountWorkflow`, `five-menu-journal` e `unified-five-menus`. A factory normal mantém `financialCloudApproved:false` e bloqueia acesso financeiro público. Apenas os testes injetam `Session.createPrivateTest` com Auth/HTTP fictícios, sem credenciais e sem dados de contas reais.

**14/14 novos testes de integração** `scripts/test-r5-integrated-runtime-20261025.cjs` passaram no GitHub Actions https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40218096079: login, lista de carteiras, wallet A/B, caixa/margem, revisão, tentativa de movimento sem confirmação, rejeição de escrita pelo servidor de QA, troca de utilizador, logout e resposta tardia. Prévia HTML offline do proprietário `BTC_Strategy_Pro_R5_Etapa5_Teste_Integrado_20261025.html`: seis larguras Chromium (320–1440px), **6/6 verificações visuais por largura**, sem overflow ou erro JS. Relatório `docs/V20_R5_ETAPA5_INTEGRACAO_QA_20261025.md`.

**23/34 etapas com implementação técnica em QA; R5: 5/5 etapas técnicas trabalhadas.** Gate aberto: Samsung Galaxy S25 físico, autorização financeira expressa, regras Kraken atualizadas, segurança da cloud e aceitação do utilizador; **não significa aplicação já funcional em produção**. PR #35 draft, sem merge, deploy, alteração de saldos, conta Kraken ou Supabase. Próximo Bloco 13: preparação QA e revisão de publicação; não levantar `financialCloudApproved` sem autorização.

## Bloco 13 — Etapa 1/3 — Alertas (25/10/2026)

Correção de planeamento: a etapa 13.1 segue o **plano fixo do Bloco 13: 1) Alertas, 2) Onboarding, 3) QA**; publicação e rollback são parte do Bloco 15.

**Implementação real** em `financial-alerts-v20.js`, `financial-alerts-view-v20.js` e integração no `five-menu-integrated-runtime-v20.js`. Avisos PT-PT para regras/cotações desatualizadas, ausência de caixa livre, financiamento insuficiente da próxima compra, risco de manutenção **no cenário** antes do reforço, confirmação pendente e incompatibilidade de revisão. Exige carteira, revisão e hash do diário autenticado antes de usar dados financeiros. Sem push, emails, negociação ou taxas inventadas.

**QA GitHub Actions final:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40220638840 — **468/468 testes aprovados**, 0 falhas. Inclui 19 testes de alertas, 2 testes adicionais de ligação com o runtime R5 e 6 viewports Chromium B13.1 em 320/390/393/430/768/1440px, além das regressões V20 anteriores. Prévia branch `previews/v20-b13-alerts-bloco8-qa-20261025.html` e relatório `docs/V20_B13_ETAPA1_ALERTAS_QA_20261025.md`. Laboratório HTML offline/ZIP e screenshots mobile/desktop entregues na conversa, com valores explicitamente fictícios.

**24/34 etapas técnicas implementadas, B13 1/3.** A política financeira e registo público continuam desativados, os gates R1.4/R2.4 **NÃO APROVADOS**, PR #35 draft, main/Supabase/contas/produção intactos. QA físico Samsung S25 ainda pendente. Próxima **B13.2 — Onboarding/tutorial**; evitar prometer liquidação Kraken ou sinais automáticos.

## Bloco 13 — Etapa 2/3 — Tutorial interativo V20 (25/10/2026)

A versão V20 original já tinha **seis lições versionadas** em `wallet-onboarding.js`. Foram preservadas a versão e a validação do comprovativo. A etapa 13.2 acrescenta guia de **8 passos e 4 perguntas**, exemplos educativos de 20/30/50 e simulação de caixa versus equity isolada, sem autenticação, gravação de aceitação, ordens, alterações financeiras ou supor que uma perda não realizada é debitada duas vezes.

Código: `onboarding-guide-v20.js` integrado em `five-menu-integrated-runtime-v20.js` (ajuda no UI), `guided-tutorial-v20.js` e `guided-tutorial-view-v20.js` (reutilização explícita das seis lições oficiais e exemplos educativos exatos). Prévia `previews/v20-b13-onboarding-bloco8-qa-20261025.html` preserva a Demo premium Bloco 8. Relatório `docs/V20_B13_ETAPA2_ONBOARDING_QA_20261025.md`.

**CI FINAL:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40225067023 — **537/537 testes aprovados, zero falhas**, incluindo a suite antiga de onboarding, 15 testes do guia, 18 testes do catálogo/cálculos, **6/6 browser QA Chromium** em 320/390/393/430/768/1440 px e regressões financeiras/cloud/PostgreSQL completas. Corrigido um ID duplicado na prévia e dois pressupostos desnecessariamente rígidos nos testes. HTML offline/ZIP e screenshots entregues ao proprietário.

**Progresso: 25/34 etapas técnicas concluídas, Bloco 13: 2/3.** A decisão financeira definitiva permanece NÃO APROVADA, `financialCloudApproved:false` e `publicRegistrationApproved:false` mantidos; PR #35 draft, nenhuma mudança à `main`, contas reais ou produção. **Próximo B13.3 — QA integrada dos alertas e tutorial.** O Samsung S25 físico e a conta autenticada real ainda não foram testados, e o Bloco 14 fará revisão independente das regras Kraken e das fórmulas.
