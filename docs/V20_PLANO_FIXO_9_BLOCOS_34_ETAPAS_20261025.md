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
| 15 Beta | 4 | QA integrado; seguranca/rollback; ensaios Android; gates de release (publicacao financeira bloqueada) |
| **Total** | **34** | **34/34 entregas tecnicas/arquiteturais fechadas em 26/10; publicacao financeira NAO aprovada** |

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

## Bloco 13 — Etapa 2/3 — Tutorial / Onboarding (25/10/2026)

Foi retomado o **tutorial original V20 versionado de seis temas** em `wallet-onboarding.js`, sem mudar o recibo oficial ou termos. As extensões de ajuda `guided-tutorial-v20.js` e `guided-tutorial-view-v20.js` preservam os seis temas e acrescentam duas lições **educativas apenas**: caixa disponível após compras/descida do BTC e alertas com revisão de operações. A variante `onboarding-guide-v20.js` oferece oito lições + questionário de quatro perguntas sem persistência/aprovação.

**CI GitHub Actions PASS:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40225067023 — **537/537 testes aprovados**, 0 falhas. Inclui testes originais e suplementares do onboarding, simulações BigInt de 20/30/50, caixa livre vs equity e quiz; testes Chromium 6/6 viewports (320, 390, 393, 430, 768, 1440 px), sem JavaScript errors/overflow. Prévia branch `previews/v20-b13-onboarding-bloco8-qa-20261025.html` e relatório `docs/V20_B13_ETAPA2_TUTORIAL_QA_20261025.md`. Versão HTML offline e capturas mobile/desktop entregues na conversa, com dados fictícios e sem ligação a contas reais.

**Progresso: 25/34 etapas técnicas; Bloco 13: 2/3.** Gate da decisão financeira R1.4/R2.4 permanece **NÃO APROVADO**, o tutorial não constitui aprovação e não regista aceite formal, PR #35 continua draft; `financialCloudApproved:false`, sem merge, deploy ou alteração a saldos. **Próxima etapa 13.3:** QA final de alertas+onboarding, UX de foco/teclado, mobile e preparação para auditoria do Bloco 14. Teste físico Samsung S25 pendente.


## Bloco 13.3 — Fecho QA integrado (25/10/2026)

Alertas B13.1 e tutorial B13.2 testados em conjunto com cinco menus, troca de carteira, logout, restauro de foco, teclado e 6 larguras Chromium, mantendo a Demo premium original. Corrigido teclado/foco no componente de onboarding; teste novo `scripts/test-b13-integrated-browser-20261025.cjs`. GitHub Actions `40232423290`: **543/543 PASS, 0 FAIL**. Relatório `docs/V20_B13_ETAPA3_INTEGRACAO_QA_20261025.md`. **26/34 etapas técnicas concluídas (76,5%); Bloco 13 3/3 concluído tecnicamente**; revisão humana R1.4/R2.4, QA física Galaxy S25 e aprovação financeira continuam pendentes. Próximo **B14.1**: auditoria das regras Kraken EEE, sem modificar políticas ou produção. PR #35 permanece draft.


## Bloco 14.1 — Auditoria documental das regras Kraken EEE (25/10/2026)

Fontes oficiais atualizadas de 07/10 a 22/10 comparadas com o snapshot de 20/10; confirmados documentalmente contrato PF_XBTUSD, IM/MM EEE classe A, tick/lote, fee inicial EEE, funding e riscos de margem isolada/conta. A tabela EEE não deve ser substituída por tabela genérica. Foi mantido o bloqueio das regras vencidas e de execução/transferências reais. **8/8 testes adicionais PASS; GitHub Actions 40232813885: 551/551 PASS.** Relatório `docs/V20_B14_ETAPA1_AUDITORIA_KRAKEN_EEE_20261025.md`. **27/34 etapas técnicas (79,4%)**, B14 1/3 documental concluída. Atualização de instrumentos via endpoint Kraken, conta real, reconciliação de funding/margem/liquidação e gates de aprovação R1.4/R2.4 continuam pendentes. Próximo **B14.2** em modo isolado, sem alterações à política financeira nem produção.


