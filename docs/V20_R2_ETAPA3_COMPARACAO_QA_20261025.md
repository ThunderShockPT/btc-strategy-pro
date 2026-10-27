# BTC Strategy Pro — Bloco R2, Etapa 3/4

**Data:** 25 de outubro de 2026  
**Estado:** laboratório comparativo offline e QA local concluídos. Não é a app online, não efetua ordens, não altera a estratégia em produção, nem valida preços de liquidação oficiais da Kraken.

## Objetivo

Comparar três distribuições com capitais de **1.000 / 1.500 / 2.000 / 2.500 USD** e cenários comuns, sem confundir resultados históricos ou lucros contrafactuais com ganhos realizáveis.

| Grelha | Primeiras compras entre ciclos | Reforços dentro do ciclo | Última das 15 entradas |
|---|---:|---:|---:|
| Original A–E | 1.000 USD | 8.000 USD | 60.000 USD |
| V20 Equilibrado (base simplificada) | 240 USD (0,3%) | 1.200 USD (1,5%) | 76.640 USD |
| Experimental mais espaçada | 1.500 USD | 7.000 USD | 60.000 USD |

**Regras fixas de comparação:** referência BTC 80.000 USD; 5 ciclos de 1.000 USD de **valor nominal por ciclo**, distribuídos 20/30/50 por compras, e quantização de 0,0001 BTC. Capital da carteira é diferente do nominal. Perfil Equilibrado com piso de referência 60.000 USD.

## Matriz produzida

- **120 resultados:** 3 distribuições × 4 capitais × 5 trajetórias **sintéticas** × 2 modos de margem.
- Trajetórias: `80k → 75k → 84k`, `80k → 70k → 84k`, `80k → 60k → 85k`, `80k → 55k → 85k`, `80k → 82k` sem descida.
- Modos: apenas 10% de margem inicial, ou reforço de margem **hipoteticamente planeado** quando o capital disponível chega no cálculo estático ao requisito de stress.
- Hipóteses ilustrativas: manutenção 5%; comissão taker 0,05% por lado; reserva de caixa Equilibrado 20%; buffer 1% do capital; funding **hipotético** de 0,01% a cada 8h durante 14 dias (42 períodos). A Kraken em realidade pode liquidar parcialmente e o funding depende de taxas variáveis e liquidação contínua/horária. A aplicação não mede isso nesta etapa.
- Entradas preenchidas se o preço mínimo do percurso atravessar o limite, assumindo execução ao preço exato. É otimista em gaps e **não** faz replay de preços intraperíodo, execução parcial ou timing de adições de margem. Avaliação no ponto mínimo, **não** reconstrução cronológica de liquidação.
- Projeções de lucro líquido: apenas vendas dos ciclos que atingiriam média ponderada +1.500 / +2.500 / +3.500 conforme nº compras, se todas as hipóteses forem verdadeiras. Não contabiliza lucros não realizados de ciclos abertos. Não há previsão de retorno.

## Resultado ilustrativo (2.000 USD em caixa, percurso 80k → 60k → 85k, margem planeada)

| Grelha | Compras | Nominal executado | PnL não realizado a 60k | Margem de stress estimada | Total da carteira necessário* | Ganho líquido hipotético **apenas se resistir** | Regra V20 do piso |
|---|---:|---:|---:|---:|---:|---:|---|
| Original A–E | 15 | 4.950,90 USD | −516,90 USD | 779,45 USD | 1.181,93 USD | +234,95 USD | **Não passa**, uma ordem no piso |
| V20 concentrada | 15 | 4.965,27 USD | −1.143,27 USD | 1.372,35 USD | 1.774,83 USD | +201,82 USD | Níveis estritamente acima |
| Experimental dispersa | 15 | 4.946,15 USD | −542,15 USD | 803,06 USD | 1.205,53 USD | +233,33 USD | **Não passa**, uma ordem no piso |

\* Total da carteira necessário inclui margem adicional planejada, caixa protegida 20% e comissões de abertura; não inclui novos depósitos, nem garante que adições chegariam a tempo para evitar uma liquidação real.

**Sem reforços de margem (só 10% inicial), os três modelos apresentam risco de liquidação neste cálculo estático a 60k**, mesmo com carteira de 2.500 USD. Ter dinheiro livre na carteira não reforça automaticamente uma posição isolada. Os ganhos da tabela não podem ser tratados como realizáveis nesse percurso sem cumprir os requisitos de sobrevivência.

**Queda mais profunda a 55.000 USD:** com carteira de 2.000 USD, a V20 concentrada requer 2.075,91 USD no modelo (incluindo 400 USD de caixa protegida), ficando aquém do capital disponível; a A–E requer 1.531,21 USD mas continua inválida no piso da política V20. Isto **não certifica** que a A–E sobreviva a um gap ou à liquidação intratrajetória.

## Limites decisivos

1. O estudo R2.3 **não é um backtest histórico** e não dispõe das séries verificadas Kraken de mark, funding real e preenchimentos.
2. O modelo é de **posição agregada BTC** com níveis teóricos por ciclo, sem cálculo cronológico das ordens, das transferências ou da liquidação. Um evento intraperíodo pode liquidar antes de o resultado estático sugerir sobrevivência.
3. No Modo C Beta, a política atual impõe **preços estritamente acima do piso**. A translação literal do clássico e a alternativa dispersa têm compra exatamente em 60k; não podem ser aplicadas silenciosamente.
4. Quaisquer novas políticas de espaçamento, reservas e de admissão continuam sem aprovação final. Não escolher o “melhor” por um único cenário nem pelo maior lucro hipotético.

## QA executado

- **26/26 testes Python** do gerador, grelhas, capitais, quantização, limites, cash/margem e matriz de 120 cenários: **aprovados**.
- **6/6 larguras Chromium** 320, 390, 393, 430, 768 e 1440 px, com interações de filtros, retorno ao estado inicial, CSV, sem erros JavaScript nem overflow horizontal: **aprovadas**.
- Não testado em Galaxy S25 físico, conta Kraken ou conta Supabase. Não houve publicação ou migração.

## Próximo passo

**R2 — Etapa 4/4:** rever os critérios de comparação com o proprietário, identificar política de comparação aceitável e integrar resultados de testes históricos recuperados (sem substituir proxies por Kraken). A aceitação humana do Bloco R1 ainda está pendente e a R2 não pode aprovar automaticamente uma nova estratégia financeira.

## Referências oficiais consultadas

- Especificações EEE PF_XBTUSD (lote 0,0001 BTC; tick 1 USD; alavancagem máx. Pro 10×): https://support.kraken.com/pt/articles/perpetual-contract-specifications-for-clients-in-the-eea (atualizado 22/10/2026).
- Escalões de margem EEE (IM e MM): https://support.kraken.com/pt/articles/derivatives-margin-schedule-and-maximum-leverage-eea (atualizado 07/10/2026).
- Taxas Derivados EEE: https://support.kraken.com/pt/articles/fees-for-derivatives-trading-eea (atualizado 17/03/2026).