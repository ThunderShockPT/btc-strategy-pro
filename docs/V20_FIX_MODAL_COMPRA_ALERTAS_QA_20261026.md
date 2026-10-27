# BTC Strategy Pro V20 — Correção dos alertas e da janela de compra (26/10/2026)

**Problemas reportados pelo proprietário em teste físico PC:** os alertas não eram compreensíveis; a janela de registo de compra fechava de forma inesperada.

## Diagnóstico reproduzível e origem

Na Demo integrada Bloco 8, o alerta financeiro **só calcula cenários de carteira após seleção da conta fictícia A/B**. Sem seleção, clicar nos botões "Compra sem caixa", "Risco antes do reforço" e "Estudo desatualizado" repetia apenas "Dados de conta não sincronizados", sem explicar como usar. O atalho `#alertBtn` ainda abria uma janela antiga "próximo bloco", embora os testes de alertas B13 já estivessem implementados.

Na modal de compra/venda `#overlay`, havia handlers que a fechavam ao clicar no fundo ou pressionar Escape. Além disso, `openForm` executava `api.close()` **imediatamente após um registo Demo bem-sucedido**, sem deixar confirmação visual persistente. A validação automatizada da versão anterior confirmou este fecho após `#b4FSave`. Não foi comprovado um fecho espontâneo temporal sem interação; a correção reforça os dois caminhos de saída acidental.

## Correções concretas

- `previews/v20-b15-integrated-bloco8-qa-20261025.html`: ao pedir cenários de alertas carrega **apenas a carteira FICTÍCIA A** (nunca login real) se ainda não houver uma escolhida, e mostra texto educativo específico para falta de caixa, margem em risco e estudo de outra revisão. Botões "Limpar cenário" e "Voltar à Demo original".
- Botão antigo de alertas no cabeçalho encaminha para o painel funcional B13 em vez de "em breve".
- Modal de compra/venda fica protegida contra fechos ao tocar fora ou pressionar Escape; mantém Cancelar e X explícitos. Em erro de validação a modal continua aberta.
- Depois de gravar, aparece uma **confirmação persistente**: tipo da operação, estratégia, preço e montante, mensagem "apenas Demo". Botão explícito "Entendido · fechar". Sem execução de ordens.
- Regressões acrescentadas em `scripts/test-b15-purchase-alerts-browser-20261026.cjs` e CI.

## Evidência verificada

**GitHub Actions run #40391581770: 655/655 PASS; 0 FAIL, 37 suítes**, incluindo 4 novos testes, em 393/768/1440 px, com eventos reais Chromium. https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40391581770

Também foram verificados na versão ZIP Netlify:
- 21 scripts JS `node --check` sem erro;
- fluxo de alerta com escolha automática da carteira fictícia A;
- registo de compra com confirmação explícita e guarda contra saída acidental;
- ficheiros ZIP íntegros, manifesto e SW com cache com nova versão `20261026-purchase-alerts-v1`.

## Entrega

**ZIP Netlify de QA**, preparado para arrastar a pasta com `index.html` na raiz: `BTC_Strategy_Pro_V20_CORRECAO_COMPRAS_ALERTAS_20261026.zip` (anexo no ChatGPT). É pacote da Demo, **não** release de produção. Atualizar manualmente o projeto https://app.netlify.com/projects/adorable-heliotrope-b8a413/deploys e depois testar https://adorable-heliotrope-b8a413.netlify.app/?qa=20261026-v2

**Nota de escopo:** o pacote ZIP contém ainda os últimos ajustes manuais de instalação/diagnóstico Netlify; o HTML canónico integrado no GitHub contém a correção de compra e alertas e é fonte futura de reconstruções. A Demo original e o motor/contas financeiros permanecem isolados, sem alterações à `main`, autenticação real, Kraken ou Supabase.

## Plano de 34 etapas

**33/34 etapas técnicas preparadas (97,1%)**. QA do defeito corrigido (ainda a pedir confirmação humana na versão efetivamente publicada), mas **R1.4/R2.4 e release financeiro** continuam bloqueados. A publicação Demo no Netlify não representa aprovação financeira.
