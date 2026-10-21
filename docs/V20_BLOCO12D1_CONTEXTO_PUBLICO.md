# V20 — 12D1: contexto público e medição do processamento

21/10/2026. Base: 8c3e5c9978110a855d3fd819439b2eefa3c8558a, branch feat/v20-public-financial-context.

## Implementação

backend/public-market.cjs consulta exclusivamente o endpoint público do contrato PF_XBTUSD: https://futures.kraken.com/derivatives/api/v3/tickers/PF_XBTUSD. Não solicita autenticação, não transmite sessão da aplicação e não lê contas, ordens ou chaves Kraken. Marca, bid, ask, último negócio e respetivo instante ficam separados. Preço de execução e liquidação da conta permanecem nulos.

O adaptador verifica símbolo, produto, moeda, suspensão/post-only, números positivos, ordem bid/ask, timestamp e idade máxima de 60 s. Rejeita dados futuros. Preserva o lastTime com nanossegundos recebido da API, sem o confundir com serverTime. O instante do servidor identifica o snapshot; não demonstra o instante exato de atualização do mark.

Pedidos concorrentes no mesmo worker partilham uma chamada pendente. O cache dura no máximo 5 s, preserva os instantes originais e não devolve preço antigo se a atualização falhar. Tem timeout de 3 s por predefinição, resposta limitada a 64 KB e redirecionamentos recusados. Os limites são operacionais, não alterações de risco. Não existe promessa de zero latência ou disponibilidade contínua. Não é ainda um serviço WebSocket contínuo ou um cache partilhado entre workers.

backend/financial-context.cjs fornece avaliação public_mark para o diário manual. Regras são obtidas pelo servidor; a versão enviada pelo cliente é ignorada. Valida proprietário/projeto, recusa Demo e cenários de regras congeladas, verifica âmbito/idade das regras pelo relógio do servidor e reconstrói o diário com o motor existente. Não altera caixa, quantidade, margem, piso ou movimentos. Uma cotação recente não renova a data de verificação das regras.

O runtime passa a transportar os providers de plano e configuração e o relógio até ao handler HTTP. Mesmo com uma política aprovada, mantém cloudAvailable=false se faltar qualquer um dos três providers. A entrada de produção continua sem providers e a política continua fechada; não foi implantado o bundle novo. Os módulos novos não estão ligados ao processamento financeiro alojado.

## Observação pública real

O adaptador recebeu uma resposta pública real por Node, sem autenticação. Snapshot em 2026-10-21T16:36:18.997Z, receção em 16:36:19.100Z; chamada completa medida em 5382 ms usando timeout de prova de 10 s. São observações pontuais, não uma garantia de desempenho nem preços atuais. A precisão nanosegundo do último negócio foi confirmada na resposta real.

## Desempenho

scripts/benchmark-financial-context.cjs produz amostras de CPU e wall clock para diário com 100, 1000 e 5000 eventos e pesquisa estrita até 12 ciclos. A primeira tentativa usou um nome de evento inexistente na fixture; foi corrigida para capital_deposit e a medição foi repetida. Nenhuma regra financeira foi alterada.

Resultados completos em V20_BLOCO12D1_BENCHMARK.json, Node 24.19.0 local, cinco amostras após aquecimento. Máximos CPU: cerca de 41,4 ms / 90,5 ms / 509,4 ms para os três diários; pesquisa de ciclos 7903 ms CPU e 7660 ms wall. A CPU é do processo Node, não do pedido em Deno. Não inclui SQL, Auth, rede ou utilizadores concorrentes. O ensaio serve para identificar o bloqueio; não aprova a carga em produção.

O limite documentado das Edge Functions é de 2 s CPU por pedido: https://supabase.com/docs/guides/functions/limits. A pesquisa de ciclos necessita otimização ou repartição/arquitetura de execução, com equivalência financeira verificada, antes de aprovar esta etapa. Não reduzir silenciosamente o número de cenários, a precisão ou o critério de sobrevivência.

## Pendências explícitas

Ticker não contém a série temporal e a profundidade verificadas exigidas pelos perfis: historyAvailable=false e depthAvailable=false. Não se fabricaram estes dados a partir de um preço ou bidSize/askSize. O provider completo de planos/configuração depende dessas fontes.

É ainda necessário guardar o contexto revisto no servidor para todos os comandos. O fluxo SQL atual recomputa a proposta ao confirmar: um mark novo muda o hash e exige nova revisão. O cache de 5 s não é uma solução para este problema. A configuração inicial já possui proposta temporária no servidor; essa proteção tem de cobrir também os restantes fluxos.

A etapa 12D continua aberta. Ver V20_BLOCO12_ETAPAS_RESTANTES.md para as seis etapas restantes e blocos 13–15. Não foram alterados main, site público, saldos ou contas; não houve migrações, implantação ou emails. A pré-visualização visual permanece na versão 11B.

## Fontes consultadas

- https://docs.kraken.com/api-reference/market-data/get-ticker-by-symbol
- https://docs.kraken.com/api-reference/market-data/get-orderbook
- https://supabase.com/docs/guides/functions/limits
- https://supabase.com/changelog.md — lido em 21/10; alteração TLS anunciada para 10/11/2026, sem mudança de configuração neste sub-bloco. Não foram introduzidas dependências novas.

## Verificação local executada

- 477/477 testes V20, zero falhas e zero ignorados, 80,29 s. Incluem 13 testes novos de contexto público e 1 proteção adicional do runtime; os 16 testes de carteira/planos do checkpoint anterior também foram repetidos.
- 386/386 verificações V19 repetidas: Auth 19, cloud 26, release 38, responsividade 37, planeador 266.
- Reconstrução do bundle fechado: 475 460 bytes; arranque local e gate fechado aprovados. Não equivale a execução financeira em Deno alojado.
- Código de referência: 3ae91bbb3c6b5d3cf48959ee59bf2c317ff9d45f. CI associada: 39636474507. O estado final deve ser verificado no GitHub; estes resultados locais não são apresentados como resultado da CI.

CI verificada após a conclusão: 39636474507 terminou com ambos os jobs aprovados no código 3ae91bbb3c6b5d3cf48959ee59bf2c317ff9d45f. O job PostgreSQL 119348236209 aprovou 13/13 testes, zero falhas. O conteúdo dos oito ficheiros de código/testes/configuração foi comparado com o remoto; os três ficheiros de documentação também foram confirmados. PR: https://github.com/ThunderShockPT/btc-strategy-pro/pull/20, sem merge ou publicação. A aprovação dos testes funcionais não elimina o bloqueio de desempenho medido.
