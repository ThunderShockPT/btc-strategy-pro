# Importação manual e reconciliação de posição aberta — 25/10/2026

Implementação em continuidade do PR #34, sobre c60d19fc5a33b7f06294d688a035727e51fe01f3. R04 permanece parcial até à validação do navegador e do ambiente alojado. Não é aprovação do Bloco 12, do S25 ou de produção.

O novo formulário permite reconstruir uma carteira separada com saldo inicial, transferências reais de margem, compras, vendas, depósitos, retiradas, custos e funding. Exige histórico completo declarado e reconciliação exata de caixa, margem atribuída, quantidade BTC e custo da posição aberta. Não cria operações presumidas a partir de um saldo final. As comissões de cada execução são explícitas, mesmo quando zero.

A confirmação autentica a sessão, revê a proposta congelada e grava os factos com recibo idempotente numa transação. Não aprova ciclos novos, reservas ou admissão de estratégia. O plano subsequente continua sujeito à admissão estrita e à aceitação explícita. O piso é indicado pela pessoa e preservado na revisão subsequente.

As fontes históricas vêm exclusivamente do servidor: regras versionadas e capturas públicas efetivas de 20/10 e 24/10, ou regras correntes quando já eram observadas na data da execução. Datas sem cobertura são recusadas; não se alteram datas das fontes. Limite explícito desta interface: 250 movimentos e 64 KB por pedido. Não é importação automática de ficheiros Kraken, nem integração de conta da corretora. Não substitui nem reduz o ensaio financeiro de 5000 movimentos/12 ciclos.

Para a importação, o contexto público usa regras e mark atuais. O livro de ordens e as velas não são necessários para gravar factos históricos; a validade continua limitada às fontes efetivamente usadas, sem prolongamento arbitrário.

Validação local: 30 testes direcionados aprovados, incluindo oito novos testes de importação/reconciliação, criação atómica de carteira separada, recuperação de resposta perdida, divergências, fontes históricas ausentes, expiração e sessão revogada. Builds da aplicação e runtime concluídos. Nenhuma migração aplicada, função alojada alterada, confirmação financeira do proprietário executada ou publicação realizada nesta entrega.

Pendente antes da disponibilização: teste browser do formulário completo e navegação em diálogo, reconciliação alojada com contas QA novas, auditoria de cobertura de importação e regressão CI. O teste físico no Samsung Galaxy S25 continua pendente.

## Ensaio alojado concluído

O ensaio `f238ec539886` passou com duas contas Auth novas, SQL e mark público. Preparação: 3891 ms; validade útil à chegada da revisão: 58649 ms; confirmação: 4451 ms, dentro do prazo original. A preparação não criou projeto; a confirmação criou quatro eventos, sem admitir plano. A repetição recuperou o recibo sem duplicar; a outra conta recebeu 404. A regra histórica preservou a observação real de 24/10 às 16:10:22.887Z. Evidência: `qa/V20_OPEN_POSITION_IMPORT_HOSTED_20261025.json`.

As duas contas foram bloqueadas e ficaram sem sessões, verificado por SQL. A função QA foi encerrada na versão 41. O runtime privado do proprietário mantém autorização por allowlist e metadados imutáveis; nenhuma operação financeira do proprietário foi executada. A interface foi observada no navegador QA para abertura do diálogo, inclusão de movimento e mudança para compra. O percurso de importação completo no browser e S25 continua por verificar; não declarar R04 ou o Bloco 12 globalmente aprovados.
