# V20 — 12D7C: atualização dos dados e reconciliação independente

## Alteração

O collector conserva os candles já fechados enquanto a sua fronteira original continua válida, até à fronteira do minuto seguinte. Uma atualização do livro deixa de obrigar a descarregar o mesmo histórico durante esse intervalo. Não se prolonga a validade das observações nem se alteram preços ou datas. Cache desativada força as duas consultas. A expiração do histórico ou inversão do relógio obriga a consultar novamente; falhas não são substituídas por dados expirados. O limite normal mantém-se em 3000 ms.

Nos testes de contagem, duas leituras separadas por seis segundos no mesmo minuto passam de quatro pedidos para três: duas consultas do livro e uma do histórico. Este resultado é uma redução de pedidos, não uma medição de ganho de latência na produção.

`scripts/probe-public-latency.cjs` acrescenta um diagnóstico público explícito, separado da aplicação: limites de tempo e tamanho, URL, estado HTTP, bytes, tempo até cabeçalhos e tempo até leitura do corpo. Não usa credenciais nem escreve factos financeiros. Pedidos ainda em curso quando o diagnóstico termina são identificados como tal, não como sucessos.

## Evidência real

`docs/qa/V20_12D7C_PUBLIC_LATENCY.json` guarda uma sequência executada no ambiente de desenvolvimento:

- Prazo normal de 3000 ms: falhou por PUBLIC_OBSERVATION_TIMEOUT.
- Ensaio separado de 10000 ms: sucesso, cerca de 5.433 s totais; livro 1.440 s, histórico 1.414 s e ticker posterior 3.907 s.
- Novo ensaio com o prazo normal, no mesmo processo: voltou a falhar por PUBLIC_OBSERVATION_TIMEOUT; livro 0.430 s e histórico atingiu o prazo.

Os limites de 10 s são exclusivamente diagnósticos; não alteram o prazo da aplicação. Estes resultados não aprovam disponibilidade 24/7 nem latência. O entrypoint de produção permanece fechado e sem ativação dos novos providers. A origem da variabilidade ainda exige medição no alojamento efetivo, separando rede, Auth, SQL e CPU.

## Reconciliação solicitada pelo utilizador

Foram acrescentados cinco testes independentes de nominais, PnL e taxas exibidas nas três imagens fornecidas. O detalhe e as limitações estão em `docs/V20_RECONCILIACAO_IMAGENS_KRAKEN_20261021.md`. Não houve importação de operações para a carteira, nem inferência de margem, alavancagem, jurisdição ou liquidação pelas imagens.

## Verificação executada

- Suite focada collector/diagnóstico/imagens: 25/25, zero falhas ou ignorados.
- Bateria completa V20 atualizada: 593/593, zero falhas ou ignorados, 46.21 s; log local `../qa-public-cache-full.log`.
- Bundle Edge reconstruído: 519747 bytes, sem publicação.
- Checkpoint anterior PR30: ambos os jobs GitHub terminaram com sucesso, incluindo PostgreSQL de QA. Os resultados anteriores não são apresentados como execução desta nova build.

Não foram alteradas migrações, contas, dados reais, main ou política de abertura. O manifesto do cálculo foi atualizado para a alteração do collector.

## Próximo passo

12D continua aberta: medir e resolver a latência no ambiente alojado, compor os providers no entrypoint de teste e validar capacidade com históricos grandes/concorrência. Não se avança para 12E com falhas críticas pendentes. Continuam seis etapas contando 12D–12I; depois do Bloco 12, realizar teste conjunto S25 antes do 13.
