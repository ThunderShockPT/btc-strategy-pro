# BTC Strategy Pro — Bloco 14, Etapa 1/3 — Auditoria documental Kraken EEE (25/10/2026)

**Estado: auditoria independente das fontes oficiais concluída tecnicamente; live/API/account reconciliation e aprovação financeira NÃO concluídas.**

## Alcance exato

Rever a documentação pública recente da Kraken em 25/10/2026 e comparar com o snapshot **20/10/2026** em `rules/kraken/eea-pf-xbtusd-20261021.json` e com os travões `kraken-rules.js`. Esta etapa **não** declara regras de mercado em tempo real, não autoriza trading e não atualiza `observedAt` artificialmente.

## Comparação documentada (EEA, PF_XBTUSD, Multi-M isolated 10x)

1. Contrato BTC perpétuo EEE: `PF_XBTUSD`, quantidade mínima 0,0001 BTC, incremento 0,0001 BTC no snapshot, tick 1 USD, máximo publicado 1 200 BTC, classe A / até 10x. A especificação oficial foi atualizada a **22/10/2026**. Fonte: https://support.kraken.com/pt/articles/perpetual-contract-specifications-for-clients-in-the-eea
2. Escalões EEE classe A, fonte oficial revista **07/10/2026**: 0 USD→IM 10%/MM 5%; 30 milhões→20%/10%; 50 milhões→30%/15%; 150 milhões→50%/25%. Correspondem ao snapshot EEE. **As tabelas genéricas da API incluem 1% de IM na primeira faixa e NÃO devem substituir a tabela EEE.** Fonte: https://support.kraken.com/pt/articles/derivatives-margin-schedule-and-maximum-leverage-eea
3. Funding: ganho/perda contínuo, apuramento horário ou alteração da posição; fator 8, limite ±0,5% por hora nas especificações oficiais. O motor ainda precisa reconciliar o débito dos pagamentos de posições isoladas ao saldo geral da carteira, a dívida de funding não liquidada e as condições concretas da conta. Fonte: https://support.kraken.com/pt/articles/perpetual-contract-specifications-for-clients-in-the-eea
4. Taxas maker/taker **base EEE** 0,0200%/0,0500%, dependentes de volume móvel e do utilizador. Os escalões posteriores diferem dos valores da tabela global mais recente: não usar o escalonamento genérico para clientes EEE. Liquidações e conversões podem ter custos adicionais. Fontes: https://support.kraken.com/pt/articles/fees-for-derivatives-trading-eea e https://support.kraken.com/pt/articles/360048917612-fee-schedule
5. Margem isolada e liquidação: `isolated equity = allocated initial margin + unrealized PnL` é uma aproximação didática, mas no produto Multi-M também pode ocorrer liquidação ao nível global da conta. O financiamento isolado pode ser descontado do saldo geral, e perdas de colateral, conversões, manutenção por tiers e fees afetam o cálculo. A cotação **mark price** é distinta do último preço de mercado. Fontes: https://support.kraken.com/pt/articles/4844463246100-margining-liquidations-multi-collateral-derivatives e https://support.kraken.com/pt/articles/collateral-currencies-eea
6. USD/EUR: haircut EUR 0% publicado não significa que não existam risco cambial ou etapas de conversão. `FX_COLLATERAL_ENGINE_PENDING` deve continuar a bloquear, até reconciliação.

## Verificações e resultados

- Criado `scripts/test-b14-kraken-documentation-20261025.cjs` com oito regressões explícitas que preservam margens EEE, tamanho do contrato, funding, taxas ilustrativas, limitação de EUR e bloqueio do snapshot expirado.
- Workflow de QA isolado atualizado, sem alterar `main`, políticas de risco, saldos, Kraken API, Supabase ou produção.
- **GitHub Actions https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40232813885 — 551/551 testes PASS, 0 falhas; B14.1 8/8 PASS.**
- Os testes comparam invariantes do snapshot a fontes oficiais pesquisadas por revisão documental; **não** equivalem a captura do endpoint público Kraken atualizado. A consulta automatizada ao endpoint de instrumentos em 25/10 não foi possível por limitação de acesso. Não renovámos o snapshot.

## Decisões e bloqueios mantidos

- `STALE_RULES` continua obrigatório para regras observadas em 20/10. Nenhuma recomendação concreta, ordem automática, transferência ou decisão de liquidação pode ser dada como oficial com estas regras.
- Pendentes: API pública renovada de forma verificável; distinguir cliente EEE, plataforma e classe real; reconciliar funding, manutenção, mark, taxas de liquidação parcial, conversão e margens; QA Samsung S25 e dados de conta real autorizada; revisão do proprietário R1.4/R2.4.
- **27/34 etapas técnicas do plano (79,4%)** com auditoria documental B14.1 entregue. **Próximo: Bloco 14.2 — reconciliação matemática com as regras publicadas**, mantendo execução e decisões financeiras bloqueadas até validação.
