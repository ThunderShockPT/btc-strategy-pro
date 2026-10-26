# BTC STRATEGY PRO — Bloco R2, Etapa 4/4 — Proposta para validação

**Data:** 25-10-2026  
**Estado:** síntese técnica concluída; **aprovação financeira do proprietário pendente**.  
**Branch isolada:** `audit/v20-strategy-recovery-20261025` (não é a produção).  
**Fonte primária:** `docs/V20_R2_ETAPA3_COMPARACAO_QA_20261025.md` + matriz de 120 cenários, `docs/V20_R2_ETAPA2_REPRODUCAO_HISTORICA_20261025.md` + histórico A–E.  
**Restrição obrigatória:** a aplicação é um planeador/registo manual; não liga à Kraken, não executa ordens e não transfere margem.

## 1. O que sabemos com segurança

1. **A estratégia clássica aprovada na Demo** tem cinco conjuntos A–E, dotação nominal 20%/30%/50%; primeiras entradas a 1.000 USD de distância e reforços a 8.000 USD, no exemplo BTC 80k: A 80/72/64k, B 79/71/63k, C 78/70/62k, D 77/69/61k e E 76/68/60k. Alvos de venda ilustrativos: preço médio após fase +1,5/+2,5/+3,5k USD.
2. **A V20 Equilibrada Beta mantém parâmetros de 0,3% entre ciclos e 1,5% entre reforços** (a volatilidade poderá aumentar o espaçamento real). Na grelha base simplificada de 80k, as 15 entradas terminam em 76.640 USD, embora o piso de stress seja 60.000 USD. Isto é diferente do desenho clássico desejado.
3. **O piso de stress Equilibrado −20.000 USD não é a última compra obrigatória nem uma garantia de liquidação.** Margem inicial 10% do nominal não assegura proteção até ao piso. Caixa livre e margem isolada atribuída são distintas.
4. **Nenhum dos três desenhos está certificado para Kraken isolado 10x.** A grelha A–E transladada e a experimental colocam uma entrada *no* piso 60k, atualmente inadmissível pela política estrita. A V20 concentrada evita esse ponto, mas pode precisar de mais margem.
5. A investigação #1820 do modelo Spot Margin (2.040 configurações) produziu +1.186,34 USD em 7 negócios simulados, mas 0 negócios no intervalo final reservado para teste. As rentabilidades de trabalhos Kraken anteriores com liquidação são **não realizáveis na forma apresentada**. Não transpor esses retornos para o plano.

## 2. Comparação sob hipóteses iguais (não histórico real)

Cinco ciclos × 1.000 USD **nominais por ciclo**, capital da carteira 2.000 USD, BTC 80k→60k→85k, 10x isolado, todas as 15 compras preenchidas em níveis previstos, margem planeada e disponível no momento suposto, taxa taker ilustrativa de 0,05%, manutenção 5%, funding hipotético 0,01%/8h por 14 dias e caixa protegida 20%.

| Indicador | A–E original | V20 concentrada (simplif.) | Experimental dispersa |
|---|---:|---:|---:|
| Última entrada | 60.000 USD | 76.640 USD | 60.000 USD |
| Perda não realizada a 60k | −516,90 USD | −1.143,27 USD | −542,15 USD |
| Margem isolada **estimada** necessária | 779,45 USD | 1.372,35 USD | 803,06 USD |
| Orçamento total estimado, incluindo reserva | 1.181,93 USD | 1.774,83 USD | 1.205,53 USD |
| Lucro líquido hipotético após recuperação *se sobreviver* | +234,95 USD | +201,82 USD | +233,33 USD |
| Admissão piso estrito atual | Não (uma compra = piso) | Níveis acima | Não (uma compra = piso) |

*Lucros condicionais, não rentabilidade prevista; o modelo não calcula sequência temporal de possíveis liquidações. Mesmo a indicação “resiste no modelo” não prova sobrevivência numa exchange.*

**Outras trajetórias, mesmo capital / margem planeada:**

| BTC mínimo | A–E — margem requerida | V20 — margem requerida | Experimental — margem requerida |
|---|---:|---:|---:|
| 75.000 USD | 109,30 USD | 496,53 USD | 89,00 USD |
| 70.000 USD | 229,12 USD | 770,19 USD | 223,80 USD |
| 60.000 USD | 779,45 USD | 1.372,35 USD | 803,06 USD |
| 55.000 USD | 1.128,74 USD | 1.673,42 USD | 1.149,98 USD |

A 55k, a V20 concentrada necessitou de 2.075,91 USD **incluindo 400 USD de reserva** no exemplo, ultrapassando a carteira de 2.000 USD; nem a A–E nem a dispersa passam a regra atual do piso. Com *apenas* margem inicial de 10%, as três grelhas dão sinal de risco de liquidação no cenário estático a 60k, mesmo que haja caixa livre que nunca foi efetivamente transferida para margem isolada.

## 3. O que não está demonstrado

