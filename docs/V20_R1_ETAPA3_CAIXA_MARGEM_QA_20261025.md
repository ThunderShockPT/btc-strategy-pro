# BTC Strategy Pro — R1 etapa 3/4: orçamento, caixa e risco ilustrativo

**25-10-2026.** Entrega de um comparador HTML totalmente offline, sem ordens, contas, login, depósitos, alterações à política V20 ou publicação em main.

## Pontos verificados

- PF_XBTUSD EEE: contrato de referência e regras fotografadas em `rules/kraken/eea-pf-xbtusd-20261021.json`; lote mínimo/passo 0,0001 BTC e tick de 1 USD. Os valores da Kraken podem mudar; não é validação atual de uma conta.
- Multiplicador 10x isolado: margem inicial ilustrativa = 10% do nominal. Este valor NÃO protege automaticamente contra grandes quedas.
- Cenário sintético com entrada contínua até ao piso: manutenção aproximada 5% do nominal ao piso e taxa 0,05% por lado. Considerar taxa de abertura, reserva de caixa por perfil (Seguro 30%, Equilibrado 20%, Arriscado 10%), buffer de 1% da caixa e funding hipotético de 10 USD alterável.
- A caixa livre não é margem isolada já transferida. A simulação não representa contas com posições preexistentes e não assume preenchimentos se a transferência falhar.
- Grelha V20 concentrada é de referência simplificada, não inclui toda a lógica de volatilidade/observações; classificação do modelo R1 não equivale à classificação do motor V20 completo.

## Resultado do exemplo de 80k, Equilibrado, 5 ciclos x 1.000 USD nominais

| Distribuição | Última compra | Entradas <= piso 60k | Margem de stress* com caixa 2k | Caixa total comprometida com caixa 2k | Regra V20 |
|---|---:|---:|---:|---:|---|
| V20 concentrada (base) | 76.640 | 0 | ≈1.356,28 USD | ≈1.768,77 USD | Apenas hipótese viável no pequeno modelo |
| Clássica A–E | 60.000 | 1 | ≈760,82 USD | ≈1.173,29 USD | **Rejeitada:** preço = piso |
| Experimental mais dispersa | 60.000 | 1 | ≈784,55 USD | ≈1.197,03 USD | **Rejeitada:** preço = piso |

* Exemplo com todas as compras preenchidas ao preço previsto, sem gaps, custo real de funding, slippage ou execução parcial; não é cálculo oficial Kraken. Com 1.000 USD de caixa a versão concentrada teria **défice ≈558,77 USD** para margem e reservas nas condições escolhidas, apesar de margem inicial ≈496,53 USD.

## QA

- 12/12 testes Node locais aprovados no ficheiro de entrega; versão portátil dos testes guardada em `scripts/test-r1-capacity-20261025.cjs` (executar `node --test scripts/test-r1-capacity-20261025.cjs`).
- 6/6 larguras Chromium: 320/390/393/430/768/1440 px, 0 erros JavaScript, 0 overflow; mudança de estratégia/carteira/fills e reset testados.
- Ainda não foi validado na Kraken, Supabase, cloud nem em Samsung Galaxy S25 físico.
- O comparador está em `previews/v20-r1-capacity-20261025.html` e disponível como HTML autónomo da conversa.

## Próximo gate

R1 etapa 4/4: utilizador revê estes resultados; não alterar a política financeira até avaliar R2, resolver compra no piso e validar uma seleção explícita. Manter Bloco 12 aberto, sem merge/publicação do projeto.