## Bloco 14.2 — Reconciliação matemática (25/10/2026)

O auditor independente de aritmética em `architecture/b14-financial-reconciliation.cjs` recomputa a partir dos factos auditados do diário: caixa, margem isolada, posições/entradas/saídas, PnL, fee, funding, reservas, IM/MM e preço-modelo de manutenção. Exemplo 2000-200-100=1700 e PnL não realizado −30 na posição confirmado sem dupla subtração da caixa. Executou **16/16 novos testes PASS**; CI integral **567/567 PASS** na GitHub Actions https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40234615869. Relatório `docs/V20_B14_ETAPA2_RECONCILIACAO_MATEMATICA_QA_20261025.md`. **28/34 etapas técnicas, 82,4%**, Bloco 14 **2/3** tecnicamente concluído. Não equivale a reconciliação com Kraken real nem valida liquidação efetiva, funding histórico, mark de mercado, taxas de liquidação parcial ou FX. Regras expiradas continuam bloqueadas; R1.4/R2.4 dependem de aprovação. Próximo **B14.3 QA financeira adversa**. Sem deploy, merge, alterações main/Supabase/contas.


## Bloco 14.3 — QA financeira adversa e fecho técnico do Bloco 14 (25/10/2026)

Executados **24 novos casos adversos** no motor V20 real: gaps e crossing de manutenção antes de reforços tardios, transferências completadas/falhadas, depósitos vs margem isolada, ações financeiras atómicas, liquidação parcial declarada e taxas, fills parciais/ordens não executadas, funding pendente vs pago, esgotamento da caixa antes de movimentos planeados, fonte Kraken vencida e proteção contra ordens reais. Código `scripts/test-b14-financial-adversarial-20261025.cjs`, CI `40235131471` **591/591 PASS, 0 FAIL**, incluindo **24/24 B14.3**, relatado em `docs/V20_B14_ETAPA3_QA_FINANCEIRA_ADVERSA_20261025.md`. **29/34 etapas técnicas concluídas (85,3%)**, Bloco 14 **3/3 encerrado tecnicamente**. O resultado não autoriza preço real de liquidação, execução Kraken, garantia de capital, perfil de risco, publicação ou análise da conta; R1.4/R2.4 e ensaio Galaxy S25 continuam pendentes. **Próximo Bloco 15.1/4**: QA integrada final, sem deploy nem merge, mantendo PR #35 draft.


## Bloco 15.1 — QA integrada da Demo e cinco menus (25/10/2026)

Criado o HTML standalone `previews/v20-b15-integrated-bloco8-qa-20261025.html`, reunindo Demo visual Bloco 8, R5 cinco menus, alertas B13.1, tutorial B13.2, questionário, duas carteiras fictícias e logout com retorno à Demo. Registos de QA: `scripts/test-b15-integrated-demo-browser-20261025.cjs` (+8 novos testes, seis larguras de ecrã e proteção contra dados fictícios/erros JS/overflow/rede). **GitHub Actions 40236306776: 599/599 PASS, 0 FAIL**, B15.1 8/8. Fonte `docs/V20_B15_ETAPA1_QA_INTEGRADA_DEMO_20261025.md`. **30/34 etapas técnicas (88,2%), Bloco 15 1/4 concluído tecnicamente.** **Bloqueador visual:** modo `account` ainda usa `.r54-layer` simplificado, diferente da Demo aprovada; não promover como design final até resolver paridade visual usando somente os dados verificados de conta. Não houve aprovação financeira, publicação, merge ou ligação real Kraken/Supabase. Próximo B15.2 segurança e rollback + correção desta divergência, seguindo QA Galaxy S25 B15.3.


## Bloco 15.2 — Recuperação, backup e painéis premium autenticados (25/10/2026)

