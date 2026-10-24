# Bloco 12 — cálculo, revisão e confirmação dentro da validade

Data: 24 de outubro de 2026. Continuação do PR #34 na branch `qa/v20-block12-recovery-20261022`, a partir de `f78a53bc4c4acda479c4e0d6a2af9d9c633f7afc`. Implementação: `a078a2df7809b2caad97f666484234273c3dfa0c`; atualização de teste e métricas QA: `9098cc75646a723b2f2766787592a620026a910d`.

## Resultado e âmbito

O ensaio alojado de referência passou o percurso **cálculo → revisão → pausa QA de 15 segundos → confirmação → recibo → repetição idempotente**, com **5000 movimentos e 12 ciclos efetivamente selecionados**. A revisão chegou ao cliente com 39 952 ms de validade original. O histórico financeiro permaneceu integralmente igual; SQL confirmou 5000 eventos, dois planos, um recibo e plano ativo na versão 2.

Isto demonstra a resolução do bloqueio técnico neste ensaio. **O Bloco 12 permanece aberto** para integração publicada, formulários/importação, privacidade, restauro, capacidade global e S25. A pausa automatizada não constitui aceitação humana ou teste físico. Não foram ativadas contas públicas, produção V20 ou emails.

## Continuidade revalidada

- `python RETOMAR_PROJETO.py`: 436 ficheiros SHA-256 e os 332 blobs Git válidos.
- O head remoto do PR #34 correspondia ao pacote; o checkout veio da branch remota existente. Base preservada: `perf/v20-bounded-risk-paths` / `1177be0f7528ff83350c6e6e170e8b1886374304`.
- Antes dos ensaios, conta QA v33 e runtime QA v20 estavam estaticamente encerrados. Produção v1 mantinha a política fechada e `cloudAvailable:false`.
- O histórico Supabase continuava com quatro migrações antigas e sete V20. Nenhuma migração, política RLS ou grant foi reaplicado ou alterado.
- O pacote histórico, a main V19 e as outras branches não foram usados para substituir a continuação.

## Alterações

### Uma reconstrução inicial por cenário

O simulador fixa as regras históricas por compra antes da primeira reconstrução do diário. Antes, a atribuição posterior das mesmas regras descartava o diário preparado e provocava outra reconstrução no primeiro passo. Mantêm-se as verificações cronológicas e de âmbito das regras históricas, as mudanças de regras, a reconstrução nas retomas e a validação de cada movimento.

Para fontes até 5000 eventos e buscas até 4 MB, cada unidade admite até três cenários com 96 passos cada. Fontes maiores mantêm o fallback de um passo. Os resultados completos foram comparados com o cálculo síncrono e com o código do snapshot anterior, sem alterar a admissão A estrita, os cenários, os valores ou o piso preservado.

### Preparação limitada e revisão imutável

A extensão opcional `reviewPlan:{id,version}` no avanço solicita preparação, não aceitação. Quando termina o cálculo, a resposta indica `reviewPending`. A interface pede depois `prepareReview:true`; esse pedido só prepara uma revisão de um trabalho já concluído, sem executar outra unidade de cenário. A resposta contém `completedReview` e o resultado dessa mesma revisão.

A preparação usa o caminho habitual de `Store.prepare`: autenticação, sessão SQL viva, assinatura do checkpoint, fingerprint das linhas de origem, revisão integral do domínio, comparação do head/geração e prazo original. A preparação também passa pelo limite de admissão de `/prepare`. Retomas e respostas perdidas continuam a exigir reconciliação; o recibo mantém a sua chave idempotente.

O payload privado guarda uma única cópia do input comum ao estado e à busca concluída, com `completedSearchInputHash`. A confirmação reconstitui essa referência sem perda, verifica o hash e executa as revalidações existentes. As revisões antigas com input completo continuam legíveis. Não houve alteração de esquema ou de limites da tabela, compressão de factos, alteração de timestamps ou omissão de validações financeiras.

Na interface, o cálculo conduz à revisão preparada. O checkbox começa desmarcado, o hash exato continua obrigatório e a gravação depende do clique explícito. O contador local mostra a validade restante; ao expirar, desmarca e desativa a aceitação. Uma proposta nova exige revisão e aceitação novas. O relógio do servidor continua a decidir se a transação pode escrever.

A instrumentação opcional regista apenas fases, duração e identificador do pedido. O wrapper QA usa-a para medir preparação; não regista tokens, histórico, saldos ou contactos.

## Evidência alojada

Fonte: [V20_CONFIRMATION_5000_12_20261024.json](qa/V20_CONFIRMATION_5000_12_20261024.json).

