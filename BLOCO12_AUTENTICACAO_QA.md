# BTC Strategy Pro — Bloco 12 · Autenticação preparada (2026-10-20)

## Situação
- PWA pública em modo Demo; **não** ativar BTC_BETA_AUTH_ENABLED antes da validação.
- Supabase isolado no projeto oftzqqjbwonngubihrsd; não alterar a base de dados do Racing Horse Manager.
- Tabelas projects e project_snapshots com RLS ativo e forçado, acesso anon de leitura bloqueado.
- UI de registo, login, email, reenvio, recuperação e alteração de password implementada e protegida por feature flag.
- Password mínima de 10 caracteres para criação/alteração, confirmação e controlo de pedidos simultâneos.

## Configuração Supabase obrigatória
1. Authentication > URL Configuration: Site URL https://thundershockpt.github.io/btc-strategy-pro/
2. Adicionar Redirect URL exato https://thundershockpt.github.io/btc-strategy-pro/ (HTTPS).
3. Authentication > Providers > Email: confirmar que a confirmação por email está ativa.
4. Authentication > SMTP: configurar remetente/domínio verificado e entrega de email fiável.
5. Configurar Rate Limits e Bot Protection/CAPTCHA de registo e recuperação.

## Testes obrigatórios antes do desbloqueio
1. Registo com email controlado; entrega de confirmação; bloqueio de login sem confirmar.
2. Link de confirmação volta à PWA no Android e permite login.
3. Reenviar confirmação entrega email; não revelar existência da conta.
4. Password incorreta, boa, tentativa repetida e limites de abuso.
5. Recuperação de password: link correto e nova password; antiga rejeitada.
6. Persistência da sessão após fechar e reabrir PWA.
7. Duas contas distintas: cada uma só lê/altera os seus próprios projetos (RLS).
8. Backup local permanece intacto no login/logout; migração local só com consentimento explícito.
9. Verificar logs de Auth e erros de browser; nunca guardar segredos ou tokens nos relatórios.

## Estado real
Bloco 12 implementado no frontend, com 10 blocos JavaScript a passar na verificação de sintaxe.
SMTP, links de email, contas reais e sincronização multi-dispositivo ainda aguardam testes.
A flag de autenticação pública permanece false e a versão continua uma Beta Demo.
