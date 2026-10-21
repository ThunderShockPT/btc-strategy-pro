# 12D5D — perfis aprovados com cálculos retomáveis

21/10/2026. PR #27, branch `feat/v20-resumable-profile-plans`. Base: `959c784f54d8a617fc28cb6eb9f68f4bcb9285e3`. Código/configuração testados: `7b84b5229721ab42f45f61bdbc71e488ca1f43f9`.

## Comportamento implementado

Seguro, Equilibrado e Arriscado podem agora preparar, retomar e concluir a pesquisa de ciclos, criar uma revisão persistente e aplicar uma nova versão de plano após confirmação explícita. O caminho também aceita planos que já tenham `profilePolicyVersion`; conserva a sua natureza de plano de perfil.

O motor de perfis separa a preparação da política e níveis da conclusão sobre uma pesquisa terminada. O modo síncrono existente usa as mesmas decisões e conserva o formato dos resultados. Na conclusão retomável, verifica-se a igualdade do input, plano candidato e política com a pesquisa antes de usar os resultados. Os cenários não voltam a ser executados na preparação da revisão nem na confirmação.

O cálculo assinado guarda o plano de origem e o pedido de perfil com mercado/base policy obtidos exclusivamente do servidor. MAC, build, âmbito, estado da carteira, sessão e prazo continuam a ser verificados. O manifesto passa a incluir a definição JSON dos perfis, além do código do motor. Não houve alteração dos parâmetros aprovados nem nova migração SQL.

## Pedido e idempotência

Na rota autenticada de criação de cálculos, `request` pode conter:

```json
{
  "idempotencyKey": "<identificador estável do pedido>",
  "profileChange": {
    "profile": "balanced",
    "floorMode": "preserve",
    "marginAdmission": "strict"
  }
}
```

Só são aceites os três perfis e as decisões de piso `preserve` ou `from-profile-reference`. A admissão tem de ser `strict`. Dados de mercado, observações, profundidade ou políticas enviados pelo cliente são recusados.

A mesma chave devolve o trabalho já criado, sem nova consulta ao provider. Reutilizá-la com outro perfil, piso ou tipo de cálculo gera `CALCULATION_JOB_IDEMPOTENCY_CONFLICT`. As escolhas são copiadas antes de operações assíncronas e ficam vinculadas ao contexto assinado.

O resultado de um trabalho de perfil tem o formato completo do motor de perfis, incluindo `cycles`. Trabalhos genéricos mantêm o resultado de ciclos anterior. A aplicação continua pelo workflow `plan-calculation`, com apenas ID do trabalho e ID/versão do próximo plano. O cliente não recebe o envelope assinado nem o contexto interno do trabalho.

## Preservação financeira

`preserve` mantém o piso e o preço/instante de referência. Só a decisão explícita `from-profile-reference` permite substituir o piso pelo derivado do perfil; o preço/instante de referência continuam fixos.

A aplicação do plano altera a versão, configuração e reservas. Não modifica os eventos originais, não cria BTC ou dinheiro, não transfere margem e não executa ordens. O prazo de confirmação continua limitado pelo prazo original do cálculo; preparar uma revisão não o renova. A confirmação exige seleção viável e sobrevivência ao cenário de falha de adição de margem segundo a política aprovada.

## Verificação executada

| Execução | Resultado |
| --- | --- |
| V20 local, conjunto final | 549/549; zero falhas/ignorados; 80,75 s |
| Primeira regressão de perfis/saídas/admissão/ciclos revistos | 55/55; zero falhas/ignorados |
| Casos novos iniciais de perfis retomáveis | 5/5; o sexto caso, de mudança explícita do piso, foi incluído no conjunto final |
| Controlos V19 | 386: Auth 19, cloud 26, release 38, responsividade 37, planeador 266 |
| PostgreSQL 17 nativo em QA | 22/22; zero falhas/ignorados |
| Bundle Edge local | Reconstruído, 494113 bytes; política financeira fechada |

Os testes comparam os resultados completos dos três perfis retomados com o motor síncrono, sem os apresentar como validação financeira independente. Na alteração de um plano já aprovado, `generate` e `advanceSearch` foram instrumentados para lançar erro se chamados durante a revisão ou confirmação; o fluxo passou sem os executar e sem nova consulta ao contexto.

Cobrem ainda as escolhas vinculadas à chave, recusa de dados injetados/admissão condicional, falta de provider/histórico suficiente, integração HTTP, alteração explícita do piso, preservação de eventos/referência e replay idempotente.

PostgreSQL: workflow `39657131828`, job `119420268554`, no commit de código acima. O caso novo executa a transição para Equilibrado e depois Seguro, mantendo os factos financeiros e as referências. Os restantes casos de isolamento, concorrência, rollback, revogação de sessão e dump/restauro continuam incluídos. O job remoto de regras ainda estava em execução na recolha; não se declara aqui o seu resultado final.

## Pendências e melhoria proposta

O provider de histórico e profundidade da produção continua por concluir. Os dados sintéticos dos testes são identificados como tal; esta entrega não transforma um ticker em histórico, não fornece probabilidades e não aprova recomendações públicas.

Faltam a composição dos serviços no runtime, ensaios de carga com históricos grandes, validação de ingresso/admissão no ambiente alojado e os restantes critérios do Bloco 12. Não houve deploy, merge para main ou alteração de dados reais. Não há integração de contas Kraken.

Na ligação à interface, mostrar perfil, decisão de piso, instante do preço e prazo restante da revisão; quando expirar, pedir uma nova revisão de forma clara. Esta melhoria de apresentação fica para a integração da interface, sem sugerir proteção garantida.

Mantêm-se seis etapas do Bloco 12 contando 12D; quatro blocos principais contando o 12. O teste conjunto no Samsung S25 mantém-se depois do Bloco 12 concluído e validado, antes do 13.
