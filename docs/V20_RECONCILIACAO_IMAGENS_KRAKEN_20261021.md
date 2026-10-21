# Reconciliação das três imagens Kraken — 21/10/2026

Transcrição visual das imagens enviadas pelo utilizador, sem importar movimentos para a carteira. Não se guardam imagens, IDs de negociação ou IDs de ordem no repositório público. As taxas são valores exibidos, possivelmente arredondados.

| Imagem | Quantidade | Preço de execução USD | Nominal USD | Taxa USD |
| --- | --- | --- | --- | --- |
| 208598 — Comprar | 0.0024 BTC | 84356 | 202.4544 | 0.1012 |
| 208600 — Vender | 0.0024 BTC | 84625 | 203.10 | 0.1016 |

Os dois nominais coincidem com quantidade × preço. Se as duas execuções forem a compra e o fecho correspondente, nessa ordem e sem outras operações intervenientes: lucro bruto = 0.0024 × (84625 − 84356) = 0.6456 USD. Taxas visíveis = 0.2028 USD. Resultado após essas taxas = 0.4428 USD, antes de funding e outros custos não apresentados. As imagens não demonstram o emparelhamento nem a cronologia; a app não deve conciliá-las automaticamente só pela quantidade igual.

A imagem 208596 mostra outra posição LONG encerrada: 0.0022 BTC, abertura 82038 USD, fecho 83392 USD e PnL de +2.9788 USD. A multiplicação independente 0.0022 × (83392 − 82038) coincide exatamente com esse PnL. Não se associa esta posição às duas execuções de 0.0024 BTC.

A taxa exibida nessa posição é 0.09173 USD e o funding exibido é +0.00 USD. Subtrair apenas essa taxa produz 2.88707 USD, mas não estabelece o lucro líquido completo: falta confirmar se a taxa inclui toda a abertura/fecho e se existem outros movimentos. Funding exibido a duas casas pode esconder frações; não prova saldo exato nulo no extrato.

As taxas são compatíveis com 0.05% do nominal, após arredondamento de apresentação. Isto não confirma maker/taker, escalão de taxas ou precisão do débito no extrato; não se altera a tabela de regras com base nesta compatibilidade.

A documentação oficial de PnL linear usa quantidade × (saída − entrada). Não se multiplica novamente este resultado por 10: a quantidade já determina a exposição. O nominal chamado “Custo” nestas imagens é quantidade × preço; não demonstra a margem efetivamente atribuída.

Fontes oficiais consultadas:
- https://support.kraken.com/articles/360022835511-calculation-of-profit-and-loss-derivatives
- https://support.kraken.com/articles/perpetual-contract-specifications-for-clients-in-the-eea

As imagens mostram BTC Perp/BTCUSD e “CFL” nas execuções, mas não mostram símbolo API completo, jurisdição da conta, margem isolada/cross, alavancagem selecionada ou liquidação. Não confirmam a aplicabilidade à conta da configuração EEE/10×/isolada do projeto. Não é necessário ligar a conta Kraken para transcrever estes valores; um extrato completo ou os detalhes da posição permitem conciliar os campos em falta mais tarde.

## Testes

`scripts/test-kraken-screen-reconciliation.cjs` verifica os dois nominais, o resultado condicional do par após taxas visíveis, o PnL bruto da posição encerrada, a subtração parcial da taxa e a compatibilidade dos arredondamentos. Usa o motor existente com capital, margem, contrato e horas explicitamente fictícios de QA, não inferidos das imagens. Não valida liquidação ou margem contra a Kraken.

Uma primeira fixture usava um nome de ciclo fora do esquema e foi recusada por INVALID_CYCLE. Corrigiu-se o identificador da fixture para cycle-1; não se alterou o motor para aceitar dados inválidos.
