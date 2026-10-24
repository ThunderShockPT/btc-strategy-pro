# V20 — 12D7B: contexto público e liquidez ao melhor ask

## Decisão aprovada

O utilizador escolheu a opção 1 apresentada na conversa: utilizar apenas o tamanho visível ao melhor preço de venda. Mantêm-se as percentagens já aprovadas de participação dos perfis. Não se somam níveis mais afastados. A decisão está versionada em `policies/public-liquidity-20261021.json`.

## Implementação

`backend/public-profile-context.cjs` compõe o collector público de livro/candles com o ticker e as regras verificadas. O contexto só admite projetos manuais, com proprietário e projeto coerentes. Não integra contas Kraken, não envia ordens e não altera factos financeiros.

Para PF_XBTUSD linear BTC/USD, a conversão só é admitida com o contractSize verificado de 1. O nominal elegível é preço do melhor ask × tamanho reportado × contractSize. O motor existente aplica depois a participação do perfil. Quantidade e preço respeitam os incrementos do contrato. A profundidade visível pode mudar ou desaparecer; não garante execução ou liquidez futura.

O livro é revalidado e ordenado; um campo bestAsk independente não pode substituir os níveis observados. O histórico usa apenas fechos de candles de marcação completos e contínuos. Conservam-se as fontes, versões e instantes originais. Fechos de um minuto podem omitir descidas intraminuto e não constituem previsão de volatilidade.

A cotação é obtida após o livro/histórico e tem de ser pelo menos tão recente quanto ambos. Uma cotação em cache anterior à fronteira solicitada obriga a nova consulta; se continuar anterior, o contexto é recusado. Não se altera a data de uma observação para aparentar atualidade.

O prazo do contexto é o mínimo entre livro + 60 s, fronteira do histórico + 60 s, ticker + 60 s e validade das regras. Esse prazo limita checkpoints e revisões guardadas, incluindo o caminho síncrono. O mapa temporário tem capacidade limitada, isola contexto por proprietário/projeto/regras/avaliação e descarta entradas expiradas ou após inversão do relógio. Não substitui a persistência dos factos nem as verificações SQL de sessão e versão.

O manifesto de cálculo inclui agora estes providers e a política de liquidez. Uma alteração de metodologia invalida builds anteriores. O entrypoint de produção permanece fechado e sem ativação deste provider. O par de providers suporta perfis; a geração genérica continua a exigir uma política de ciclos explicitamente configurada.

## Verificação executada

- Bateria completa V20: 579/579, zero falhas ou testes ignorados, 76,37 s (`/tmp/btcsp-public-profile-full.log`). Esta execução precedeu os três casos adicionais abaixo.
- Suite final do novo provider: 14/14 (`/tmp/btcsp-public-profile-focused.log`), incluindo dois casos adicionados após a bateria completa: capacidade limitada e expiração durante obtenção da política.
- Suite final de revisões congeladas: 6/6 (`/tmp/btcsp-public-profile-frozen.log`), incluindo um caso adicional de prazo público a limitar a revisão guardada em SQL de QA local.
- Bundle Edge reconstruído: 519 747 bytes; sem publicação.

Uma primeira versão do teste de capacidade usava eventos de outro projeto e foi corretamente recusada por EVENT_SCOPE_MISMATCH antes de atingir o limite pretendido. Corrigiu-se a fixture para testar o limite com eventos do projeto correto; o teste passou. Não se flexibilizou a validação de propriedade.

Os testes usam observações sintéticas identificadas e o replay público já documentado em 12D7A. Não são prova de disponibilidade contínua, de execução Kraken, de SMTP ou de isolamento de duas contas Auth reais em produção. A evidência de latência de 12D7A mantém-se: sucesso com limite de 10 s e falha com o prazo normal de 3 s; este trabalho não aumenta o prazo para ocultar essa falha.

## Continuação necessária

Antes de fechar 12D: resolver/medir latência, compor os providers no entrypoint de teste, ensaiar no runtime efetivo e medir capacidade/CPU/SQL/Auth com históricos grandes e concorrência. Não houve migrações, alterações a contas reais, publicação em main ou abertura de registo/cloud. Após terminar todo o Bloco 12, realizar o teste conjunto no Samsung S25 antes do Bloco 13.
