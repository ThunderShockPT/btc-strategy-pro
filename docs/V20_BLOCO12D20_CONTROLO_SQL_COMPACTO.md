# Bloco 12D20 — respostas SQL compactas no controlo dos cálculos

As consultas de estado, cancelamento, bloqueio, leitura inicial da lease e confirmação do avanço passam a selecionar os campos operacionais necessários, incluindo unidades concluídas, sem devolver todo o checkpoint. A aquisição da lease continua a devolver o envelope completo que será autenticado e calculado. A leitura do resultado/revisão e o confronto da escolha idempotente também conservam o envelope completo.

Mantêm-se transações, FOR UPDATE/FOR SHARE, autorizações, sessões ao vivo, prazos SQL, identidade da lease, versão, assinatura e leitura integral da origem financeira. Não há migração, alteração de esquema ou mudança dos cálculos. O teste de integração verifica que um avanço recebe exatamente um envelope SQL e que estado/cancelamento não o recebem; as suites de concorrência, revogação, expiração, idempotência, rollback e resultado completo continuam a verificar o comportamento.

O laboratório Auth/SQL passa a contar consultas e tempo de espera por categoria (jobs, source, session, other), máximo por consulta e número de linhas com checkpoint. Só regista métricas agregadas, sem SQL, parâmetros, tokens ou dados das contas. São tempos de parede do cliente PostgreSQL, incluindo transporte e parsing, não CPU do servidor. Consultas concorrentes podem sobrepor-se e não se devem somar para deduzir a percentagem de tempo global. Contadores começam no enqueue; os casos concluídos capturam-nos na confirmação idempotente, antes do cálculo direto; os expirados incluem a verificação do bloqueio. O custo da instrumentação está incluído no laboratório.

Resultados efetivos da matriz no PR #34. Um caso máximo expirado continua a deixar 12D aberto, mesmo quando os testes passam por comprovarem um bloqueio correto. Continua pendente a validação completa no Edge alojado e no ingresso real.

Referência SQL: https://www.postgresql.org/docs/17/dml-returning.html. Changelog Supabase revisto em 23/10/2026: as alterações publicadas de TLS e extensões PostgreSQL não exigem mudanças nesta seleção de campos; não se alteram TLS, operadores, extensões ou configuração de produção.
