# V20 — 12D8: capacidade com históricos grandes

## Resultado e bloqueio

A execução local encontrou unidades de cálculo superiores a 2 s de CPU com 5000 movimentos, mesmo com a pesquisa limitada a um ciclo. Não se aprova o runtime Edge nem a passagem para 12E. O próximo trabalho é dividir também o interior de cada cenário e evitar reconstruir repetidamente o prefixo imutável do histórico, com resultados iguais e verificações de versão, assinatura, validade, sessão e propriedade preservadas.

Não se introduz um limite arbitrário de operações nem se descarta histórico para contornar o problema. Não se muda o runtime ou a política de risco sem avaliar a solução.

## Método executado

`scripts/benchmark-large-checkpoints.cjs` usa seis processos isolados, sequenciais, para históricos de 100, 1000 e 5000 movimentos. Cada tamanho inclui depósitos ou ciclos de compras/vendas já encerrados, com duas comissões por par. O capital, a margem e os timestamps são explicitamente fictícios de QA. O relógio fixo não altera a data das regras reais nem aprova regras entretanto expiradas.

Cada processo mede reconstrução, criação do checkpoint, cada avanço, obtenção do resultado e comparação síncrona. Confirma que o resultado completo coincide e que o input não foi alterado. Três processos adicionais executam simultaneamente históricos de 1000 movimentos mistos. Não há ligações a contas, SQL, Auth real, Kraken ou recursos de outros projetos.

| Movimentos | Conteúdo | Máxima CPU por operação de checkpoint | Maior checkpoint JSON |
| --- | --- | --- | --- |
| 100 | Depósitos | 97.14 ms | 112674 bytes |
| 100 | Trades/comissões | 124.38 ms | 117937 bytes |
| 1000 | Depósitos | 658.77 ms | 481676 bytes |
| 1000 | Trades/comissões | 1005.52 ms | 556398 bytes |
| 5000 | Depósitos | 2602.10 ms | 2129676 bytes |
| 5000 | Trades/comissões | 3878.22 ms | 2512468 bytes |

As três execuções simultâneas terminaram em 7323.62 ms no total. A maior operação individual entre esses processos consumiu 1135.302 ms CPU. Isto mede concorrência de processos locais, não leases SQL ou utilizadores reais no alojamento.

Os máximos de RSS do processo Node variaram aproximadamente de 82 a 458 MiB, incluindo a comparação síncrona posterior. RSS de Node não corresponde à memória do isolate Deno e não permite declarar uma ultrapassagem de memória no alojamento. Os valores por fase constam do JSON.

Fonte oficial consultada em 22/10/2026: https://supabase.com/docs/guides/functions/limits — 2 s CPU por pedido e 256 MB de memória. As medições locais não são equivalentes ao runtime alojado; são evidência suficiente para manter a aprovação bloqueada e exigir otimização e ensaio efetivo.

## Evidência e testes

- `docs/qa/V20_12D8_LARGE_CHECKPOINTS.json`: nove casos executados, todos com igualdade completa e input inalterado. O campo engineBuild é null porque o módulo não exporta essa constante; não representa uma build verificada. A origem é o checkpoint do PR31, commit 27c8de8c8a0f87defed75b06b569cfb142a7efa6, sem alterações ao motor durante o ensaio.
- Quatro testes da fixture/diagnóstico passaram: identidades únicas e capital exato em 5000 movimentos, trades encerrados com custos contados uma vez, limites da ferramenta de QA e percurso completo curto de checkpoint.
- PR31: jobs remotos postgres-atomic e rules concluídos com sucesso, verificados antes desta etapa. Não se apresentam esses testes como nova execução do benchmark atual.

A comparação com a execução síncrona valida equivalência determinística; não substitui a auditoria matemática independente. Este ensaio usa maxCycles=1, não aprova os 12 ciclos configurados. Tempos e memória não constituem garantia de capacidade.

## Continuação

1. Tornar cada cenário retomável por passos de eventos/preços, mantendo a liquidação cronológica e todas as condições de admissão.
2. Repetir estas cargas depois da alteração e aumentar até ao limite configurado de ciclos.
3. Ensaiar o pacote no alojamento efetivo, separando CPU, rede pública, Auth e SQL; resolver a latência pública ainda pendente.

A produção permanece fechada. Não se aplicaram migrações, não se alterou main nem qualquer conta real. Continuam seis etapas contando 12D–12I; depois do Bloco 12, teste conjunto Samsung S25 antes do Bloco 13. Faltam quatro blocos principais contando o 12 atual.
