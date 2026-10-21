# V20 — Bloco 9: simulação temporal, funding e custos

21/10/2026 · Base preservada: `60407081bbe116657e7ffdc54e94f9901eae0416`, Bloco 8. Branch: `feat/v20-temporal-simulation`.

## Resultado e âmbito

`temporal-simulator.js` simula um caminho cronológico explícito até 90 dias, partindo da posição reconstruída pelo motor comum. Calcula funding por quantidade e duração, custos de execução e efeito na carteira, com checkpoints de 1, 7, 30 e 90 dias quando o horizonte os inclui. Cenários são sintéticos e determinísticos; não são backtests, probabilidades ou rentabilidades esperadas.

O motor continua especializado em LONG USD, PF_XBTUSD, EEE, 10× selecionado e margem isolada. Não lê contas Kraken, não usa chaves API e não executa ordens ou transferências. Não se altera a interface pública nem a produção Supabase.

## Regras verificadas e limitações documentais

Foram consultadas novamente em 21/10/2026 as páginas oficiais EEE de [especificações](https://support.kraken.com/pt/articles/perpetual-contract-specifications-for-clients-in-the-eea) e de [margem Multi-M](https://support.kraken.com/pt/articles/4844463246100-margining-liquidations-multi-collateral-derivatives). A primeira descreve acumulação contínua, liquidação no fim da hora ou quando a posição líquida muda, taxa absoluta por unidade/hora, conversão pela taxa relativa e índice, e o sinal para LONG. A segunda distingue o débito de funding na carteira geral para margem isolada.

O registo versionado `rules/kraken/funding-eea-20261021-review.json` conserva fontes, exemplo público, decisões e pontos pendentes. Não substitui nem torna completo o conjunto de regras do Bloco 1. O exemplo público de LONG de 2 BTC a índice 37 000, com taxas -0,04%/+0,04% em horas sucessivas, corresponde a +29,6/-29,6 USD e foi reproduzido em teste independente.

Persistem discrepâncias na prosa pública sobre equivalências do cap e no exemplo de arredondamento de uma posição SHORT. O motor não deduz uma política oficial de arredondamento desses exemplos e não calcula o prémio de funding a partir do mark. A contabilização de margem isolada é uma aproximação explicitamente distinguida da liquidação ao nível da conta. A reconciliação pública/manual independente continua no Bloco 14, sem integração de contas.

## Entrada da simulação

`simulate(input, request)` recebe o mesmo diário de factos dos blocos anteriores, incluindo correções. O pedido exige:

- `scenarioId`, instante final `until` e `rulePolicy=freeze-verified-at-start`.
- `openingAccruedFundingNetUSD`: funding ainda não liquidado no início, explicitamente indicado, incluindo zero quando esse for o pressuposto. Funding histórico já registado no diário não deve ser repetido aqui.
- `fundingPeriods`: cobertura integral, contígua e sem sobreposição do horizonte. Cada intervalo tem início/fim, taxa absoluta assinada em USD/BTC/hora e fonte declarada. Taxa zero também tem de ser explícita. A última taxa não é extrapolada para preencher dados em falta.
- `steps`: preços de marcação, transição contínua/gap e ações com resultado explícito. São admitidos até 500 passos e 50 ações por passo, mantendo o limite de 10 000 eventos do motor financeiro.

`absoluteRate({relativeHourlyRate,indexPriceUSD})` converte uma taxa relativa horária já definida, com sinal, pela referência do índice declarada. Não divide novamente por 8 nem multiplica por 10×. A API principal recebe taxas absolutas com até 18 casas decimais; uma conversão que exceda essa precisão exige arredondamento explícito pelo chamador. Não se geram taxas futuras, caps ou estimativas a partir de spot/mark atual.

## Regras atuais e horizontes longos

Os dados têm de estar no âmbito e recentes no início da simulação. Não se prolonga silenciosamente o prazo de verificação Kraken. Para estudar datas futuras, o motor usa `ruleScenario={mode:'frozen-rules-synthetic',referenceAt}`: a avaliação de regras ocorre na referência inicial e o resultado tem `syntheticFrozenRules=true` e `marginFiguresCurrent=false`.

Esta hipótese é obrigatória para a simulação temporal e só é admitida com avaliação sintética. O instante de referência não pode estar no futuro nem contornar uma regra que já estava desatualizada no início. Alterações futuras de tabelas de margem podem ser fornecidas como cenários explícitos com nova versão, sujeitos à mesma validação de âmbito.

As posições existentes são reconstruídas; quando a simulação usa uma regra atual numa compra anterior à observação dessa regra, a aplicação é declaradamente uma hipótese atual para a posição existente, não confirmação das exigências que vigoravam nessa negociação. Snapshots históricos explicitamente fornecidos continuam a ser avaliados na sua data aplicável. Não se reescrevem factos reais.

Os workflows de caixa, alterações de plano/perfil e correções recusam entradas com `ruleScenario`. Um resultado de regras congeladas não pode ser confirmado como movimento real por essas APIs. O simulador devolve resumos e premissas, não um `nextInput` pronto a guardar como operações.

## Acumulação, liquidação e conservação de dinheiro

A base é `funding = quantidade BTC × taxa absoluta × horas decorridas`. Taxa positiva significa pagamento da posição LONG; negativa significa recebimento. Quantidades mudam apenas após execuções aceites. Compras/vendas parciais alteram a acumulação subsequente e um fecho total interrompe-a.

O resultado separa funding pago/recebido acumulado, funding liquidado na carteira e funding ainda por liquidar. Os pagamentos acumulados reservam saldo imediatamente. Por prudência, o modelo não permite gastar recebimentos acumulados antes da liquidação; esta restrição é uma decisão conservadora da aplicação, não uma descrição garantida da disponibilidade na Kraken.

Os valores liquidam-se nos limites horários UTC e antes de uma mudança de posição executada. Se uma compra falhar, a tentativa não liquida funding antecipadamente; o fim de hora continua a liquidar independentemente dessa compra. Uma liquidação parcial explicitamente fornecida também liquida a acumulação anterior uma vez.

O arredondamento de liquidação usa 18 casas, half-even, com diferença acumulada exposta em `settlementRoundingNetUSD`. Valores abaixo da precisão representável permanecem pendentes até serem representáveis. É uma política matemática da app, não arredondamento oficial reconciliado.

Invariante: funding inicial pendente + recebimentos acumulados − pagamentos acumulados + diferença de arredondamento = funding liquidado líquido + funding pendente líquido. O PnL do diário inclui apenas funding já liquidado; `economicEquityUSD` e `economicNetPnLUSD` acrescentam o pendente uma única vez. Carteira, margem isolada e reservas não são contadas duas vezes.

Para manter o custo de cálculo controlado, os lançamentos hipotéticos de funding são agregados entre ações. A cronologia das liquidações de funding fica em `funding.timeline`. Os factos de origem, incluindo correções, são preservados. As contagens do diário derivado não representam a quantidade de movimentos oficiais Kraken. Caminhos sem alteração de preço/posição reutilizam a estimativa de risco e continuam a reconstruir os saldos pelo motor financeiro comum.

## Execução, comissões, spread e slippage

As ações de compra/venda exigem quantidade pretendida e preenchida, resultado, cotação de referência, spread completo em pontos base, slippage, taxa maker/taker declarada e ciclo/alocações. O preço de execução é separado do mark: aplica-se meio spread à cotação de referência, depois slippage adverso; compras arredondam para cima e vendas para baixo ao tick do contrato. Não se debita outra comissão pelo spread, já refletido na execução.

As taxas são declaradas pelo cenário, sem presumir o escalão de uma conta. A comissão incide no nominal efetivamente executado e arredonda para cima a 18 casas. Compra/venda e respetiva comissão são validadas em conjunto: falta de caixa para a comissão não permite conservar uma execução gratuita. Rebates maker não estão modelados como taxas negativas.

Custos de conversão, liquidação e outros podem ser fornecidos em USD explicitamente. Não existe conversão de garantia EUR/BTC, forecast de FX ou dedução automática de custos desconhecidos. Uma ordem não executada não aumenta a posição nem gera comissão de execução. Uma operação parcial só utiliza a quantidade preenchida.

## Cronologia do risco e falhas

Entre marcas contínuas, o cenário assume interpolação linear. Um gap mantém a marca anterior até à chegada e aplica o salto nesse instante. Não se inventa volatilidade entre os pontos. O motor identifica o primeiro entre a insuficiência da carteira para funding e a fronteira de manutenção isolada. O instante de cruzamento contínuo é aproximado ao milissegundo, com a tolerância da estimativa numérica de preço.

Uma queda que atinge manutenção interrompe o caminho antes de reforços, vendas normais ou adições tardias. Não se presume que haverá tempo para transferir margem. Uma adição falhada não aumenta a margem. Depósitos mudam a carteira e só uma adição efetivamente assumida como executada muda a margem isolada.

A insuficiência para pagar funding interrompe o cenário mesmo que a fronteira isolada ainda não tenha sido atingida. O resultado não atribui um preço oficial de liquidação ao nível da conta, nem gasta automaticamente a margem isolada para pagar custos da carteira geral. Movimentos que tentem gastar funding negativo já acumulado são bloqueados.

Uma liquidação parcial exige quantidade, execução, alocações, destino do PnL e custo explícitos. Não é inferida. Só se aplica quando o gatilho ocorre no instante do passo; se o caminho contínuo cruzar a fronteira antes, o motor para nesse cruzamento sem assumir uma execução posterior. Se a liquidação parcial não restabelecer manutenção, o caminho para antes das ações seguintes.

Reservas insuficientes são assinaladas em `firstReservationShortfall`. Completar um cenário não significa que um plano seja financiável ou recomendado. A política de perfis e a confirmação de novas reservas continuam separadas. A simulação temporal fornece um estudo adicional dos custos; o gerador de ciclos mantém os seus cenários e não extrapola automaticamente este estudo para candidatos não testados.

## Testes e relatório

`npm run test:v20:temporal` executa casos públicos independentes, invariantes, valores-limite, erros de unidade/cobertura, execuções/custos, funding positivo/negativo, preço e funding concorrentes, mudanças de manutenção, posições corrigidas, dados antigos e integração UMD sem rede. Os testes de propriedades comparam 30 caminhos de venda parcial com um oráculo independente de funding; o teste de 90 dias verifica checkpoints por um cálculo independente de duração.

`npm run preview:v20:temporal` gera `docs/V20_BLOCO9_CENARIOS.json`: 90 dias com taxas sintéticas, carteira esgotada, gap com margem tardia, venda parcial com custos e funding variável. Preços e taxas do relatório são pressupostos, não dados atuais de mercado.

Não houve testes com conta Kraken, API privada, dispositivos físicos ou cloud real neste bloco. Os testes de banco continuam isolados. A interface de gráficos temporais será ligada no Bloco 11 e a persistência de pressupostos/resultados no Bloco 12.

## Resultados executados em 21/10/2026

- **309/309 testes Node aprovados**, nas dez suites dos Blocos 1–9, sem falhas ou testes ignorados.
- **51/51 testes temporais aprovados**, incluindo o exemplo público EEE, o oráculo de funding em 30 caminhos e o horizonte de 90 dias.
- **386/386 verificações da Beta aprovadas**: autenticação 19, sincronização isolada 26, release 38, responsividade estática 37 e planeador 266.
- O relatório sintético foi executado: 2 000 USD, 0,01 BTC e taxa assumida de 2 USD/BTC/hora durante 90 dias produzem **43,20 USD de pagamentos acumulados**, com margem isolada factual preservada. Não é uma taxa atual ou previsão.
- Os 28 ficheiros da referência funcional auditada permanecem byte a byte iguais. Não houve alteração da main, publicação ou acesso à produção Supabase.

## Continuidade

Próximo: **Bloco 10 — configuração inicial, tutorial e assistente da carteira**. **Faltam 6 blocos principais (10–15)**. Mantêm-se a política A estrita, o histórico auditável, as reservas e as regras de confirmação dos blocos anteriores. A auditoria financeira independente final continua no Bloco 14.
