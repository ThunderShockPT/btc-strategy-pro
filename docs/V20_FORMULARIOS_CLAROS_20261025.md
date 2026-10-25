# Aplicação da prompt — registo de compra e venda

Primeira correção funcional da prompt consolidada, sobre d78792a951b85527ac89b6d3395d735ef03f9fb3. A app, os motores e a carteira do proprietário não foram reiniciados.

O registo de execução passa a explicar unidade, obrigatoriedade, origem do valor e exemplos fictícios junto aos campos. O preço USD/BTC aparece antes da conversão opcional do valor em USD. A margem atribuída é explicitamente separada da operação; não se infere a transferência de margem dividindo por 10. Quantidade, preço, comissão, data e quantidade pedida numa execução parcial recebem validação específica antes de enviar o pedido, sem perder o draft. São mantidos vírgula decimal, custos explicitamente zero apenas quando declarados e confirmação explícita.

O histórico mostra nomes legíveis para os tipos de movimento. Os detalhes auditáveis continuam preservados. A seleção inicial de compra consulta quantidades pendentes calculadas pelo motor: não escolhe uma etapa já preenchida só porque o estado original ainda diz ativa. Sem uma etapa pendente conhecida, não inventa o vínculo.

No navegador QA: 200 USD / 100 000 USD por BTC produziu 0,002 BTC; comissão vazia foi identificada junto ao campo e os restantes valores ficaram preservados. Página QA com dados inventados, sem gravações na conta do proprietário. Os testes de API/SQL existentes cobrem compra, venda parcial, correção e recibo; não se declara um novo ensaio completo no servidor nem aprovação S25 por esta observação.

A alteração é da interface/orquestração, sem alteração de regras financeiras, validade, admissão A, backend ou migrações. Permanecem por aplicar as restantes simplificações da prompt: configuração inicial, movimentos, importação, recuperação de erros de servidor e validação integral das cinco páginas. O Bloco 12 permanece aberto.

## Validação e publicação

20 testes locais direcionados passaram. O CI 40179607085, no código 3fce8e8bc763be76ed5e5657a8242964bb1ac956, passou as sete tarefas, incluindo os percursos de browser a 393 e 1280 px, conversão USD/BTC e erro junto à comissão sem perder a quantidade. A primeira CI falhou porque os testes ainda procuravam os rótulos antigos; os testes foram atualizados e ampliados antes da publicação.

Publicação privada concluída: fonte Sites aa8adba1e4a1caa2e7030619c744c5d37c625c2d, deployment appgdep_6addc882d8588191a54b1920bda432e1, endereço habitual. Não houve alteração de backend ou de dados financeiros do proprietário. A aprovação física S25 e o fecho do Bloco 12 permanecem pendentes.