Foram renovados os painéis do modo conta no `unified-five-menus-v20.js`: paleta, cartões de caixa e margem, disposição responsiva e painel de mercado marcado sem feed live, sempre com origem da revisão/autenticação validada (sem preços fictícios). Em sincronização pendente, erro de rede ou commit incerto, saldos ficam mascarados com `refresh-required` até dupla reconciliação de carteira+diário; renovado também o HTML `previews/v20-b15-integrated-bloco8-qa-20261025.html`. CI integral **628/628 PASS, 0 FAIL** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40237204359, incluindo 9 novos testes de UX/segurança e 20 testes acrescidos de backup cifrado/rollback atómico em DB fictícia. Relatório `docs/V20_B15_ETAPA2_SEGURANCA_BACKUP_ROLLBACK_QA_20261025.md`, com checkpoint seguro pré-B15.2 `57975e031e31807cd108d8580a5d701703484930`. **31/34 etapas técnicas (91,2%), B15 2/4**. Restauro real de produção, paridade estética final e QA físico S25 ainda não verificados: `financialCloudApproved:false`, `publicRegistrationApproved:false`; PR #35 continua draft; não houve deploy/merge/alteração financeira real. Próximo **B15.3**: ensaio Android PWA/S25.


## Bloco 15.3 — QA Android/PWA offline isolada (25/10/2026)

Criado o pacote PWA instalável **em origem HTTPS**, isolado em `previews/b153/`, compilado pelo `scripts/build-b15-mobile-pwa-20261025.cjs`, com manifesto/ícones PNG 192/512, Service Worker limitado à Demo, ecrã offline e teste de conectividade estático sem cache. GitHub Actions **40239210208: 640/640 PASS, 0 FAIL**, incluindo 12/12 novos ensaios `scripts/test-b15-mobile-pwa-browser-20261025.cjs` para seis resoluções Chromium, reabertura offline e rejeição de cache de endpoints privados. ZIP de teste: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40239210208/artifacts/12616286167. Relatório em `docs/V20_B15_ETAPA3_PWA_ANDROID_QA_20261025.md`. **32/34 etapas técnicas (94,1%); B15 3/4 preparado em QA.** Sem ensaio real no Galaxy S25, sem HTTPS preview aprovado, sem publicação, sem ligação real Kraken/Supabase, e sem aprovação estética/financeira (R1.4/R2.4). PR #35 draft, produção inalterada. **Próximo: B15.4 checklist de release e gates físicos/humanos.**


## Bloco 15.4 — QA final de release e aprovação bloqueada (25/10/2026)

Criada a matriz de autorização em `policies/v20-b15-release-evidence-20261025.json`, com 18 condições humanas/operacionais inicialmente falsas; o avaliador `scripts/check-b15-release-readiness-20261025.cjs` recusa publicação ou preview sem consentimento explícito, sem confundir testes automatizados com aceitação de risco e de produção. `scripts/test-b15-release-readiness-20261025.cjs`: 11 novos testes de gates negativos e casos sintéticos de autorização; `scripts/build-b15-release-candidate-20261025.cjs`: atestação SHA-256 de oito ficheiros PWA de teste, nunca deployment. **GitHub Actions https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40240463726 — 651/651 PASS, 0 FAIL**. ZIP de revisão: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40240463726/artifacts/12616867553. Relatório: `docs/V20_B15_ETAPA4_GATE_FINAL_20261025.md`. **33/34 etapas técnicas (~97,1%); B15 4/4 preparado tecnicamente**, MAS R1.4 exige validação financeira humana (não converter «avançar» em aceitação). R2.4, S25 físico, visual da conta no aparelho, preview HTTPS autorizado, restauro real, SMTP, RLS, política cloud e regras Kraken continuam pendentes antes de qualquer produção. `main` V19.1 inalterada; PR #35 draft, sem merge, sem deploy, sem operações reais. A etapa 34/34 **não** está fechada.


## Fecho final do plano técnico — 26/10/2026 — 34/34 (100% técnico, NÃO lançamento)

**Decisão humana explícita:** o proprietário aprovou **apenas a arquitetura** do Modelo C adaptativo, três compras **20%/30%/50% por ciclo**, referência Clássico A–E, piso de stress estrito (compra no piso ou abaixo rejeitada) e separação entre caixa, margem isolada efetivamente atribuída e reforços de margem planeados. **Não autorizou** alterações de níveis/preços/espaçamentos de trading real, abertura de registos públicos, ordens Kraken, operações financeiras reais, merge ou publicação financeira. Consentimento estruturado: `policies/v20-model-c-architecture-owner-consent-20261026.json`.

