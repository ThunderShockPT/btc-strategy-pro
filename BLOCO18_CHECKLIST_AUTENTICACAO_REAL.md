# BTC Strategy Pro — Bloco 18 · Checklist para abrir contas reais

Data: 2026-10-20
Aplicação: https://thundershockpt.github.io/btc-strategy-pro/
Repositório: ThunderShockPT/btc-strategy-pro
Supabase exclusivo BTC: oftzqqjbwonngubihrsd

## Situação atual confirmada

- Versão **18.0.0-beta-auth-qa** publicada.
- Página inicial com **Entrar / Criar conta / Experimentar Demo** está funcional.
- Proteção de contas reforçada: validação de email confirmado com auth.getUser(), URLs de retorno limitados à própria aplicação, mudança de conta entre separadores sem conservar a listagem privada anterior.
- A autenticação pública mantém-se **BTC_BETA_AUTH_ENABLED=false**. Não ativar apenas para "ver se funciona".
- RLS por owner_id=auth.uid() nas tabelas projects e project_snapshots; funções de gravação e eliminação com segurança invoker e controlo de revisões.
- CI executa testes de segurança, de callback, de identidade e navegação responsive.
- O remetente atualmente verificado na ligação Resend é de **outra aplicação** (Racing Horse Manager). NÃO reutilizar esse remetente; configurar uma identidade própria da BTC Strategy Pro.

## Sequência para lançamento com login real

1. **Decidir e verificar um domínio de envio da BTC Strategy Pro** no fornecedor SMTP/Resend. Usar um domínio que o proprietário controla; não assumir domínio próprio a partir do endereço público GitHub Pages. Verificar DNS (SPF/DKIM e, idealmente, DMARC).
2. No Supabase da BTC Strategy Pro, **Authentication > URL Configuration**:
   - Site URL: `https://thundershockpt.github.io/btc-strategy-pro/`
   - Redirect URL permitida, exata e em HTTPS: `https://thundershockpt.github.io/btc-strategy-pro/`
   - Confirmar que não há wildcards abertos para qualquer domínio.
3. **Authentication > Providers > Email**:
   - Permitir email/password e **Confirm email = ON**.
   - Garantir que o registo não gera uma sessão utilizável antes da confirmação.
4. **Authentication > SMTP Settings**:
   - Configurar host, porta, user SMTP, password (só no painel privado), From address, nome do remetente BTC Strategy Pro.
   - **Nunca** enviar password SMTP, chave secreta Supabase ou token de acesso para o GitHub/frontend/chat.
   - Rever limites de email e proteção anti-abuso/bot.
5. **Testes reais (usar dois emails de teste autorizados)**:
   - Registo A com confirmação enviada e recebida (não permite login antes de confirmar).
   - Reenvio A dentro dos limites, sem revelar se um email pertence a uma conta.
   - Confirmação abre a rota HTTPS correta no browser e PWA Android.
   - Login A válido/inválido, encerramento de sessão e reabertura.
   - Recuperar password, receber email, abrir link, atualizar password e confirmar que a antiga deixa de autenticar.
   - Registo B e login em dispositivo distinto; B não vê, não grava e não elimina dados de A (testar APIs reais com JWT autenticado).
   - Editar o mesmo projeto em dois dispositivos de A: a versão antiga deve falhar e não substituir a nova.
   - Testar o modo offline e restauro JSON; os dados Demo pré-existentes não devem ser migrados sem consentimento.
   - No Android S25 e browsers 320, 360, 390, 430 CSS px, verificar login, teclado, confirmação e reset.
6. **Privacidade e operações**:
   - Antes de registos reais, atualizar a identificação do responsável pelo tratamento e contacto privado nas páginas públicas.
   - Disponibilizar fluxo seguro para pedir eliminação da conta cloud/dados associados; não usar service role no browser.
   - Documentar retenção, tratamento de incidentes e suporte.
7. Só após provas **PASS**, rever o código e alterar de maneira controlada a configuração `BTC_BETA_AUTH_ENABLED` e o teste CI que a bloqueia. O registo público NÃO deve ser desbloqueado automaticamente pelo sucesso dos testes de sintaxe.

## Critério de autorização

**GO:** SMTP/domínio verificado, links confirmados em Android e desktop, duas contas isoladas por RLS, recuperação e eliminação de conta asseguradas, políticas finais atualizadas, todos os testes PASS.

**NO-GO:** Sem domínio SMTP próprio, falhas de confirmação/password, dados de contas cruzados, risco de perda silenciosa ou ausência de canal privado para exercer direitos.

## Fontes técnicas

- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/reference/javascript/auth-onauthstatechange
