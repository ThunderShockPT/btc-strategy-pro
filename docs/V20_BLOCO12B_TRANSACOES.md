# V20 — Bloco 12B: gravação financeira atómica

21/10/2026. Implementação backend testada em bases isoladas; não instalada no Supabase público.

## Resultado

`backend/atomic-store.cjs` liga os workflows financeiros existentes a uma transação PostgreSQL. Permite preparar e confirmar movimentos de caixa/margem e execuções/correções. Não recebe saldos calculados pelo frontend como fonte de verdade: carrega envelopes originais do servidor, obtém regras/preço pelo provider de contexto do backend, reconstrói a posição pelo motor decimal e volta a calcular a proposta confirmada.

A API deste módulo é interna, sem endpoint HTTP. Exige dependências de servidor para autenticar o token e fornecer contexto financeiro. A escrita está desligada por predefinição (`enabled=false`). Os adaptadores reais de Supabase Auth, dados públicos atuais e interface serão implementados no Bloco 12C. Os providers usados nos testes são fixtures explicitamente sintéticas. O módulo não liga contas Kraken nem envia ordens ou transferências.

## Estrutura aditiva

Migração gerada com Supabase CLI: `20261021133133_v20_atomic_financial_persistence.sql`.

| Estrutura | Comportamento |
|---|---|
| `btcsp_financial_events.event_envelope` | Evento completo, incluindo metadados de execução parcial e extensões; trigger compara envelope com as colunas indexadas e os factos |
| `btcsp_plan_versions.plan_envelope` | Versão integral do plano; parâmetros e configuração têm de coincidir com as colunas SQL |
| `btcsp_private.project_heads` | Contexto de cálculo atual, ID do plano ativo, revisão, geração e hash do estado; conserva também a ordem original dos envelopes e versões |
| `btcsp_private.command_receipts` | Recibo imutável por chave de idempotência, hash do pedido e resultado confirmado |
| `btcsp_calculation_runs` | Snapshot das regras, preço, pedido, revisão-base e resultados antes/depois para auditar o cálculo usado |

Os envelopes existentes eventualmente sem conteúdo não são preenchidos com informação inventada. A leitura recusa esses streams até existir reconciliação. A inicialização é uma função interna de provisionamento com estado já revisto; não é uma importação automática de JSON enviado pelo cliente. Um projeto com eventos existentes não pode ser reinicializado por esta função.

O head é uma projeção reconstruível e mutável; os eventos, versões de planos, cálculos e recibos mantêm-se append-only. A tabela V1 `projects.capital` não é usada como saldo financeiro V20. Os projetos V1 e os respetivos snapshots não são alterados pela migração aditiva.

O contexto completo inclui regras e valuation; os planos históricos importados sem versão de regras explícita recebem a identificação `unrecorded-historical-rule-version` na coluna de contexto SQL, mantendo o seu envelope original intacto. Não se atribui às versões antigas uma verificação Kraken que não ocorreu.

## Confirmação e concorrência

1. O autenticador de servidor confirma o proprietário, email confirmado e ausência de sessão anónima. Um ownerId recebido no pedido não substitui essa autenticação.
2. A leitura transacional bloqueia o head em partilha enquanto recolhe eventos e planos, verifica os hashes e preserva os originais. O cálculo decorre depois de libertar esse bloqueio.
3. A confirmação repete o cálculo com contexto de servidor. O hash revisto e o hash do head têm de coincidir. Uma alteração relevante de preço/regras exige rever a proposta.
4. A transação curta de gravação bloqueia o head com `FOR UPDATE`, verifica novamente a geração/hash e procura um recibo anterior.
5. Grava a nova versão de plano quando necessária, eventos contíguos, comissão associada, histórico de cálculo, head e recibo, na mesma transação.
6. Qualquer falha desfaz todas as escritas. Pedidos iguais com a mesma chave recebem o recibo anterior. Reutilizar a chave com conteúdo diferente é recusado; um dispositivo com revisão antiga tem de voltar a comparar.

O hash deteta divergências e não substitui autenticação. Não existem novas funções SECURITY DEFINER nem RPC de escrita financeira exposto ao cliente. As tabelas públicas mantêm SELECT por proprietário e sem escrita autenticada direta. As estruturas privadas não têm permissões para anon/authenticated. A ligação privilegiada do backend deve permanecer exclusivamente no servidor; o módulo não contém chaves.

