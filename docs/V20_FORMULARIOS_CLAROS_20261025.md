# Aplicação da prompt — registo de compra e venda

Primeira correção funcional da prompt consolidada, sobre d78792a951b85527ac89b6d3395d735ef03f9fb3. A app, os motores e a carteira do proprietário não foram reiniciados.

O registo de execução passa a explicar unidade, obrigatoriedade, origem do valor e exemplos fictícios junto aos campos. O preço USD/BTC aparece antes da conversão opcional do valor em USD. A margem atribuída é explicitamente separada da operação; não se infere a transferência de margem dividindo por 10. Quantidade, preço, comissão, data e quantidade pedida numa execução parcial recebem validação específica antes de enviar o pedido, sem perder o draft. São mantidos vírgula decimal, custos explicitamente zero apenas quando declarados e confirmação explícita.

O histórico mostra nomes legíveis para os tipos de movimento. Os detalhes auditáveis continuam preservados. A seleção inicial de compra consulta quantidades pendentes calculadas pelo motor: não escolhe uma etapa já preenchida só porque o estado original ainda diz ativa. Sem uma etapa pendente conhecida, não inventa o vínculo.

No navegador QA: 200 USD / 100 000 USD por BTC produziu 0,002 BTC; comissão vazia foi identificada junto ao campo e os restantes valores ficaram preservados. Página QA com dados inventados, sem gravações na conta do proprietário. Os testes de API/SQL existentes cobrem compra, venda parcial, correção e recibo; não se declara um novo ensaio completo no servidor nem aprovação S25 por esta observação.

A alteração é da interface/orquestração, sem alteração de regras financeiras, validade, admissão A, backend ou migrações. Permanecem por aplicar as restantes simplificações da prompt: configuração inicial, movimentos, importação, recuperação de erros de servidor e validação integral das cinco páginas. O Bloco 12 permanece aberto.
