# V20 — 12D9: cenários retomáveis, checkpoints compactos e fila

## Entrega agrupada

Esta entrega reúne a divisão dos cenários, a representação compacta das regras/histórico, a integração na fila e API, a migração operacional preparada, a correção das fixtures temporais e a bateria de regressão. Não conclui 12D nem aprova a capacidade do alojamento.

`position-risk.js` partilha o mesmo executor entre a simulação completa e os métodos beginSimulation/advanceSimulation. A continuação conserva o índice do caminho, o estado corrente, as regras históricas por compra, os movimentos hipotéticos, as falhas, os eventos de risco e o histórico. A retoma continua a verificar liquidação antes das ações e a respeitar gaps, falhas de margem, custos, limites e alterações de regras. Cada unidade do serviço avança um passo do caminho. As ações de um passo ainda são atómicas; um passo com várias ações continua a poder ser caro.

`cycle-planner.js` conserva sete cenários e o mesmo critério de seleção, mas permite pausas dentro deles. Os resultados completos continuam a coincidir com os hashes guardados antes desta alteração para seis configurações, incluindo posições abertas e limite de 12 ciclos. A validação inicial mantém a reconstrução e verificação da posição. Durante o avanço não se repete uma reconstrução adicional apenas para obter parâmetros estáticos do cenário; o estado do caminho continua a ser reconstruído e validado pelo motor.

As regras idênticas são guardadas uma vez num pool por continuação. As compras referem índices verificados; versões e conteúdo distintos mantêm-se separados. O histórico original fica apenas no input assinado; o cenário conserva o número de movimentos da base e os eventos hipotéticos adicionais. A base é reconstruída na retoma e a contagem divergente é recusada. As regras e os movimentos históricos não são descartados. O serviço autentica e copia os mesmos bytes canónicos numa única passagem, preservando tamanho máximo, HMAC, escopo, build, validade e origem.

## Integração e migração preparada

O limite de falhas de execução é separado dos passos que tiveram sucesso: tentativas menos sequência continua limitado a 100; a sequência tem limite técnico de 10000, com até 10100 tentativas totais. Um teste executa mais de 100 passos reais sem esgotar o limite de falhas. Não se alonga o prazo original de 60 segundos nem a validade dos preços/regras.

Os avanços têm um contador HMAC de ingresso separado, provisoriamente 240/minuto por endereço; prepare/commit financeiros mantêm 12/minuto e state mantém 60/minuto. Autenticação, sessão SQL e lease continuam obrigatórios. Estes limites são operacionais de Beta, não aprovação de capacidade/abuso para lançamento. Planos com muitos passos podem continuar a atingir o prazo ou o contador; o ensaio alojado tem de validar essa compatibilidade.

`20261022191052_v20_path_checkpoint_capacity.sql`, criada pelo CLI Supabase, prepara os constraints operacionais da fila e do contador. Mantém RLS, grants, chaves estrangeiras, dados, origem imutável e prazos. Foi executada em QA local e PostgreSQL nativo via CI; não foi aplicada à produção. Não há migração de factos financeiros nesta entrega.

## Fixtures temporais

Os testes integrados dependiam de regras observadas em outubro de 2026 e falharam após o prazo de revisão. O helper `live-clock-qa.cjs` é exclusivo de Demo de QA: versões QA-SYNTHETIC, contexto identificado como fictício, referência original preservada e regras históricas explícitas. Recusa projetos manuais. As regras verificadas de produção não foram redatadas nem declaradas atuais. A renovação real continua pendente para recomendações específicas.

## Verificação executada

- Bateria final: 614/614 testes V20, zero falhas, ignorados ou cancelados; 59.28 s (`../qa-v20-bounded-final.log`).
- Os cinco runners de regressão V19 passaram (`../qa-bounded-legacy.log`).
- PostgreSQL nativo de QA: 23/23 no commit 8ce7dfe8decd6cc98ad0c51982e2374950ceb5b3, job 120035851309, run 39839321838. Este ensaio inclui a migração e precede apenas a última alteração de cópia defensiva de metadados não usados e o teste correspondente.
- Bundle Edge: 525679 bytes; sem publicação.
- Ensaios sintéticos de carga e igualdade do resultado em `docs/qa/V20_12D9_LARGE_CHECKPOINTS.json` e `docs/qa/V20_12D9_5000_FINAL.json`. Cada ficheiro identifica a build medida; o primeiro contém a fase anterior à última otimização da validação da assinatura.

As primeiras tentativas detetaram: contextos QA expirados, crescimento excessivo do checkpoint por repetição das regras e pressupostos antigos de sete pedidos ou de um contador partilhado. Foram corrigidos os contextos de teste, a representação e a integração; não foram removidas as verificações financeiras. Os testes também confirmam referências inválidas recusadas, histórico intacto, metadados do chamador não congelados e manutenção das regras de entrada após alterações de requisitos.

## Critérios ainda por cumprir

A divisão por passos reduz o trabalho de cada unidade, mas não aprova o runtime. Permanecem: custo de reconstrução/serialização com históricos grandes, ações extensas no mesmo passo, carga até ao limite de ciclos, compatibilidade dos prazos com muitos pedidos, latência pública e medição real de CPU/Auth/SQL/rede no alojamento. Node local não equivale a Deno alojado. Igualdade com o motor síncrono prova equivalência, não validação financeira independente.

A cloud financeira, registo público e entrypoint de produção continuam fechados. Não houve alterações a main, contas reais ou recursos de outro projeto. Não se avança para 12E com estes bloqueios. Depois da validação integral do Bloco 12, mantém-se o teste conjunto no Samsung S25 antes do Bloco 13.

## Última medição da build final

O ensaio final isolado de 5000 trades mediu 1879.12 ms CPU na operação mais pesada, 1428.69 ms de tempo total máximo por operação e 2564549 bytes no maior checkpoint. O resultado completo coincide com a pesquisa síncrona e o input permaneceu inalterado. Esta medição continua limitada a um ciclo e exclui SQL, Auth real, rede e Deno alojado; não aprova a capacidade de produção.
