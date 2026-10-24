# 12M — Transporte compacto sem reduzir verificações

O ensaio 12L transportava cerca de 3 MB por checkpoint, além de reler a origem financeira completa em cada avanço. Esta implementação reduz esses dois fluxos sem alterar cálculos, movimentos ou planos, nem prolongar prazos. O lote provisório de oito passos passa a abranger até 5000 eventos/4 MB, após o ensaio de unidades descrito abaixo.

## Representação persistida

`calculation-storage.cjs` comprime apenas a pesquisa de checkpoints acima de 256000 bytes, com gzip nível 1. O JSON persistido mantém os metadados que os constraints/triggers SQL já verificam: identidade, origem, build, sequência, prazo, conclusão e progresso. A pesquisa completa é reconstruída antes de o serviço verificar a assinatura HMAC original. O HMAC e os dados financeiros não são substituídos pelo hash de transporte.

A descompressão limita a saída a 8000000 bytes e verifica formato, comprimento, SHA-256 e correspondência dos metadados de progresso. Conteúdo inválido bloqueia o trabalho; checkpoints antigos sem compressão continuam a ser lidos. Conteúdo incompressível conserva a representação anterior. Na fixture local de 5000 movimentos, o JSON passou de 2644658 para 311236 bytes (88,23% de redução); codificação e descodificação são medidas locais, não limites do Edge.

## Verificação da origem sem a transportar

O início faz a leitura integral e validação habitual da origem, no mesmo transaction/lock em que obtém uma impressão SHA-256 calculada em PostgreSQL. Essa impressão cobre o head completo, todas as linhas de eventos e planos, os envelopes, metadados e ordem. Fica dentro do payload assinado do checkpoint.

Avanço, resultado e origem de revisão podem obter apenas o head hash e uma nova impressão calculada pelo SQL sobre as linhas atuais. Não aceitam o digest do cliente nem reutilizam apenas um valor guardado. A sessão continua validada no SQL em cada transação e o head conserva o share lock que serializa escritores financeiros. Qualquer diferença bloqueia a origem como alterada. Datas e validade continuam verificadas antes/depois das operações. A API normal de snapshot/exportação mantém a leitura integral; o caminho legado sem impressão conserva a validação integral.

O teste de integridade confirma que o append-only impede alterações normais. Apenas na base isolada de testes, desativa esse trigger para simular corrupção privilegiada de factos, envelopes de evento/plano, contexto e ordem sem atualizar o head hash. Todas as diferenças são detetadas; os triggers são repostos. Outra conta e uma sessão revogada não obtêm o basis.

## Validação e limites

Os testes cobrem igualdade integral antes/depois da compressão, resultado completo após retomas, HMAC original, prazo inalterado, corrupção, limite de descompressão, retoma por outra instância, idempotência e zero escrita financeira pela fila. A matriz Auth/SQL nativa passa a descodificar o payload persistido antes de executar o oráculo direto, conservando a comparação completa.

A implementação não aplica novas migrações nem abre os gates cloud. A conclusão alojada de 5000/12, CPU, memória de pico, ingresso, todas as janelas, frontend publicado, SMTP e restantes critérios continuam por comprovar. Os resultados efetivos de repetição alojada e CI devem ser consultados nos artefactos 12M/PR; a redução de bytes local não constitui aprovação de capacidade.

## Lote de oito passos e custo do próprio ensaio

A matriz de 16 unidades sintéticas no Edge passou com hashes completos iguais, incluindo 5000 movimentos/12 ciclos e perfil: início, avanço escolhido pelo maior CPU local, resultado e origem de revisão. Os avanços selecionados têm menos de 4 MB. Mantém um cenário por pedido; acima de 5000 eventos ou 4 MB usa um passo. O máximo de operação observado no handler puro foi 659,41 ms; CPU de worker e percurso Auth/SQL devem ser lidos separadamente. A função de diagnóstico foi encerrada na versão 18.

O wrapper de conta QA passa a validar a fixture completa na preparação autenticada por capability, antes de qualquer escrita, em vez de repetir essa validação estática em cada arranque de worker. O runtime continua a validar integralmente a origem real do SQL no início e a sua impressão em cada avanço. A fixture permanece fixa no bundle, com scope/marker/capability verificados; não se aceita histórico do pedido.

O manifesto do diagnóstico fixa os hashes dos módulos efetivamente usados em `engineBuild`. O campo `sourceCommit` identifica o checkout base, anterior às alterações de lote ainda em trabalho durante a geração; não deve ser interpretado como hash do bundle testado. O relatório HTTP fixa o SHA-256 do bundle efetivamente publicado.

## Repetições Auth/SQL e interrupção recuperada

O primeiro percurso compacto (lote de dois) expirou na sequência 16. O seguinte (lote de oito) expirou na sequência 17. Ambos conservaram o prazo original, os 5000 eventos, um plano e zero recibos no projeto grande. São falhas de conclusão alojada, apesar de a matriz pura de unidades passar.

A terceira tentativa, com sockets novos apenas no runner QA e medição separada do handler, foi interrompida enquanto aguardava a janela seguinte após uma rejeição 425 `CALCULATION_WINDOW_TOO_SHORT`. Não criou trabalho: o SQL confirmou zero jobs desde o início desse ensaio e o mesmo head. Este resultado não mede conclusão nem melhora de desempenho. Antes da interrupção, o pedido state levou 4999 ms no cliente/638 ms no handler; a rejeição de admissão levou 7581/1325 ms. A diferença inclui transporte e infraestrutura, sem atribuição causal comprovada.

Na recuperação, a função temporária de conta foi encerrada estaticamente na versão 27 (503); a função de unidades já estava encerrada na versão 18. As duas contas deste run foram banidas e as duas sessões restantes revogadas. Os três projetos retêm 5006 eventos inventados e um recibo anterior; o projeto grande conserva 5000 eventos, um plano e zero recibos. Nenhum dado V19 foi migrado.

A primeira implementação compacta passou os sete jobs do CI 40079891544. Depois da extensão para oito passos, a repetição local de checkpoints, armazenamento e wrapper passou 37 testes; o CI da alteração final deve ser consultado no PR. O Bloco 12 continua aberto, com a conclusão máxima alojada ainda por demonstrar.
