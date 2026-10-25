# BTC Strategy Pro V20 — PWA Android QA (Bloco 15.3)

**Ambiente DEMO isolado. Não é a versão pública nem suporta saldo real ou ordens Kraken.**

Esta pasta inclui a aplicação instalada a partir do código V20 testado (Demo Bloco 8 + alertas B13 + tutorial + cinco menus + painéis premium de conta fictícia), manifesto, ícones 192/512 PNG, Service Worker limitado ao subdiretório `b153/` e ecrã offline.

## No computador (Windows/macOS/Linux)

1. Descarregar o artefacto `btc-strategy-v20-b153-pwa-qa` do GitHub Actions do PR #35; descompactar mantendo a pasta `b153` completa. Abrir `index.html` diretamente testa apenas o design; **não** ativa o Service Worker em `file://`.
2. Para testar a PWA localmente, no diretório que contém a pasta `b153`, executar `python3 -m http.server 8080` e abrir `http://localhost:8080/b153/index.html`. O Chrome permite Service Workers em localhost. No computador, confirmar instalação, menus e reabertura em modo offline.
3. A partir da raiz do repositório: `node scripts/build-b15-mobile-pwa-20261025.cjs` e `node --test scripts/test-b15-mobile-pwa-browser-20261025.cjs` para reconstruir e validar a mesma versão.

## No Samsung Galaxy S25 — validação humana pendente

Para o Chrome Android instalar a PWA, é necessário um URL **HTTPS** que sirva esta pasta de forma estática e isolada, mantendo os ficheiros e a scope `./`. Um `file://` ou `http://IP-DO-PC:8080` não cumpre os requisitos de origem segura para esta instalação. **Não publicar no domínio principal ou ligar contas reais sem autorização.**

Quando existir um preview HTTPS autorizado e seguro, confirmar:

1. Abrir o URL no Chrome e verificar que aparece o cabeçalho da Beta QA e os gráficos da Demo original.
2. Abrir menu ⋮ → **Instalar app** (texto pode variar); confirmar ícone e abertura em ecrã autónomo. O botão **Instalar Demo** na página usa o diálogo do Chrome apenas quando disponível.
3. Usar os cinco menus, tutorial, alertas, trocar entre contas fictícias A/B, simular revisão diferente e terminar sessão. Não inserir dados reais.
4. Fechar a PWA, cortar dados móveis e Wi-Fi, abrir de novo; verificar gráfico, menus, tutorial e aviso offline. O Service Worker guarda apenas o HTML estático, manifesto, fallback e ícones.
5. Ligar rede e reabrir. Confirmar que os dados de outra carteira não reaparecem depois de logout, e que não há login Kraken disponível na Demo.
6. Registar capturas de ecrã e qualquer problema (tamanho dos botões, barras inferiores, teclado, scrolling e comportamento após suspensão). Os testes de CI não substituem esta observação física.

## Limites

- Não guarda carteiras autenticadas, operações, tokens, API, taxas ou cotações reais em CacheStorage. Modo `account` nesta Demo tem apenas carteiras fictícias e serve para validar estados visuais.
- A PWA histórica da raiz do repositório não foi alterada, porque essa versão é V19.1; o B15.3 é **somente** um pacote de teste V20.
- A instalação real em Galaxy S25, ambiente HTTPS de teste, restauro de produção, aprovação visual e gates financeiros R1.4/R2.4 ainda aguardam validação. `financialCloudApproved:false` e `publicRegistrationApproved:false`.
