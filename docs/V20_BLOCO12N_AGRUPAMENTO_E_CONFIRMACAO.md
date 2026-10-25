# 12N — Agrupamento e confirmação de perfis aprovados

O cálculo passa a executar até dois cenários de 32 passos por pedido, para históricos de até 5000 movimentos e pesquisas de até 4 MB. Acima de qualquer limite mantém um cenário de um passo. Os tamanhos anteriores (1, 2 e 8) continuam disponíveis. Esta é uma otimização provisória dentro do backend ainda fechado para produção.

Mantém a assinatura do checkpoint, a identidade, a origem financeira e o prazo original. O manifesto do motor foi atualizado: trabalhos assinados por outra compilação continuam a ser rejeitados. O agrupamento não renova preços nem prolonga a validade das observações.

Os testes comparam os resultados completos com o cálculo síncrono, retomam o checkpoint em novas instâncias, verificam os limites de tamanho e rejeitam conclusão tardia. O teste de transporte SQL passa a esperar dois cenários concluídos numa única sequência; continua a exigir apenas uma leitura do checkpoint completo e nenhuma nas consultas de estado/cancelamento.

O percurso HTTP/SQL de um perfil já aprovado foi prolongado até à segunda confirmação: grava a versão 3, repete a confirmação com o mesmo recibo e verifica dois recibos para duas versões confirmadas. Perfil, piso, eventos e reconstrução financeira permanecem iguais. A confirmação não volta a executar os cenários.

## Evidência e limites

O ensaio local `docs/qa/V20_12N_GROUPED_LOCAL_20261024.json` usa 5000 movimentos mistos e limite de 12 ciclos. Concluiu em nove avanços, com igualdade integral do resultado síncrono e histórico de entrada inalterado. O maior pedido medido consumiu 937,399 ms de CPU e 864,825 ms de tempo decorrido no Node local. Estes valores não medem Auth, SQL, transporte ou execução no Supabase.

As oito suites de regressão relevantes passaram 84 testes: checkpoints, perfis, percurso público, fila persistida, compressão, HTTP, interface de conta e composição do runtime. Os bundles de conta e Edge foram gerados com o gate cloud fechado.

Não houve publicação do frontend, deploy de função ou alteração de dados alojados nesta etapa. A repetição máxima alojada com autenticação, confirmação e recibo final continua pendente; o ensaio local não resolve por si só a expiração observada em 12M.

O Bloco 12 permanece aberto. Além da capacidade alojada, faltam os critérios já registados no PR #34: percurso autenticado publicado, formulários/importação restantes, privacidade e eliminação, restauro integral, ingresso/concor­rência/memória e validação no S25. O proprietário começa de novo, sem migração V19. Os emails reais continuam pendentes de domínio próprio.
