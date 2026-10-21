# V20 — Bloco 5: caixa dinâmica e revisão de planos

21/10/2026 · `v20-cash-5.1` · Base: Bloco 4 (`7588dd425eb72b79cfca060f00a1bafe51bd51f3`).

## Entrega e fronteira da integração

`cash-workflow.js` implementa a preparação, comparação e confirmação explícita de movimentos manuais de capital e margem. Reutiliza exclusivamente `financial-engine.js` e `position-risk.js` para saldos e risco. Não há outro calculador de PnL, margem ou liquidação nesta camada.

O módulo não escreve em LocalStorage, Supabase, serviços externos ou contas Kraken. A confirmação devolve um novo conjunto de factos e o evento a persistir; não declara uma gravação concluída. A persistência transacional, a revisão global do projeto e a autenticação dos pedidos pertencem ao Bloco 12. O HTML/PWA e os dados da Beta permanecem preservados. Os botões da Carteira/Conta serão ligados a este fluxo nos blocos de interface; ainda não estão disponíveis na versão pública.

O gerador de ciclos continua no Bloco 6. O resultado declara `newCycles.status=not-calculated-block6` e `count=null`, em vez de inventar zero ciclos ou apresentar os cinco ciclos legados como resultado do novo motor. A reavaliação completa de compras futuras, vendas e ciclos exige esse gerador e os blocos 7/9. Neste checkpoint, configurações e compras pendentes são preservadas, a caixa e as reservas são reconstruídas, e a necessidade de rever o plano fica explícita.

## Fluxo de movimentos

| API | Responsabilidade |
| --- | --- |
| `prepareMovement(input, activePlan, request)` | Validar, comparar antes/depois, calcular diferenças e preparar uma revisão imutável |
| `confirmMovement(input, activePlan, review, confirmation)` | Verificar que o estado e a comparação continuam iguais; devolver um único evento novo ou uma resposta idempotente |
| `preparePlanChange(input, activePlan, change)` | Preparar uma nova versão das reservas, sem alterar perfil, referências ou configuração de ordens |
| `confirmPlanChange(input, activePlan, review, confirmation)` | Confirmar separadamente uma revisão de reservas financiada e com risco atual disponível |

`input` segue o contrato dos blocos 3/4. `activePlan` contém `id`, `projectId`, `ownerId`, `scenarioKey`, `version`, `profile`, `referencePriceUSD`, `referenceAt`, `protectionFloorUSD` e opcionalmente `configuration`. Projeto, proprietário e cenário têm de coincidir com o diário. Perfis: `safe`, `balanced`, `risky`. O piso deve ser positivo e inferior ao preço de referência configurado; não é reposicionado quando a cotação muda. A configuração, incluindo compras pendentes e objetivos de saída existentes, é conservada integralmente.

`request` exige:

- UUID `id`, chave `idempotencyKey` e `expectedRevision` como string inteira.
- `kind`: `capital_deposit`, `capital_withdrawal`, `margin_add` ou `margin_remove`.
- `mode`: `recorded` (já realizado) ou `planned` (apenas planeado). Não existe predefinição silenciosa.
- `amountUSD` como string decimal positiva, até 18 casas; `currency=USD`.
- `effectiveAt` e `recordedAt` UTC. A data de registo não pode ultrapassar a avaliação fornecida; um facto realizado não pode ter execução posterior ao registo.
- Origem opcional `source` (até 120 caracteres) e nota opcional `note` (até 500), sem caracteres de controlo.
- Só para `margin_add`: `purpose=initial|additional`.

A origem do envelope é `manual` ou `demo`, conforme o cenário. `source` é informação adicional, por exemplo «Transferência bancária». A aplicação terá de apresentar textos introduzidos pelo utilizador como texto, sem os interpretar como HTML.

## Realizado e planeado são estados diferentes

Um movimento `recorded` é preparado como evento append-only. Antes da confirmação, não altera o diário. Após confirmação, `nextInput` contém o histórico original intacto e no máximo um evento adicional. `eventToAppend` pode ser persistido posteriormente por um adaptador autorizado. `databaseWritten=false`, `krakenTransferPerformed=false` e `planApplied=false` não mudam neste módulo puro.

Um movimento `planned` não produz um evento factual e não pode ser confirmado por `confirmMovement`. Conserva a data desejada e mostra uma projeção claramente identificada: «se fosse registado agora, ao mesmo mark e com as mesmas regras». Não estima o preço, funding ou condições futuros. A projeção não entra na caixa real nem financia outros compromissos. Quando a operação acontecer, o utilizador tem de preparar um pedido novo como realizado e confirmar os valores e datas reais.

