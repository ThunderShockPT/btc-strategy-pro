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
