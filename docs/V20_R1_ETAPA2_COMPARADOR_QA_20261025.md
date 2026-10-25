# BTC Strategy Pro — R1 etapa 2: comparador interativo isolado

**Estado:** entregavel local pronto para avaliacao; nao integrado na app publica e nenhuma alteracao ao motor V20.

- Modo Classico A-E: 20/30/50, diferenca de 1.000 USD entre conjuntos e 8.000 USD entre reforcos, alvo de venda faseado media+1.500/+2.500/+3.500 USD.
- Base V20: espacos de 0,3%/1,5% para Equilibrado, **sem** a componente de stress observacional, portanto representacao simplificada, nao replica completa do plano cloud.
- Terceira opcao: 1.500/7.000 USD, hipotese de comparacao, nao aprovada.
- Testes: 10/10 node; 6/6 larguras browser, 0 overflow horizontal, 0 erro JS; interacoes basicas aprovadas (modos, perfil, preco, reset).
- Limites: nao estima liquidacao, nao verifica margens Kraken, funding, fees atuais, quantizacao, volatilidade, slippage; nunca enviar ordens reais ou interpretar pnis de exemplo como backtest.
- O ficheiro HTML autonomo e os testes sao entregues ao utilizador no pacote da conversa de 25/10/2026. Esta branch documenta a evidencia e o plano; ficheiros externos ao repositorio nao sao automaticamente publicados.
- Proxima etapa: R1 3/4; testar viabilidade antes de qualquer nova politica.

**Advertencia:** Piso de risco e precos de entrada sao conceitos diferentes. A distribuicao classica transladada para 80.000 USD tem minimo de 60.000 USD, enquanto a heuristica V20 base minima 76.640 USD; nenhuma das duas comprova protecao contra liquidacao.
