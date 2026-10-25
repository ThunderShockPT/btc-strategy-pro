# Bloco 12D16 — Auth e SQL em ambiente descartável

## Objetivo e isolamento

A nova suite usa PostgreSQL 17 e a imagem oficial `supabase/gotrue:v2.197.0` num runner descartável da CI. Os serviços escutam apenas em loopback. Não cria projetos ou branches Supabase, não usa recursos do jogo e não necessita de credenciais do utilizador. O segredo JWT e as passwords das duas contas de QA são gerados para a execução. A configuração temporária tem permissões 0600 e é removida no passo de limpeza; o container Auth também é eliminado.

A imagem e a configuração foram conferidas no compose oficial e no changelog Supabase. A configuração considera a alteração de `API_EXTERNAL_URL` para incluir `/auth/v1`. O laboratório usa o serviço Auth diretamente, sem gateway. Não testa configuração ou TLS de um gateway de produção.

## Fluxo preparado

Duas contas `@example.test` são registadas e entram por password no Auth real do laboratório. A confirmação automática existe exclusivamente nesse ambiente: não comprova entrega de email, confirmação por link ou recuperação. Tokens e sessões são emitidos pelo GoTrue e persistidos na base Auth nativa; não são respostas de identidade inventadas pelo teste.

A suite liga duas instâncias do runtime a servidores HTTP locais, com pools PostgreSQL independentes e relógio real. Aplica as migrações apenas na base descartável, inicializa uma carteira manual de QA com uma compra declarada e executa:

- leitura autenticada, assinatura inválida recusada e isolamento da segunda conta;
- criação e repetição de recálculo do perfil atual;
- dois pedidos de avanço simultâneos, retoma entre instâncias e resultado completo igual ao cálculo direto;
- revisão, confirmação e repetição idempotente, sem inventar movimentos ou alterar BTC, caixa, margem ou piso;
- logout real, sessão SQL eliminada e avanço posterior recusado sem alterar a sequência.

Se o início cair perto do fim do minuto, o teste aguarda uma nova fronteira antes de recolher fontes. Nunca prolonga o prazo original. O tempo reportado mede o recálculo até à confirmação idempotente no runner, excluindo instalação, preparação e espera pela fronteira.

## Adaptações explícitas do laboratório

As regras, preços, livro e candles continuam sintéticos e identificados como QA. O transporte Auth injetado aceita apenas o endpoint fixo esperado pelo backend e encaminha o pedido de utilizador para o GoTrue local, que verifica a assinatura. A imagem local emite tokens com o issuer esperado para exercitar a validação de projeto; o segredo é independente e os tokens não são credenciais de produção.

O adaptador de pool valida a configuração esperada pelo runtime e abre apenas a ligação PostgreSQL de loopback configurada para QA. Não usa TLS no loopback. Nenhuma configuração ou exceção de ligação foi adicionada ao código de produção. As consultas de negócio, sessões, leases e verificações de prazo usam o PostgreSQL real, sem substituição do relógio SQL.

Sem Docker neste workspace, a execução completa é feita pelo job `real-auth-runtime` da CI. Falhas não são convertidas em testes ignorados. Os resultados e métricas são consultados nos logs do job e registados no PR.

## Critérios ainda abertos

Este laboratório não equivale ao runtime Edge alojado do Supabase. Não mede os seus limites CPU, memória de pico, latência externa, TLS, gateway ou endereço de ingresso. Usa poucos movimentos e maxCycles=1. Continuam pendentes cargas grandes e máximas, ensaio alojado completo, SMTP exclusivo, confirmação/recuperação por email e 12E–12I. O Bloco 12 permanece aberto; o teste S25 continua antes do Bloco 13.