O driver PostgreSQL é injetado através de `transaction(fn)` e `query`. O ensaio nativo usa `pg@8.23.1`, fixado como dependência de desenvolvimento com lockfile. Todas as instruções de uma transação usam a mesma ligação. O código não concatena entradas do utilizador em SQL. A CI cria e elimina apenas uma base QA com nome aleatório num serviço local efémero.

## Verificação executada

**Suite V20 local: 414/414**, sem falhas ou testes ignorados, incluindo 16 novos testes de transações em PostgreSQL embutido. **Regressão V19: 386 verificações** aprovadas: Auth 19, cloud isolada 26, release 38, responsividade 37 e planeador 266.

**PostgreSQL real 17.11: 5/5** na GitHub Actions, execução `39609922574`, job `119255814490`:

- Dois pedidos independentes, preparados sobre o mesmo estado, calculados simultaneamente com barreira de sincronização: um confirma, o outro recebe conflito, sem saldo perdido ou criado.
- Dois retries simultâneos: um depósito e um recibo, com reapresentação do mesmo resultado.
- Falha injetada no recibo depois do fill, comissão, plano e cálculo: rollback integral; depois, repetição bem-sucedida sem duplicados.
- RLS com duas identidades SQL: conta diferente não lê eventos; anon não lê a tabela financeira.
- Bloqueio real de uma linha em ligações com PIDs distintos: a segunda recebe lock timeout enquanto a primeira mantém a transação aberta.

Os testes locais adicionais cobrem 2 000 + 500 USD = 2 500 USD de capital contabilístico, sem alteração da posição ou da margem isolada; adição efetiva de margem; compra parcialmente executada; comissão uma só vez; correção auditável sem reescrever o original; permissões de service_role; limites dos envelopes; gate fechado; review adulterada; venda excessiva; caixa insuficiente; conservação da ordem de origem e extensões.

Na primeira execução local, um teste consultava um nome de campo incorreto (`cash.netCapitalUSD`); foi corrigido para `capital.netContributedUSD` e repetida a suite inteira. A primeira tentativa de instalar PostgreSQL local falhou por restrições do ambiente; o teste nativo foi executado no serviço efémero da CI, com resultado e logs inspecionados. Nenhum teste de servidor foi dado por aprovado a partir da simulação embutida.

## Limites e continuação

A migração não foi aplicada a `oftzqqjbwonngubihrsd`. Não houve alterações a dados, Auth, SMTP ou contas reais, nem integração pública. Não foi alterada a interface ou a pré-visualização do Bloco 11B. A branch parte do checkpoint `d834a4cc0a34bf8ef18733af1a6a3046d7d6e49f`, relativo ao Bloco 12A.

Os testes de RLS com duas identidades SQL não equivalem a testes de Supabase Auth com duas contas reais. Ainda faltam o endpoint autenticado, proteção contra abuso, sessão revogada, credenciais exclusivamente no servidor, ligação do frontend, revisão explícita de conflitos, persistência das alterações de perfil/planos sem execução financeira, recibos reais de onboarding, quotas, backups e ensaio de restauro do servidor. A privacidade e eliminação de conta precisam de um fluxo privilegiado próprio; os FKs restritivos impedem que a eliminação comum apague o histórico financeiro em cascata.

A aprovação de revisão não marca automaticamente um plano alternativo como aplicado: o recálculo do plano após movimentos continua a exigir a confirmação específica da estratégia. Ações planeadas não se tornam factos nem alteram a liquidação da posição real. Não há recomendação de risco em tempo real ou preço oficial Kraken nesta entrega.

Próximo: **Bloco 12C — integração cloud e critérios de autenticação/recuperação**. Manter o registo público e sincronização financeira desligados até SMTP, confirmação/reset, isolamento real e restauro estarem validados. Manter backups locais Beta. Faltam **4 blocos principais (12–15)**, com o 12 em curso.

Fontes oficiais consultadas: https://www.postgresql.org/docs/current/explicit-locking.html ; https://supabase.com/docs/guides/database/functions ; https://node-postgres.com/features/transactions .
