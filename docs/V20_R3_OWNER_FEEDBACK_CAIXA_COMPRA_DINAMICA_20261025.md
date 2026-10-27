# BTC Strategy Pro — Avaliação do proprietário R3.4: caixa e capacidade após compras

**25 de outubro de 2026 | Requisito de correção aceite para desenvolvimento técnico, sem aprovação de política financeira.**

## Pedido do proprietário
- [x] Compras nominais 20/30/50 e margem isolada
- [x] Entrada no piso de 60.000 USD bloqueada
- [x] Caixa e margem isolada são conceitos diferentes
- Alteração solicitada: **mostrar apenas o valor principal da caixa e, com esse valor, calcular quanto ainda é possível comprar após compras anteriores e após novas quedas do Bitcoin.** Evitar sugerir que dinheiro do capital inicial permanece integralmente disponível durante todo o plano.

A decisão financeira definitiva foi **expressamente NÃO APROVADA** no formulário. Não alterar automaticamente o Modo C/V20 nem publicar.

## Diagnóstico confirmado na V20

O `financial-engine.js` já expõe `cash.walletUSD`, `cash.spendableUSD`, `cash.isolatedMarginUSD`, `pnl.unrealizedGrossUSD`, `margin.isolatedEquityUSD`, `margin.maintenanceBufferUSD`. Transferências para margem subtraem à carteira livre; taxas e funding pago também subtraem; a simples desvalorização de uma posição isolada altera PnL não realizado e a equity da **posição**, não sendo uma nova despesa automaticamente deduzida à carteira livre do diário.

O conceito «disponível» mostrado pela Kraken pode ser um indicador **de margem/equity**, diferente da «caixa livre contabilística» interna; depende do tipo de carteira Kraken e do colateral. A app **não está ligada à conta**, pelo que não pode afirmar conhecer o disponível real da corretora. O ecrã deve rotular o saldo como calculado a partir dos movimentos inseridos, com data e tipo de saldo.

O planeador V20 já reserva margem para compras futuras, mas o utilizador precisa de ter um número central fácil e uma estimativa **por compra pendente** que considere as compras já efetuadas e a descida até ao nível de entrada. Não se deve subtrair a perda não realizada duas vezes.

## Implementação de QA sem alterar o produto

Ficheiros na branch `audit/v20-strategy-recovery-20261025`:
- `architecture/next-buy-capacity.cjs`: usa o motor original `financial-engine.js`, `position-risk.js` e `kraken-rules.js` para estimar, *sem escrever no diário*, uma próxima compra num preço de disparo. Reconstrói a caixa livre do diário, desconta funding pendente declarado e outras reservas, calcula perdas das posições existentes no preço de disparo, bloqueia se a manutenção fosse atingida **antes** da próxima compra, exige margem adicional suficiente após a compra e ao piso escolhido, contempla comissões e quantização de lotes, e calcula uma **estimativa conservadora de nominal máximo sob o teto de estudo**. Nenhum resultado concede execução ou garantia de liquidação.
- `scripts/test-next-buy-capacity-20261025.cjs`: 16 verificações.
- CI GitHub Actions https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40203983744: **219/219 testes aprovados**, 0 falhas, usando Node 24 e `decimal.js@10.6.0`. São 16 testes novos + os 203 previamente aprovados.
- Uma falha inicial dos novos testes revelou que o novo adaptador rejeitava PnL negativo; foi corrigida a leitura de `unrealizedGrossUSD`, mantendo o **valor negativo assinado** do motor V20, sem alterar motores financeiros preexistentes. CI reexecutada com sucesso.

### Exemplo de reconciliação

Capital registado 2.000 USD; margem efetivamente transferida 200 USD para uma posição long de 0,01 BTC a 100.000 USD; reserva protegida 100 USD. Sem taxas/funding no exemplo:

| Momento | Caixa livre do diário | Margem isolada transferida | PnL não realizado | Equity isolada |
|---|---:|---:|---:|---:|
| BTC a 100.000 | 1.700 USD | 200 USD | 0 USD | 200 USD |
| BTC a 97.000 | 1.700 USD | 200 USD | −30 USD | 170 USD |

O saldo da **equity** muda; a caixa livre contabilística não sofre nova dedução de 30 USD. Caso a Kraken mostre «disponível» inferior, o utilizador precisa de distinguir e reconciliar o campo com o seu modo de conta. Em BTC próximo de 80.000, a posição sem reforços pode atingir a manutenção **antes da nova compra**, bloqueando-a no modelo mesmo com saldo positivo na carteira.

## Regras obrigatórias para a interface R4

1. **Um número principal grande:** «Caixa livre estimada para novas compras: X USD». Base: `ledger.cash.spendableUSD` após os movimentos manualmente confirmados, descontando funding pendente **se conhecido**. Não é automaticamente o saldo oficial de margem disponível na Kraken.
2. Linha pequena de contexto, expansível e sem ruído: capital inicialmente registado; transferências reais de margem; reserva de segurança; comissões/funding; equity isolada e perdas não realizadas; data do mark. Não esconder riscos atrás de um único valor.
3. Na secção das compras da estratégia, por etapa: preço de disparo, nominal planeado, quantidade quantizada, saldo estimado nesse momento, margem extra exigida, custo/taxa e **«Pode comprar neste cenário?»**. Se não, apontar se é por fundo insuficiente, risco de liquidação **antes** da compra, regra do piso, lote/tick inválido ou regras Kraken desatualizadas.
4. Recalcular a sequência integral do plano após qualquer compra real inserida, venda, taxa, funding, depósito na caixa ou **transferência efetiva de margem**; não assumir que reforços planeados já foram efetuados. Uma ordem preenchida parcialmente deve consumir apenas a parte executada; uma ordem planeada não equivale a trade.
5. **Não prometer compra máxima real na Kraken**: calcular «até X USD nominais sob hipóteses», com teto de pesquisa informado. Se o utilizador inserir manualmente o saldo disponível visto na Kraken, tratá-lo no futuro como limite adicional conservador com origem/data, não como verdade sincronizada.
6. Não utilizar dados de snapshot Kraken desatualizado para aprovar uma compra e não ocultar a eventual liquidação anterior ao nível pretendido.
7. **Modo leitura/QA até decisão financeira explícita.** Restauro da Demo original no R4 sem substituir UI aprovada por formulários genéricos.

## Aceitação e continuação

- **Feedback funcional R3.4 recebido**; o problema foi reproduzido como requisito e validado no motor de QA. **Não está integrado na aplicação online**, porque R4 é a fase de interface.
- Bloco R3 mantém **fecho técnico**, mas o gate de aceite financeiro **não foi concedido**.
- **Contagem do plano não muda: 14/34 etapas técnicas**. Este esforço é correção derivada da validação R3.4, não etapa adicional do plano. R4.1 deve recuperar a Home da Demo e adotar o cartão de caixa livre.
- Não houve merges, deploys, alteração ao Supabase, carteira ou regras de perfil Beta.

## Referências públicas
- Kraken multi-collateral EEE, diferença cross/isolated: https://support.kraken.com/au/articles/multi-collateral-derivatives-contracts-eea
- Kraken Multi-M: margem, PnL e liquidação isolada: https://support.kraken.com/au/articles/4844463246100-margining-liquidations-multi-collateral-derivatives
- Kraken Glossary: diferença entre available margin e margin equity: https://support.kraken.com/articles/4975925630484-derivatives-trading-glossary