Registar um depósito e registar uma adição de margem são dois pedidos distintos. Nenhum movimento de capital altera a posição, a margem ou a fronteira estimada de liquidação ao mesmo mark. O motor verifica essa invariante. Uma adição de margem debita a carteira e credita a margem; não aumenta o capital contribuído.

## Comparação e reservas

A revisão inclui as reconstruções antes/depois, a estimativa de risco, a inversa para o piso guardado e diferenças de capital, carteira, margem, caixa disponível, reservas por financiar, equidade e quantidade. A diferença de liquidação só é numérica quando ambas as estimativas existem. A necessidade de margem calculada não é uma transferência realizada.

Os valores reservados não são dinheiro adicional. A caixa disponível desconta reservas de ordens, margem e segurança. A inversa pode utilizar a reserva destinada à margem, mas continua a excluir ordens e reserva protegida, como no Bloco 4.

Uma retirada sem saldo é bloqueada; não pede dinheiro à margem automaticamente. Uma retirada histórica que ocorreu realmente pode deixar reservas do plano por financiar: o facto é conservado e o plano é marcado para revisão. Não se falsifica o histórico para manter o plano aparentemente viável. Uma retirada apenas planeada que consuma reservas recebe impedimento explícito. Transferências de margem realizadas são factos declarados, não uma autorização da corretora; eventuais incumprimentos dos limites atuais aparecem como avisos. A admissibilidade de uma transferência planeada usa as verificações conservadoras do Bloco 4.

`movementFitsCurrentConstraints` avalia as restrições verificáveis do movimento planeado, não a viabilidade de todos os ciclos. `reservationRevisionAdmissible` avalia financiamento das reservas e ausência de incumprimento ao mark, não uma certificação de segurança da estratégia.

Uma revisão de reservas exige UUID diferente, versão seguinte e confirmação própria. Os factos financeiros não mudam. Perfil, piso, preço/instante de referência e configuração de ordens não são editáveis por esta API. Alterações de risco e geração de novas compras serão revistas nos blocos 6/7. Uma proposta antiga deixa de poder ser confirmada depois de qualquer movimento, mudança de cotação ou alteração das premissas.

## Regras expiradas e contabilização offline

`financial-engine.js` passa a `v20-core-3.2` e admite `bookkeepingOnly: true` apenas como exceção à expiração temporal das regras. O âmbito, contrato, plataforma, classe, metadados e todas as invariantes financeiras continuam obrigatórios. A API estrita habitual continua a bloquear regras expiradas. Uma tabela futura ou um contexto incompatível não são aceites por esta exceção.

O workflow usa essa reconstrução para não perder depósitos/retiradas realizados quando as regras expiram. Nesse estado, o resultado é `bookkeeping-only-stale-rules`, `ruleAssessment.marginFiguresCurrent=false` e os números de margem reconstruídos são apenas referências históricas/cached. A liquidação e a inversa devolvem `unavailable-stale-rules`, sem preço ou necessidade de margem atual. A interface deverá ocultar os requisitos históricos como indicadores atuais e mostrar a indisponibilidade do risco. Não se alteram a data nem o estado das regras para contornar a expiração.

`position-risk.js` verifica adicionalmente `ruleAssessment.scopeReady`; o modo contabilístico não pode ativar uma estimativa de risco. Sem regras atuais, revisões de reservas não são aprovadas e transferências de margem planeadas ficam impedidas. Isto não é garantia de funcionamento offline de toda a PWA: armazenamento durável, recuperação e atualização do feed continuam nos blocos de integração/QA.

Esta separação é compatível com a documentação Kraken de margem isolada e com a decisão de não ligar contas. Não há previsão de funding ou garantia de evitar liquidação. Fonte revista em 21/10/2026: https://support.kraken.com/pt/articles/4844463246100-margining-liquidations-multi-collateral-derivatives

## Idempotência, revisão e concorrência

Uma repetição com a mesma identidade e os mesmos valores já registados devolve `already-recorded`, sem segundo evento. Se o ID/chave já existir com valores, datas ou metadados diferentes, devolve `IDEMPOTENCY_CONFLICT`. Uma revisão esperada diferente da atual impede um novo evento.

