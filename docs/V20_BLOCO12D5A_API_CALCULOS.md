# 12D5A — API autenticada de cálculos persistentes

Checkpoint de 21/10/2026. Base: 12D4, commit `0bcfd6875f68dfd38d0b4ee9a2c93eca195bdb08`. Não conclui a etapa 12D.

## Implementação

O handler HTTP aceita cinco pedidos POST sob `/api/v20/calculations/`: `enqueue`, `advance`, `status`, `result` e `cancel`. A criação recebe apenas `projectId`, `scenarioKey` e `request: {idempotencyKey}`. Os restantes recebem apenas o âmbito do projeto e `jobId`. Não aceita proprietário, cotações, políticas ou envelopes fornecidos pelo cliente.

A identidade vem da autenticação remota. O serviço persistente volta a verificar a sessão SQL e o proprietário nas suas transações. A idempotência, validade original, comparação com o estado da carteira e leases permanecem no serviço 12D4; a API não aplica resultados à carteira.

Os novos caminhos partilham os contadores existentes: criação e avanço usam o limite de `prepare`; estado e resultado usam `state`; cancelamento usa `commit`. Assim, caminhos diferentes não multiplicam a capacidade permitida nem exigem alterar a constraint SQL de admissão. Todos continuam sujeitos a origem autorizada, JSON limitado a 96 KB, endereço de ingresso confiável, Bearer validado e respostas privadas sem cache.

A dependência `calculationJobs` é opcional e validada quando fornecida. Sem ela, o caminho responde `CALCULATIONS_NOT_ENABLED`. A política cloud fechada continua a responder antes de autenticação ou acesso financeiro. O runtime alojado ainda não constrói esta dependência; não houve deploy, alteração de schema na produção ou ativação pública.

## Verificação executada

- 31/31 testes locais de API autenticada, novo ciclo HTTP, runtime e bundle, sem falhas ou testes ignorados.
- Regressão V20: 533/533 testes, sem falhas ou testes ignorados; 61,95 s. Depois foi ampliado apenas o teste HTTP para obter também o resultado completo; essa versão final passou em execução própria, 1/1.
- O teste HTTP usa o serviço de cálculos e migrações reais em PGlite de QA, com Auth remoto simulado e verificação SQL de sessão. Cobre idempotência, outra conta, progresso, resultado ainda incompleto, resultado completo, cancelamento, campos rejeitados, sessão revogada e ausência de alterações financeiras.
- O bundle foi reconstruído, com 480755 bytes e política financeira fechada.

Não se declara aqui validação em PostgreSQL alojado, com duas contas Auth reais, Android ou Deno. O workflow inclui o novo teste; os resultados remotos devem ser consultados separadamente.

## Pendências e compatibilidade

O motor, regras de risco, compras descendentes 20/30/50, contabilidade e histórico não foram alterados. Não há ligação de contas Kraken nem ordens ou transferências automáticas.

Continua pendente a proposta revista guardada no servidor, com confirmação explícita sem regenerar toda a pesquisa a uma nova cotação. Também faltam a composição no runtime, ligação à interface, retenção, capacidade e ensaios de carga. Um resultado calculado não é uma estratégia aplicada nem uma garantia de proteção.

Esta entrega é parte de 12D5, dentro da etapa 12D já existente. Restam seis etapas do Bloco 12 contando a atual; quatro blocos principais contando o 12 (depois: 13, 14 e 15).
