# V20 — Bloco 6: ciclos numerados e pesquisa de capacidade

21/10/2026 · `v20-cycles-6.1` · Base: Bloco 5 (`70bef4c03a50a410163da37e6131c237a827a5f8`).

## Entrega e limites desta fase

`cycle-planner.js` calcula o número de novos ciclos que cabe num cenário explicitamente parametrizado, preservando a posição real e as compras históricas. Cada ciclo distribui o orçamento **nominal do próprio ciclo** em 20/30/50. Não se divide a caixa total nesses três pesos. Os ciclos têm IDs `cycle-1`, `cycle-2`, etc.; nunca se reutiliza um número encontrado no histórico, mesmo depois de uma venda total.

Integração no workflow de caixa: depósitos podem comparar a capacidade antes/depois; um plano de ciclos exige outra revisão e confirmação. Não escreve factos, reservas, Supabase, LocalStorage ou contas Kraken. Nenhuma ordem ou transferência é executada. A interface pública/PWA ainda não carrega estes módulos; a substituição visual das estratégias A–E ocorrerá na integração dos blocos 10/11.

O orçamento por ciclo, espaçamento, custos e política de margem são parâmetros obrigatórios. **Não foram escolhidas novas predefinições de risco** neste bloco. O perfil existente é conservado como configuração; a política automática de Seguro/Equilibrado/Arriscado será proposta e validada no Bloco 7, com aprovação antes de fixar regras com impacto material. A referência de preço e o piso do projeto não são deslocados quando o mercado muda.

## Contratos

`BTCCyclePlanner.generate(input, activePlan, policy)` reutiliza os contratos dos blocos 3–5. O plano exige âmbito, versão, perfil, preço/instante de referência e piso válidos. Regras atuais são obrigatórias: o modo contabilístico com regras expiradas não permite gerar planos.

Parâmetros obrigatórios de `policy`:

| Campo | Significado |
| --- | --- |
| `maxCycles` | Limite total de ciclos ativos, inteiro de 1 a 12 neste checkpoint |
| `nominalCycleBudgetUSD` | Orçamento nominal igual para cada novo ciclo candidato |
| `firstEntryPriceUSD` | Primeira entrada do primeiro ciclo novo, sem deslocamento automático |
| `reinforcementSpacingUSD` | Intervalo nominal entre as três entradas do mesmo ciclo |
| `cycleSpacingUSD` | Deslocamento entre primeiras entradas dos ciclos novos |
| `feeRate` | Taxa hipotética para aberturas e reserva de fecho; não é uma taxa Kraken confirmada |
| `upPriceUSD` | Preço do cenário sintético de subida e da reserva de custo de fecho |
| `minimumBufferUSD` | Folga matemática positiva desejada no piso |
| `protectedCashUSD` | Reserva base que não pode ser comprometida |
| `fundingReserveUSD` | Caixa reservada para custos futuros; não é funding já pago |
| `externalOrderReserveUSD` / `externalMarginReserveUSD` | Compromissos explicitamente fora dos ciclos modelados |
| `marginPlacement` | `prefunded` ou `before-each-buy` |
| `requireFailedMarginSurvival` | Decisão explícita sobre rejeitar candidatos cujo cenário de falha de margem atinja manutenção |

Montantes, preços e taxas entram como strings decimais. Não há um valor de taxa ou de proteção escolhido silenciosamente. Um cenário de taxa zero é permitido apenas porque foi fornecido explicitamente. Taxas distintas maker/taker, funding temporal, spreads, conversões e execução adversa mais detalhada continuam no Bloco 9.

O limite 12 é uma restrição técnica inicial testada, não uma recomendação de usar 12 ciclos nem uma constante financeira da Kraken. Pode ser configurado para valores menores. Aumentá-lo exige testes e revisão de performance; nunca se apagam ciclos antigos porque ultrapassam um limite novo. O planeador suporta até 36 ordens futuras neste checkpoint. Inventários históricos maiores podem ser preservados, mas um conjunto pendente acima desse limite exige revisão em vez de truncagem silenciosa.

## Inventário de compras e execuções parciais

`activePlan.configuration.cycleInventory` contém ciclos com `cycle`, `nominalBudgetUSD` e três `entries`, ordenadas por `stage=1/2/3`. Cada entrada guarda `priceUSD`, `state=active|closed|cancelled` e `fillEventIds`. Os IDs referenciam compras reais do mesmo ciclo e não podem estar atribuídos a duas etapas. Quando um ciclo é explicitamente mapeado, todas as suas compras históricas têm de estar atribuídas. Não se adivinha a etapa pelo preço ou pela ordem de introdução.

O nominal executado é quantidade BTC × preço de cada fill factual. O restante do orçamento da etapa é convertido em quantidade pelo preço limite, arredondado para baixo ao lote. O dinheiro que sobra devido ao lote fica visível como não alocado. Não se aumenta uma compra para arredondar para cima nem se transfere esse resto para outra etapa alterando os pesos.

