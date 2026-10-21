# 12D5B — confirmação com contexto revisto persistente

21/10/2026. Branch `feat/v20-frozen-command-reviews`, PR #25. Base: checkpoint 12D5A, `cb5edd810904ea2cc1d9728607f518c5e3434089`. Código e configuração testados: `1769bf6dcd7094851e69c850a294bb14a00054f6`.

## Problema resolvido

O adaptador SQL voltava a consultar o contexto financeiro ao confirmar. Uma nova cotação podia mudar o hash e invalidar a proposta apresentada. Agora o servidor guarda a revisão preparada e confirma esse contexto exato, com validade curta. Não considera uma cotação antiga como atual: mantém a fonte e o instante originais.

`prepare` obtém a sessão, o estado e o relógio da base de dados; calcula a revisão fora da transação; volta a verificar sessão, hash e geração antes de a guardar. A preparação não acrescenta operações financeiras nem aplica planos.

`commit` procura primeiro o recibo de idempotência. Sem recibo, carrega a revisão privada correspondente ao proprietário, projeto, cenário e hash; verifica pedido, origem, versão e build. Confirma o workflow com o input guardado, sem chamar os providers de preço/política. A transação final volta a verificar sessão, hash, geração e validade antes de gravar os factos, plano, cálculo e recibo atomicamente.

A confirmação explícita continua obrigatória. Um depósito, execução ou nova versão de plano entretanto obriga a nova revisão, mesmo quando a revisão financeira numérica não mudou. Uma repetição exata de um comando já aplicado devolve o recibo, mesmo depois da limpeza da revisão temporária.

## Persistência e validade

Migração preparada pela CLI: `20261021180609_v20_frozen_command_reviews.sql`. Não aplicada à produção.

`btcsp_private.command_reviews` guarda contexto e revisão derivados, separados do diário financeiro. Tem chave composta por âmbito/hash, FK para o projeto/proprietário, RLS sem permissões de cliente, constraints de âmbito e prazo, índice proprietário/expiração e bloqueio de UPDATE. O serviço pode inserir, ler e remover revisões temporárias expiradas; essa remoção não remove operações ou recibos financeiros.

O prazo máximo é 60 segundos desde o início da preparação, medido pelo relógio SQL. Em cenários manuais com avaliação financeira, a idade da cotação e o prazo de revisão das regras podem encurtá-lo. Não se prolonga o prazo durante a confirmação. Contexto de mera contabilidade explicitamente fornecido pelo servidor mantém esse tratamento distinto. Dados Demo continuam identificados como sintéticos.

A preparação serializa a admissão por proprietário e limita as revisões guardadas a 200, limpando as expiradas desse proprietário antes da contagem. A capacidade e o volume total ainda exigem ensaios no ambiente alojado. O payload tem limite de 10 MB; este limite técnico não constitui aprovação de capacidade pública.

O manifesto de build passa a abranger também o adaptador SQL, cash/execution/correction workflows e perfis/saídas. Alterações relevantes invalidam revisões e checkpoints de outra build; é necessário regenerá-lo após editar os ficheiros listados. A migração não usa funções SECURITY DEFINER.

## Verificações executadas

| Verificação | Resultado observado |
| --- | --- |
| Regressão local V20 final | 538/538, zero falhas/ignorados, 62,96 s |
| Revisões e checkpoints específicos | 29/29, zero falhas/ignorados |
| Controlos V19 | 386: Auth 19, cloud 26, release 38, responsividade 37, planeador 266 |
| PostgreSQL 17 nativo em QA | 20/20, zero falhas/ignorados |
| Bundle Edge local | Reconstruído, 485990 bytes, política financeira fechada |

PostgreSQL executado no workflow `39650494113`, job `119397234365`, sobre o commit de código acima. Os casos novos confirmam sobrevivência ao reinício do provider sem nova cotação e revogação real da sessão entre reconstrução e transação final. Os casos existentes de concorrência passaram com a barreira agora colocada depois da leitura das revisões guardadas. Incluem rollback e dump/restauro numa segunda base de QA.

O primeiro teste antigo de revogação dependia de um callback de consulta de preço durante o commit; esse callback deixou de existir. O teste foi atualizado para revogar a sessão após a revisão, e foi acrescentada a revogação entre transações em PostgreSQL. Uma instrumentação inicial do teste local bloqueou por tentar abrir uma query na mesma ligação já ocupada; foi interrompida e corrigida. Estes ensaios iniciais não são contabilizados como aprovados.

Os testes novos cobrem também revisão efetivamente expirada pelo relógio SQL, recusa de pedido alterado/outro proprietário, imutabilidade e permissões privadas, preço conservado num plano sem alteração dos eventos e replay após remoção da revisão. Não representam autenticação de produção, SMTP ou testes no Samsung S25.

## O que falta dentro de 12D

1. Ligar um trabalho de cálculo concluído à criação desta revisão, conservando o seu contexto e prazo originais.
2. Evitar repetir a pesquisa completa de ciclos/perfis na confirmação. Nesta entrega, os handlers financeiros existentes ainda revalidam usando o contexto guardado; o custo Edge não está resolvido.
3. Compor os serviços no runtime alojado, medir históricos grandes, concorrência, admissão e capacidade; não há dispatcher/scheduler público ativo.
4. Obter histórico e liquidez verificáveis para os perfis, sem os inventar a partir de um ticker.

Nenhuma regra de risco foi relaxada. Compras descendentes 20/30/50, histórico append-only e separação caixa/margem mantêm-se. Sem integração de contas Kraken, ordens ou transferências automáticas. Sem alteração visual nesta entrega: a pré-visualização continua a versão anterior.

Permanecem seis etapas do Bloco 12 contando 12D; quatro blocos principais contando o 12. Depois: 13 alertas/tutorial; 14 auditoria financeira; 15 Beta/lançamento.
