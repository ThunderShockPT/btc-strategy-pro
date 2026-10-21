# V20 — Bloco 7A: perfis e objetivos, proposta pronta para decisão

21/10/2026 · Base: Bloco 6 (`3acc411ae0b5617e42598a4be64eaf96be4aa41e`).

## Estado e decisão necessária

Foram implementados o motor de prévias dos perfis (`risk-profiles.js`), o planeador de saídas (`exit-planner.js`) e uma revisão de mudança de perfil no workflow de caixa. Não foram ativadas novas predefinições financeiras na Beta, na interface ou na cloud.

As referências de descida já aprovadas continuam **40 000 / 20 000 / 10 000 USD** para Seguro/Equilibrado/Arriscado. O rótulo inicial Equilibrado mantém-se, sem o apresentar como adequado para todos. Reserva, dimensionamento de orçamento, adaptações, espaçamento e limites de qualidade abaixo são **heurísticas novas propostas**, não regras Kraken, recomendações pessoais ou parâmetros estatisticamente calibrados.

A regra 23 da prompt do proprietário exige opções e aprovação antes de fixar novas regras materiais de risco. Por isso `policies/profiles-proposal-20261021.json` tem `applicationEnabled=false`, e `confirmProfileChange` recusa a aplicação com `PROFILE_POLICY_APPROVAL_PENDING`, mesmo depois de confirmar uma prévia individual. A aprovação de uma política de produto é separada da confirmação de um plano num projeto. Não há um argumento de cliente que ative estes perfis nesta versão.

O Bloco 7A entrega código, testes, exemplos reproduzíveis e proposta concreta. O Bloco 7B deve registar a escolha do proprietário, finalizar os parâmetros aprovados e testar a ativação antes de fechar o Bloco 7. Nenhuma opção equivale à aprovação de lançamento.

## Parâmetros propostos para a Beta

| Parâmetro | Seguro | Equilibrado | Arriscado |
| --- | ---: | ---: | ---: |
| Descida USD inicial já aprovada | 40 000 | 20 000 | 10 000 |
| Reserva base mínima / capital contabilístico | 30% | 20% | 10% |
| Orçamento **nominal por novo ciclo** / capital contabilístico | 25% | 50% | 75% |
| Limite de domínio da descida / referência | 60% | 40% | 20% |
| Multiplicador do drawdown observado para cenário de stress | 2 | 1,5 | 1 |
| Espaçamento base entre reforços / referência | 2% | 1,5% | 1% |
| Espaçamento entre ciclos / referência | 0,5% | 0,3% | 0,2% |
| Folga matemática no piso / capital contabilístico | 2% | 1% | 0,5% |
| Spread máximo da prévia | 10 bps | 15 bps | 25 bps |
| Participação máxima proposta na profundidade de compra declarada | 1% | 2% | 5% |

Capital contabilístico significa carteira geral + margem isolada efetiva, depois de PnL realizado/custos/funding liquidado. Não inclui lucro não realizado nem o nominal da posição. Os percentuais de orçamento não são percentuais de caixa gastada: o motor calcula à parte a margem necessária, custos e reservas, e pode devolver zero ciclos. Orçamento mínimo sobe apenas até permitir os três lotes mínimos; se a liquidez declarada não permitir esse mínimo, a prévia é bloqueada.

A reserva base maior que já exista é preservada. Mudar para Arriscado não liberta automaticamente uma reserva previamente maior. Uma proposta de perfil mantém todas as execuções e o inventário de compras pendentes; incompatibilidades com novo piso ou profundidade exigem revisão, não apagamento ou redimensionamento silencioso de ordens antigas.

Os parâmetros comuns também estão por aprovar: cotações até 60 segundos; pelo menos 30 observações, cobrindo uma hora, com último ponto até uma hora da avaliação; componente de espaçamento de 20% do drawdown observado; margem planeada antes de cada compra. Estes limites são filtros técnicos iniciais de dados, não prova de adequação estatística. Taxas, horizonte de stress de subida, funding reservado, compromissos externos e limite de ciclos continuam explícitos na política base, sem inventar taxas oficiais.

