# 12M — Transporte compacto sem reduzir verificações

O ensaio 12L transportava cerca de 3 MB por checkpoint, além de reler a origem financeira completa em cada avanço. Esta implementação reduz esses dois fluxos sem aumentar lotes ou prazos e sem alterar cálculos, movimentos ou planos.

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
