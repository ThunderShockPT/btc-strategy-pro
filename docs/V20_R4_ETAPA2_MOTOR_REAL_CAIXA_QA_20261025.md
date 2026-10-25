# BTC Strategy Pro — Bloco R4, Etapa 2/4 (25/10/2026)

**Estado: implementação e QA de laboratório concluídos. Não publicada e sem aprovação de política financeira.**

## Código entregue

- `previews/v20-r4-bloco8-real-engine-ledger-20261025.html`: cópia fiel da **Demo Bloco 8**, com velas, radar, cartões, ações e estilo premium preservados, mais um cartão compacto «Caixa livre estimada» (valor principal). Detalhes financeiros ocultos até abrir o painel.
- O HTML é autónomo e transporta o **worker financeiro original de V20 do arquivo da Demo 24/10**, com Decimal v10.6.0, `kraken-rules`, `journal-projection`, `financial-engine`, `position-risk`. O ecrã chama `BTCFinancialEngine.reconstruct`, `BTCPositionRisk.estimate`, `BTCFinancialEngine.marginRequirements`, `BTCKrakenRules.validateOrder` e `BTCPositionRisk.requiredMarginForFloor` para **calcular a caixa e a capacidade**, sem emitir ordens ou gravar dados.
- Operações fictícias em diário apenas na memória: compra, venda, depósito na caixa, margem +/−, comissão, funding e reset. O motor rejeita erros sem gravar o evento; a cotação e a próxima compra são cenários manuais.
- A próxima compra é bloqueada se a posição existente atingisse manutenção antes da entrada, se violar piso/tick/lote ou se não houver caixa para margem extra/taxas; o limite nominal calculado tem teto didático de 5.000 USD e **não é poder de compra oficial Kraken**.

## Resultados QA no navegador

- **6/6 resoluções Chromium:** 320, 390, 393, 430, 768, 1440 px; zero exceções JS e zero overflow horizontal.
- Todas as seis repetiram a sequência: caixa 1.700; mark BTC 100.000→97.000: PnL não realizado −30 sem mexer na caixa; comissão −50→1.650; margem +100→1.550; depósito +500→2.050; funding −10→2.040; compra de 0,001 BTC e venda parcial de 0,001 BTC→**2.037,27** de caixa livre após contabilização de custo médio; teste de risco antes da compra; reposição.
- 3 ensaios de rejeição adicionais: transferência de margem superior ao saldo, venda superior ao BTC da posição e compra inferior ao lote mínimo. Todos rejeitados pelo **motor V20**, sem modificar a caixa; uma operação válida seguinte funcionou.
- Corrigida incompatibilidade do adaptador com a **precisão de até 24 casas decimais** devolvida pelo core depois de uma venda parcial. O core original e os parâmetros ativos não foram alterados.
- O motor financeiro base já tinha **219/219 regressões CI** verificadas no run https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40203983744. O HTML novo teve **QA em Chromium local**, não CI remota nesta etapa.

## Limitações imprescindíveis

1. **Não lê a conta Kraken nem Supabase**; todos os movimentos ficam num diário fictício apagado ao recarregar.
2. O snapshot Kraken é histórico (20/10/2026), e a data sintética da demonstração é congelada nessa janela, **sem falsificar uma validação atual**. Nenhuma compra é autorizada para hoje.
3. A caixa é `ledger.cash.spendableUSD` após reservas; pode diferir do «available margin» da Kraken. PnL não realizado reduz equity isolada, sem dupla dedução da carteira.
4. A previsão da compra é **estática** e não certifica sobrevivência na Kraken em gaps, saltos de mark, funding futuro, liquidação parcial ou atrasos de transferência. Os gráficos e o radar históricos da Demo continuam ilustrativos e **ainda não estão ligados ao mesmo diário**.
5. A seleção financeira R1.4/R2.4 continua **NÃO APROVADA**. Nenhum deploy, merge, alteração a `main`, migração, credencial, saldo ou plano financeiro ativo.
6. Teste em **Samsung S25 físico**, e integração efetiva da carteira autenticada, ainda por fazer.

## Seguinte

**R4.3** — estruturar os cinco menus definitivos (Início, Estratégias, Mercado, Risco, Conta), preservar o terminal e o histórico da Demo e continuar a integração UI com as partes do V20 já testadas, sem formatação cloud genérica. **16 de 34 etapas com entrega técnica**; os gates humanos não ficam automaticamente aprovados.
