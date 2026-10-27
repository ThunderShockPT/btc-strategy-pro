# BTC Strategy Pro V20 — Bloco 15 · Etapa 1/4 — QA integrada da Demo Bloco 8 (25/10/2026)

**Estado: etapa 15.1 concluída tecnicamente em ambiente de teste. Esta QA NÃO representa aprovação para disponibilização pública nem aprovação estética dos painéis autenticados.**

## Entrega real

Foi criado um único ficheiro HTML standalone: `previews/v20-b15-integrated-bloco8-qa-20261025.html`, com base na Demo aprovada e preservada do Bloco 8 e nas integrações já testadas no R5 e B13. O ficheiro contém:
- Interface original em modo Demo, paleta azul-petróleo/ciano, sidebar/mobile bottom navigation e gráficos canvas históricos.
- Cinco menus Início, Estratégias, Mercado, Risco e Conta, mais página auxiliar do diário autenticado fictício.
- Painel de alertas do B13.1 com estados de sincronização e risco modelado.
- Tutorial B13.2 embebido com lições, questionário, teclado Tab/Shift+Tab/Escape, restauração de foco e sem persistência de autorização financeira.
- Ferramentas de troca entre carteiras **fictícias** A/B, conflito de revisão, sincronização simulada, logout e retorno à Demo original.
- Aviso persistente de que o layout real da conta ainda tem painéis simplificados, distintos do design original.

Código adicional: `scripts/test-b15-integrated-demo-browser-20261025.cjs` com 8 novos testes (2 de integridade estrutural/visual e 6 Chromium completos).
Integração dos testes em `.github/workflows/r3-risk-paths-qa.yml`, mantendo as suites R3/R5/B13/B14 e PostgreSQL temporário de QA.

## Resultado dos testes

**GitHub Actions**: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40236306776

- **599/599 TESTES PASS, 0 FAIL**; 8/8 novos B15.1, incluindo os 6 tamanhos de ecrã **320, 390, 393, 430, 768 e 1440 px**.
- Ao mudar para carteira fictícia A, os valores de caixa `1.700 USD` ficam coerentes nos cinco menus; com carteira B, `860 USD`. Quando o diário e a carteira divergem, os números autenticados são ocultados até reconciliação; logout apaga a projeção visível e voltar à Demo restaura o modo visual original.
- Segurança/UX: sem JavaScript exceptions, sem overflow horizontal, sem rede durante a execução, sem scripts externos, modal com foco de teclado e saída por Escape, questionário sem aceitação financeira.
- Alertas sincronizados com modo da conta, reinicializados ao alternar carteira/logout.
- Testes de fidelidade do CSS raiz do Bloco 8, paleta, fundos, canvas e navegação. **Não é prova de equivalência visual em todos os detalhes nem teste físico S25.**
- A primeira execução `40236130979` falhou apenas no teste de integridade CSS por não ignorar uma quebra de linha antes da regra `:root`; **6/6 percursos browser passaram nesse ensaio**. O teste foi corrigido (trimStart), e a segunda execução completa `40236306776` passou a 100%. Não se alterou a CSS da Demo para contornar o teste.

## Bloqueios realmente identificados

1. **BLOQUEADOR DE PARIDADE VISUAL — conta autenticada**: `unified-five-menus-v20.js` atualmente esconde a apresentação Demo ao mudar para `account` e usa secções `.r54-layer` simplificadas, só de leitura. O proprietário exige que a experiência autenticada tenha visual equivalente ao da Demo. Não substituir os dados fictícios por dados reais sem vinculação correta ao diário. Esta divergência deve ser corrigida e revista antes da aprovação visual/publicação; `visualParityOfAccountApproved:false` no laboratório.
2. O ficheiro standalone é **apenas laboratório offline**, mesmo que os módulos reais de autenticação e persistência tenham testes unitários e de API. As carteiras A/B aqui são simuladas, sem login real, dados reais nem armazenamento cloud.
3. A ligação atual Kraken, regras EEE frescas, fórmulas reais de liquidação, custos por conta e política financeira continuam **não certificadas**; gates R1.4 e R2.4 por aprovar.
4. QA físico Galaxy S25, estados PWA instalável/offline reais, UX de textos/campos, autorização do proprietário e plano de rollback ainda pendentes em B15.2/B15.3/B15.4.

## Estado do projeto

**30/34 etapas técnicas concluídas (88,2%), Bloco 15 1/4.** A 15.1 significa integração técnica da Demo, **não** aceitação do produto final nem conclusão do requisito de igualdade visual no modo autenticado. PR #35 permanece draft, `financialCloudApproved:false`, `publicRegistrationApproved:false`. Nenhum merge, deploy, reset, migração, chamada privada Kraken ou mudança de dados reais.

**Próximo Bloco 15 — Etapa 2/4: revisão de segurança, rollback e resolução da divergência visual autenticada antes dos ensaios no telemóvel, preservando o design aprovado e bloqueando dados falsos.**
