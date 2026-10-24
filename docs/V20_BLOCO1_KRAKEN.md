# V20 — Bloco 1: contrato e regras Kraken

Revisão: 21/10/2026. Base: `d26545f36acda2f2c464626fb93ce688d41309af` (V19.1).

## Âmbito e implementação

Esta alteração acrescenta regras versionadas, evidência pública, validação de âmbito e testes. O módulo `kraken-rules.js` não está carregado pelo HTML V19.1: não altera saldos, diário, contas, interface ou service worker. O novo motor só o consumirá nos blocos seguintes. Nenhuma chave Kraken foi pedida, guardada ou utilizada. Não existem chamadas de colocação de ordens ou transferência.

O histórico adicional pedido pelo proprietário foi pesquisado, mas não foram devolvidas novas mensagens. Continuam vinculativos a prompt V20 e os pedidos disponíveis: Modelo C, 20/30/50, capital adicional separado da margem efetiva, correções auditáveis, comparação de planos e preservação dos dados. Não foram presumidos novos pedidos nem fixadas as políticas finais de risco.

## Descoberta principal: tabela por plataforma

O endpoint público oficial devolveu `PF_XBTUSD` com `serverTime=2026-10-20T23:31:04.66Z` (21/10 em Lisboa). A resposta contém tabelas por plataforma, além das tabelas globais. O ficheiro de evidência conserva a resposta do instrumento e o manifesto inclui o seu SHA-256.

Os caminhos `marginSchedules.europa.retail`, `.europa.professional`, `.europa_crypto.retail` e `.europa_crypto.professional` concordam com a tabela EEE:

| Limite inferior, USD | IM | MM |
|---|---|---|
| 0 | 10% | 5% |
| 30 000 000 | 20% | 10% |
| 50 000 000 | 30% | 15% |
| 150 000 000 | 50% | 25% |

A documentação API descreve os limiares como limites inferiores de unidades de cotação para contratos lineares. O módulo usa seleção inclusiva do novo nível na fronteira, com strings decimais comparadas exatamente. A função devolve o nível publicado, não uma margem calculada nem autorização para negociar.

As tabelas globais desta resposta começam em IM 1% e MM 0,5%; não são as tabelas EEE acima. Isto explica a indicação 100× que aparece na linha BTC da página de especificações. A seleção agora exige plataforma e classificação explícitas e não tem fallback global. A resposta pública não identifica contas. Por decisão posterior do proprietário, a aplicação não ligará contas: a tabela é um cenário EEE declarado manualmente, sem alegar confirmação pela corretora. Ver V20_PRODUCT_DECISIONS.md.

Fonte: https://futures.kraken.com/derivatives/api/v3/instruments

Schema: https://docs.kraken.com/api-reference/instrument-details/get-instruments

Tabela EEE: https://support.kraken.com/pt/articles/derivatives-margin-schedule-and-maximum-leverage-eea

## Instrumento e unidades

| Campo | Valor observado |
|---|---|
| Símbolo | PF_XBTUSD |
| Produto | Perpétuo linear Multi-M |
| Base / cotação | BTC / USD |
| Tamanho do contrato | 1 unidade base |
| Quantidade mínima | 0,0001 BTC, conforme especificação EEE |
| Precisão negociável | 4 casas decimais na API, passo 0,0001 BTC |
| Tick de preço | 1 USD |
| Limite observado | 1 200 BTC |

O módulo valida lotes e ticks sem arredondar silenciosamente. Validar metadados não prova caixa suficiente, margem suficiente, limite disponível na conta ou execução. Os estados negociável, suspenso e post-only pertencem ao instante da resposta e precisam de atualização.

Especificações: https://support.kraken.com/pt/articles/perpetual-contract-specifications-for-clients-in-the-eea

## Preços e fórmulas de referência

Guardar separadamente preço de mercado/último negócio, mark, execução, média, último reforço, piso, estimativa local e estimativa fornecida pela Kraken. Um preço oficial deve incluir origem e instante; não é uma promessa de execução ou um limiar imutável.

