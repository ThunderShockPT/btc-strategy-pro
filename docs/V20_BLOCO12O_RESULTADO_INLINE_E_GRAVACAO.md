# 12O — Resultado no último avanço e custo da gravação

## Alterações

O pedido autenticado `calculations/advance` aceita o booleano opcional `includeResult`. Só quando o trabalho está concluído devolve `completedResult`, obtido pelo serviço normal de resultados. A verificação de sessão SQL, origem, assinatura e validade mantém-se. Pedidos anteriores conservam a resposta anterior; valores não booleanos ou o campo noutras rotas são recusados. O cliente pede esta opção e a interface usa o resultado recebido, conservando a consulta separada como fallback para respostas antigas e retomas por estado.

A confirmação deixa de procurar cada identificador histórico numa lista completa. Usa um conjunto de identificadores para verificar preservação e unicidade, mantendo a comparação canónica integral dos eventos anteriores. A comparação direta dos conteúdos canónicos substitui dois hashes por evento; não elimina a validação financeira nem altera factos, planos, prazos ou recibos.

Código: `bdbd7786a71672e28ff04ad4b9fa4eedca23a4ea`. As oito suites relevantes passaram **77 testes locais**, incluindo transporte HTTP, cliente, interface de conta, composição do runtime, percurso público, persistência, propostas congeladas e checkpoints. Os bundles foram gerados com o gate de produção fechado. O CI 40093797417 passou as sete tarefas, incluindo navegador, PostgreSQL e quatro cargas com autenticação real. O CI anterior 40091666881 também passou.

## Ensaios alojados

Foram usadas apenas contas QA e histórias inventadas, preços públicos reais e regras explicitamente sintéticas. Estes ensaios não validam regras atuais Kraken nem envolvem ordens numa exchange.

1. **Percurso curto, versão QA 28:** passou cálculo, confirmação, repetição idempotente e verificação do estado, em quatro avanços. As duas contas foram encerradas e o acesso após logout foi recusado.
2. **5000 movimentos, limite de 12 ciclos, versão 29:** o trabalho `cc507326-e061-4811-8a0e-79add5e813f2` concluiu em cinco avanços. O resultado completo coincidiu com o cálculo síncrono sobre a origem congelada (SHA-256 `deefd5ce7d991a386ce9f34278311aa8f20f11bdbe88885a89975368b5162ec8`). A confirmação recebeu `COMMAND_REVIEW_EXPIRED`; SQL conservou 5000 eventos, um plano e zero recibos.
3. **Resultado inline, versão 30:** o pedido de confirmação `01a16dd9-8d2e-7904-a030-ecbde38ee516` foi interrompido com HTTP 546. O log registou `CPUTime`, 2238 ms. A reconciliação confirmou 5000 eventos, um plano, zero recibos e o mesmo head. Isto motivou a alteração da procura histórica para um conjunto.
4. **Resultado inline e procura linear, versão 32:** o trabalho `13e49474-d02c-484d-aec7-c2bb6d603a36` concluiu em cinco avanços e devolveu o resultado sem consulta separada. A comparação integral com o cálculo síncrono passou (SHA-256 `d99b9093e21f164d9dc1cecf93b94dee987dc2c4c6bee7caf75b02f3019d3af9`). A confirmação chegou à verificação transacional, mas foi recusada por validade expirada. Conservou 5000 eventos, um plano, zero recibos e o head `f8370fbfd56412d360302048db433983ea6a28adfbd01bd2d30407c74134a99a`.

O último ensaio e as métricas observadas estão em `qa/V20_12O_HOSTED_LINEAR_LARGE12_20261024.json`. As métricas de shutdown são amostras de workers, não memória de pico nem aprovação de capacidade. Não se atribui a variabilidade de transporte a uma causa ainda não demonstrada.

## Estado final

As funções temporárias ficaram encerradas estaticamente: conta versão 33 e runtime versão 20, ambas com HTTP 503. As quatro contas dos dois runs ficaram bloqueadas, sem sessões. A API de produção e o frontend não foram publicados ou ativados.

**O Bloco 12 continua aberto.** Há agora conclusão alojada do cálculo máximo, mas ainda falta concluir a confirmação/gravação dentro da validade original com margem de utilização adequada. Não se prolongaram prazos, não se aceitaram preços expirados e não se declarou o percurso máximo aprovado. Permanecem os restantes critérios do PR #34: ingresso/concorrência/memória, frontend autenticado publicado, formulários/importação, privacidade/eliminação/termos, restauro integral e S25. O proprietário começa sem migração V19; emails reais continuam pendentes de domínio.
