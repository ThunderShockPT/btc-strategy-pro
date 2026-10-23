# Bloco 12D23 — diagnóstico do início de cálculos no Edge

A versão 11 do diagnóstico temporário mediu a build do 12D22 com início, avanço selecionado e resultado para 10, 1000 e 5000 movimentos, incluindo limite 12 e perfil equilibrado. Acrescentou revisão de perfil. São fontes sintéticas e relógio histórico fixo, sem contas, carteiras ou escrita financeira reais. O bundle descodifica apenas o caso pedido para evitar carregar todo o arquivo em memória.

O primeiro ensaio encontrou HTTP 546 em large-limit-start e profile-large-start. Os logs confirmaram CPU Time exceeded, com 2723 e 2817 ms nos workers respetivos. Mesmo havendo hash calculado internamente, um HTTP 546 não é sucesso. Os restantes avanços/resultados devolveram os hashes esperados. A recolha pública passou em 491 ms, SELECT 1 read only passou com certificado obrigatório e o token inválido foi recusado com 403. A função foi encerrada na versão 12 antes da correção.

A causa identificada foi a reconstrução da origem em cada chamada de inventário de candidatos, além de outras leituras repetidas na preparação. O contexto do planeador passa a obter ledger, projeção efetiva e admissão de manutenção numa reconstrução integral única, usando a mesma aritmética de risco. A projeção validada é reutilizada apenas nessa preparação para validar inventários e números de ciclos. Não há cache entre pedidos, aceitação de ledger do chamador ou redução de verificações de vínculos, ordens, margem, caixa ou perfil. Bookkeeping com regras expiradas continua a não permitir planeamento.

Os testes comparam o contexto com reconstrução integral e estimativa de risco, incluindo igualdade na fronteira de manutenção, preços com precisão alta, ausência de posição, regras expiradas e inputs imutáveis. Continuam os hashes fixados de planeamento, a retoma e os testes de perfis. Os resultados finais após correção e a CI serão registados na PR #34. Isto não conclui o fluxo alojado completo com sessão/SQL e não mede o pico de memória. Os workers podem tratar várias operações; CPU de shutdown é de worker, não uma decomposição exata por operação.

## Repetição corrigida — versão 13

As 16 amostras de cálculo devolveram HTTP 200, hash completo igual e input intacto. Incluem 5000 movimentos com limite 12 e perfil equilibrado, com início, avanço escolhido pelo custo local, resultado e origem de revisão. Os 19 resultados autorizados (incluindo as sondas) têm correspondência de execution_id com shutdown. O máximo observado foi 900 ms por worker; alguns workers serviram várias operações, pelo que esse total não deve ser atribuído isoladamente a uma delas.

| Amostra corrigida | CPU do worker | Operação no handler |
| --- | ---: | ---: |
| 1000 movimentos / limite 12 — início | 178 ms | 134,85 ms |
| 5000 / limite 12 — início | 560 ms | 510,73 ms |
| 5000 / limite 12 — avanço selecionado | 664 ms | 554,73 ms |
| Perfil, 5000 / limite 12 — início | 695 ms | 625,56 ms |
| Perfil — avanço selecionado | 667 ms | 552,04 ms |
| Perfil — resultado | 477 ms | 372,88 ms |
| Perfil — origem da revisão | 290 ms | 171,42 ms |

Não houve CPU Time exceeded na versão corrigida. Memória máxima observada no encerramento: 15669509 bytes; isto não é memória de pico. A recolha pública final passou em 446,08 ms no limite normal de 3 s. A consulta SELECT 1 em transação read only passou em 1706,74 ms, com verificação de certificado obrigatória. O token deliberadamente inválido foi recusado com 403. Não se usou sessão financeira válida no alojamento.

A função temporária foi encerrada na versão 14. Verificação externa: HTTP 503, QA_COMPLETE_CLOSED e financialCloudEnabled=false. As chaves temporárias foram removidas do diretório de trabalho depois do encerramento. A função de produção continua na versão 1 e não foi republicada.

A CI 39948913609 da implementação 3f0879c8dba45ff6cdc0ef5d4c028949569f2a21 passou as seis tarefas: 658 testes V20, quatro cargas de conclusão obrigatória Auth/SQL, 386 verificações anteriores e 23 testes PostgreSQL. A carga máxima concluiu em 47446 ms, com resultado completo igual; as de 1000/12 e 5000/1 concluíram em 15478 e 16273 ms. Estes tempos de laboratório variam entre runners e não são SLA.

## Artefactos e limites

Os ficheiros V20_12D23_* em docs/qa preservam os dois ensaios HTTP, logs selecionados sem cabeçalhos/credenciais, manifestos, fixtures e bundles exatos comprimidos. SUMMARY.json inclui hashes SHA-256 e a correspondência dos workers. O hash do bundle descomprimido foi comparado com o relatório HTTP. Não contêm a chave de acesso ao diagnóstico.

Permanecem pendentes o percurso alojado completo com sessão válida, fila, SQL e confirmação, concorrência e ingresso reais, memória de pico e todas as janelas temporais admitidas. O início de recolha favorável da CI não aprova a admissão mínima provisória de 45 s em qualquer instante. Este ensaio resolve as duas falhas de CPU selecionadas, mas não conclui 12D nem abre a escrita financeira.
