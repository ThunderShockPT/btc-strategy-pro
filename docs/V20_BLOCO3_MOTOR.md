# V20 — Bloco 3: motor financeiro único

21/10/2026 · Versão `v20-core-3.1` · USD · LONG PF_XBTUSD · Registos manuais.

## Resultado e integração

`financial-engine.js` acrescenta um motor puro de reconstrução, separado das páginas. Recebe factos, regras versionadas e um mark tipado; devolve saldos, posição conjunta, PnL, requisitos de margem e reservas. Não lê ou escreve LocalStorage, Supabase ou contas de corretoras, nem executa ordens ou transferências.

O módulo não está ainda carregado na V19.1. A migração de dados continua apenas preparada e testada em ambiente isolado. Dashboard, estratégias e simulador serão ligados ao mesmo motor nos blocos de integração e interface, em vez de ativar parcialmente cálculos novos numa página enquanto as outras mantêm os antigos.

## Precisão e unidades

Dependência `decimal.js@10.6.0`, fixada no package-lock. O motor usa um construtor próprio com 80 algarismos significativos e arredondamento half-even, isolado da configuração global da biblioteca. Montantes, preços e quantidades entram como strings decimais sem notação exponencial, com até 18 casas. Não se aceitam valores monetários JavaScript Number.

Lotes/ticks do contrato são verificados depois de retirar apenas zeros decimais não significativos, sem arredondar uma quantidade inválida. O motor aceita execuções em quantidade BTC; o nominal é derivado de quantidade × preço. Não deduz quantidade de um nominal introduzido em USD usando floats. A interface futura terá de propor uma quantidade executável e explicar a diferença de nominal causada pelo lote.

Os resultados derivados são strings arredondadas a 24 casas; não são factos para reintroduzir no livro. Divisões com dízimas usam a precisão de 80 algarismos, não aritmética racional infinita. As invariantes internas toleram apenas erro inferior ou igual a 10^-60, sem usar essa tolerância para aceitar uma venda sem BTC ou criar saldo. O fecho total atribui toda a base remanescente, evitando resíduos artificiais de custo.

Arredondamentos efetivos da corretora e eventuais ajustes de liquidação monetária continuam a exigir cenários/testes próprios. Este motor de estimativas não afirma reproduzir o razão oficial de uma corretora.

Documentação da biblioteca: https://mikemcl.github.io/decimal.js/

## Contrato de entrada

`reconstruct` recebe `projectId`, `ownerId`, `scenarioKey`, `platform`, `clientType`, `rules`, `events`, `valuation` e, opcionalmente, `reservations` e `includeTrace`.

- Cenários aceites: `manual_long` e `demo_long`, sem mistura entre eles. Os cenários legados continuam bloqueados até revisão/conversão explícita.
- Cada evento segue o envelope do Bloco 2: UUID, proprietário/projeto/cenário, origem, revisão decimal inteira como string, idempotência, datas UTC e esquema 1.
- Datas efetivas são ordenadas cronologicamente, com revisão como desempate; data de registo é conservada separadamente. Uma venda anterior à compra é recusada mesmo que tenha sido introduzida depois.
- Eventos com data efetiva posterior à avaliação são recusados como factos futuros; devem permanecer no plano. A avaliação é uma reconstrução dos factos fornecidos, não uma consulta bitemporal do que era conhecido em cada data.
- O chamador deve fornecer o conjunto completo do diário selecionado. A sincronização do Bloco 12 deverá verificar completude, revisão esperada e conflitos; este módulo não autentica pedidos.
- IDs, revisões e chaves de idempotência repetidos são recusados. Não são silenciosamente ignorados, para não esconder uma importação incorreta.
- A cotação exige `markPriceUSD`, origem e instante. Os tipos aceites são sintético, mark público e mark manual. Um preço spot não pode fingir ser mark. A recolha de preços públicos e a sua frescura na interface permanecem por implementar.
- A plataforma de regras é um cenário EEE manual, sem ligação ou leitura de uma conta Kraken. Regras fora do âmbito ou expiradas bloqueiam esta avaliação específica.

## Factos suportados

| Tipo | Factos específicos |
|---|---|
| `opening_balance` | `amountUSD`, `currency=USD`; um único saldo inicial, que pode ser zero |
| `capital_deposit` / `capital_withdrawal` | `amountUSD`, `currency=USD` |
| `margin_add` | `amountUSD`, `currency=USD`, `purpose=initial/additional` |
| `margin_remove` | `amountUSD`, `currency=USD` |
| `trade_buy` | Símbolo, quantidade BTC, preço USD, ciclo numerado e `executionStatus=executed` |
| `trade_sell` | Símbolo, quantidade, preço, estado executado, destino do PnL e ciclo ou atribuições de ciclos |
| `fee` | Montante, moeda, categoria; comissão de trading referencia uma execução anterior |
| `funding` | Montante liquidado, moeda, direção paga/recebida e ID único de liquidação |

Uma execução parcial de uma ordem é um fill executado pela quantidade realmente preenchida. A parte pendente não entra no livro de factos. Não existe a antiga limitação de três registos de compra: as três etapas pertencem ao plano 20/30/50; cada etapa pode conter vários fills.

Taxas não podem ser escondidas dentro do facto de compra/venda e descontadas outra vez como evento fee: campos extra são rejeitados. Uma comissão de trading só pode ser registada uma vez por execução nesta versão. Rebates, comissões em outras moedas e múltiplas componentes de taxa da mesma execução exigem extensão explícita, não um depósito de capital fictício.

O ID de funding identifica uma liquidação concreta, não apenas uma hora. Assim, vários pagamentos realizados por alterações de posição na mesma hora podem ser registados separadamente. Ainda não há acumulação ou previsão temporal automática: isso pertence ao Bloco 9.

