# V20 — painel da conta e cálculos retomáveis

23/10/2026. Trabalho preparado no PR #34. Não conclui o Bloco 12 nem ativa a conta online publicada.

## Entrega

`account-workflow-v20.js` liga o cliente autenticado à leitura da carteira, cálculo retomável, proposta do servidor e confirmação. Os avanços são sequenciais, apenas após respostas válidas, sem repetição automática de pedidos incertos. Uma sessão de cálculo pode ser pausada; consultar/continuar reconcilia primeiro o estado. Um início incerto repete explicitamente a chave original. Uma confirmação incerta recupera o recibo idempotente original.

`account-view-v20.js` apresenta a carteira, versão do plano, perfil, referência, piso, progresso e validade original. A revisão mostra os parâmetros e reservas antes/depois e as compras na ordem devolvida pelo motor, com Entrada/Primeiro reforço/Segundo reforço. Não recalcula saldos, reservas ou preços. A aceitação é desmarcada a cada nova apresentação; propostas inaplicáveis ou expiradas não autorizam confirmação. O servidor continua a verificar todos os critérios financeiros e temporais.

A página Conta da prévia inclui o painel, com estado indisponível por defeito. A composição autorizada pode fornecer um cliente já autenticado por `BTCV20AccountConnection.attach(client)` e deve propagar logout/troca de conta através de `clearSession()`/`detach()`. Este ponto de integração não fornece login, não contorna a política de abertura e não copia a carteira Demo para o servidor. O cliente HTTP não é incluído no bundle Demo; o alojamento terá de o fornecer na composição autenticada.

Ao sair da página ou ocultá-la, os avanços param após o pedido em curso; voltar não retoma automaticamente. Troca de conta, logout e revogação SQL eliminam o estado privado apresentado. Uma resposta tardia não o restaura. Uma falha de ligação identifica a última leitura como potencialmente desatualizada.

## Verificação

`node --test scripts/test-account-workflow.cjs scripts/test-cloud-calculations.cjs scripts/test-onboarding-preview.cjs scripts/test-app-workflows.cjs`

A suite do painel usa o cliente real, API HTTP, fila/checkpoints e migrações em PGlite, com identidade, fontes e histórico sintéticos de QA. Cobre confirmação sem alterar os movimentos, respostas perdidas no início/avanço/commit, recibo único, pausa/cancelamento, expiração, troca de conta, logout durante pedido, revogação SQL e conflito de segundo dispositivo. Cobre ainda escaping, ordem dos reforços, aceitação explícita, pausa ao ocultar e desmontagem dos eventos. Não é um teste visual num browser nem um ensaio de Auth real ou Edge completo.

A CI anterior, do commit 79d2c26b2942899ccc4324fa3bc44ec50409962d, terminou com sucesso: execução 39957594653. A nova entrega acrescenta a suite do painel ao workflow obrigatório.

## Ainda necessário

- Composição alojada completa e admissão temporal comprovadas; ingresso, concorrência e pico de memória.
- Login/recuperação e SMTP exclusivos BTC, com testes de email reais.
- Ligação dos fluxos de movimentos, execuções e correções da conta; criação e listagem de carteiras.
- Privacidade, portabilidade, eliminação, restauro e migração/reconciliação V19.
- Teste visual e ponta a ponta no S25 após disponibilizar o acesso de teste.

O entrypoint financeiro, registo público e política de abertura permanecem fechados. Nenhum recurso de produção ou do Racing Horse Manager foi alterado.