## Alternativas de admissão de margem a escolher

**A — Estrita (proposta preferida para a Beta):** se o caminho declarado de falha de adições de margem atingir manutenção, o plano é rejeitado. Dinheiro apenas na caixa não resolve esse cenário. Uma posição existente pode precisar de uma adição de margem efetivamente registada antes de permitir um novo plano neste modo.

**B — Condicional:** permite estudar/apresentar um plano que funciona nos cenários com adições de margem, mesmo que falhe quando essas adições não acontecem. O resultado tem `conditional-on-planned-margin`, preserva o primeiro evento de risco e não altera a margem real. A interface futura terá de dar destaque à condição e exigir confirmação específica; não o pode apresentar como resistente à falha.

Os dois modos estão implementados apenas como prévias (`marginAdmission=strict|conditional`), com aplicação bloqueada. No cenário de falha herdado do Bloco 6, novas compras são suspensas e a posição existente continua pela descida; não se afirma cobrir todos os erros possíveis, como comprar apesar de uma transferência falhada.

As alternativas dizem respeito ao critério de admissão do planeador. Não são recomendações de perfil para uma pessoa nem garantias de evitar liquidação. A proposta de parâmetros da tabela é a mesma nos dois modos.

## Referência, volatilidade observada e liquidez

`BTCRiskProfiles.preview(input, activePlan, request)` exige perfil, decisão de piso, modo de admissão, contexto de mercado e política base. Os resultados têm `canApply=false`, versão, regras, valuation e pressupostos identificados.

- `floorMode=preserve` conserva o piso existente, mesmo que seja personalizado. Mostra também o piso que o perfil teria proposto; não atribuir a esse piso personalizado uma proteção padrão fictícia.
- `floorMode=from-profile-reference` calcula uma proposta usando o preço/instante guardados no projeto, nunca substituindo a referência silenciosamente pela cotação atual.
- A referência USD é limitada pela fração de domínio para não produzir pisos negativos quando o BTC estiver baixo. Pode ser aumentada pelo stress do drawdown observado, dentro do domínio. Se o stress observado ultrapassar o domínio do perfil, a prévia é bloqueada, em vez de cortar o stress e alegar que continua adequado.
- O drawdown é calculado pelo maior declínio de um pico para um preço posterior nas observações fornecidas. Não é uma previsão de volatilidade futura, desvio-padrão, VaR, probabilidade ou validação fora da amostra.
- O espaçamento é o maior entre a fração base e 20% do drawdown observado aplicado à referência, alinhado ao tick.
- A primeira entrada nova usa o mark fornecido, identificado como snapshot desta prévia. Entradas já planeadas não são movidas.
- Spread e profundidade de compra são observações declaradas com símbolo, moeda, fonte e instante. A profundidade reduz o orçamento máximo; não representa liquidez garantida até à execução. Ordens existentes acima do limite proposto exigem revisão.

Não foi implementado um adaptador de dados públicos neste bloco. Contextos aceites são `synthetic` e `manual-public-observation`, com origem explícita. Dados em falta, antigos, invertidos ou incompatíveis não são substituídos por valores inventados. O chamador deve fornecer o instante atual na avaliação; um timestamp antigo não prova frescura atual. Integração pública, latência, persistência dos dados e validação de séries continuam nos blocos posteriores.

## Objetivos de saída independentes do perfil

`BTCExitPlanner.targetPrice(input, request)` calcula um preço de execução hipotético necessário para um objetivo líquido explicitamente escolhido. Não recebe perfil de risco nem deduz velocidade de lucro a partir dele.

A declaração exige `horizon=short|intermediate|extended`, `horizonDays`, quantidade BTC, objetivo líquido USD, taxa de fecho, outro custo e funding futuro com montante/direção (`paid|received`). Não há percentagens de lucro predefinidas nem funding fixo inferido do prazo. `compareTargets` compara os três horizontes com durações estritamente crescentes. O prazo é uma descrição do cenário, não uma previsão de quando o objetivo será atingido.