| Verificação | Resultado observado |
|---|---|
| Histórico | 5000 movimentos inventados QA, incluindo compras, vendas e custos |
| Limite e seleção | 12 configurados; 12 ciclos selecionados |
| Fontes | Preços públicos reais Kraken; regras explicitamente sintéticas |
| Cálculo | Três unidades persistidas; preparação num pedido separado |
| Validade original | `2026-10-24T13:24:00.000Z`, preservada |
| Revisão recebida | `2026-10-24T13:23:20.048Z`; 39 952 ms disponíveis |
| Interação simulada | Pausa de 15 000 ms antes do pedido de confirmação |
| Recibo SQL | Um; transação iniciada às `13:23:41.093324Z`, com 18 906,676 ms até ao prazo |
| Repetição | Mesmo recibo; sem duplicação |
| Estado final | 5000 eventos idênticos, dois planos, versão ativa 2 |
| Comparação completa | Igual ao cálculo síncrono atual e ao snapshot `f78a53b` na mesma origem congelada |
| Maior CPU observada | 1596 ms nos pedidos deste ensaio; sem HTTP 546 |
| Logout | Acesso subsequente recusado; sessões revogadas |

O timestamp do recibo é o início da transação PostgreSQL, não uma medição do instante exato de commit. O código voltou a verificar `clock_timestamp()` antes das escritas; não se usa o timestamp do recibo para contornar a validade.

O resultado integral tem SHA-256 `53c62f02735192965d1668e847f05b480fecd4804b88fe1d111d0605d41f8ad1`. A comparação com o próprio motor e a versão anterior verifica equivalência e regressões; não é auditoria financeira independente nem certificação de regras atuais Kraken.

### Custo da preparação

| Fase no serviço | Wall time |
|---|---:|
| Leitura autenticada | 137 ms |
| Recuperação/verificação da busca | 567 ms |
| Validação da origem | 588 ms |
| Revisão do domínio | 484 ms |
| Montagem da proposta | 6 ms |
| Persistência da revisão | 366 ms |
| Total instrumentado | 2148 ms |

O pedido de preparação levou 2351 ms no handler e 3019 ms no cliente. A confirmação inicial levou 1597 ms no handler e 6228 ms no cliente. Estes tempos incluem percursos diferentes e não devem ser somados às fases como custos adicionais.

O transporte do ensaio final usa o comportamento HTTP normal do cliente. Os ensaios anteriores forçavam `Connection: close`; uma tentativa Node 24.22.1 foi interrompida por `Undici Parser.finish / assert(!this.paused)` depois do fixture. A retoma ocorreu após encerrar as sessões QA, com novo pedido de cálculo. Assim, os tempos anteriores e finais não isolam causalmente uma única otimização.

As amostras de memória de shutdown estão no JSON. Não representam memória de pico, carga sustentada ou aprovação global de concorrência.

### Tentativas preservadas

[Registo das tentativas](qa/V20_CONFIRMATION_ATTEMPTS_20261024.json): a primeira redução para três cenários ainda deixou apenas 18,8 segundos na revisão e expirou após a pausa; a fusão de cálculo e preparação excedeu 2000 ms de CPU; a tentativa de transporte interrompida não iniciou o cálculo financeiro. Nenhum desses casos foi contado como aprovação. A solução final separa as unidades e conserva a validade original.

## Validação automatizada

- Bateria de filas atualizada: 23 testes aprovados.
- Bateria de builds, HTTP, runtime público e limites: 45 testes aprovados, incluindo comparação completa de 5000 movimentos/12 ciclos.
- Bateria de propostas congeladas, perfis, cliente e conta: 33 testes aprovados.
- Regressões de conta, movimentos, execuções e carteiras: 40 testes aprovados.
- Referências de input antigas/corrompidas e contador de validade: testes específicos aprovados.

Estas baterias sobrepõem-se; não constituem uma contagem global de testes únicos. O Chromium não estava instalado neste workspace e o download local falhou. O teste real de navegador passou no CI, com Chrome do runner; isto continua distinto do Samsung S25 físico.

O primeiro CI desta entrega passou seis tarefas e falhou uma expectativa antiga de duas unidades, onde o limite medido passou a ser três. A expectativa foi atualizada mantendo as verificações de transporte e isolamento. O [CI 40098215397](https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40098215397) passou as sete tarefas para o commit de código `9098cc75646a723b2f2766787592a620026a910d`: regressões, PostgreSQL, navegador e quatro cargas com Auth real. A entrega documental posterior contém apenas este relatório, JSON de evidência e CSV de pendências; não altera os ficheiros de runtime e usa `[skip ci]` para evitar repetir a mesma bateria sobre documentação.

## Encerramento e próximas entregas

A função de conta QA terminou na versão 37, estaticamente HTTP 503 `QA_COMPLETE_CLOSED`; runtime QA v20 permaneceu encerrado. As seis contas criadas nos três runs ficaram bloqueadas, com zero sessões. Produção v1 continua com `cloudAvailable:false`; a política de abertura e o site público não foram ativados.

A [lista de pendências](V20_PENDENCIAS_20261024.csv) mantém R02–R15. A próxima entrega é a integração autenticada alojada: entrada, carteiras, cálculo/revisão/confirmação, movimentos, correções, conflitos, retoma e logout na interface efetivamente servida. Depois continuam os formulários/importação de posição aberta, privacidade/eliminação/portabilidade, restauro integral e capacidade. SMTP permanece separado e depende de domínio BTC próprio. O teste físico no S25 precede o Bloco 13; os Blocos 14 e 15 mantêm auditoria financeira independente e QA/lançamento.
