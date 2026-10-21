# V20 — Bloco 8: operações corrigíveis e auditáveis

21/10/2026 · Base preservada: `a7a5c730729dd2d5e187faf4b71680de4d88dcfc`, Bloco 7B. Branch de trabalho: `feat/v20-auditable-corrections`.

## Resultado e critérios de aceitação

O motor de desenvolvimento passa a reconstruir a posição a partir de um diário append-only: os registos originais são preservados e cada alteração acrescenta um evento. Corrigir, anular, restaurar e reverter uma correção são ações distintas. Nenhuma ação modifica, cancela ou comunica com operações da Kraken.

Critérios deste bloco:

- Recalcular quantidade, preço médio, custos, funding efetivamente registado, PnL, carteira e margem com o mesmo motor dos blocos anteriores.
- Preservar os factos originais, o momento da negociação e cada versão da correção, com motivo, proprietário, referência e instante de registo.
- Impedir vendas superiores à quantidade reconstruída, quantidades indisponíveis num ciclo, caixa negativa, insuficiência de margem inicial e referências de custos incoerentes.
- Preparar um resumo antes/depois e exigir confirmação do seu hash exato; recusar revisões alteradas ou desatualizadas.
- Permitir alterações coerentes de várias operações numa única proposta, sem guardar estados intermédios inválidos.
- Manter os cenários de risco e o planeador de ciclos compatíveis com os factos corrigidos.

## Arquitetura implementada

`journal-projection.js` projeta os eventos pela revisão de registo, independentemente da ordem do array. Cada operação original começa na versão 1. Os eventos `correction`, `void` e `reversal` apontam para a operação original em `target_event_id` e têm `correction_reason` no envelope, compatíveis com as colunas e constraints da estrutura do Bloco 2.

Nos factos da correção guardam-se `expectedVersion`, `action`, `previous`, `next` e `reversesCorrectionId`. Os estados anterior/novo incluem `active` e `record`, com os factos e `effective_at`. Uma transição exige a versão esperada e valores anteriores exatamente iguais à versão corrente. Os instantes de registo não podem recuar relativamente à operação ou à sua última correção. A data da negociação pode ser corrigida explicitamente; a data original permanece no evento fonte.

A projeção mantém ID, proprietário, contrato/tipo de evento, origem e metadados do evento original. Só a vista contabilística dos factos e da data efetiva é substituída. Anular desativa o registo; restaurar reativa-o sem mudar os valores. Reverter referencia a última correção dessa operação e repõe o estado anterior através de outro evento. Para desfazer uma correção mais antiga é necessário rever a cadeia posterior, evitando repor versões por cima de alterações recentes.

`financial-engine.js` valida os envelopes de todos os eventos, aplica a projeção e reprocessa os factos ativos pela data efetiva/revisão original. O mesmo identificador de compra continua a ligar as comissões explicitamente registadas. Anular ou mudar a data da compra pode invalidar essa ligação, exigindo resolução explícita. O resultado inclui a contagem de eventos fonte, correções e factos ativos; a projeção conserva todas as versões auditáveis.

`correction-workflow.js` expõe `prepare(input, request, {plan})` e `confirm(input, review, {confirmedReviewHash, plan})`. Aceita 1–100 alterações por proposta, sujeitas ao limite total de 10 000 eventos e a uma verificação conservadora de 64 000 bytes por payload de correção, compatível com o limite de armazenamento do Bloco 2. Cada alteração tem ID, chave idempotente, operação alvo, versão esperada, ação e motivo. Para substituir exige os novos factos completos e a data efetiva; para reverter exige o ID da correção anterior.

A proposta apresenta saldos antes/depois, diferenças, registos afetados, inconsistência financeira inicial e ligações de ciclos afetadas. Todas as alterações exigem confirmação, incluindo as de maior impacto. A confirmação recalcula a proposta e valida o hash do conteúdo e do estado completo — eventos, avaliação, regras, reservas e plano fornecido. Uma repetição exata de um lote já presente devolve `already-recorded`, sem novos eventos; mistura de repetidos e novos ou pedidos alterados é recusada.

O retorno de confirmação é apenas `prepared-for-persistence`, com `nextInput`, `databaseWritten=false`, `planApplied=false` e `exchangeTradeChanged=false`. Não há escrita em contas, base de produção ou interface pública.

## Consistência cronológica e alterações em lote

Uma compra de 500 USD corrigida para 50 USD não cria dinheiro: em futuros, o nominal da compra não tinha sido debitado como compra spot. A margem efetivamente transferida continua atribuída; uma retirada posterior exige movimento próprio. O PnL é reconstruído sobre a quantidade/preço corrigidos.

Se existia uma venda de 0,003 BTC e a compra passar de 0,005 para 0,0005 BTC, a proposta é bloqueada em `SELL_EXCEEDS_AVAILABLE_BTC`, identificando a venda. O utilizador pode preparar um lote que corrija também essa venda para 0,0003 BTC, se corresponder à realidade do seu diário. O motor só valida o estado financeiro final desse lote. Não altera automaticamente a venda nem inventa execuções ou compensações monetárias.