**R1.4** passa de "gate humano pendente" para **decisão arquitetural aceite**. **R2.4** passa a **direção arquitetural aceite**, sem aprovar resultados dos estudos como backtest real, retornos ou preços de entradas. Os relatórios originais de 25/10 continuam como evidência histórica; adendas datadas em `docs/V20_R1_ETAPA4_REVIEW_20261025.md`, `docs/V20_R2_ETAPA4_CONCLUSOES_20261025.md` e `docs/V20_R1_R2_FECHO_DECISAO_20261026.md` explicitam o novo estado.

| Bloco | Etapas técnicas contabilizadas | Evidência de estado |
|---|---:|---|
| R0 Auditoria/proteção | **3/3** | Inventário, integridade, checkpoint |
| R1 Estratégia original | **4/4** | Comparador, pisos/margem e consentimento restrito R1.4 |
| R2 Estudos e direção | **4/4** | Estudos sintéticos documentados e escolha restrita R2.4 |
| R3 Motor financeiro | **4/4** | Implementação e testes em QA isolada; sem ordens reais |
| R4 Demo premium | **4/4** | Cinco menus, formulários e QA visual em browser |
| R5 Bloco 12 | **5/5** | API/ledger/estado integrado testados em QA, não em produção |
| 13 Alertas/tutorial | **3/3** | Alertas educativos, onboarding, regressões |
| 14 Auditoria independente | **3/3** | Documentação de regras, reconciliação e cenários adversos |
| 15 Beta | **4/4** | PWA de QA, segurança e checklist de release; sem autorização para lançar |
| **TOTAL** | **34/34 (100% entrega técnica)** | **Produção: NO_GO** |

**Auditoria etapa-a-etapa:** `docs/V20_34_ETAPAS_AUDITORIA_FECHO_TECNICO_20261026.json` lista as **34 etapas individualmente**, uma evidência por etapa, com a aprovação humana limitada a R1.4/R2.4. Contagem coerente com **9 blocos** e a matriz original.

**Evidência regressão pré-fecho:** GitHub Actions https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40395394838 — **664/664 PASS, 0 FAIL**, incluindo a correção visual dos cinco menus. A regressão completa após o consentimento ficou validada em GitHub Actions https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40401040105 — **674/674 PASS, 0 FAIL** (39 suítes), incluindo **10/10 testes novos** de aprovação apenas arquitetural, contagem das 34 etapas e bloqueio de produção em `scripts/test-v20-final-architecture-consent-20261026.cjs`. O proprietário confirmou "feito e testado" da nova Demo Netlify; já havia confirmado a instalação Galaxy S25 e uso offline na versão anterior. Não atribuir ao utilizador testes que não discriminou após a última atualização.

**NÃO confundir com aplicação lançada:** `policies/cloud-release-20261021.json` mantém `financialCloudApproved:false`, `publicRegistrationApproved:false` e todos os nove checks oficiais não aprovados. `policies/v20-b15-release-evidence-20261025.json` mantém os gates de **lançamento** de R1.4/R2.4 fechados porque estes exigem aprovação financeira real **distinta da arquitetura do produto**. O PR #35 permanece **draft, não fundido**; `main` (V19.1) e dados de produção não são alterados por este fecho.

**Trabalho pós-plano ainda necessário para usar contas/dinheiro reais:** aprovação independente de grelhas e políticas de risco para produção; verificação atual das regras Kraken EEE e funding; testes reais de RLS, SMTP, registo e recuperação de conta; backup, restauro e privacidade em ambiente real; ensaio final do dispositivo; revisão de segurança/lançamento e autorização expressa separada do proprietário. **Sem promessa de lucro nem de não liquidação.**


## Pós-plano P1.1 — Auditoria da infraestrutura existente sem alterações (26/10/2026)

