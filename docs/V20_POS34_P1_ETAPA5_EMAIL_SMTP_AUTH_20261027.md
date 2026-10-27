# BTC Strategy Pro V20 — P1.5/8 · Email, SMTP, recuperação e URLs de autenticação

**Data:** 27/10/2026  
**Ambiente:** revisão estática da branch `audit/v20-strategy-recovery-20261025` e documentação atual Supabase.  
**Resultado:** lógica de autenticação e recuperação revista, testes offline implementados; **configuração SMTP/redirect/rate limits alojada ainda NÃO CONFIRMADA**. **PRODUÇÃO: NO_GO.**

## 1. O que já existe no código

- **`account-session-v20.js`** contém login com `signInWithPassword`, validação de sessão `getUser`, verificação de `email_confirmed_at`, rejeição de utilizadores anónimos e de sessões inválidas/expiradas. Nenhuma carteira privada é ligada durante `PASSWORD_RECOVERY`.
- A recuperação no módulo de sessão verifica `token_hash` com `verifyOtp({type:'recovery'})`. A alteração de password usa `updateUser` e termina a sessão globalmente; essa lógica já tinha testes de regressão dedicados.
- **`auth-guard.js`** processa callbacks PKCE/códigos e callbacks com hash, exige HTTPS ou localhost, evita acrescentar parâmetros e fragmentos sensíveis ao destino e fornece mensagens de erro genéricas para evitar expor detalhes internos.
- **`previews/v20-r5-login-wallets-qa-20261025.html`** contém formulários de login, registo, recuperação e troca de password. Quando os controlos de cloud Beta estão desativados, o formulário aparece com campos/botões `disabled`; usa `signUp`, `resetPasswordForEmail` e `updateUser` apenas no modo Beta explicitamente ativado. Os destinos de confirmação/recuperação são derivados de `location.origin+location.pathname`.
- **Registo de discrepância antes de ativar:** o campo de password no preview impõe `minlength=8`, mas o módulo de sessão exige **mínimo 10** na alteração de password. As interfaces e mensagens devem alinhar com a configuração **real do servidor Auth**, ainda desconhecida. Não ativar um fluxo inconsistente.

## 2. O que NÃO foi confirmado na configuração alojada

| Controlo do Supabase Auth | Evidência atual | Estado |
|---|---|---|
| SMTP personalizado, remetente e autenticação SPF/DKIM/DMARC | Não existe método de leitura de configuração Auth na ligação disponibilizada nesta sessão | **Por verificar** |
| Confirmação de email obrigatória | O código exige confirmação para associar carteiras; a opção real do fornecedor não foi lida | **Por verificar** |
| `Site URL` | Ainda não consultado no painel Auth | **Por verificar** |
| Allowlist real de destinos `Redirect URLs` | Código prepara URL do browser; não prova allowlist do fornecedor | **Por verificar** |
| Limites reais de envios, OTP, verificações, login e refresh | Código mapeia erros; não prova limites configurados | **Por verificar** |
| Template, validade do link, entrega real e inbox | Nenhum email foi enviado, recebido ou aberto | **Por verificar** |
| Recuperação com duas contas reais | P1.4 usa fixtures e base descartável, não valida mensagens recebidas | **Por verificar** |

O Supabase documenta que o **servidor SMTP padrão é apenas para testes** e restringe envios a destinatários previamente autorizados (normalmente membros da equipa) se não houver SMTP personalizado. Portanto, ainda que os botões funcionassem na Beta, **não é seguro presumir que um futuro utilizador receberia mensagens de confirmação ou recuperação**.

Referências oficiais:
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/rate-limits

**Não foi verificada a configuração do Supabase Dashboard neste trabalho.** A existência de configuração de email noutro projeto não permite assumir que o BTC Strategy Pro esteja configurado da mesma forma.

## 3. Testes criados e limites

- `policies/v20-post34-email-auth-recovery-review-20261027.json`: inventário read-only do estado, com **6 bloqueios** e sem dados pessoais, chaves ou passwords.
- `scripts/test-v20-post34-email-auth-recovery-20261027.cjs`: 9 testes offline de callbacks, URLs seguras, proteção de dados em erros, fluxo de password, formulário desativado, discrepância de requisitos e gates financeiros.
- `scripts/test-auth-guard.cjs` e `scripts/test-account-session.cjs`: regressões já existentes do mesmo domínio incluídas na workflow.
- `.github/workflows/v20-post34-email-auth-qa.yml`: Node 24, dependências presas ao lockfile, **sem segredos, sem envio de emails, sem alterações ao Supabase e sem deploy**.

Os testes **não** substituem a verificação de entrega a destinatários reais, links válidos e expirados, reenvio, bounce, DKIM ou limites aplicados pelo serviço.

## 4. Passos para completar a aceitação hospedada, sem comprometer dados

1. Obter do painel **Authentication → SMTP Settings**, com acesso autorizado, confirmação apenas de **ligado/desligado**, identidade do remetente e domínio; **não** copiar passwords SMTP.
2. Rever **Authentication → URL Configuration**: `Site URL` e lista exata de redirecionamentos. Adicionar domínios apenas depois de decidir a origem aprovada de Beta; não usar wildcard indiscriminado.
3. Rever **Authentication → Providers → Email** (confirmação obrigatória) e **Authentication → Rate Limits**; registar parâmetros e valores sem chaves nem emails reais.
4. Num ambiente isolado e com autorização separada, criar duas contas fictícias e usar uma caixa de testes controlada para confirmação, reenvio e recuperação. Testar link expirado, reuso, saída global de sessão e ausência de mistura das carteiras.
5. Corrigir a discrepância de comprimento de password após confirmação dos limites efetivos do servidor, assegurando que os vários formulários comunicam exatamente a mesma regra.

**Nenhuma dessas alterações/ações de entrega foi autorizada nem executada automaticamente.** Não reenviar passwords, links completos de recuperação ou tokens para chat/documentos.

## 5. Estado do plano

**Plano técnico inicial:** 34/34 (100% arquitetural).  
**Fase P1:** P1.1/8 e P1.2/8 concluídas na revisão; P1.3 auditada mas proteção comprometida continua bloqueada (Free); P1.4 QA local aprovada mas faltam ensaios alojados; **P1.5 auditada e testada offline, com SMTP/URLs/entrega alojados pendentes**. Faltam P1.6 restauro, P1.7 Kraken e P1.8 avaliação de lançamento; as pendências de P1.3 a P1.5 não desaparecem por avançar para a etapa seguinte.

**GO/NO-GO:** `NO_GO`, `financialCloudApproved:false`, `publicRegistrationApproved:false`, PR #35 draft, `main` V19.1 intocada, nenhuma operação financeira ou inscrição pública.