Comissões e funding mantêm os valores realmente registados, mesmo quando uma compra muda de nominal. Só são alterados por correções explícitas dos respetivos registos. As taxas não são inferidas retroativamente. Anular uma compra com comissão ligada exige resolver a comissão no mesmo lote ou numa revisão coerente. Anular uma venda cujo lucro já foi retirado pode deixar a carteira negativa e é bloqueado.

O âmbito da API de correções é compra, venda, comissão e funding. Capital e transferências de margem continuam nos workflows de caixa e exigem movimentos próprios; esta API não os pode apagar. Operações pendentes pertencem ao plano: um registo incorretamente marcado como executado pode ser anulado no diário, mas a ordem planeada exige revisão separada.

## Compatibilidade com ciclos e risco

O planeador usa agora `Core.effectiveEvents(input)` para os valores das compras associadas às etapas. Uma compra anulada deixa de entrar na posição; se continuar ligada ao plano, a ligação inválida exige revisão explícita. Um ciclo corrigido passa a ter a quantidade correta. Os números originais e corrigidos dos ciclos permanecem reservados para evitar reutilização acidental.

Os cenários de risco partem da posição corrigida. Uma correção de diário não pode aparecer como ação de mercado hipotética para fazer desaparecer uma posição durante um cenário de queda. A estimativa continua local, aproximada e distinta de qualquer preço oficial Kraken.

A correção não muda automaticamente os orçamentos pendentes, o piso escolhido, as reservas ou os objetivos de saída. A prévia marca `planReviewRequired=true`, `exitTargetsRequireReview=true` e não inventa uma nova contagem de ciclos. Ligações anuladas ou com ciclo alterado são identificadas em `inventoryImpact`. Segue-se o workflow de revisão/confirmação de perfil/ciclos dos blocos anteriores, com dados atuais quando necessários.

Com regras desatualizadas, a reconstrução contabilística continua possível no âmbito já admitido pelo motor; a estimativa de risco fica indisponível. A correção não se apresenta como validação de preços, taxas ou funding.

## Âmbito de dados e backend

Não se altera o esquema nem se aplica DDL neste bloco: a estrutura existente já prevê eventos imutáveis, razões e referências. O adaptador do Bloco 12 deverá serializar estes envelopes, autenticar o proprietário, validar a política no servidor e atribuir a revisão global do projeto sob transação. A revisão usada pelo motor é do diário fornecido; não é um mecanismo suficiente de concorrência entre cenários e dispositivos. Hashes locais não são assinaturas de autorização.

O motor mantém as origens atuais `manual` e `demo`, com separação por cenário. Uma referência de execução externa fornecida manualmente pode ser conservada como metadado, sem validação ou ligação a conta Kraken. Não se implementa neste bloco um importador de execuções ou uma nova origem persistida: isso exige mapeamento explícito no adaptador de importação. Não há chaves API, leitura de contas ou reconciliação automática com a corretora.

A migração de dados reais, gravação cloud, concorrência multiutilizador e interface de histórico ficam nas integrações previstas, sem apagar dados nem desativar os backups da Beta. No navegador, os módulos devem carregar pela ordem: decimal, regras Kraken, projeção do diário, motor, risco, workflows. A aplicação pública ainda não os carrega.

## Verificação

O relatório reproduzível `docs/V20_BLOCO8_CENARIOS.json` é gerado por `npm run preview:v20:corrections`. Mostra exemplos sintéticos, sem cotações reais ou probabilidades. Os testes incluem um oráculo independente de PnL com valores inteiros para 60 carteiras fechadas e um ensaio com 1 003 factos mais 60 correções. O tempo desse ensaio não constitui benchmark de navegador ou garantia de performance em dispositivo físico.

Os testes de navegador deste bloco executam os módulos UMD numa VM sem rede ou armazenamento. Não são um ensaio físico no Samsung S25 nem testes de formulários. Os testes SQL continuam isolados; não provam persistência ou concorrência na produção.

## Resultados executados em 21/10/2026

- **258/258 testes Node aprovados**, sem falhas ou testes ignorados, nas nove suites dos Blocos 1–8.
- **43/43 testes específicos de correções aprovados**: exemplos, invariantes, estados inválidos, reversões, idempotência, revisões concorrentes, payloads limite, VM do navegador, propriedades e carga.
- **386/386 verificações anteriores da Beta aprovadas**: autenticação 19, sincronização isolada 26, release 38, responsividade estática 37 e planeador 266.
- Os **28 ficheiros da referência funcional auditada permanecem byte a byte iguais**. Nenhum dado real foi alterado, nem houve publicação ou alteração da main.
- O relatório sintético foi executado e confirma a preservação semântica de todos os factos originais após confirmação. A ordenação das chaves JSON pode ser normalizada; os valores originais e o seu conteúdo não são reescritos.

## Continuidade

Próximo: **Bloco 9 — simulação temporal**, com funding variável, custos ao longo do tempo e cenários extremos. **Faltam 7 blocos principais (9–15)**. A interface de detalhes/edição/confirmação será ligada aos workflows na renovação visual; a gravação atómica fica no Bloco 12. Os perfis mantêm os parâmetros do Bloco 7B e a auditoria financeira independente continua no Bloco 14.