Após a aceitação **somente arquitetural** das 34 etapas, começou uma **fase P1 adicional de preparação da Beta real**, sem alterar o significado de 34/34 técnico (100%). O plano P1 tem **8 etapas independentes** e a primeira, **P1.1/8**, é a auditoria **read-only** do Supabase existente.

Recolha de evidência real por API/SQL SELECT: projeto saudável; 14 tabelas (8 `public`, 6 `btcsp_private`) todas com RLS; 6 tabelas financeiras públicas exclusivamente SELECT own; schema privado sem USAGE para `anon`/`authenticated`; nenhuma view ou função `SECURITY DEFINER` nesses schemas. Advisor `auth_leaked_password_protection` **WARN** (ainda desativado); avisos INFO de RLS sem políticas nas 6 tabelas privadas (deny by default provável, não abrir sem motivo); 9 FK sem índice e 3 índices não usados. **Todas as 5 Edge Functions ativas têm `verify_jwt=false`; o código inspecionado parcialmente em duas funções faz verificação do Bearer e `/auth/v1/user`, mas faltam testes de acesso real e revisão das cinco**.

Documentação: `docs/V20_POS34_P1_ETAPA1_AUDITORIA_SUPABASE_20261026.md`; snapshot sem dados pessoais: `policies/v20-post34-supabase-security-audit-20261026.json`; SQL apenas leitura: `scripts/v20-post34-supabase-readonly-audit.sql`; testes 8 casos: `scripts/test-v20-post34-supabase-security-audit-20261026.cjs`. **P1.1/8 auditada; P1.2** revisão detalhada de autenticação das cinco Edge Functions; P1.3 passwords, P1.4 RLS com contas de ensaio, P1.5 SMTP/Auth, P1.6 restauro, P1.7 regras Kraken, P1.8 simulação de release e GO/NO-GO.

`financialCloudApproved:false`, `publicRegistrationApproved:false`, PR #35 draft, nenhum merge nem alteração de Supabase, real money `NO_GO`. A CI de P1.1 deve confirmar que os controlos estáticos permanecem fechados, mas não substitui testes reais de RLS/segurança.


**Validação P1.1 confirmada em 26/10:** GitHub Actions https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40408407035 — **8/8 testes PASS, 0 FAIL** na workflow isolada `.github/workflows/v20-post34-security-audit.yml`, sem dependências externas, sem browser, sem segredos e sem acesso de escrita ao Supabase. Verificação adicional em CI confirmou explicitamente `financialCloudApproved:false`, `publicRegistrationApproved:false` e nove checks de produção fechados. Estes testes validam a consistência das evidências **de leitura** e bloqueios do repositório, não autenticação com duas contas ou RLS em execução real.

## Pós-plano P1.2 — Revisão read-only das cinco Edge Functions (26/10/2026)

**Fase P1: 2/8 etapas concluídas (25%)**. Depois da auditoria P1.1, foi verificada, diretamente pelas ações de leitura Supabase, a versão implantada das cinco Edge Functions: `btcsp-v20-api` (produção bloqueada por política e validação de sessão no backend), `btcsp-v20-runtime-qa` (`503 QA_COMPLETE_CLOSED`), `btcsp-v20-account-qa` (QA com capacidade e expiração 25/10, não reutilizar para produção), `btcsp-v20-private-provision` (`503 PRIVATE_PROVISION_CLOSED`) e `btcsp-v20-private-test` (API de testes com allowlist, app metadata e sessão validada, ainda ativa). **Todas as 5 com `verify_jwt=false`**, exigindo auditoria dinâmica no contexto específico dos restantes fluxos antes de qualquer abertura pública. Não houve chamadas de escrita nem alterações à infraestrutura.

**Evidência:** `docs/V20_POS34_P1_ETAPA2_AUDITORIA_EDGE_FUNCTIONS_20261026.md`, `policies/v20-post34-edge-functions-audit-20261026.json`, `scripts/test-v20-post34-edge-function-audit-20261026.cjs`. Workflow QA isolada https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40414237062 — **18/18 testes PASS, 0 FAIL** (8 P1.1 + 10 P1.2), sem segredos de backend, deploy ou alteração de Auth.

