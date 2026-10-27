# BTC Strategy Pro V20 — Preparação do preview HTTPS isolado para Galaxy S25

**Estado real: PACOTE PRONTO, preview NÃO alojado.** A ligação Vercel atual listou os projetos existentes, mas devolveu HTTP 403 («sem autorização para criar projeto») ao tentar criar `btc-strategy-v20-demo-qa` na equipa atual. Não usar o projeto `horse-manager-v2` e não mexer em `btc-strategy-pro` público/V19.1.

## Alternativa imediatamente disponível: Netlify Drop

Netlify publica pastas de sites estáticos sob um **novo endereço HTTPS**. O link ficará publicamente acessível por omissão: só publicar o pacote de **Demo com dados fictícios**, nunca carteiras reais, credenciais ou chaves. Para manter o endereço, convém gerir a publicação numa conta Netlify própria.

1. No computador abrir https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40240463726/artifacts/12617135444 e descarregar o ZIP `btc-strategy-v20-b153-pwa-qa`. **Este é o pacote estático da Demo e NÃO o ZIP de revisão com políticas/documentação.**
2. Extrair o ZIP. Confirmar que **na pasta a enviar**, na raiz, existem `index.html`, `sw.js`, `manifest.webmanifest`, `offline.html`, `connectivity-probe.txt` e `icons/icon-192.png` e `icons/icon-512.png`. Não enviar a pasta pai de nível errado.
3. Abrir **https://app.netlify.com/drop** no Chrome/PC e arrastar a **pasta extraída com `index.html` na raiz** (ou o ZIP, se o interface de Drop aceitar). Verificar a raiz do ficheiro para evitar 404.
4. Abrir o novo URL `https://...netlify.app` no computador; testar cinco menus, alertas e tutorial, e confirmar que só aparecem carteiras fictícias. Este URL é exclusivo para QA e não altera o GitHub Pages principal.
5. Enviar/abrir o mesmo URL no Galaxy S25 com Chrome Android, menu ⋮ → **Instalar app**. Abrir primeiro online, depois testar modo avião, reabertura, troca de redes e o logout. Guardar capturas de ecrã. Não introduzir credenciais reais nem tentar ligação à Kraken.

Referência oficial: https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/ e https://app.netlify.com/drop.

## Regras de aceitação e checkpoints

- Apenas PWA DEMO offline da branch `audit/v20-strategy-recovery-20261025`.
- CI verificada `40240463726` **651/651 PASS, 0 FAIL**. Nenhum dos testes CI foi executado no Galaxy S25 físico.
- `financialCloudApproved:false`; `publicRegistrationApproved:false`; PR #35 mantém-se draft; main/V19.1 intocada.
- Publicação da **aplicação financeira** continua explicitamente bloqueada até R1.4, R2.4, regras Kraken, RLS, SMTP, restauro real, paridade estética aprovada e testes físicos.
- Se o preview HTTPS não abrir, verificar que Netlify serviu o `index.html` na raiz e que `/manifest.webmanifest`, `/sw.js` e `/icons/icon-192.png` devolvem 200 com tipos corretos.
- Se usar Vercel em vez de Netlify, a conta tem de ter permissão de criação de projetos na equipa. Não tentar acoplar a Demo a um projeto não relacionado.

**O URL de preview HTTPS definitivo só pode ser relatado depois de a publicação ter sido efetuada e verificada.**