A documentação descreve o mark como índice acrescido da EMA de 30 segundos da base e prevê exceções se o índice falhar. O motor deve consumir o mark oficial quando disponível; uma simulação deve declarar o mark assumido.

Para LONG linear: quantidade `Q = soma(nominal executado / preço executado)`; base remanescente `B`; média `A = B/Q`; PnL não realizado `Q × (mark − A)`. Vendas reduzem quantidade e base proporcionalmente e realizam o resultado correspondente. Taxas e funding têm lançamentos próprios e não podem ser descontados outra vez ao apresentar PnL líquido.

A tabela EEE e a nota técnica de margens Multi-M apontam para valorização da margem baseada na entrada. Portanto, não transportar automaticamente a fórmula legada que aplica MM ao nominal ao mark. Para um cenário sintético simples de taxa constante, USD, uma posição, sem funding nem custos e MM calculada sobre a entrada:

`R = Q × A × taxaMM`

`equidadeIsolada(P) = M + Q × (P − A)`

`P_limite = A + (R − M) / Q`

Exemplo independente para futuros testes: Q=0,01 BTC; A=100 000 USD; M=100 USD; MM=5% do nominal de entrada de 1 000 USD. R=50 USD. A fronteira é 95 000 USD: equidade 50=R. Abaixo, o cenário viola manutenção. Um depósito de 500 USD que fica apenas na carteira não altera esta fronteira. Transferir efetivamente 50 USD da carteira para M produz M=150 e fronteira de 90 000 USD, sem criar capital.

Este exemplo é sintético, não um preço Kraken reconciliado. Com custos, alterações de posição, garantias variáveis ou regras de escalão, a função de risco deve ser resolvida por intervalos e verificada em cada evento. Devem ser avaliadas tanto a manutenção isolada como as condições de liquidação global aplicáveis. O bloco atual não implementa esse motor e não aprova recomendações financeiras específicas.

Nota técnica sobre base de entrada, usada apenas para a explicação Multi-M, sem adotar margem de opções: https://support.kraken.com/articles/options-portfolio-margining

Margem e liquidação: https://support.kraken.com/pt/articles/4844463246100-margining-liquidations-multi-collateral-derivatives

## Funding e custos

Funding acumula continuamente; liquida no fim de cada hora ou quando muda a posição líquida. A taxa absoluta tem unidade USD por BTC por hora; a relativa exige o preço de referência usado para a converter. O coeficiente observado é 8 e o máximo relativo observado na API é 0,005 por hora. Não converter isto em juros fixos ou num débito a cada 8h. Há uma inconsistência aritmética no texto da página ao indicar o equivalente de oito horas; o manifesto regista-a.

Para cálculo por segmentos: multiplicar quantidade mantida, taxa absoluta e fração temporal de cada intervalo. A política contabilística proposta mantém uma acumulação pendente e um evento de liquidação que transfere essa acumulação para o saldo geral. O pagamento efetivo não cria um segundo custo. A documentação de isolada refere débito no saldo geral; a conciliação exata de equidade antes/depois da liquidação fica obrigatória antes da validação do motor temporal.

Comissões incidem sobre o nominal efetivamente executado. A tabela central consultada apresenta exemplos de primeiro nível de maker 0,02% e taker 0,05%, mas os artigos também mostram exemplos de outros níveis. O manifesto marca as taxas de conta como não confirmadas. Devem ser guardadas por fill ou por cenário, não aplicadas retroativamente a todo o histórico.

Fonte EEE de custos: https://support.kraken.com/pt/articles/fees-for-derivatives-trading-eea

Tabela atual: https://www.kraken.com/features/fee-schedule

## Liquidação parcial e global

O processo Multi-M inclui liquidação parcial, total e mecanismos subsequentes. A descrição de proteção de capital indica tentativas parciais em incrementos de 10% e custos dependentes da execução e do preço de equidade zero. A liquidação total tem encargo descrito em função da manutenção mínima. Não transpor o exemplo global com MM=1% para uma conta EEE com MM=5%.