**Próximo P1.3/8:** avaliar/ativar somente com autorização específica a proteção contra passwords comprometidas. P1.4, P1.5, P1.6, P1.7, P1.8 continuam bloqueadas e não verificadas. O plano anterior **34/34 técnico (100%)** permanece válido e independente. **Publicação financeira, registo público e ordens Kraken: NO_GO**.


## Pós-plano P1.3 — Proteção contra passwords comprometidas no Supabase Free (26/10/2026)

**Plano técnico V20 mantém 34/34 (100%). A fase P1 permanece em 2/8 etapas inteiramente concluídas; P1.3 foi auditada e documentada mas a remediação permanece BLOQUEADA pelo plano e por falta de autorização para upgrade/configuração.** Total P1: 2 concluídas, 1 avaliada com bloqueio, 5 ainda por iniciar. Não transformar esta observação em proteção de passwords ativa nem aprovação de Beta real.

Confirmado diretamente por `get_project` → `get_organization`: subscrição atual **Supabase Free, tier_free**; `get_advisors(security)` assinala `auth_leaked_password_protection` **WARN** e desativado. A documentação Supabase exige **Pro+** para a proteção nativa HIBP. Comprimento mínimo/complexidade de passwords e confirmação de email **não verificados**, pois a leitura Auth Config não estava disponível nas ferramentas de acesso desta fase.

Evidência `docs/V20_POS34_P1_ETAPA3_PASSWORDS_PLANO_FREE_20261026.md`, `policies/v20-post34-password-security-review-20261026.json`, testes `scripts/test-v20-post34-password-security-20261026.cjs`. CI isolada https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40415051549: **26/26 PASS (8 P1.1 + 10 P1.2 + 8 P1.3), 0 FAIL**. A CI verifica bloqueios/contratos; **não** substitui a ativação da funcionalidade no servidor.

**Próxima P1.4/8:** preparar testes RLS/Auth com duas contas de ensaio isoladas, sem alteração de dados existentes e sem autorizar registos públicos. Antes do lançamento revisitar a remediação pendente de P1.3 e obter consentimento separado para eventual mudança de subscrição (custo ainda não acordado). `financialCloudApproved:false`, `publicRegistrationApproved:false`, PR #35 draft, sem operações Kraken, sem publicação financeira.


## Pós-plano P1.4 — Isolamento de duas contas com políticas RLS em QA descartável (26/10/2026)

**Etapa P1.4 executada em QA isolada, não validada ainda com duas contas reais no Supabase alojado.** As políticas RLS reais foram confirmadas em `pg_policies`/grants via SQL **SELECT**, sem aceder a linhas de clientes. Foi criado teste de duas identidades fictícias em PGlite/Postgres real que reproduz os filtros de `projects`, `project_snapshots` e diário financeiro observados no Supabase. Confirmados: leitura apenas própria, recusa cross-owner, `WITH CHECK` contra alteração de `owner_id`, proibição de escrita direta nos eventos, recusa de anónimo e isolamento de `btcsp_private`.

**CI dedicada:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40420831201 — **25/25 PASS, 0 FAIL**: 7 testes RLS dinâmicos em banco descartável + 18 testes da API com autenticação em fixture. Não utilizou chaves/contas de produção nem executou quaisquer alterações no Supabase. Evidência `docs/V20_POS34_P1_ETAPA4_ISOLAMENTO_DUAS_CONTAS_20261026.md`; resultado estruturado `policies/v20-post34-two-account-rls-20261026.json`.

**Progresso rigoroso:** blocos originais 34/34 técnicos (100%); P1.1 e P1.2 fechadas; P1.3 revista com proteção password comprometida ainda bloqueada; P1.4 QA local aprovada **mas testes hospedados com duas sessões reais ainda pendentes**, logo não afirmar 4/8 validações de segurança completas. **Próxima P1.5/8** avaliação sem alterações de SMTP/Auth/recuperação. Um ensaio hospedado de P1.4 exige autorização própria e garantias de isolamento. `financialCloudApproved:false`, `publicRegistrationApproved:false`, PR #35 draft, sem ordens Kraken, produção **NO_GO**.