Cada revisão inclui SHA-256 do estado completo, plano, premissas e comparação. A confirmação exige `confirmed: true` e o `reviewHash` exato. O estado é copiado antes de operações assíncronas; alterações no objeto chamador não mudam a comparação que está a ser construída. Uma comparação alterada ou baseada em outro estado é recusada.

O hash é um mecanismo de consistência local, não uma assinatura de autorização, RLS ou proteção contra um cliente malicioso que consiga recalculá-lo. A persistência futura deve autenticar, reconstruir no servidor e verificar revisão/idempotência sob transação e bloqueio. Duas confirmações contra a mesma cópia antiga podem ambas preparar resultados em memória; a gravação atómica do Bloco 12 terá de aceitar apenas a revisão correta. Este bloco não anuncia concorrência cloud implementada.

A revisão usada aqui refere-se ao conjunto completo de eventos do cenário fornecido. A restrição SQL de revisão é global ao projeto/proprietário; o adaptador servidor do Bloco 12 terá de alocar essa revisão global, incluindo eventos de outros cenários e controlo. Não inserir diretamente o resultado deste protótipo na tabela sem esse adaptador.

## Exemplo obrigatório executado

Sem comissões neste exemplo; mark e entrada 100 000 USD, 0,01 BTC abertos; reservas: ordens 300, margem futura 200 e segurança 400 USD.

| Indicador | Antes | Depósito realizado +500 | Adição de margem realizada +50, depois do depósito |
| --- | ---: | ---: | ---: |
| Capital contribuído | 2 000 | 2 500 | 2 500 |
| Carteira geral | 1 900 | 2 400 | 2 350 |
| Margem isolada | 100 | 100 | 150 |
| Disponível após reservas existentes | 1 000 | 1 500 | 1 450 |
| Liquidação local estimada | 95 000 | 95 000 | 90 000 |
| Margem adicional para piso 80 000, folga zero | 150 | 150 | 100 |

Os preços são sintéticos, sem confirmação face a uma posição real. Folga zero coloca o piso na fronteira matemática, não numa proteção garantida. O perfil Equilibrado, as compras históricas e as referências configuradas mantêm-se. A quantidade de novos ciclos não é inventada antes do Bloco 6.

## Verificação

`node --test scripts/test-cash-workflow.cjs` cobre 34 casos: exemplo 2 000+500; capitais 100/200/500/2 000/10 000/50 000; depósitos antes e depois de compras 20/30/50; margem separada; planos sem factos; confirmação; idempotência; comparações alteradas/obsoletas; concorrência local; retiradas com saldo insuficiente; reservas por financiar; datas e cronologia; metadados; custos/funding sem duplicação; três perfis; âmbito por utilizador/projeto/cenário; versões; compatibilidade UMD/Web Crypto; regras expiradas com risco bloqueado.

Inclui 100 trajetórias determinísticas de depósitos e retiradas comparadas com um oráculo de conservação monetária em inteiros. A suite UMD usa VM com os quatro módulos reais e Web Crypto; não é um teste de navegador visual ou Android físico. Resultado executado após `npm ci --ignore-scripts`: 130 testes Node aprovados (18 regras, 18 dados, 28 motor, 32 risco e 34 caixa), zero falhas. As cinco suites Beta aprovaram 386 verificações (19 autenticação, 26 sincronização isolada, 38 publicação, 37 responsividade e 266 planeamento legado). Comparação binária: os 28 ficheiros originais continuam idênticos. Não foram executados testes em dispositivo Android físico nem persistência cloud real neste bloco.

## Melhorias e continuidade

A próxima fase deverá ligar o gerador de ciclos à revisão após depósito, mostrando as diferenças de compras ainda não executadas sem alterar o histórico. A confirmação do novo plano deve usar o mesmo protocolo de revisão, com validação cronológica completa. Como qualquer mudança de valuation invalida esta revisão conservadora, a interface deverá manter a cotação da comparação identificada pelo seu instante enquanto o formulário está aberto; os dados de mercado podem continuar a atualizar noutras áreas. O adaptador de confirmação e a política de atualização desse snapshot terão de ser testados no Bloco 11/12 para evitar que um feed rápido impeça a confirmação de um registo de caixa. Convém ainda permitir uma confirmação de registo e revisão de plano em passos curtos, exibindo claramente que o depósito pode ficar guardado mesmo que o utilizador recuse alterar a estratégia.

Faltam 10 blocos principais (6–15). O feed público contínuo, a Carteira/Conta visual e a sincronização serão integrados nos blocos previstos. Sem ligação a contas Kraken e sem publicação na main neste checkpoint.