## Posição e PnL

Para cada fill de compra: quantidade soma a quantidade BTC e base soma quantidade × preço. A média é base/quantidade, ponderada por BTC. Todas as compras LONG do contrato formam uma posição conjunta; os ciclos são atribuições internas de quantidade, não margens ou liquidações independentes.

Uma venda parcial atribui base proporcional à quantidade vendida. Uma venda de vários ciclos usa atribuições explícitas cuja soma tem de coincidir com o fill e não pode ultrapassar o saldo de nenhum ciclo. O PnL usa a média da posição conjunta. O fecho total deixa quantidade e base em zero.

PnL bruto realizado = nominal da venda − base atribuída. PnL bruto não realizado = quantidade aberta × mark − base remanescente. O resultado líquido da conta agrega os dois, deduz taxas pagas e inclui funding líquido liquidado, uma só vez. As taxas de posições ainda abertas já pagas são custos da conta, não “taxas de venda” inventadas.

O utilizador tem de declarar onde ficou o PnL realizado: carteira geral ou saldo isolado. O valor só é lançado nesse destino. O motor não presume uma transferência real em nome do utilizador. No fecho total, margem ainda registada permanece identificada como por devolver até existir um movimento `margin_remove`. A interface futura pode preparar esse movimento numa operação composta, mas não pode duplicá-lo.

Fórmula linear e distinção entre preço de avaliação e execução: https://support.kraken.com/articles/portfolio-management-eea

## Caixa e conservação financeira

O nominal de um futuro não é descontado da carteira como uma compra spot. A carteira só muda com saldo inicial, depósitos/retiradas, transferências de margem, PnL liquidado no destino declarado, taxas e funding.

Invariantes verificadas após cada evento:

`carteira + saldo isolado = contribuições líquidas + PnL bruto realizado − taxas + funding líquido`

`equidade total = contribuições líquidas + resultado líquido total`

Quantidade e base não podem ser negativas; a quantidade dos ciclos tem de somar a posição conjunta. Vendas acima da quantidade disponível, carteira negativa e retirada de margem superior ao saldo isolado são bloqueadas.

Reservas de ordens, adições futuras de margem e segurança são afetações da carteira, não ativos adicionais. Se o plano reservar mais do que existe, o motor mantém o saldo factual, apresenta a insuficiência e devolve zero disponível para novos compromissos. Não altera o histórico para fazer caber o plano. A aprovação de novos depósitos, retiradas ou compromissos pela interface pertence aos blocos respetivos.

## Margem e limitações de risco

IM e MM usam a tabela EEE versionada e o nominal de entrada da posição. A seleção 10× é distinta da alavancagem efetiva. Novas compras exigem a margem inicial nominal já atribuída no livro; esta é uma condição necessária, não uma prova de admissibilidade da ordem durante uma trajetória de preços adversa.

O resultado mostra equidade isolada ao mark, folga de manutenção, insuficiência de margem nominal inicial, alavancagem efetiva baseada no nominal de entrada e, separadamente, exposição ao mark/equidade. Um incumprimento ao mark não cria automaticamente uma venda ou liquidação histórica.

`estimatedLiquidationUSD` continua null. A simulação cronológica antes/depois de reforços, a admissibilidade de retiradas de margem em posições abertas, gaps e a raiz de liquidação serão implementados no Bloco 4. Não interpretar o estado “não violado ao mark” como garantia de segurança do plano.

Correções, anulações e reversões ainda não são resolvidas aqui: eventos de controlo são recusados até o Bloco 8 produzir e testar a projeção auditável correta. Não se ignora uma correção para calcular um saldo aparentemente válido. O adaptador legado também não ativa posições automaticamente.

## Exemplos e testes

1. 2 000 USD iniciais; 100 transferidos para margem; compras nominais 200/300/500 a 100 000 por BTC; taxas 0,50. Posição: 0,01 BTC, média 100 000. Carteira: 1 899,50; margem: 100. Ao mark 105 000, PnL não realizado: 50; equidade: 2 049,50.
2. Comprar 0,01 BTC a 100 000 e 0,01 a 80 000: média 90 000. Vender 0,005 a 110 000: base atribuída 450, PnL realizado 100, base restante 1 350. Fechar os 0,015 restantes a 100 000 realiza mais 150. PnL realizado total: 250. Libertar os 180 de margem não cria outro lucro.
3. Adicionar 500 à carteira depois de compras: contribuições sobem para 2 500; quantidade, média e margem isolada mantêm-se. Transferir depois 50 para margem reduz carteira em 50 e aumenta margem em 50, sem aumentar contribuições.

`node --test scripts/test-financial-engine.cjs` cobre estes exemplos, fundos insuficientes, ordens pendentes, precisão, tabelas de margem, taxas/funding duplicados, âmbito, cronologia e imutabilidade. Inclui 100 carteiras completas comparadas com um oráculo independente de fluxos em inteiros, 100 repetições de compras/fechos com dízimas e 2 501 factos reconstruídos duas vezes com o mesmo resultado.

São testes do motor matemático manual, não uma reconciliação com uma conta Kraken, teste visual, validação de probabilidades ou aprovação de publicação. Os testes dos blocos anteriores continuam obrigatórios.

## Próximo bloco

Bloco 4 — liquidação estimada, margem isolada e cálculo inverso, com eventos cronológicos e cenários de falha. Faltam 12 blocos principais, do 4 ao 15. O feed público, a interface nova, a ativação cloud e o lançamento continuam nos blocos previstos; nenhuma conta de corretora será ligada.
