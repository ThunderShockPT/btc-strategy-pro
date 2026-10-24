# V20 12D11 — menos pedidos por cálculo

A retoma assinada pode agora executar até dois passos do mesmo cenário por pedido. O limite é operacional e só se aplica quando a base tem até 1000 movimentos e o estado de pesquisa serializado tem até 1500000 bytes. Acima de qualquer limite conserva um passo. O servidor pode impor maxPathStepsPerUnit=1; valores fora de 1 ou 2 são recusados. O campo não é aceite dos clientes HTTP. Estes limites de Beta são conservadores e provisórios, não aprovação de CPU alojada.

Não se agrupam cenários nem comandos financeiros. Cada passo conserva a ordem das ações, verificação de manutenção, gaps e regras históricas. A sequência continua a contar pedidos bem sucedidos; não representa número de marcas ou de ordens. Assinatura, build, identidade, sessão SQL, base do projeto e validade original continuam verificadas. O prazo máximo de 60 segundos não foi aumentado; a expiração efetiva continua a respeitar a fonte com validade mais curta, incluindo o fecho dos candles. Pode restar menos de 60 segundos ao iniciar.

## Verificação local

Antes dos novos casos, passaram 50 testes de checkpoints, fila e composição de runtime. Com os três casos novos, passaram os 27 testes da suite de checkpoints. Passaram também 13 testes de integração HTTP, aplicação de planos/perfis e bundle Edge. Os testes comparam a execução a um e dois passos, resultado completo, input intacto, prazo e sequência; limites de 1000/1001 eventos e payload pesado conservam a fronteira esperada. Configurações inválidas são recusadas. Um teste força a expiração após o processamento de dois passos e confirma a recusa do progresso, sem alterar o envelope original. O teste específico de mais de 100 avanços da fila fixa explicitamente um passo para continuar a exercer o limite histórico de retries, sem enfraquecer a asserção.

## Comparação isolada

1000 movimentos de trades, limite de 12 ciclos, relógio sintético QA, baseline e alteração em processos Node separados e sequenciais, sem suites concorrentes. Uma amostra por configuração.

| Medida | Baseline 12D10 | 12D11 |
| --- | --- | --- |
| Pedidos de avanço | 203 | 104 |
| Soma dos tempos locais de pedidos | 33156.04 ms | 24071.44 ms |
| Maior CPU por pedido | 1045.777 ms | 892.880 ms |
| Maior tempo local por pedido | 626.94 ms | 566.13 ms |

Redução de 48.8% nos avanços e 27.4% no tempo local somado. Ambos os resultados completos coincidem com o motor síncrono e preservam o input. Estas medições não incluem SQL, autenticação remota, rede ou Deno alojado, e não são uma garantia de rapidez. A igualdade é equivalência, não auditoria financeira independente. Artefacto detalhado: docs/qa/V20_12D11_BOUNDED_BATCHING.json.

## Continuidade

12D ainda requer validação alojada de CPU/memória, SQL/Auth/rede, latência das fontes públicas e compatibilidade do prazo original; os 104 pedidos continuam relevantes. A carga com 5000 movimentos até ao limite de ciclos também continua pendente. Não se declarou 12D concluído nem se passou para 12E. Não houve migração de produção, alteração de contas, abertura de gates ou publicação de frontend. Depois de 12D seguem 12E–12I e o teste físico no S25 antes do Bloco 13.
