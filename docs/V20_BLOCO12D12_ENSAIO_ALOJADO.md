# V20 12D12 — diagnóstico reproduzível no alojamento

23/10/2026. Motor base: 91bf7f8aa050a608ba4e582918627b2757580034. O código, fixtures comprimidas, hashes esperados, resultados HTTP e registos de execução ficam no repositório. Não se confunde este ensaio com aprovação do fluxo financeiro completo.

## Resultados observados

Nove amostras alojadas — início, avanço selecionado por carga local e resultado para 10/1000/5000 movimentos — devolveram o hash completo esperado e conservaram o input. Os casos de 1000 usam limite de 12 ciclos; os de 5000 usam apenas um ciclo. Os checkpoints usam relógio histórico fixo e dados fictícios explícitos. Isto não renova regras nem cotações de produção.

| Amostra | CPU do worker nos logs | Operação medida no handler |
| --- | --- | --- |
| 1000 movimentos — início | 971 ms | 795.96 ms |
| 1000 movimentos — avanço selecionado | 721 ms | 577.74 ms |
| 5000 movimentos — início | 1533 ms | 1384.09 ms |
| 5000 movimentos — avanço selecionado | 1482 ms | 1302.67 ms |

Os nove workers de cálculo têm correspondência por execution_id entre resultado e shutdown; todos ficam abaixo do limite documentado de 2 s. O CPU inclui arranque/verificações do diagnóstico e exclui SQL e Auth nos casos de cálculo. Memória registada no encerramento: cerca de 29–30 MB; não é medição do pico. Uma unidade escolhida pela maior CPU local não garante que todas as unidades alojadas estejam cobertas.

As quatro amostras do provider público, com ticker, melhor bid/ask e candles de mark fechados, passaram no prazo normal de 3 s: 164.43, 156.19, 317.37 e 161.26 ms dentro do handler. Não foi aumentado o timeout. Os primeiros pedidos sem chave após publicação mediram cerca de 4–5.5 s no cliente; esse tempo não foi decomposto em rede, arranque e propagação da publicação.

A consulta SQL `SELECT 1`, dentro de transação read only, passou em cerca de 1066.18 ms incluindo ligação e transação. Não consultou carteiras nem escreveu dados. A URL disponibilizada pelo runtime exigiu reforçar explicitamente o modo TLS no diagnóstico; validação do certificado manteve-se obrigatória e host/projeto BTC continuaram verificados. Esta adaptação é exclusiva de QA; a configuração e os gates financeiros de produção não foram alterados. A recusa HTTP de um token deliberadamente inválido foi 403. Uma sessão real válida e o respetivo fluxo SQL ainda não foram testados aqui.

## Falhas encontradas e correções

A primeira publicação do diagnóstico falhou antes do handler: `Buffer` não estava disponível para as dependências empacotadas. A inicialização do driver revelou depois uma ReferenceError com os globais Node ausentes em Deno. Os bundles passam a disponibilizar Buffer, process e o alias global antes de avaliar dependências. O diagnóstico também instancia e encerra um pool sem ligar, para verificar o construtor. O empacotamento de produção recebeu o mesmo bootstrap, sem publicação do frontend ou da API financeira.

Testes novos arrancam bundles num processo sem esses três globais e verificam o gate fechado. Outros testes cobrem chave/expiração/quota, pedidos inválidos, igualdade, imutabilidade, destino SQL, read only e certificado obrigatório. Não se relaxou o validador das URLs de produção. As falhas iniciais e tentativas SQL ficam identificadas nos artefactos, sem credenciais ou tokens de acesso.

## Bloqueio temporal confirmado

Numa recolha às 04:35:57.183 UTC, o histórico fechado terminava às 04:35:00 UTC. Pela regra atual, restavam apenas 2817 ms de validade. Um cálculo que demora dezenas de segundos não cabe nessa janela, mesmo com preços recebidos rapidamente. Não se prolongou o prazo nem se inventou uma observação mais recente. Falta resolver o momento de admissão/agendamento do cálculo e medir o percurso completo com a validade mais curta das fontes.

## Encerramento e continuidade

A função temporária btcsp-v20-runtime-qa passou pelas versões 4–9 de diagnóstico e foi encerrada na versão 10. Verificação externa final: HTTP 503, QA_COMPLETE_CLOSED, financialCloudEnabled=false. A função financeira btcsp-v20-api, migrações, contas e frontend publicado não foram alterados.

12D continua aberta: fluxo completo alojado com sessão válida, fila/SQL e concorrência; prazo real das fontes; carga de 5000 movimentos até ao limite completo de ciclos; ingresso e memória de pico. Os casos sintéticos não substituem essas verificações. Não se avança para 12E como se estes critérios estivessem aprovados. Depois seguem 12E–12I e teste físico S25 antes do Bloco 13.

## Reprodução

- `scripts/qa/build-hosted-fixtures.cjs` produz fixtures e escolhe o avanço mais pesado na amostra local. O arquivo guardado permite repetir exatamente os casos medidos, sem depender de uma nova escolha de pico.
- `scripts/qa/build-hosted-runtime.cjs /caminho/privado` restaura o arquivo se necessário e gera uma chave temporária de 15 minutos, guardada apenas nesse diretório. Não se guarda a chave no repositório.
- `scripts/qa/run-hosted-runtime.cjs /caminho/privado ficheiro.json` executa apenas os casos enumerados no endpoint QA do projeto BTC. A função deve ser encerrada após o ensaio.
- `docs/qa/V20_12D12_SUMMARY.json` identifica fontes, versões, hashes, limites e resultados. Os restantes artefactos preservam dados HTTP, logs e fixtures sintéticas. V20_12D12_RUNTIME_V6.mjs conserva o bundle exato medido, com SHA-256 verificado contra o relatório; contém apenas o hash de uma chave temporária, nunca a chave.

Documentação consultada: https://supabase.com/docs/guides/functions/limits ; https://supabase.com/docs/guides/functions/auth-headers ; https://supabase.com/changelog/cbc-tls-ciphers-deprecated .
