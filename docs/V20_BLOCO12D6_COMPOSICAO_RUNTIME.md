# 12D6 — composição dos serviços no runtime

21/10/2026. PR #28, branch `feat/v20-runtime-calculation-composition`. Base: `c98278a02be9964207aca3316bfc27feb8d19db3`. Código/configuração testados: `45af2d5353260ee4aa1b46c2fabe42d1c1385330`.

## Entrega implementada

O runtime passa a ligar os serviços privados de checkpoints e trabalhos persistentes às rotas autenticadas de cálculo e à revisão/confirmação de planos já existentes. A versão de código é `v20-edge-runtime-12d6.1`.

Depois de a política e os três providers obrigatórios permitirem a composição, a infraestrutura é construída de forma lazy: adaptador SQL exclusivo BTC, Auth, admissão e material de assinatura. Cada pedido constrói os seus adaptadores de cálculo usando a identidade validada nesse pedido. O estado do cálculo continua no SQL, permitindo retomar noutro worker.

A identidade só é validada remotamente uma vez por pedido admitido. Chamadas internas usam uma função restrita ao token daquele pedido; não existe cache global de identidade. Todas as transações continuam a executar a verificação SQL da sessão. Revogar a sessão impede o pedido seguinte mesmo que o endpoint Auth simulado ainda devolva o utilizador.

O provider de plano fornece `cyclePolicy` para cálculos genéricos, ou `market` e `baseCyclePolicy` para perfis. Os dados não são recebidos do cliente. A confirmação usa a revisão persistente, sem nova cotação ou simulação. Onboarding mantém o seu provider e fluxo próprios.

## Configuração e fecho seguro

São necessárias duas chaves de servidor distintas:

- `BTCSP_ADMISSION_KEY`: HMAC dos identificadores de admissão.
- `BTCSP_CALCULATION_KEY`: assinatura dos checkpoints.

Ambas têm de representar exatamente 32 bytes em Base64 canónico. Valores ausentes, malformados ou iguais são recusados antes de criar o pool. Para produção deverão ser geradas criptograficamente e geridas como segredos exclusivos BTC; os valores fixos dos testes são apenas fixtures de QA. Nenhum valor de chave foi criado ou instalado na cloud nesta entrega.

Mantêm-se o URL Supabase fixo, validação do destino SQL, TLS verificado, pool limitado e chave pública Auth configurada. Uma configuração incompleta impede operações financeiras. O endpoint health devolve `cloudAvailable: false` se a composição falhar, sem expor o motivo interno ou credenciais.

Esse indicador significa política/providers presentes e composição configurada; não faz ligações SQL ou chamadas Auth para provar saúde de dependências externas. Não substitui testes de acesso, schema, rede ou atualidade dos dados.

Com a política fechada, o runtime não lê segredos, não cria pool, não chama Auth e recusa as rotas financeiras. A validação da origem ocorre antes da disponibilidade: uma origem estrangeira não provoca acesso à configuração, mesmo no ensaio de uma política aprovada.

## Verificação executada

| Execução | Resultado |
| --- | --- |
| V20 local, conjunto final | 553/553, zero falhas/ignorados, 91,44 s |
| Primeiros testes focados de runtime e bundle | 16/16, zero falhas/ignorados |
| Controlos V19 | 386: Auth 19, cloud 26, release 38, responsividade 37, planeador 266 |
| PostgreSQL 17 nativo de QA | 23/23, zero falhas/ignorados |
| Bundle Edge local | Reconstruído, 518805 bytes, política financeira fechada |

O teste integrado local percorreu health, leitura, criação de cálculo de perfil, retoma noutro worker, resultado, revisão, confirmação e replay. Verificou uma chamada remota Auth por pedido, infraestrutura reutilizada por worker, uma consulta ao contexto/política para o cálculo e preservação dos eventos/piso. Cobriu ainda outra conta, sessão revogada, chaves inválidas/partilhadas, rotas fechadas e origem estrangeira sem leitura de segredos.

No teste local, o driver foi ligado a PGlite de QA. No ensaio nativo foi ligado a PostgreSQL 17 de QA através de um transporte injetado, com Auth remoto simulado. O SQL e os serviços do runtime foram executados; o TLS e a rede de produção não foram ensaiados por essa injeção.

PostgreSQL: workflow `39658839846`, job `119426205138`, no commit de código acima. O caso novo percorreu os serviços compostos, retomou o trabalho noutra instância e confirmou o perfil com uma validação remota de identidade por pedido. Inclui os testes anteriores de concorrência, rollback, isolamento, sessão e dump/restauro. O tempo do caso QA não constitui benchmark de CPU Edge nem inclui latência Auth/SQL de produção.

## Limites e próximos passos

Esta entrega compõe o código do runtime. A função de produção não foi atualizada. O entrypoint continua sem os providers de produção e com a política fechada; não houve criação de segredos, migração SQL, abertura de contas, merge para main ou alteração do site/preview.

Faltam a fonte verificável de histórico/profundidade, ligação dos providers reais, ensaios de históricos grandes e validação em Deno/SQL alojados. Permanecem por validar ingresso/admissão, capacidade/retenção e orçamento de CPU por cenário; não se considera aprovada a execução pública no Edge.

O próximo ensaio deverá medir separadamente CPU, Auth, SQL e tempo total, mantendo o critério de sobrevivência à falha de adição de margem. Se uma unidade ainda ultrapassar o orçamento do runtime, será necessário dividi-la mais ou escolher um runtime adequado; não reduzir as condições financeiras para acelerar o teste.

Sem alteração das regras de risco, contabilidade, preços de reforço ou compras 20/30/50. Sem ligação de contas Kraken, ordens ou transferências automáticas. Restam seis etapas do Bloco 12 contando 12D, e quatro blocos principais contando o 12. O teste conjunto no Samsung S25 mantém-se após a conclusão/validação do Bloco 12, antes do 13.
