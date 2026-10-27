# BTC Strategy Pro — Bloco R4, Etapa 3/4 · Relatório QA

**25/10/2026. Etapa técnica concluída em laboratório. Sem publicação, sem aprovação financeira.**

## Fonte e entrega

Foi preservada a **Demo Bloco 8** com candlesticks, radar de estratégias, terminal e design original, usando a prévia **R4.2** com ledger V20 e caixa livre calculada. Nova versão offline: `previews/v20-r4-five-tab-bloco8-dashboard-20261025.html`.

Navegação principal definitiva com exatamente cinco menus e equivalentes em mobile/desktop:

1. **Início**: Home fiel, gráfico de velas, radar, caixa livre e painel do motor V20.
2. **Estratégias**: Tabela Chaves histórica; atalho para Diário de operações.
3. **Mercado**: Terminal gráfico histórico da Demo; preços ainda ilustrativos.
4. **Risco**: Simulador gráfico histórico da Demo; separado do cálculo V20 da Home.
5. **Conta**: Projetos e acesso da Demo; sem sincronização com o diário temporário V20.

O Diário/Registos histórico permanece acessível por Estratégias e pela lateral no desktop. Terminal mantém acesso direto no desktop. Os atalhos originais da Home para terminal e risco continuam a funcionar. O estado ativo é atualizado mesmo quando uma funcionalidade antiga navega fora do novo menu.

## QA local executado

**6/6 viewports Chromium/Playwright, sem erros JavaScript ou overflow do documento**: 320, 390, 393, 430, 768 e 1440px. Em cada dimensão foram testados: abrir os 5 ecrãs, exatamente uma vista visível, estado ativo correto, atalho do Diário e retorno, gráfico e radar presentes, caixa inicial 1700 USD, descida BTC 100k→97k com perda isolada sem debitar novamente a caixa, comissão fictícia 50 USD→1650 USD e reset 1700 USD. Evidências e scripts Python no ZIP da conversa; screenshots desktop/mobile.

## Limites

Não é o frontend autenticado; o diário financeiro V20 é fictício e temporário no cartão Home. Os módulos históricos de Estratégias, Diário, Mercado, Risco e Conta **ainda não usam esse mesmo diário**; rótulos contextuais explicam a diferença. O snapshot Kraken é histórico, o terminal não mostra preço público live, não há execução de ordens, não houve escrita em Supabase ou carteira, nem alteração aos perfis de risco. Sem teste físico Galaxy S25. Os gates financeiros **R1.4/R2.4** continuam NÃO APROVADOS.

**Estado fixo:** R0 3, R1 3, R2 4, R3 4, R4 3 = **17/34 etapas técnicas**. Próxima: **R4.4**, testes visuais e funcionais completos e proposta de unificação segura de diário e modos sem regressões; aceite do utilizador pendente.