Existem duas bases de resultado:

| `profitScope` | O que significa |
| --- | --- |
| `exit-net-increment` | PnL bruto da quantidade vendida menos custos novos e com funding futuro declarado; custos históricos da conta são mostrados à parte |
| `account-net-after-total-close` | Resultado líquido acumulado da conta depois de fechar toda a posição, incluindo PnL realizado anterior, taxas pagas e funding liquidado, uma única vez |

A segunda opção exige fecho total; não apresenta lucro não realizado de uma posição remanescente como resultado já realizado. A atribuição de funding futuro é a do cenário explicitamente fornecido; não se inventa uma distribuição proporcional de custos de conta numa venda parcial.

O preço necessário considera a base atribuída à quantidade e a comissão proporcional ao nominal de saída. Arredonda para cima ao tick e confirma que o objetivo continua atingido depois do arredondamento monetário do custo. Trata objetivos já cobertos por resultados anteriores sem produzir preços negativos. Se a posição já estiver na manutenção, bloqueia um novo alvo específico.

Um preço-alvo por si só não prova que há caixa para todos os custos ou que o caminho permite chegar lá. O resultado diz `requires-chronological-exit-simulation`; a simulação seguinte verifica isso. Nada constitui uma ordem de venda.

## Vendas parciais e totais

`simulateExit` usa o motor cronológico do Bloco 4 e a reconstrução do Bloco 3. Exige quantidade, preço de execução, mark do cenário, alocações explícitas por ciclo, destino do PnL, outcome preenchido/não preenchido, transição contínua/gap e eventual retirada de margem explícita.

O relatório separa PnL bruto realizado, custos novos, funding do cenário, resultado líquido liquidado do cenário, PnL realizado acumulado, PnL não realizado, custos acumulados, exposição e risco remanescentes. A correção de um histórico permanece trabalho do Bloco 8; esta função não modifica factos.

Uma venda não executada não realiza lucro nem paga a comissão de uma execução inexistente. A margem não volta automaticamente à carteira num fecho total: só se existir `marginReleaseUSD`. Numa venda parcial, uma retirada que viole a equity inicial da posição restante é bloqueada. Não é possível vender BTC acima do disponível nem atribuir mais a um ciclo do que esse ciclo conserva.

O mark e o preço de execução são independentes: uma execução com slippage pode realizar menos PnL e deixar outra valorização não realizada. Se a trajetória atingir manutenção antes da venda, a operação posterior não é presumida executada.

Funding futuro é um **montante hipotético independente**, aplicado num ponto do cenário antes da venda, não uma acumulação temporal modelada. O seu recebimento também é suportado. Outros custos futuros são declarados separadamente. O Bloco 9 deverá distribuir os movimentos no tempo e modelar os respetivos extremos. Não se aplica o mesmo funding ao saldo e ao PnL duas vezes.

A retirada de margem opcional é ordenada depois da venda e antes dos custos de fecho neste cenário explícito. Isto não é uma promessa da sequência real da Kraken. Taxas/funding sem caixa podem impedir uma ação; a transferência não é inventada para pagar esses custos. Liquidação global de conta e garantias não USD não são reproduzidas pelo modelo isolado LONG USD.

## Exemplo independente de saída

0,01 BTC com entrada a 100 000 USD; objetivo de novo lucro líquido 50 USD, taxa hipotética de fecho 0,0005 e outros custos/funding zero. Resolver `0,01×preço − 1 000 − 0,01×preço×0,0005 ≥ 50` e alinhar ao tick dá **105 053 USD**. O bruto seria 50,53, comissão 0,525265 e líquido 50,004735 USD. Não é uma cotação ou ordem atual.

Vender metade a 110 000 realiza 50 USD brutos, paga 0,275 e deixa 0,005 BTC abertos. A margem permanece 100 USD se não houver retirada explícita; o PnL não realizado dos BTC remanescentes é calculado separadamente ao mark do cenário.

