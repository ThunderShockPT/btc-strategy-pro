# 12D7A — histórico público e livro de ordens

21/10/2026. PR #29, branch `feat/v20-public-history-orderbook`. Base: `41760755e9ae589389399701e43a625674abbd0b`. Código/configuração testados: `448573c22ba6b9be5a2787299a578b685c2ebd0d`.

## Implementação e fontes confirmadas

O novo collector backend usa apenas dois GETs públicos fixos de PF_XBTUSD:

- Livro: `https://futures.kraken.com/derivatives/api/v3/orderbook?symbol=PF_XBTUSD`.
- Histórico: `https://futures.kraken.com/api/charts/v1/mark/PF_XBTUSD/1m?count=65`.

Documentação oficial consultada nesta entrega:

- [Get orderbook](https://docs.kraken.com/api-reference/market-data/get-orderbook).
- [Market Candles](https://docs.kraken.com/api-reference/candles/market-candles).
- [Resolutions](https://docs.kraken.com/api-reference/candles/resolutions).
- [Especificações EEE](https://support.kraken.com/pt/articles/perpetual-contract-specifications-for-clients-in-the-eea), como referência do contrato; não se atualizaram margens ou regras contabilísticas nesta entrega.

As APIs consultadas são públicas, sem autenticação. Não houve ligação de contas Kraken ou acesso a ordens privadas. As respostas não identificam obrigatoriamente o símbolo; o vínculo resulta do URL fixo, explicitamente registado nas limitações.

## Livro de ordens

O collector valida preços/tamanhos positivos, limites de payload/níveis, ausência de preços duplicados equivalentes e livro não cruzado. Ordena asks em ordem ascendente e bids descendente.

A documentação consultada descreve bids descendentes, mas o primeiro ensaio real devolveu-os ascendentes: 2032 níveis de compra e 1193 de venda. A fixture preserva a resposta completa para testar essa diferença. O parser não confia na ordem recebida nem conta duas vezes preços equivalentes como 100 e 100.0.

Os tamanhos são conservados como `contract-size-as-reported`. Ainda não são convertidos em quantidade BTC ou orçamento de liquidez elegível. `depthBudgetUSD` permanece null, e `profileContextEnabled` false. O livro visível pode desaparecer e não garante execução a qualquer preço.

## Histórico de marcação

São conservados OHLC e limites originais dos intervalos de um minuto. O candle em formação é excluído. São exigidos pelo menos 61 candles completos, sem duplicação ou lacunas, para uma sequência de fechos que pode abranger uma hora. Dados incompletos, incoerentes, futuros ou antigos são recusados; não existe interpolação.

O último limite fechado tem de estar a não mais de 60 segundos do relógio de receção. A resposta conserva `receivedAt` e `observedThrough`, sem reatribuir ao preço histórico um instante atual.

OHLC de um minuto não é uma sequência contínua de ticks. A ordem intraminuto do máximo e mínimo é desconhecida; o collector não inventa movimentos entre esses extremos. Também não apresenta closes históricos como preço de execução ou último mark atual. A transformação em observações para o perfil e a montagem coerente com o ticker continuam por ligar.

## Rede, cache e limites

Os dois pedidos podem correr em paralelo e são partilhados por chamadas concorrentes no mesmo worker. Payload máximo de 1 MB por resposta, timeout por defeito de 3 segundos, cache máximo de 5 segundos. Há validação de frescura e relógio também após a leitura; cache expirado obriga a nova consulta. Uma falha não devolve silenciosamente dados antigos.

O transporte não envia credenciais, não segue redirects e só usa os dois URLs fixos. Estes controlos não prometem disponibilidade ou latência constante, nem aprovam o volume de pedidos com muitos workers.

## Resultados executados

| Execução | Resultado observado |
| --- | --- |
| Collector específico final | 14/14, zero falhas/ignorados |
| Regressão V20 local | 567/567, zero falhas/ignorados, 76,56 s |
| Controlos V19 | 386: Auth 19, cloud 26, release 38, responsividade 37, planeador 266 |
| PostgreSQL 17 nativo em QA | 23/23, zero falhas/ignorados; sem alteração SQL nesta entrega |
| Ensaio real, timeout configurado de 10 s | Sucesso em aproximadamente 4,84 s: 64 candles completos, um candle em formação excluído, 2022 bids e 1239 asks |
| Ensaio real separado, timeout normal de 3 s | Falhou com `PUBLIC_OBSERVATION_TIMEOUT`, após aproximadamente 3,01 s |

Não se declara aprovado o funcionamento de produção com o timeout normal. O sucesso com prazo maior não foi usado para alterar o prazo por defeito ou esconder a falha. O caminho continua bloqueado para contexto automático de perfis.

Os dois ensaios estão preservados em `docs/qa/V20_12D7A_PUBLIC_PROBES.json`, com timestamps UTC originais. A fixture `scripts/fixtures/public-observations-20261021.json` é replay de respostas públicas capturadas; o seu relógio de replay não é uma nova receção de rede ou verificação atual.

PostgreSQL: workflow `39661117509`, job `119434051910`, no commit de código acima. Os casos existentes de sessão, isolamento, concorrência, reconstrução, rollback e restauro passaram. O job de regras remoto ainda estava em execução na recolha deste registo; o seu resultado não é pressuposto.

## Decisão a aprovar antes de ligar os perfis

O ponto 23 da prompt mestre pede aprovação antes de fixar decisões importantes de risco. A definição de liquidez utilizável influencia os orçamentos e o número de ciclos; não deve ser a soma indiscriminada de todas as ofertas, incluindo preços distantes.

| Opção | Efeito e compromisso |
| --- | --- |
| 1 — só a melhor oferta de venda visível, proposta recomendada inicialmente | Mais conservadora; pode limitar o orçamento/ciclos e exigir nova avaliação quando o nível mudar. Não garante que essa oferta continue disponível. As percentagens de participação aprovadas dos perfis mantêm-se. |
| 2 — várias ofertas dentro de uma faixa limitada | Pode admitir mais liquidez; exige escolher explicitamente o limite de preço e contabilizar o slippage. Não está implementada nem aprovada. |

Nenhuma das opções foi ativada. Depois da decisão faltam o mapeamento de unidades com as regras válidas do contrato, o contexto coerente entre ticker/livro/histórico e a resolução da latência observada. A opção recomendada não é uma garantia contra perdas ou liquidação.

## Estado de lançamento

Sem deploy, migração, merge para main ou alteração da interface/preview. A política cloud mantém todos os gates fechados. O collector ainda não é usado para criar planos reais. Não se atualizaram datas de verificação das regras Kraken a partir destas cotações.

Continuam seis etapas do Bloco 12 contando a atual; quatro blocos principais contando o 12. O teste conjunto no Samsung S25 mantém-se após a conclusão e validação do Bloco 12, antes do 13.