- **Não houve backtest histórico Kraken com dados brutos de mark/funding e sequências de execuções/ordens**. Os 120 cenários de R2.3 são sintéticos e com execução ao preço exato; não simulam gaps, filas, liquidações parciais, dimensão de ordem real, timing de transferências, slippage, nem a microestrutura.
- O cenário de recuperação até 85k só calcula saídas hipotéticas condicionais. Não comprova que uma posição sobreviveu antes disso. Resultados não servem para recomendar investimentos.
- O espaçamento experimental de 1.500/7.000 USD é alternativa de estudo, **não política aprovada** nem necessariamente melhor.
- A correção de uma compra exatamente no piso precisa de resolver o conflito por *posicionamento diferente das entradas ou uma zona sem compras*, nunca simplesmente desativar a regra estrita ou mudar o piso silenciosamente.

## 4. Proposta de arquitetura para Bloco R3 (sem aprovar preços de trading)

**Recomendação de produto, para avaliação:**

- Manter o **Modo Clássico A–E** integral como modo de referência e comparação, com os seus níveis, alvos de venda e lógica de médias; indicar claramente se não pode ser aplicado pela política atual.
- O **Modo C Adaptativo** deve separar os parâmetros `riskFloorUSD`, `buyLadderLowerBoundUSD`, `cycleFirstEntryGapUSD`, `withinCycleReinforcementGapUSD`, `maxCycles`, nominal, reserva de caixa e margem isolada realmente atribuída. Os perfis Seguro/Equilibrado/Arriscado escolhem o piso de stress, mas não uma grelha implícita incompreensível.
- Oferecer pelo menos três pré-visualizações *não executáveis*: referência A–E, V20 atual, e alternativa ajustável. A opção de simulação não altera o diário nem o plano guardado.
- Validar piso estrito, quantidade mínima e lotes, cash realmente disponível, proteção em cenário de *não chegada* dos reforços de margem e dados Kraken atualizados. Se inválido, mostrar causa e ação possível; jamais mostrar «lucro garantido».
- Separar **guardar rascunho (sem prazo frustrante)** de **confirmar uma alteração financeira persistida** (revisão com validade, revalidação de fontes e confirmação explícita).
- Restaurar visual da Demo original e formulários explicados em PT-PT; manter entradas manuais, PWA, diário de compras/vendas, PnL, correções e anulações auditáveis.

## 5. Decisões que exigem aprovação explícita antes de R3 alterar o motor

1. **Manter clássico A–E como modo sempre visível?** Sugestão de UX: sim, como referência, não como ordens automáticas.
2. **Como deve ser o modo adaptativo?** Manter V20 apenas para comparar / propor escada mais espaçada / permitir construir uma escada manual parametrizada. Não impôr valores de 1k/8k como novo padrão sem testar.
3. **Exigir compras estritamente acima do piso?** Sugestão de segurança: manter a regra e demonstrar os níveis proibidos; escolher novos níveis/intervalos com base em testes, sem vender o piso como proteção garantida.
4. **Como gerir margem?** Mostrar caixa e margem isolada reais separadas; simular reforços futuros, mas no gate estrito rejeitar caminhos que dependam de reforços não efetuados para sobreviver.
5. **Quando apresentar lucros?** Apenas projeções explícitas condicionais com custos, perdas, falhas e pressupostos, nunca metas garantidas. O Modo Clássico e o C podem coexistir para comparação.

**Próximo passo sugerido:** R3/Etapa 1/4 pode preparar esquema e testes em branch isolada **sem mudar valores financeiros**; só alterar algoritmo/calibração ativa com decisão explícita do proprietário. R1/Etapa 4 e o fecho financeiro de R2 requerem a avaliação do proprietário no comparador.

## 6. Critérios de conclusão dos Blocos R1 e R2

- R1: a grelha recuperada corresponde às fontes e os testes passam (tecnicamente demonstrado), e o utilizador avalia a experiência/decisões no comparador (pendente).
- R2: estudos e cenários classificados com proveniência e limites, cálculos reprodutíveis, e o proprietário escolhe uma direção para R3 (pendente). Sem dados brutos, não declarar backtest Kraken validado.
- Os testes R2.3 (26 casos de cálculo, seis viewports) e este painel de decisão não equivalem a validação financeira independente, ainda reservada ao Bloco 14.

**Produção, Supabase, perfis e carteiras permanecem inalterados.**

## Adenda de 26/10/2026 — escolha de direção R2.4, sem trocar a política financeira

O proprietário escolheu expressamente o **Modelo C adaptativo como arquitetura principal**, a grelha histórica **Clássico A–E para comparação**, a decomposição **20%/30%/50%** do nominal por ciclo, **piso de stress estrito** e separação de margem real de reforços apenas planeados. Esta decisão encerra o **gate de direção arquitetural R2.4**.

**Não foram aprovados:** preços ou espaçamentos específicos para compras reais, automatização de ordens, estratégia de liquidação efetivamente segura, probabilidades de lucro, abertura de contas públicas ou lançamento da V20 financeira. As condições de qualidade do estudo R2.3 (120 cenários sintéticos, não backtests completos Kraken) e as observações anteriores continuam válidas. As distâncias históricas do clássico não passam automaticamente a parâmetros de negociação.

Registo formal: `policies/v20-model-c-architecture-owner-consent-20261026.json`. Resumo auditado: `docs/V20_34_ETAPAS_AUDITORIA_FECHO_TECNICO_20261026.json`. Manter `financialCloudApproved:false`, `publicRegistrationApproved:false` e PR #35 em draft.
