# BTC Strategy Pro V20 — Bloco 15 · Etapa 3/4 — Android/PWA offline QA (25/10/2026)

**Estado: CONCLUÍDA TECNICAMENTE, apenas com QA automatizada Chromium Android-like + pacote PWA estático de teste. Samsung Galaxy S25 físico e publicação HTTPS do preview continuam PENDENTES.**

## Entrega e limites

O pacote da **Demo V20 isolada**, produzido por `node scripts/build-b15-mobile-pwa-20261025.cjs`, é gerado em `previews/b153/`. Inclui:
- `index.html` gerado a partir da Demo premium integrada em `previews/v20-b15-integrated-bloco8-qa-20261025.html`, com cinco menus, gráficos históricos, tutorial, alertas e painéis de conta **fictícia**;
- `manifest.webmanifest` exclusivo da Demo V20, com `display:standalone`, `start_url:./index.html`, `scope:./`, nome próprio de QA e ícones PNG de 192/512 px;
- `sw.js` limitado ao seu próprio subdiretório e prefixo de cache `btcsp-v20-b153-demoqa-`: guarda **somente** página HTML pública, manifesto, ícones e fallback offline; não guarda endpoints privados, valores financeiros, tokens, respostas de corretora, login ou transações;
- `offline.html` claro quando uma página secundária não está em cache;
- `connectivity-probe.txt` que nunca é precached, para detetar ligação real sem consultar a Kraken ou a conta do utilizador;
- `README.md` com instruções de reconstrução e um protocolo de teste manual específico para Samsung Galaxy S25.

**O projeto público `main`, o HTML `index.html` V19.1, o `service-worker.js` e o manifesto de produção não sofreram alteração.** Não houve deploy, transferências, operações Kraken, escritas de base de dados real, migração ou fusão de branches.

## Ensaios realizados

Workflow GitHub Actions **40239210208**: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40239210208

**640/640 testes aprovados; 0 falhas**, incluindo **12/12 novos casos B15.3**:

1. Integridade do HTML reconstruído a partir da versão V20 premium + ausência de scripts externos em modo Demo.
2. Manifesto isolado com escopo correto, `display: standalone`, e ícones PNG de tamanho/dimensões efetivos 192/512.
3. Service Worker exclusivo do subdiretório, métodos GET, whitelist de cache e sem captura da PWA principal.
4. 6 combinações Chromium **Android-like** (320, 390, 393, 430 px) / tablet (768 px) / desktop (1440 px): cinco menus, gráficos, botão de instalação, A/B de contas fictícias, logout, bloqueio de dados, sem overflow horizontal ou JS exceptions.
5. Reabertura da Demo totalmente **sem rede** em 393 e 1440 px, por CacheStorage, preservando gráficos, navegação, tutorial e sessão fictícia limpa após logout.
6. Recuperação online após o modo offline, com um teste efetivo de conexão a ficheiro público não cacheável. `navigator.onLine` isoladamente não foi considerado fiável.
7. Teste de rotas privadas fictícias: GET a `private-wallet.json` e POST a `api/transaction` fora da cache; verificada whitelist de 5 ficheiros apenas.

A primeira execução `40238787840` encontrou **10/12 PASS, 2 FAIL**: o indicador offline dependia de `navigator.onLine`, que não refletia corretamente a ausência de rede na emulação. Substituiu-se por probe de conectividade ao ficheiro estático e a execução final `40239210208` confirmou **12/12 e 640/640 PASS**.

## Artefacto de teste

**ZIP verificado no GitHub Actions**: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40239210208/artifacts/12616286167

Nome: `btc-strategy-v20-b153-pwa-qa` — contém os ficheiros estáticos necessários. Este artefacto permite inspeção e testes locais, não instala automaticamente a app Android. O ficheiro HTML aberto como `file://` apenas apresenta a interface e **não** testa instalação/offline via Service Worker.

## Testes físicos que faltam

Para Chrome no **Samsung Galaxy S25 real**:
- É obrigatório um URL HTTPS estático e isolado ou origem localhost no dispositivo; abrir `http://IP_DO_PC` via Wi-Fi LAN não é origem segura para SW Android.
- Testar no Chrome Android a opção `Instalar app`, ícone/ecrã inicial e modo standalone.
- Reabrir em modo avião e confirmar os cinco menus, gráficos, tutorial e estados offline depois de instalação e primeira abertura online.
- Testar teclado, alinhamento de botões, toque, scroll em 393 px, suspensão/reabertura, mudança de rede, logout e ecrã após instalação.
- Guardar capturas/problemas; aprovar visualmente a correspondência real entre os cartões premium e a Demo.
- **Não introduzir saldos reais, dados Kraken, credenciais, ou trocar `financialCloudApproved:false` / `publicRegistrationApproved:false` por true.**

## Progresso

**32/34 etapas técnicas (~94,1%)** concluídas em QA; Bloco 15 **3/4 tecnicamente preparado**, não validado fisicamente.

O `PR #35` permanece draft, sem merge nem deploy. Decisões R1.4/R2.4, integridade de regras Kraken EEE atuais, restauro de produção e revisão visual humana continuam pendentes.

**Próximo: Bloco 15.4/4 — preparação de Beta e checklist de publicação/segurança, sem publicação automática, com bloqueadores reais claros e plano de aprovação do proprietário.**
