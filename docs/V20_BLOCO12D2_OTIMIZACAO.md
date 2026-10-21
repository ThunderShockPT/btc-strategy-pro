# V20 — 12D2: reutilização segura de regras imutáveis

21/10/2026. Branch perf/v20-immutable-rule-reuse; referência anterior d4731ee408dcd11ea20c043c499e7eb924aef88b. Não houve implantação, migração, alteração de dados ou abertura cloud.

## Alteração

O perfil CPU apontou para a validação repetida das mesmas tabelas Kraken e cópias/reconstruções na simulação. kraken-rules.js passa a reconhecer, por identidade num WeakSet privado, apenas os objetos que o próprio módulo validou e congelou recursivamente. Objetos do chamador continuam a ser validados e copiados, mesmo se Object.freeze tiver sido aplicado externamente. O WeakSet não guarda carteiras nem impede a recolha dos objetos.

A avaliação do âmbito, da data de verificação e da classificação da conta continua em cada Rules.assess: uma regra imutável pode estar desatualizada e continuar a ser recusada. Não há cache de aprovação ou de saldos.

cycle-planner.js normaliza uma vez as regras da cópia de trabalho. position-risk.js conserva as regras validadas na simulação e nas compras históricas relevantes. Copia os movimentos e a avaliação mutáveis antes de cada ação. Metadados históricos sem referência permanecem compatíveis e separados do input original.

A última reconstrução de cada ação já foi feita durante a validação do seu último evento: esse resultado é reutilizado para as verificações finais, que permanecem presentes. As vistas de risco de um mesmo estado são reutilizadas dentro da simulação, sem reutilizar resultados entre estados ou projetos.

Não se alteraram a precisão decimal, os arredondamentos, o cálculo da margem, os preços, os limiares, a quantidade de ciclos permitida, os sete cenários ou a exigência de sobrevivência a falhas das adições de margem. O cálculo das exigências de margem a partir da base exposta pelo ledger mantém a sequência de arredondamento anterior. Não se introduziram dependências novas.

## Regressão com a versão anterior

Antes da alteração foram calculados e guardados hashes dos resultados completos de seis casos, incluindo capital pequeno, limite configurado de 12, capital maior com 12 ciclos, margem pré-atribuída, comparação condicional e posição existente. O ficheiro scripts/fixtures/cycle-optimization-baseline.json indica a referência original. A comparação inclui ordens, reservas, margens, raízes estimadas, cenários e checkpoints, com ordenação canónica das chaves e ordem dos arrays preservada.

Os dez testes novos também verificam imutabilidade profunda, alteração do input após a primeira validação, objeto inválido congelado externamente, passagem do tempo, âmbito incorreto, manutenção alterada, preservação das regras de compras antigas e metadados históricos não usados. Os seis hashes coincidem integralmente. São testes de regressão; não substituem a auditoria financeira independente do Bloco 14.

## Medição comparada

scripts/benchmark-rule-reuse.cjs foi executado com uma cópia separada da versão anterior. Os três módulos originais foram obtidos no commit de referência; os restantes módulos financeiros mantiveram-se iguais. Cada implementação recebeu aquecimento e três amostras intercaladas, no mesmo processo Node e com os mesmos inputs. Cada resultado completo foi comparado com o original em todas as amostras.

| Capital sintético | CPU média antes | CPU média depois | Redução média | CPU máxima depois |
| --- | --- | --- | --- | --- |
| 2 000 USD | 4 029 ms | 1 059 ms | 73,7% | 1 352 ms |
| 50 000 USD | 7 864 ms | 3 151 ms | 59,9% | 6 299 ms |

Amostras completas em V20_BLOCO12D2_BENCHMARK.json. O limite configurado foi 12 ciclos; o número selecionado depende do capital e da viabilidade. As amostras lentas não foram descartadas. Não se compararam apenas os melhores tempos.

Estes valores são CPU do processo Node local; não incluem Auth, SQL, HTTP, rede, muitos movimentos históricos ou concorrência. Não equivalem ao orçamento por pedido em Deno. O caso maior continua acima dos 2 s documentados para Edge: https://supabase.com/docs/guides/functions/limits. A otimização melhora o processamento, mas não aprova a arquitetura de cálculo síncrono para todas as cargas suportadas.

## Continuação e compatibilidade

12D continua em curso. É necessário limitar e repartir o trabalho por unidades verificáveis ou usar execução adequada para os cálculos pesados, mantendo todos os cenários e a precisão. Também faltam histórico/liquidez verificáveis, persistência do contexto durante a revisão e ensaio de carga no runtime efetivo. Nenhuma configuração permite apresentar esta otimização como aprovação da cloud.

A política de abertura, os providers de produção e os dados existentes mantêm-se fechados/inalterados. A pré-visualização visual continua na versão anterior, porque este checkpoint altera apenas o processamento interno. Ver V20_BLOCO12_ETAPAS_RESTANTES.md: seis etapas contando 12D em curso; quatro blocos principais contando o 12.

## Checkpoint executado

- 487/487 testes V20 locais, zero falhas e zero ignorados, duração de 109,65 s. Incluem os dez novos testes e toda a bateria anterior.
- 386/386 verificações V19 repetidas: Auth 19, cloud 26, release 38, responsividade 37, planeador 266.
- CI 39638937343: ambos os jobs concluídos com sucesso no código 8f6e20ce1a1c0ad2c2d159f970cf755b3eade0af.
- Job PostgreSQL 119357068699: 13/13 testes aprovados, zero falhas, incluindo concorrência, rollback e restauro isolado. Não equivale a teste de produção ou SMTP real.
- Os oito ficheiros de código/testes/configuração foram comparados com o remoto e coincidem integralmente.
- Bundle reconstruído localmente: 476 316 bytes. O teste de arranque fechado passou; não foi implantado.

A otimização é um checkpoint aprovado por regressão, não a conclusão do Bloco 12D. A amostra de carga maior continua a impedir aprovação de execução síncrona integral no runtime Edge. Mantêm-se os seis passos restantes, com 12D em curso.
