# BTC Strategy Pro — R4.4: auditoria final da Demo Bloco 8

**25/10/2026 | Estado: R4 tecnicamente concluído; validação do proprietário e aprovação financeira pendentes.**

## Origem e preservação

Prévia final: `previews/v20-r4-final-five-tab-audit-20261025.html`, gerada a partir da Demo R4.3, que recupera o Bloco 8 original com gráfico de velas, radar das estratégias, cartões escuros e cinco menus (Início, Estratégias, Mercado, Risco, Conta). Diário histórico e terminal preservados como ferramentas. O cartão «Caixa livre estimada» usa os módulos financeiros V20 executados localmente em cenário fictício.

## Erros descobertos e corrigidos

1. **Corrompia a sequência de eventos** depois de rejeitar um montante de entrada inválido antes de criar o evento, porque decrementava `seq` mesmo sem incremento anterior. Passou a desfazer a sequência apenas quando um evento já foi criado.
2. **Indicadores stale**: cálculo rejeitado deixava no ecrã o saldo de uma versão anterior. Agora os indicadores ficam indisponíveis (`—`) com mensagem e são restaurados apenas depois de um novo cálculo válido.
3. **Reset durante operação em curso**: botão de reposição desativado durante submissão fictícia; reset invalida respostas antigas por revisão de pedido.
4. **Fontes divergentes**: banners de Estratégias/Risco/Conta salientam que os dados históricos ainda não partilham o diário V20 da Home. Sem alegar sincronização inexistente.

## Evidência de QA

Testada no Chromium Playwright **6/6 viewports** (320, 390, 393, 430, 768, 1440px), sem erros JavaScript ou overflow. Cada percurso validou as seis vistas incluindo Diário, apenas um painel visível de cada vez, conservação da caixa entre menus e os seguintes resultados no diário fictício: caixa inicial 1700 USD, BTC 100k→97k altera PnL isolado mas não caixa; comissão 50 USD→1650; operação de −2 USD rejeitada; comissão válida de 10 USD após erro→1640; mark inválido mostra indicadores indisponíveis e recuperação após correção; transferência maior que a caixa rejeitada; reset→1700. Screenshots desktop/mobile e script `btc_r44_qa.py` estão no ZIP de entrega da conversa.

**Contagem:** R0 3 + R1 3 + R2 4 + R3 4 + R4 4 = **18/34 etapas técnicas entregues**; os gates R1.4 e R2.4 e aceitação visual continuam pendentes.

## Limites / próximos trabalhos

**Não é app publicada ou autenticada.** Sem leitura Kraken nem Supabase; diário V20 temporário em memória. Módulos históricos não estão integrados ao mesmo diário, e gráfico e radar são ilustrativos. O snapshot Kraken usado na simulação é antigo; não certifica compra, poder de compra ou liquidação atual. Não houve testes físicos Samsung S25, backtest histórico validado, migração, merge de PR, alteração de políticas, carteira real, ou deploy. O run anterior de 219 testes V20 é evidência separada; não foi reexecutado nesta etapa visual.

O **R5** deve fazer integração dos cinco menus com uma única fonte de verdade autenticada (finanças, posições, correções e anulações), mantendo fidelidade visual e separando rascunho/aplicação. Não selecionar automaticamente uma estratégia financeira: o proprietário declarou explicitamente **decisão financeira definitiva NÃO APROVADA**.

**PR #35 draft, branch** `audit/v20-strategy-recovery-20261025`, `main` e produção intactas.