O relatório reproduzível `V20_BLOCO7_CENARIOS.json`, gerado por `npm run preview:v20:profiles`, contém três perfis sobre 2 000 USD sem posição, referência fictícia de 100 000, contexto sintético e taxa de teste. Inclui também a comparação A/B com posição aberta e três objetivos de saída cujos custos futuros foram escolhidos explicitamente. Não são taxas, preços, retornos ou probabilidades observados no mercado.

## Resultado concreto da prévia sintética

Referência/mark de 100 000 USD, capital contabilístico de 2 000, sem posição aberta, spread e profundidade fictícios do relatório, taxa de teste 0,0005, funding reservado 10 USD, limite 12 ciclos e modo A:

| Perfil | Piso proposto USD | Reserva base USD | Nominal por ciclo USD | Ciclos novos no cenário | Exposição nominal efetiva planeada USD |
| --- | ---: | ---: | ---: | ---: | ---: |
| Seguro | 60 000 | 600 | 500 | 6 | 2 941,35 |
| Equilibrado | 80 000 | 400 | 1 000 | 6 | 5 924,49 |
| Arriscado | 90 000 | 200 | 1 500 | 9 | 13 391,40 |

Os números só descrevem esta entrada sintética e os parâmetros propostos. Não são contagens fixas por perfil, lucros esperados, limites oficiais ou garantia de que o dinheiro não será perdido. No exemplo separado com 0,01 BTC já abertos a 100 000 e 100 USD de margem, a fronteira local é 95 000: A rejeita o plano com piso 80 000 se a adição planeada falhar; B mostra um plano condicional e preserva esse evento de risco. A margem factual não se altera.

## Compatibilidade, testes e próximos passos

A mudança de perfil é uma nova versão proposta de configuração. Não reescreve operações, não transfere dinheiro, não executa ordens e não aplica a política. O workflow normal de caixa e ciclos dos blocos 5/6 continua disponível; apenas a aplicação destes novos perfis automáticos está bloqueada à espera de decisão. A API local não substitui autenticação, RLS ou validação de políticas aprovadas no servidor do Bloco 12.

Foram acrescentados testes de regras de dados, três perfis, piso preservado/adaptativo, domínio observado, liquidez, referência baixa, reserva existente, exclusão de PnL flutuante no dimensionamento, bloqueio de aprovação, alvo líquido independente, custos históricos, funding pago/recebido, saída parcial/total, quantidade e alocações, margem, gaps, execução não preenchida, diferença mark/execução, três horizontes, arredondamentos extremos, 100 objetivos com oráculo em inteiros e compatibilidade UMD.

As prévias de perfis reutilizam os sete caminhos do gerador. O processamento completo deve ir para Worker antes da integração visual, tal como no Bloco 6. Nenhuma página, autenticação, backup ou dados da Beta foi alterada. Verificação local final após `npm ci --ignore-scripts`: **203 testes Node aprovados** (18 regras, 18 dados, 28 motor, 32 risco, 34 caixa, 35 ciclos e 38 perfis/saídas), zero falhas. As cinco suites Beta aprovaram **386 verificações** (19 autenticação, 26 sincronização isolada, 38 publicação, 37 responsividade e 266 planeamento legado). Os **28 ficheiros originais continuam idênticos**. Não foram executados QA visual em navegador, testes num Samsung S25 físico, contas reais ou persistência cloud neste bloco. A publicação e ativação permanecem bloqueadas aos respetivos checkpoints.

Falta a decisão A/B e a confirmação dos parâmetros propostos para fechar o Bloco 7B. Depois do fecho do Bloco 7, restam **8 blocos principais (8–15)**. Não se declara o Bloco 7 completamente aprovado enquanto a decisão material estiver pendente.

Fontes oficiais de âmbito/custos revistas nesta fase, sem as transformar em autorização destas heurísticas: https://support.kraken.com/pt/articles/4844463246100-margining-liquidations-multi-collateral-derivatives e https://support.kraken.com/pt/articles/fees-for-derivatives-trading-eea. As regras versionadas, limitações e decisões anteriores continuam no Bloco 1 e em `V20_PRODUCT_DECISIONS.md`. Não há ligação a contas Kraken.
