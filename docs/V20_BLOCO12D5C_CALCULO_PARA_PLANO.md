# 12D5C — cálculo concluído para revisão e confirmação de ciclos

21/10/2026. PR #26, branch `feat/v20-calculation-plan-review`. Base: `8d4c642ddeca8da3bfc425ca2990d8c6c32af940`. Código/configuração testados: `39391004794fadebeaed336599b8f9978dcb5983`.

## Entrega

O workflow `plan-calculation` aceita apenas uma referência ao trabalho persistido e o ID/versão do próximo plano. Exemplo do pedido, com identificadores fornecidos pela aplicação:

```json
{
  "workflow": "plan-calculation",
  "command": {
    "mode": "recorded",
    "jobId": "<UUID do cálculo concluído>",
    "change": {"id": "<novo UUID de plano>", "version": "<versão seguinte>"}
  }
}
```

Segue as rotas autenticadas `prepare` e `commit` já existentes. Não aceita resultados, regras, preços ou políticas enviados pelo cliente. Não foi criada uma rota pública para obter o estado interno assinado.

O serviço de trabalhos lê o registo privado e exige conclusão, sessão válida, proprietário correto, origem inalterada e validade SQL. O serviço de checkpoints volta a validar MAC, âmbito, build, validade e estado da carteira antes de fornecer internamente o contexto e a pesquisa concluída. O adaptador compara também input e plano com a origem da carteira. Recusa contexto de mera contabilidade para esta decisão financeira.

A preparação guarda uma revisão temporária com o preço e regras originais, sem nova consulta ao provider. O seu prazo nunca excede o do cálculo original. A confirmação exige a revisão explícita e utiliza a pesquisa concluída; não reinicia `generate` nem os cenários. O commit continua a reconstruir/validar o estado financeiro e a verificar sessão, hash, geração e prazo, dentro do mecanismo transacional existente.

Aplicar esta alteração cria uma versão de plano e substitui as reservas propostas. Não cria compras, vendas ou transferências; os eventos e a revisão financeira mantêm-se. O recibo torna a repetição exata idempotente.

## Motor partilhado e limites

O cash workflow usa o mesmo construtor de revisão para pesquisa síncrona e concluída. Os novos métodos locais não constituem autorização: o backend só os utiliza depois da verificação do cálculo assinado. A confirmação exige seleção viável, sobrevivência ao cenário de falha de adição de margem e ausência de admissão condicional.

O manifesto passa a incluir também `backend/calculation-jobs.cjs`. Alterações na build invalidam cálculos/revisões anteriores. Não houve nova migração SQL nesta entrega.

A ligação cobre os planos de ciclos aceites pelo workflow existente. Planos que já têm `profilePolicyVersion` continuam a exigir o fluxo de revisão de perfil; esta entrega não remove esse bloqueio nem converte silenciosamente um plano de perfil num plano genérico. A integração retomável dos perfis continua pendente.

## Testes executados

| Execução | Resultado |
| --- | --- |
| V20 local, conjunto final | 543/543; zero falhas/ignorados; 82,72 s |
| Trabalhos, revisão e carteira específicos | 42/42; zero falhas/ignorados |
| Controlos V19 | 386: Auth 19, cloud 26, release 38, responsividade 37, planeador 266 |
| PostgreSQL 17 nativo de QA | 21/21; zero falhas/ignorados |
| Bundle Edge local | Reconstruído; 490238 bytes; política financeira fechada |

No teste integrado foram instrumentados `generate` e `advanceSearch` para lançar erro se chamados durante a preparação ou confirmação. O fluxo concluiu sem esses erros, sem nova consulta ao contexto e com igualdade dos resultados guardados. Isto prova a ausência de repetição dos cenários nesse caminho; não aprova o orçamento de CPU do Edge com históricos grandes.

Os testes novos cobrem aplicação única, replay, preservação dos factos, estado ainda pendente, outra conta, pedido com resultados injetados, depósito entretanto, expiração sem renovação de prazo, MAC adulterado e integração HTTP sem expor `completedSearch`/MAC.

O ensaio PostgreSQL usa o serviço real de trabalhos/checkpoints, prepara e confirma uma versão de plano e compara os eventos/revisão antes e depois. Workflow `39653033604`, job `119406040094`, sobre o commit de código acima. Inclui os testes anteriores de isolamento, concorrência, rollback, sessão e dump/restauro. O job remoto de regras ainda estava em execução na recolha destes resultados; não é declarado aprovado aqui.

## Próximos passos e compatibilidade

Continuam pendentes a integração retomável dos perfis, composição dos serviços no runtime, medição com históricos grandes, dados verificáveis de histórico/liquidez e ligação à interface. Os restantes gates do Bloco 12, incluindo SMTP exclusivo, duas contas Auth reais, privacidade e recuperação de produção, mantêm-se fechados.

Sem deploy, merge para main, alteração de dados reais ou ligação de contas Kraken. Sem mudança de regra de risco, preços de reforço, percentagens 20/30/50 ou contabilidade de margem. Sem interface nova para testar nesta entrega.

Permanecem seis etapas do Bloco 12 contando a etapa 12D em curso; quatro blocos principais contando o 12. O teste conjunto no Samsung S25 fica antes do Bloco 13, depois de o Bloco 12 estar concluído e validado.