Entradas fechadas/canceladas não voltam a ser compradas. Um erro ou excesso factual acima do orçamento permanece explícito como desvio; o histórico não é reduzido para fingir uma distribuição executada de 20/30/50. Vendas posteriores não apagam o nominal de compras já realizadas. A quantidade aberta é sempre a reconstrução conjunta do motor financeiro, não a soma ingênua de fills antigos.

Compras pendentes legadas sem quantidade/preço/associação suficientes são bloqueadas para revisão. O depósito pode continuar a ser registado, mas a aplicação não inventa uma nova contagem de ciclos. Novas execuções que ainda não tenham sido atribuídas à etapa correta também exigem revisão do inventário. A interface de operações dos blocos 8/11 terá de manter essa associação de forma auditável.

## Pesquisa e contabilidade

O gerador enumera contagens desde zero até ao limite disponível, incluindo ciclos já ativos. Os orçamentos novos são iguais e os níveis seguem os espaçamentos declarados. Entradas não podem ter preço negativo, ultrapassar o piso ou fingir preenchimento de um nível já passado. O número novo é atribuído depois do maior ID histórico.

Cada candidato calcula quantidade executável, exposição conjunta futura, margem máxima e custos. Reutiliza `BTCPositionRisk.requiredMarginForFloor`, extraído da calculadora inversa, e `BTCFinancialEngine.marginRequirements`; não contém outra tabela de margem. A margem planeada cobre, em cada etapa, o maior de:

- Margem inicial nominal exigida ao conjunto da posição.
- Colateral necessário para a equity inicial ao mark da compra, incluindo perdas não realizadas anteriores.
- Margem necessária para o piso e folga matemática declarados.
- Margem já atribuída, que nunca é retirada implicitamente.

A verificação da equity inicial é necessária mesmo quando o piso fica perto da entrada: ter a margem nominal de 10× não significa que o saldo, depois de perdas anteriores, admite a próxima compra. Os testes incluem este caso.

A caixa necessária soma apenas **novas transferências** de margem, comissões de abertura estimadas, reserva de fecho, funding reservado, reserva base e compromissos externos. A margem já existente não volta a ser debitada da carteira. O nominal de futuros não é tratado como uma compra spot. O funding reservado não é lançado como custo passado.

As novas reservas são uma proposta de substituição das afetações do plano anterior, não outro ativo. A revisão mostra reservas anteriores e propostas e exige confirmação separada. O chamador deve mapear integralmente ordens existentes e declarar os compromissos externos; o módulo não conhece ordens numa corretora. Nenhum plano é aplicado apenas porque o dinheiro foi adicionado.

`cycleReservationBasis` conserva separadamente reserva base, funding e reserva de fecho. A soma tem de reconciliar com `input.reservations.protectedUSD`. Isto permite recalcular depois de confirmar um plano sem tratar a reserva de custos já existente como uma nova reserva base, nem libertar a reserva base por engano.

Candidatos sem caixa ou inválidos são rejeitados antes da simulação. Os restantes são testados por contagem decrescente até encontrar o maior que cumpra os requisitos declarados. **Só um candidato com cenários executados pode aparecer como selecionado**. Candidatos menores não simulados ficam identificados como tal; não são apresentados como aprovados. O critério é maximizar contagem dentro dos parâmetros indicados, não provar rentabilidade ou encontrar uma estratégia ótima.

## Sete cenários sintéticos obrigatórios

Cada candidato passível de seleção passa pelo motor cronológico do Bloco 4:

1. Descida contínua, com passos em cada nível de entrada e no piso.
2. Subida ao preço declarado, sem presumir execução de compras inferiores que nunca foram atingidas.
3. Volatilidade com passagens pelos níveis e recuperações intercaladas.
4. Gap até ao piso: não se presumem fills nos níveis atravessados.
5. Compras não executadas: não criam BTC nem PnL fictício.
6. Fills parciais: metade da quantidade, arredondada ao lote; abaixo do mínimo fica sem execução. Custos só da quantidade preenchida. Adições de margem completas mantêm-se como pressuposto conservador.
7. Falha de adições de margem: transferências falham e novas compras são suspensas; a exposição existente continua pela descida.

A última hipótese não garante que um utilizador deixará de comprar depois de uma falha. O relatório declara expressamente a suspensão de compras; não representa toda a combinação possível de erros operacionais. Se a posição existente atingir manutenção, o resultado fica condicionado às adições de margem ou é rejeitado, conforme o parâmetro explícito `requireFailedMarginSurvival`. O relatório conserva o primeiro evento de manutenção/insuficiência de cada cenário rejeitado. Nos checkpoints após ações, inclui quantidade, carteira, margem atribuída/exigida, folga e alavancagem efetiva provenientes do motor comum. Se a manutenção já tiver sido atingida no estado inicial, não se permite uma compra futura ou uma adição posterior «resgatar» o plano.

`prefunded` simula a transferência do montante total necessário antes do caminho. `before-each-buy` simula uma proteção inicial da exposição existente e as adições incrementais antes de cada compra. Ambas são **ações manuais futuras assumidas pelo cenário**, sem garantia de haver tempo para as executar. A manutenção é verificada antes de ações no preço de chegada, como no Bloco 4.

