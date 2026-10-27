# BTC Strategy Pro V20 — P1.7/8 · Revisão Kraken Futures EEE

**Data:** 27 de outubro de 2026.  
**Âmbito:** auditoria read-only de documentos **oficiais Kraken**, `PF_XBTUSD` perpétuo linear Multi-M, margem isolada, 10× como cenário de estudo. Sem API privada, sem credenciais, sem ordens, sem revisão de parâmetros de negociação real.  
**Estado:** revisão documental concluída; **equivalência a liquidação real e regras individuais da conta NÃO comprovadas**. Produção: **NO_GO**.

## 1. Revisão Kraken EEE — factos e fontes

1. [Contratos Multi-M EEE](https://support.kraken.com/articles/multi-collateral-derivatives-contracts-eea), atualizado em 08/10/2026 na pesquisa oficial: margem **cross** por defeito, modo **isolated** disponível, alavancagem até 10× no perfil/documentação revista, collateral e moedas múltiplas, ajustes (*haircuts*) e conversão.
2. [Tabela de margem EEE](https://support.kraken.com/pt/articles/derivatives-margin-schedule-and-maximum-leverage-eea), indexada com atualização de 07/10/2026, mas algumas páginas regionais apresentam cópias anteriores: para **Classe A, primeiro escalão até 30 milhões USD**, **margem inicial de 10%**, **manutenção de 5%**. Em escalões superiores, as percentagens sobem; os requisitos podem mudar sem aviso. É obrigatório confirmar classificação, especificação e escalão efetivamente aplicáveis.
3. [Liquidações Multi-M](https://support.kraken.com/pt/articles/4844463246100-margining-liquidations-multi-collateral-derivatives), revista com data indexada de setembro de 2026: a posição isolada pode ser liquidada quando `margem isolada + PnL não realizado < margem de manutenção`. **Mas** a Kraken descreve também liquidação *global da conta*, que pode afetar **posições isoladas**; assim, um limiar simples calculado para uma posição não prevê toda a conta.
4. [FAQ liquidação](https://support.kraken.com/pt/articles/4402283092244-liquidation-faq-derivatives), atualização de março de 2026: o preço de liquidação é **estimativa dependente do mark price** e do risco da carteira; liquidações parciais e totais e respetivas taxas são possíveis. Não confundir com execução garantida num preço determinado.
5. [Especificações contratos EEE](https://support.kraken.com/pt/articles/perpetual-contract-specifications-for-clients-in-the-eea): `mark price` depende do índice e de uma EMA do prémio do mercado. Funding perpétuo acumula-se e é regularizado de hora a hora ou aquando de mudanças na posição. O valor/taxa futura não pode ser determinado sem dados relevantes do período.
6. [Comissões EEE](https://support.kraken.com/pt/articles/fees-for-derivatives-trading-eea) e [edição regional inglesa, com atualização indexada de 26/10/2026](https://support.kraken.com/in/articles/fees-for-derivatives-trading-eea): maker/taker por **volume móvel a 30 dias**, valores aplicados ao nocional, liquidação em USD e possível conversão e custo adicional para garantias não USD. **Há divergência entre a data/forma das edições regionais e a página EEE remete para tabela de comissões em tempo real.** Não promover uma taxa arquivada como comissão pessoal atual.

Esta é uma revisão documental. **Não foi capturado e autenticado o endpoint de instrumentos público da Kraken nesta etapa**, nem verificada uma conta real, o seu escalão de comissões, permissão EEE, colateral, posições, encargos de funding e ordens. As fontes públicas podem mudar.

## 2. Confronto com o motor V20

| Área | Código encontrado | Avaliação |
|---|---|---|
| Tipo de contrato/margem | `rules/kraken/eea-pf-xbtusd-20261021.json` declara `PF_XBTUSD` Multi-M perp, isolated 10× | Corresponde à arquitetura aprovada **como cenário**, não prova contexto real da conta |
| Margem escalonada | `kraken-rules.js` seleciona tabelas `europa`/`europa_crypto` e Classe A primeiro escalão 10% IM / 5% MM | Coerente com referência publicada; validar todos os novos escalões e classificação em execução |
| Liquidação | `position-risk.js` resolve limiar aproximado com margem isolada efetivamente atribuída, PnL e manutenção | **Não modela integralmente** conta Multi-M com outras posições, variações de haircuts, encargos, fees, limiares globais e execução |
| Funding | Ficheiro de regras indica período e débito da carteira geral, mas `accountingStatus=needs-public-example-validation` | **Reconciliação por fazer**, incluindo carteira e risco global |
| Preço de marcação | Modelo usa `valuation.markPriceUSD` manual/fictício | Não é feed oficial atualizado de `mark price`/índice/EMA |
| Comissões | Apenas `exampleMakerRate=0.0002`, `exampleTakerRate=0.0005`; `manualFeeRateRequired=true` | Não equiparar a conta real; averiguar taxas efetivas, conversões, funding e liquidação parcial |
| Regras atualizadas | `observedAt=2026-10-20T23:31:04.66Z`, `status=partial` | **STALE_RULES obrigatório** no dia 27/10, sem tornar as regras executáveis só com referências documentais |
| Piso de stress | Modelo C rejeita entradas no piso ou abaixo | **Teste estrito de cenário, nunca garantia contra liquidação** |
| Autorização | Execução de ordens, transferências e recomendações específicas **false** | **Manter bloqueado** |

## 3. Principais problemas a resolver antes de quaisquer cálculos de negociação real

**Risco A — conta Multi-M vs posição isolada:** o cálculo inverso de uma posição BTC isolada não abrange todo o risco da conta, em especial outras posições cross, oscilações da garantia e liquidação global, nem constitui um preço Kraken oficial.

**Risco B — funding e carteira geral:** pagamentos de funding de uma posição isolada podem sair do saldo geral e alterar a margem disponível. A reserva de dinheiro na app não é margem realmente aplicada na Kraken.

**Risco C — preços e fees:** slippage, *mark price*, saltos de preço, taxa maker/taker por volume, taxa de liquidação parcial, conversões e juros podem reduzir a cobertura. O motor atual não pode declarar proteção a 55k, 60k ou qualquer piso sem condições e reconciliação completas.

**Risco D — versões e classes:** o snapshot 20/10/2026 contém instrumentos e escalões contextuais. A documentação de 27/10 não renova por si só esse snapshot nem confirma uma carteira individual.

## 4. Entrega desta etapa

- `policies/v20-post34-kraken-eea-risk-review-20261027.json` — evidências de fontes, diferenças e **NO_GO**.
- `scripts/test-v20-post34-kraken-eea-audit-20261027.cjs` — 10 verificações de fontes, margem/funding/liquidação/fees, regras obsoletas e preservação da decisão Modelo C.
- `.github/workflows/v20-post34-kraken-eea-audit.yml` — CI isolada com testes existentes de Kraken B14 e `position-risk.js` usando simulações, sem acesso à Kraken.
- Regressões B14 e PositionRisk não atualizam preços, não ligam API nem modificam motor.

**Resultado CI:** consultar o resultado real de GitHub Actions antes de declarar aprovação; uma revisão de documentos não equivale a comparar valores privados reais.

## 5. Próximos passos e estado

**Plano V20 inicial:** 34/34 técnico/arquitetura.  
**Fase P1:** P1.1/P1.2 revisão feita; P1.3 proteção comprometida pendente; P1.4 contas reais alojadas pendentes; P1.5 SMTP e recuperação real pendentes; P1.6 backup/privacidade operacional pendente apesar dos 19 testes isolados; **P1.7 revisão documental feita, reconciliação Kraken real pendente**. **P1.8/8** deverá produzir uma matriz de GO/NO-GO e ensaio de rollback **sem lançar a app**, e obter autorização futura separada.

`policies/cloud-release-20261021.json`: `financialCloudApproved:false`, `publicRegistrationApproved:false`, checks não aprovados. PR #35 permanece rascunho; `main` V19.1, Netlify, carteira e Kraken intocados. **Nenhuma alteração ao Modelo C adaptativo (20/30/50) ou aos parâmetros reais de negociação.**
