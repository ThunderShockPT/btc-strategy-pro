# BTC Strategy Pro — Bloco 13, Etapa 1/3: Alertas (25/10/2026)

**Estado:** implementação técnica e QA concluídas na branch isolada. Autorização financeira, produção e teste físico do Samsung S25 continuam pendentes.

## Plano mestre respeitado

O ficheiro `docs/V20_PLANO_FIXO_9_BLOCOS_34_ETAPAS_20261025.md` fixa o Bloco 13 em **Alertas · Onboarding · QA**, com três etapas. A beta/publicação está reservada ao Bloco 15. **A Etapa 13.1 é Alertas.**

## Código real entregue

- `financial-alerts-v20.js`: alertas determinísticos de leitura, derivados de uma fonte autenticada V20, com verificação do mesmo UUID de carteira, revisão e `headHash` do diário; exige estimativa de capacidade vinculada à mesma revisão para avisar sobre financiamento insuficiente ou manutenção antes da próxima compra. Perda não realizada não é tratada como saída adicional automática da caixa.
- `financial-alerts-view-v20.js`: painel acessível `aria-label`, severidade risco/atenção/info, texto PT-PT seguro inserido por `textContent`. Sem push, emails ou ordens.
- `five-menu-integrated-runtime-v20.js`: agrega o novo painel no modo Conta V20 sob a Home original, usando a mesma sessão e diário R5.1–R5.5. Limpeza de sessão/troca de carteira reaproveitam os bloqueios de revisão já validados.
- `scripts/test-b13-alerts-20261025.cjs`: 19 testes de severidades, invalidação, caixa, compra seguinte, regras antigas, PnL, sessão, impossibilidade de trading, push e manipulação da UI.
- `scripts/test-r5-integrated-runtime-20261025.cjs`: mais **2 testes** de integração do módulo no runtime V20, incluindo mudança de carteira e logout.
- `scripts/test-b13-alerts-browser-20261025.cjs`: seis tamanhos reais Chromium.
- `previews/v20-b13-alerts-bloco8-qa-20261025.html`: preserva a Demo Bloco 8 e permite explorar os avisos em cenário fictício. Não consulta Kraken nem carteira real.

## CI e evidência

**GitHub Actions: 468/468 PASS, 0 falhas**, https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40220638840. Inclui 19 testes novos de alertas, 2 testes adicionais na integração R5, 6 testes browser B13.1, 6 testes browser R5, finanças, simulação temporal, correções append-only, API e PostgreSQL de QA (sem Supabase de produção). Dependência `decimal.js@10.6.0`.

**Laboratório HTML offline do proprietário:** `BTC_Strategy_Pro_Bloco13_Etapa1_Alertas_20261025.html`, pacote ZIP e screenshot mobile/desktop no chat. Foi testado em Chromium local, 320/390/393/430/768/1440px: 6/6 PASS, sem erros JS ou overflow, seis verificações por largura. **É uma prévia com avisos de cenário explicitamente fictício, distinta da carteira autenticada.** O motor genuíno é o ficheiro GitHub acima.

## Critérios e limites

- Um aviso do modelo não confirma liquidação Kraken, disponibilidade real na corretora nem recomendação de compra/venda.
- Snapshot Kraken de 20/10/2026 permanece desatualizado. A auditoria financeira independente cabe ao Bloco 14.
- `policies/cloud-release-20261021.json` continua com `financialCloudApproved:false` e `publicRegistrationApproved:false`. Não houve merge, deploy, migração, escrita em Supabase ou movimentação de carteiras.
- Gates R1.4 e R2.4 da direção financeira e aceitação visual pendentes; o utilizador declarou **decisão financeira definitiva NÃO APROVADA**.
- Teste físico Samsung S25, PWA e autenticação com uma conta real não foram realizados nesta etapa.

**Contagem:** 24/34 etapas técnicas concluídas (Bloco 13: 1/3). **Próxima etapa 13.2:** tutorial interativo com explicações práticas de caixa livre, margem isolada, risco, reforços na queda, registo apenas de movimentos já ocorridos e alertas, mantendo o design original.
