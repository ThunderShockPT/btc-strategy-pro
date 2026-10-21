# Correção da prévia — preços e ordem das compras

Pedido do proprietário: reforços em descida, referência de preço clara, plano compreensível. Cenário reportado: 200 USD, Equilibrado, piso 83 000 USD; referência sintética 100 000 USD.

## Resultado

- Nova carteira exige escolher explicitamente a referência. Não há referência 100 000 aplicada por omissão.
- Campo manual USD inteiros (tick do contrato) ou adoção explícita da cotação pública Coinbase Exchange BTC-USD. A cotação não desloca planos nem pisos guardados.
- Referência escolhida aparece antes dos resultados. Cotação spot é apresentada separadamente, com origem/hora. Não é mark Kraken. Se a referência excede a cotação disponível, a revisão avisa que os níveis não são indicações para comprar agora.
- Lista de compras pendentes ordenada por preço descendente; entrada, primeiro e segundo reforço identificados; descida percentual, quantidade executável e margem incremental do motor.
- Plano mantém os ciclos paralelos existentes, explicitamente explicados. Não foi alterada a política aprovada nem imposta uma regra nova de concluir um ciclo antes de iniciar outro. Distribuição 20/30/50 acessível por ciclo. Custos e detalhes da posição em secção expansível.
- Orçamento nominal e montante executável separados (exemplo: orçamento 30 USD, compra 29,55 USD após truncagem ao lote).
- Histórico existente e confirmações SHA permanecem intactos. Fontes financeiras continuam a ser os mesmos módulos.

## Dados públicos e limites

Documentação oficial consultada em 21/10/2026:
https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-ticker
GET https://api.exchange.coinbase.com/products/BTC-USD/ticker

Pedido público sem credenciais, timeout 4 segundos, consulta a cada 5 segundos enquanto a página está visível. Valida preço decimal positivo e instante da negociação com idade máxima 15 segundos; futuro/reposta inválida/erro ou timeout desativam adoção. Reavalia ao regressar à página. Não promete ausência de atraso nem recolha contínua com a aplicação fechada. A documentação recomenda WebSocket para streaming; integração persistente/reconexão é trabalho posterior, não simulada como concluída.

Ao adotar a cotação, apenas o preço de referência é copiado (arredondado por defeito ao tick inteiro), por ação do utilizador. Spread, profundidade, observações e execução continuam sintéticos e identificados. A data técnica do cenário Demo continua a da fixture; a data da cotação pública é mostrada separadamente. Não se passa a recomendar um plano real com observações históricas inventadas. Regras atuais para utilização real, dados de volatilidade/liquidez adequados e auditoria independente continuam pendentes.

## Validação

Regressão reproduzida: 7 ciclos, 21 compras; margem adicional 135,0525 USD; caixa não comprometida 14,187475 USD. Intervalo da lista: 100 000 a 95 200 USD. Primeiro ciclo 100 000 / 98 500 / 97 000 USD. Soma das margens incrementais mais margem inicial coincide com o total do motor.

Testes novos: referência diferente altera entradas sem alterar a fixture; dados inválidos, cotação antiga/futura, ordem descendente e histórico existente preservado. Testes do Worker continuam a executar a confirmação real com Web Crypto; navegador HTTP apenas cálculo, sem contornar segurança.

Execução alargada encontrou impedimento ambiental no script legado test-mobile-layout.cjs: binário Chromium ausente. Não é classificado como teste aprovado. QA desta prévia usa navegador gerido por CUA, incluindo larguras de iframe, sem alegar ensaio físico S25/PWA.

Faltam os blocos principais 11–15. Esta correção é um checkpoint anterior à continuação da renovação visual; não significa conclusão da aplicação nem publicação em main.
