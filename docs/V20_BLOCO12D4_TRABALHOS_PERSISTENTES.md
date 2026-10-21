# V20 — 12D4: checkpoints persistentes e coordenação entre workers

21/10/2026. Branch feat/v20-durable-calculation-jobs, a partir de b951209764df698716b11b41583a07da367fd1b7. Implementação e QA isolados; cloud pública continua fechada.

## Entrega

backend/calculation-jobs.cjs coordena o serviço assinado do 12D3 através de PostgreSQL. enqueue guarda um checkpoint privado; runUnit ocupa e calcula uma unidade; status expõe apenas progresso; result revalida o resultado completo; cancel cancela o trabalho operacional. Não há uma nova fórmula financeira.

A migração 20261021174034_v20_durable_calculation_jobs.sql foi criada com Supabase CLI 2.121.0, obtida da release oficial fixada. Cria uma tabela logged em btcsp_private, com RLS, índices, FK projeto/proprietário e chave única de idempotência por proprietário/projeto/cenário. Não foi aplicada ao Supabase real.

A tabela conserva o envelope assinado, o hash de origem, a sequência, versão operacional, estado, prazo e lease. Não guarda access tokens, refresh tokens, chaves HMAC ou credenciais Kraken. anon e authenticated não têm grants diretos; service_role dispõe de SELECT/INSERT/UPDATE e é usado apenas pelo backend. O trigger é SECURITY INVOKER e impede trocar origem, proprietário, projeto, cenário, chave de idempotência, build, data inicial ou prazo.

## Concorrência e recuperação

Cada claim é transacional, verifica a sessão SQL e bloqueia brevemente o head do projeto e a linha do trabalho. A lease tem 10 segundos por predefinição, limitada ao prazo original do cálculo. O cálculo decorre fora da transação, sem manter os locks durante a matemática ou chamadas externas.

Um segundo worker recebe busy enquanto a lease for válida. Se a lease expirar, pode ocupar a mesma unidade a partir do envelope guardado. O commit exige a mesma lease, a mesma versão, lease ainda válida, sessão ativa e o hash atual do projeto. Uma resposta atrasada de um worker anterior não substitui o checkpoint mais recente, mesmo que ninguém tenha retomado ainda.

O checkpoint e o progresso são atualizados atomicamente. Uma falha tardia na gravação faz rollback da nova etapa. Uma falha transitória liberta a lease quando possível e deixa o envelope anterior intacto; se a ligação também falhar, a lease pode expirar e ser recuperada. A repetição da criação devolve o trabalho original, sem mudar a cotação, prazo ou contexto.

Cancelamentos impedem a gravação de workers em curso. Um depósito ou mudança de plano invalida a origem, inclusive quando a revisão financeira não mudou. A verificação é repetida no commit, cobrindo mudanças feitas depois do cálculo. Expiração, alteração de build/chave ou assinatura inválida bloqueiam o trabalho, sem o apresentar como financeiramente inviável.

## Limites operacionais

Os defaults são 200 trabalhos armazenados por proprietário e 100 claims por trabalho, com lease configurável de 1–15 segundos. São limites de operação/abuso, não perfis de risco. Excedê-los devolve erro operacional sem resultado financeiro e sem reduzir ciclos ou reservas.

Não há limpeza automática nesta versão. A retenção/limpeza dos caches privados e a rotação de chaves continuam a precisar de configuração e testes antes da abertura; o limite impede crescimento ilimitado por conta, mas não substitui uma política de capacidade. Os registos financeiros append-only e projetos existentes não são apagados.

## Testes executados

O ficheiro test-calculation-jobs.cjs tem 21 testes contando o agrupador. Inclui retoma com uma nova instância, resultado completo idêntico, criação concorrente idempotente, busy, lease expirada, fencing, repetição, rollback tardio, cancelamento, scope/conta, RLS/grants, tabela logged, trigger invoker, assinatura/chave, relógio da base, validade imutável, quotas, depósito e plano aplicado sem nova revisão financeira. Um depósito após a matemática e uma sessão revogada antes do commit impedem a gravação.

A suite PostgreSQL nativa passou de 14 para 18 testes, acrescentando criação/lease entre conexões, recuperação com worker obsoleto, rollback da gravação e revogação da sessão após o cálculo. O ensaio de dump/restauro foi ampliado para comparar os trabalhos privados, confirmar RLS e retomar uma unidade numa segunda base restaurada, com o mesmo envelope assinado e sem alterar os factos financeiros.

Os testes usam identidades Auth de QA; a verificação de sessão e concorrência é SQL real na suite nativa. Não equivalem a dois logins Supabase reais ou SMTP. O restauro é de bases locais de QA num contentor efémero; não é restauro da produção. As duas contas e dados de teste são criados isoladamente, sem reiniciar contas existentes.

## Compatibilidade e próximo passo

O motor e o manifesto financeiro do 12D3 mantêm-se inalterados. O serviço delega toda a matemática no mesmo checkpoint assinado. Não grava em operações, planos, margens, caixa ou cálculo financeiro append-only; uma transferência de margem continua a exigir o respetivo movimento confirmado.

Não existe ainda um endpoint HTTP para esta fila, um agendador implantado, execução em background 24/7 ou consumo sem sessão válida. A recuperação é automática na próxima invocação autorizada de runUnit, sem ter de reenviar o envelope pelo frontend. A camada HTTP/dispatcher e a integração da proposta revista são o próximo trabalho do 12D. A fila não aplica planos automaticamente.

Permanecem pendentes histórico/liquidez verificáveis, carga com históricos grandes, validação em Deno/ingresso e os gates de Auth, SMTP, backup de produção, privacidade e abertura. O tempo de CPU do 12D3 não é apresentado como medição deste fluxo completo com Auth/SQL reais.

A migração está preparada, sem aplicação ou implantação. main, GitHub Pages, dados reais, backups Beta e pré-visualização visual permanecem inalterados. Não houve emails, ligação a contas Kraken nem utilização de recursos do Racing Horse Manager.

## Fontes técnicas consultadas

- https://www.postgresql.org/docs/17/explicit-locking.html
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/queues/quickstart — a solução usa a tabela operacional do backend existente, sem ativar uma extensão ou exposição de filas pela Data API.
- https://supabase.com/changelog.md — consultado; nenhuma alteração da configuração TLS neste checkpoint.

As permissões, RLS, constraints, trigger e índices novos foram verificados nas bases de QA. Não se apresenta o advisor da produção, onde a migração não existe, como auditoria deste novo esquema.

## Checkpoint final executado

- 532/532 testes V20 locais aprovados, zero falhas/ignorados, 83,23 s. Inclui os 21 testes novos contando o agrupador e toda a bateria anterior.
- 386/386 verificações V19: Auth 19, cloud 26, release 38, responsividade 37, planeador 266.
- CI 39647572060: ambos os jobs concluídos com sucesso no código c5185cd618943f658d62f257b7bc2532016f49a6.
- PostgreSQL nativo, job 119387086882: 18/18 aprovados, incluindo o restauro com continuação de um trabalho. O resultado foi confirmado nos logs.
- Seis ficheiros de código/testes/configuração comparados com o remoto, conteúdo integral coincidente.
- Bundle fechado reconstruído: 478 957 bytes, inalterado porque este serviço ainda não está ligado à entrada Edge. Não houve implantação.

O 12D4 conclui a implementação e QA da coordenação persistente, sem concluir todo o 12D. Mantêm-se seis etapas do Bloco 12, contando a atual, e quatro blocos principais contando o 12.
