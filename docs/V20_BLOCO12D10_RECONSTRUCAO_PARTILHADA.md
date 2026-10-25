# V20 12D10 — reconstrução partilhada do histórico

A retoma de cada caminho reconstruía o histórico no snapshot e novamente ao pedir os movimentos efetivos. O motor passa a oferecer reconstructWithEvents: o mesmo executor devolve o ledger e a projeção efetiva já validada. As interfaces reconstruct e effectiveEvents conservam os resultados anteriores. Não há cache de saldos nem dispensa de validar eventos, correções, regras, escopo ou conservação de capital. A simulação usa a projeção da reconstrução inicial, eliminando a segunda reconstrução. Checkpoints conservam prazos, HMAC e verificação da base; o manifesto de build foi regenerado para recusar checkpoints de código anterior.

## Verificação

A bateria primária completa do workflow passou: 617 testes V20 e 386 verificações Beta legadas, sem falhas. Inclui bundle Edge e módulo browser. O teste adicional compara a reconstrução combinada, verifica imutabilidade e separação dos factos do chamador e confirma rejeição de duplicados, outro proprietário e montantes inválidos. Hashes completos de regressão anteriores continuam iguais; correções, alterações de regras e continuação serializada mantêm resultados.

PostgreSQL nativo não está instalado nesta sessão. A branch foi acrescentada ao workflow para executar os 23 testes nativos na CI; resultados devem ser consultados após o envio, sem confundir PGlite local com PostgreSQL nativo.

## Medição isolada local

Dados fictícios, relógio fixo de QA. Sem suites de teste concorrentes. Baseline no commit e1c2048 e código alterado medidos sequencialmente, em processos Node separados. Uma amostra por configuração: não é previsão de capacidade de produção.

| 1000 movimentos, maxCycles=1 | Baseline | Alterado |
| --- | --- | --- |
| Soma dos tempos locais de pedidos | 5872.37 ms | 4089.16 ms |
| Máximo CPU por pedido | 644.107 ms | 482.541 ms |
| Avanços | 29 | 29 |

Redução observada de cerca de 30.4% na soma dos tempos e 25.1% no máximo CPU. Cada execução confirma igualdade do resultado completo com pesquisa síncrona e input inalterado. O limite de 12 ciclos, com 1000 movimentos, exigiu 203 avanços e 33911.02 ms locais de pedidos; máximo CPU 531.265 ms, máximo tempo por pedido 483.92 ms. Não se compara diretamente esse tempo com a amostra anterior de 50 segundos, que concorreu parcialmente com testes.

Ensaio adicional isolado: 5000 movimentos, maxCycles=1, máximo CPU por pedido 1505.712 ms e máximo tempo por pedido 1109.41 ms. Resultado completo igual e histórico intacto. Este ensaio não cobre 5000 movimentos com 12 ciclos. Artefacto: docs/qa/V20_12D10_5000_SHARED_RECONSTRUCTION.json.

Artefacto detalhado: docs/qa/V20_12D10_SHARED_RECONSTRUCTION.json.

## Estado do Bloco 12

12D permanece aberto: faltam CPU/memória e latências alojadas, SQL/Auth/rede, concorrência e prazo efetivo de 60 segundos, dados públicos no prazo normal e carga grande até ao limite de ciclos. 203 avanços continuam a implicar muitos pedidos. Este trabalho não muda limites, validade dos preços, critérios financeiros, conta Kraken ou dados reais. Não se abriu a cloud nem se publicou novo frontend. Depois seguem 12E–12I e teste no S25 antes do Bloco 13.
