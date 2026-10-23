# Bloco 12D18 — primeiro passo de stress sem reconstrução duplicada

O início de cada cenário limitado reconstruía o histórico, serializava uma continuação com zero passos e reconstruía o mesmo histórico no avanço imediatamente seguinte. `startSimulation` passa a validar e executar o primeiro lote na mesma chamada. Os avanços posteriores continuam a reconstruir integralmente o histórico autenticado. Não há cache entre pedidos, alteração de lotes, validade, limites ou verificações financeiras.

A API anterior `beginSimulation` continua disponível. A suite compara o novo início com begin + advance, incluindo continuação serializada, ações executadas, fees, regras alteradas, gaps, resultados vazios e falha inicial de manutenção. Os seis resultados de planeamento fixados antes da otimização continuam iguais. Verificação local: 81 testes aprovados de risco, continuação e ciclos.

A matriz com Auth/SQL real será repetida no commit desta alteração. O ganho de capacidade só poderá ser afirmado pelos resultados completos; um bloqueio correto por prazo no caso máximo continua a deixar o 12D aberto. O ensaio anterior de referência é o run 39911390299: medium-12 28008 ms, large-1 42949 ms e large-12 expirado a 60498 ms. A variação entre runners impede tratar comparações isoladas como SLA.

Produção e main não são alteradas. Permanecem pendentes a conclusão máxima dentro da janela, a capacidade hospedada completa e os restantes critérios do bloco 12 antes do teste integrado no Samsung S25.
