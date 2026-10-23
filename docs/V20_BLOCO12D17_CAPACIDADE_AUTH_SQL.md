# Bloco 12D17 — capacidade do fluxo Auth/SQL real

A suite descartável passa a executar quatro cargas em jobs independentes, com bases PostgreSQL e GoTrue próprios. Cada job percorre autenticação, isolamento, fila, avanços, resultado, revisão e confirmação usando relógio real. O código de produção e a validade das fontes não são alterados.

| Caso | Movimentos | Limite de ciclos | Critério do teste |
| --- | ---: | ---: | --- |
| baseline | 3, com posição aberta | 1 | Concluir e confirmar |
| medium-12 | 1000, compras/vendas/fees | 12 | Concluir e confirmar |
| large-1 | 5000, compras/vendas/fees | 1 | Concluir e confirmar |
| large-12 | 5000, compras/vendas/fees | 12 | Medir conclusão ou bloqueio por prazo |

No caso máximo, um teste verde pode representar bloqueio correto por expiração: o campo `outcome` é obrigatório para interpretar a capacidade. `expired` ou `admission-rejected` não aprovam conclusão e não têm igualdade de resultado completo. A suite exige estado financeiro intacto e zero recibos de confirmação nesses casos. Erros que não sejam as rejeições temporais previstas continuam a falhar o teste.

As cargas são inventadas para QA. Regras e datas são geradas de forma coerente, com a observação das regras anterior aos trades e todos os movimentos anteriores à avaliação. Os IDs de fees e os vínculos do inventário são preservados ao mudar a identidade da carteira. Não há duplicação de snapshots de regras por compra, nem retimestamping de fontes ou histórico reais. Os testes locais verificam 5000 IDs únicos, referências de fees, PnL/fees exatos, quantidade final e o vínculo da posição aberta do caso pequeno.

O cálculo direto usado como comparação é executado depois da confirmação e fora do intervalo medido. O intervalo principal vai do início do enqueue à resposta da confirmação idempotente; inclui leitura do checkpoint pelo teste e os pedidos concorrentes, mas exclui instalação, preparação das contas/base, espera pela fronteira e cálculo direto de comparação. O cliente HTTP de QA usa ligações novas, incluindo o custo TCP no tempo de cada pedido, para evitar corridas de keep-alive durante esperas ou comparação síncrona no mesmo processo. Erros de transporte registam a ação e código, sem tokens. Os pedidos HTTP têm máximos e totais por ação; somas podem sobrepor-se nos dois pedidos concorrentes.

`maxCycles` é um limite de pesquisa: o relatório distingue esse limite do número de ciclos novos selecionados e do número de candidatos. Não se afirma que todos os casos aprovem 12 ciclos financiados.

Após confirmar e comparar, a suite pode aguardar outra janela para o teste de logout; essa espera fica fora do intervalo medido. O caso que expire termina após provar o bloqueio, sem executar confirmação ou marcar a revogação como testada nessa carga. Revogação continua coberta nos casos concluídos e no ensaio 12D16.

Os relatórios JSON `REAL_AUTH_SQL_QA` são extraídos dos logs da CI e registados no PR. Não são métricas do Edge alojado: o laboratório usa loopback, Node, fontes sintéticas e pools de QA. CPU por isolate, memória de pico, TLS, ingresso e desempenho alojado continuam por validar. O Bloco 12 permanece aberto, seguido de 12E–12I e teste S25 antes do Bloco 13.