Nenhum destes cenários é um backtest, uma probabilidade de lucro ou uma garantia de resistência fora dos preços declarados. Choques abaixo do piso, funding prolongado, alterações de tabela durante o caminho e outros custos exigem os cenários adicionais do Bloco 9 e a auditoria final. A liquidação estimada não é um preço oficial Kraken.

## Integração com o Bloco 5

Se o plano tiver `configuration.cyclePolicy`, `prepareMovement` compara a capacidade antes/depois do movimento ao mesmo preço e sem alterar o plano. Num movimento apenas planeado, essa capacidade posterior continua identificada como projeção hipotética; não financia o diário real.

Sem política configurada, devolve `newCycles.status=not-configured`. Se houver regras expiradas ou inventário incompatível, devolve `requires-plan-review` com o motivo; o registo de um depósito real não é perdido por causa de um plano que precisa de revisão.

Novas APIs:

- `prepareCyclePlanChange(input, plan, {id, version, policy})`: prepara inventário, reservas e resultados, mantendo perfil, piso e referência existentes.
- `confirmCyclePlanChange(input, plan, review, {confirmed: true, reviewHash})`: reconstrói e verifica a revisão; devolve configuração e reservas para persistência futura, sem alterar factos ou executar operações.

Revisões alteradas, obsoletas ou inviáveis são recusadas. Planos de ciclos já modelados têm de usar esta revisão completa; a antiga API de revisão isolada de reservas não pode contornar a reconciliação dos componentes. A confirmação não grava na cloud; o adaptador transacional e a revisão global permanecem no Bloco 12. Os hashes são consistência local, não autenticação. O módulo UMD precisa de ser carregado antes de `cash-workflow.js` quando se usam as funções de ciclos no navegador.

## Exemplos independentes e validação

Exemplo de um ciclo nominal de 1 000 USD: entradas a 100 000, 99 000 e 98 000; lote 0,0001 BTC. As afetações são 200/300/500 USD. Quantidades executáveis: 0,002 / 0,003 / 0,0051 BTC. Nominal futuro efetivo: 200 + 297 + 499,80 = 996,80 USD; quantidade 0,0101 BTC. Os restos não são redistribuídos.

Com piso 80 000, MM do cenário 5%, folga 10, margem inicial inexistente, taxa hipotética 0,0005, subida até 120 000, reserva base 100 e funding reservado 10, o oráculo manual dá: margem 248,64; abertura 0,4984; reserva de fecho 0,606; caixa total necessária **359,7444 USD**. O teste compara a enumeração com este resultado independente, incluindo valores de capital imediatamente abaixo/acima. Estes são dados sintéticos de teste, não uma recomendação para uma conta real.

Também se testa o caso obrigatório de 2 000 + 500 USD depois de três compras executadas: contribuições sobem para 2 500, a capacidade de ciclos pode aumentar no cenário configurado, mas quantidade real, margem e liquidação estimada atual não mudam. Os novos ciclos permanecem uma proposta.

A suite cobre limites, zero/um/vários ciclos, limite técnico, mapeamentos parciais/cancelados, custos, exposição conjunta, falha de margem, ausência de fills, regras expiradas, imutabilidade, confirmação e reutilização de um plano confirmado. Inclui VM com os módulos UMD reais, sem rede. Não equivale a QA visual, Android físico ou ativação cloud.

## Performance e continuidade

A procura e os sete caminhos são deliberadamente limitados. A execução com 12 ciclos é sensivelmente mais pesada do que um cálculo de saldo; não deve correr no mesmo ciclo de eventos da interface nem a cada tick do feed. Antes da ligação visual, o Bloco 11 deverá executar o planeador em Worker, identificar revisões antigas e permitir cancelamento; o ticker pode continuar a atualizar sem bloquear formulários. O benchmark local é evidência de execução, não uma garantia de latência num Samsung S25.

Verificação final executada após `npm ci --ignore-scripts`: **165 testes Node aprovados** (18 regras, 18 dados, 28 motor, 32 risco, 34 caixa e 35 ciclos), zero falhas. A execução local completa terminou em cerca de 46 segundos; não se trata de uma meta de performance para a interface. As cinco suites Beta aprovaram **386 verificações** (19 autenticação, 26 sincronização isolada, 38 publicação, 37 responsividade e 266 planeamento legado). Comparação de conteúdo: os **28 ficheiros originais permanecem idênticos**. Nenhuma migração foi aplicada ao Supabase e nenhuma publicação foi feita na main. Mantêm-se pendentes os testes de dispositivo físico, concorrência cloud, todos os cenários temporais e a reconciliação independente final.

Próximo: **Bloco 7 — Perfis e objetivos**, com propostas de política e aprovação das decisões materiais. Faltam **9 blocos principais (7–15)**. Regras públicas de referência: https://support.kraken.com/pt/articles/derivatives-margin-schedule-and-maximum-leverage-eea e documentação versionada do Bloco 1. Não há ligação a contas Kraken nem alteração da main neste checkpoint.
