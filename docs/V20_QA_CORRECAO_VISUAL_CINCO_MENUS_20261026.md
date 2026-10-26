# BTC Strategy Pro V20 — Regresso do visual distinto aos cinco menus (26/10/2026)

**Estado: correção implementada na branch auditada; não publicar sem teste da nova versão no Netlify.**

## Erro observado e causa

Depois da atualização da Demo com correções de compra e alertas, o proprietário reportou que os cinco menus mostravam aparentemente o mesmo conteúdo. A auditoria comparou os ficheiros estáticos reais da última entrega ZIP e da primeira Beta, e verificou um erro visual consistente **em Chromium a 393 px**: os módulos globais de QA `#r54-qa-menu`, `#b13Labs` e o painel PWA `#b153PWA` estavam posicionados **antes** de todas as páginas de conteúdo. Ao escolher qualquer menu, os painéis repetidos ocupavam quase todo o primeiro ecrã; as páginas corretas apareciam muito mais abaixo.

Além disso `#r52QA` estava no início da Home antes dos gráficos premium originais. A navegação do R4.3 usava `scrollIntoView({block:'nearest'})` num aviso partilhado em vez de focar a página escolhida. No modo da carteira A/B, a interface `r54-layer` mostra por desenho um conjunto de dados de sincronização comum aos cinco menus, embora cada menu tenha também informação específica; sem explicação, parece uma regressão do design original.

**Observação do browser externo:** o ambiente alojado respondeu e permitiu navegar por Início, Estratégias, Mercado, Risco e Conta com conteúdos distintos no modo Demo. Portanto, não existia prova de falha total da função de routing ou perda das páginas: o defeito reproduzido é sobretudo de disposição/prioridade visual e clareza de modo.

## Correção concreta

- Preservar as cinco páginas originais e o conteúdo premium Bloco 8. Não reescrever os gráficos, motor financeiro, autenticação, simulação, dados ou estilos fundamentais.
- No fim do carregamento, mover **os módulos de teste reais (sem clonar, sem criar novos estados)** para depois das cinco páginas, conservando o tutorial, alertas e QA offline acessíveis por scroll.
- Recolocar `#r52QA` no fundo do conteúdo da Home, mostrando os gráficos primeiro.
- Adicionar seleção compacta **Demo / Carteira A / Carteira B** no início, com estado `aria-pressed`; em A/B explicar que são vistas resumidas e que o botão Demo repõe os menus completos.
- Ao trocar menu, voltar ao topo de forma imediata; não voltar a focar um aviso partilhado.
- No ZIP Netlify isolado de QA atualizar a chave da cache de `sw.js` para `btcsp-v20-b153-demoqa-20261026-menus-v2`, preservando a lista de cache estática e sem dados privados.
- Nenhuma alteração à `main`, `index.html` público V19.1, Supabase, Kraken ou credenciais reais.

## Testes efetuados nesta correção

**Local:** Chromium real nos viewports 320, 390, 393, 430, 768 e 1440 px; 222 verificações aprovadas. Incluem navegação pelos **cinco** botões de menu, consistência dos conteúdos e estado de visibilidade, não sobreposição do QA no primeiro ecrã, sem overflow horizontal ou erros de JavaScript, alternância dos dois perfis fictícios, alerta de caixa, reset, tutorial, compra fictícia e confirmação sem fechar modal. ZIP validado por `ZipFile.testzip()`, com 11 ficheiros, ícones e manifesto.

**GitHub CI:** `scripts/test-b15-navigation-visual-browser-20261026.cjs` introduz 9 casos (1 estático, 6 larguras e 2 testes de alertas/compra) no workflow de regressão completo. Confirmar a execução final antes de alegar regressão CI aprovada.

**Não testado ainda:** nova versão instalada no Samsung Galaxy S25 **após** publicação manual do ZIP corrigido no Netlify, funcionamento offline do novo ficheiro, nem integração financeira real. Site https://adorable-heliotrope-b8a413.netlify.app/ pode continuar a servir versão anterior até upload manual, atualização da PWA e reabertura.

## Estado do plano

**33/34 etapas técnicas — 97,1%** inalterado. R1.4/R2.4, política financeira, segurança e aprovação pública continuam pendentes. PR #35 em rascunho sem merge.