O futuro simulador deve identificar o primeiro incumprimento de manutenção, distinguir esse evento de uma execução forçada total e terminar ou prosseguir apenas conforme a hipótese explícita de liquidação parcial. Não inventar o “Liquidation Margin” da conta nem prometer tempo para transferir margem.

Fonte: https://support.kraken.com/articles/360022835671-equity-protection-process-derivatives

Encargos: https://support.kraken.com/pt/articles/360048917612-fee-schedule

A carteira geral pode estar exposta em liquidação global. Acrescentar dinheiro à caixa contabilística não é o mesmo que depositá-lo na carteira Kraken ou atribuí-lo à margem isolada. Cada movimento deve indicar a localização efetiva ou que é apenas planeado.

## Garantias e validade

O manifesto inclui observações de USD, EUR, GBP e BTC com haircut e conversão, sem afirmar que são a lista EEE completa. USD tem haircut 0; EUR e GBP também constam com 0, mas exigem taxa cambial. BTC consta com haircut de 1% e conversão de 0,2%. O módulo bloqueia cálculo específico não-USD até existir valorização cambial implementada e testada; isto não elimina o requisito futuro de suportar registos noutras moedas.

Fonte: https://support.kraken.com/pt/articles/collateral-currencies-eea

O limite técnico de revisão é 24 horas a partir da observação pública, com expiração inclusiva. É uma política da aplicação, não uma validade garantida pela Kraken. Qualquer alteração oficial observada invalida a versão antes desse prazo. Faltam ao futuro mecanismo de atualização a recolha agendada e a comparação automática; o módulo deste bloco faz avaliação determinística da versão recebida.

## Contrato de utilização do módulo

- `load`: valida a estrutura/proveniência e devolve uma cópia imutável.
- `selectSchedule`: exige plataforma e tipo de cliente; nunca escolhe pelo IP ou idioma.
- `tierAt`: devolve o escalão publicado para um nominal de entrada decimal; não calcula margem.
- `validateOrder`: verifica metadados e limites do instrumento; não autoriza uma ordem.
- `assess`: exige instante UTC e âmbito explícito. Versão velha, produto incorreto, plataforma desconhecida ou valorização não suportada bloqueiam cálculo específico. Quando o âmbito está correto, o resultado continua “simulação aproximada”.

As permissões de recomendação específica, ordens e transferências são sempre falsas neste bloco. Não basta mudar uma flag para ativar essas capacidades: essa alteração é rejeitada pelo carregador V1.

## Critérios e próximos passos

Executar `node --test scripts/test-kraken-rules.cjs`. Os testes cobrem seleção EEE, fronteiras, precisão, lote/tick, expiração, fontes, instrumentos suspensos, modo isolado, classificação e imutabilidade. O teste de propriedades verifica 200 lotes e 200 perturbações de meio lote. Estes são testes de regras, não de rendimento ou de um motor de liquidação já terminado.

Critérios cumpridos: instrumento identificado, regras EEE separadas das globais, funding e preços com unidades, fontes e instante conservados, regras versionadas, estados incompletos/desatualizados bloqueados e testes reais.

Atualização de âmbito: não haverá leitura de conta Kraken. A aplicação de margem em alterações de posição, encargos de liquidação e contabilização temporal do funding serão validadas nos blocos do motor com exemplos independentes públicos e registos manuais. Não é requisito ligar uma conta. As estimativas continuam explicitamente aproximadas; esta especificação não declara o motor validado. Nenhuma migração de produção será aplicada sem backup e testes próprios.

O desenho seguinte mantém depósitos, margem e correções em eventos separados e preserva os projetos V1. A sequência segue para os blocos principais 2–15, com validação matemática e reconciliação por exemplos públicos nos blocos previstos. Não houve alteração de interface, pelo que não há um novo preview visual neste bloco.
