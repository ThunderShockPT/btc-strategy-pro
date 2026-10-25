# Aplicação da prompt — registo de compra e venda

Primeira correção funcional da prompt consolidada, sobre d78792a951b85527ac89b6d3395d735ef03f9fb3. A app, os motores e a carteira do proprietário não foram reiniciados.

O registo de execução passa a explicar unidade, obrigatoriedade, origem do valor e exemplos fictícios junto aos campos. O preço USD/BTC aparece antes da conversão opcional do valor em USD. A margem atribuída é explicitamente separada da operação; não se infere a transferência de margem dividindo por 10. Quantidade, preço, comissão, data e quantidade pedida numa execução parcial recebem validação específica antes de enviar o pedido, sem perder o draft. São mantidos vírgula decimal, custos explicitamente zero apenas quando declarados e confirmação explícita.

O histórico mostra nomes legíveis para os tipos de movimento. Os detalhes auditáveis continuam preservados. A seleção inicial de compra consulta quantidades pendentes calculadas pelo motor: não escolhe uma etapa já preenchida só porque o estado original ainda diz ativa. Sem uma etapa pendente conhecida, não inventa o vínculo.

No navegador QA: 200 USD / 100 000 USD por BTC produziu 0,002 BTC; comissão vazia foi identificada junto ao campo e os restantes valores ficaram preservados. Página QA com dados inventados, sem gravações na conta do proprietário. Os testes de API/SQL existentes cobrem compra, venda parcial, correção e recibo; não se declara um novo ensaio completo no servidor nem aprovação S25 por esta observação.

A alteração é da interface/orquestração, sem alteração de regras financeiras, validade, admissão A, backend ou migrações. Permanecem por aplicar as restantes simplificações da prompt: configuração inicial, movimentos, importação, recuperação de erros de servidor e validação integral das cinco páginas. O Bloco 12 permanece aberto.

## Validação e publicação

20 testes locais direcionados passaram. O CI 40179607085, no código 3fce8e8bc763be76ed5e5657a8242964bb1ac956, passou as sete tarefas, incluindo os percursos de browser a 393 e 1280 px, conversão USD/BTC e erro junto à comissão sem perder a quantidade. A primeira CI falhou porque os testes ainda procuravam os rótulos antigos; os testes foram atualizados e ampliados antes da publicação.

Publicação privada concluída: fonte Sites aa8adba1e4a1caa2e7030619c744c5d37c625c2d, deployment appgdep_6addc882d8588191a54b1920bda432e1, endereço habitual. Não houve alteração de backend ou de dados financeiros do proprietário. A aprovação física S25 e o fecho do Bloco 12 permanecem pendentes.

## Bloco 12 · etapa 12E — carteira e movimentos

Continuação da simplificação: nome/capital inicial, reservas, funding, taxa decimal de comissão e horizonte passam a ter explicações junto aos campos. Depósito, retirada, atribuição e devolução de margem explicam o efeito na caixa, no capital e na posição. Datas e montantes inválidos são identificados junto ao campo; valores introduzidos são conservados e o pedido não é enviado. Não se alteram motores, regras ou backend.

21 testes locais de carteiras/movimentos passaram, incluindo duas verificações novas de erro localizado e preservação dos dados. No navegador QA foram observados o aviso de depósito que não muda margem, erro junto ao montante vazio e ajuda na criação de carteira. A etapa 12E e o Bloco 12 continuam abertos: importação, recuperação de erros de servidor e validação global ainda requerem trabalho. Comunicação futura deve indicar sempre bloco e etapa, conforme pedido do proprietário.

A continuação da etapa 12E foi publicada após as sete tarefas do CI 40180380188 passarem, no código 19852abc03e33e7fa0a8b2a0c0229bd049d9d340. Fonte Sites 1c5bb1c11a38b4f628b12ec2172e73bae2ad2ff3, deployment appgdep_6addcb83b7148191acd7a48431ce0670. Prévia privada disponível, produção fechada e QA encerrada foram revalidadas por HTTP. Não foram executados comandos financeiros do proprietário. Esta entrega não fecha a etapa 12E ou o Bloco 12.

## Bloco 12 · etapa 12E — importação e erros do servidor

A importação passa a ter três secções numeradas: identificação/saldo inicial, movimentos reais e comparação dos quatro saldos do extrato. Cada caixa tem explicação da unidade e do valor esperado. Erros locais identificam campo e movimento; erros de validação e de replay do servidor indicam o movimento correspondente. Só se transmite um índice inteiro entre 1 e 250, nunca o erro interno integral ou dados de outra conta. O formulário é preservado.

Pedidos acima do limite de 64 KB passam a devolver recusa explícita de tamanho, em vez de um erro de servidor ambíguo. Não é permitido omitir factos para reduzir o histórico, alterar datas de fontes, aceitar preços expirados ou aprovar planos pela importação. As regras financeiras e as confirmações explícitas permanecem iguais.

31 testes locais de importação/API passaram, incluindo identificação da linha desde HTTP até ao workflow, erro financeiro de margem atribuído à compra correspondente, dados preservados, limite de tamanho e rejeição de metadados de linha inválidos. O navegador QA mostrou as três secções e os textos de ajuda. A validação alojada e a publicação desta alteração serão registadas depois de concluídas; não é fecho de 12E/Bloco 12.
