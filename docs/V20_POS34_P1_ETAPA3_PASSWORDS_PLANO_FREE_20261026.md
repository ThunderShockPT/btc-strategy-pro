# BTC Strategy Pro V20 — P1.3/8 · Verificação da proteção de palavras-passe (26/10/2026)

**Estado: auditoria técnica concluída; proteção nativa contra credenciais comprometidas NÃO ATIVADA (bloqueio confirmado de plano).**  
**Âmbito:** exclusivamente avaliação read-only do Supabase `oftzqqjbwonngubihrsd`. Não houve alterações a subscrição, autenticação, emails, contas reais, Supabase, GitHub Pages ou Netlify.

## Descoberta principal

O projeto **BTC Strategy Pro** encontra-se na organização Supabase de subscrição **Free (`tier_free`)**, confirmado em `get_project` → `get_organization` no dia 26/10/2026. O `get_advisors(type=security)` devolveu novamente **`auth_leaked_password_protection`, WARN, count=1**, isto é, a proteção está **desativada**.

A documentação oficial **Password security** da Supabase especifica que a funcionalidade nativa para impedir passwords presentes em bases de dados de fuga (Pwned Passwords/HaveIBeenPwned) está disponível **no plano Pro e superiores**. Fontes atuais:
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/pricing
- https://supabase.com/docs/guides/auth/general-configuration

**Não é um bug do frontend ou do backend que se possa corrigir por uma alteração simples ao código. Não ativar algo que o plano Free não disponibiliza, não inventar bypasses nem afirmar que o WARN foi resolvido.**

## O que está confirmado e o que não está

| Verificação | Evidência | Estado |
|---|---|---|
| Organização/projeto | `get_organization` devolve `plan=free, tier=tier_free` | **Confirmado** |
| Aviso de proteção contra passwords comprometidas | Supabase advisor `auth_leaked_password_protection`: `WARN` | **Por resolver** |
| Elegibilidade da funcionalidade nativa | Documentação oficial: **Pro+** | **Não disponível no plano atual** |
| Comprimento mínimo e classes exigidas atualmente | As ações de leitura ligadas não disponibilizam a configuração da política Auth | **Não verificado** |
| Confirmação de email, MFA, rate limits e recuperação real | Sem pedidos de autenticação nem credenciais de teste nesta fase | **Não verificado; P1.4/P1.5** |
| Alterações de Auth, upgrade, registos públicos | **Nenhuma** | **Não autorizado, sem alteração** |

**Importante:** o reforço de regras de passwords pode afetar entradas existentes e processos de reset. A documentação Supabase indica tratamento especial para passwords fracas. Qualquer alteração futura exige analisar os fluxos de login e recuperação com contas de ensaio; **não forçar reset global nem recolher passwords reais**.

## Opções para um futuro desbloqueio, sem alterar o projeto agora

**Opção A — Pro ou superior:** depois de obter autorização expressa para a despesa e mudança de Auth, validar a elegibilidade, ativar proteção nativa no dashboard Auth, rever o aviso de segurança e testar login/registo/reset/contas existentes. Não há autorização nem orçamento para upgrade nesta decisão.

**Opção B — Permanecer Free:** validar com o proprietário uma política de passwords fortes configurada no **servidor Supabase Auth**, confirmação de email, MFA e mitigação de abusos, bem como alternativa comprovada e autorizada de proteção contra passwords comprometidas. **Um validador JavaScript no browser não é enforcement**, pode ser contornado e não satisfaz este gate. Não enviar passwords em claro para servidores de terceiros ou telemetria. Se não houver salvaguarda suficiente, **manter o registo público desativado**.

A P1.3 não determina qual das opções escolher, não escolhe preço nem autoriza despesa.

## Trabalho técnico desta etapa

- `policies/v20-post34-password-security-review-20261026.json`: parecer verificável, detetor de inconsistência e bloqueio de lançamento.
- `scripts/test-v20-post34-password-security-20261026.cjs`: **8 testes automatizados de integridade**, proteção de consentimento e gates de produção.
- `.github/workflows/v20-post34-security-audit.yml`: executa os novos testes sem credenciais, sem acesso remoto em CI e sem alteração à infraestrutura.
- `docs/V20_POS34_P1_ETAPA3_PASSWORDS_PLANO_FREE_20261026.md`: este relatório.

Esses testes apenas verificam a consistência do que foi efetivamente observado; **não** verificam uma configuração Auth que não foi disponibilizada nem provam segurança do login real.

## Progresso

- **Plano anterior:** 34/34 entregas técnicas e arquitetura (100%), preservado.
- **Fase P1:** P1.1 e P1.2 concluídas; **P1.3 avaliada com bloqueio de remediação**. A terceira revisão está feita, mas **o controlo de segurança continua pendente**. Não converter automaticamente «3/8 revisões» em «3/8 medidas de segurança efetivas».
- **Próximo trabalho P1.4/8:** ensaio autorizado e isolado de Auth/RLS com duas contas de teste. P1.5 SMTP/recuperação, P1.6 restauro, P1.7 regras Kraken, P1.8 pré-lançamento. O desbloqueio da proteção de passwords é um **bloqueio que tem de ser revisitado antes de P1.8**.
- `policies/cloud-release-20261021.json`: `financialCloudApproved=false`, `publicRegistrationApproved=false`, nove checks `false`. `policies/v20-b15-release-evidence-20261025.json` permanece QA-only.
- PR #35 mantém-se rascunho. **GO/NO-GO para contas reais/públicas e operações Kraken: NO_GO**.

**Nota sobre o changelog:** revista a página pública Supabase Changelog de 2026, incluindo avisos relativos a Auth/SMTP. Não foi identificado um anúncio que altere a condição documentada **Pro+** para leaked password protection nesta revisão.


## Resultado dos testes em GitHub Actions

**GitHub Actions 40415051549 — 26/26 PASS, 0 FAIL.** O job da P1.3 passou os 8 controlos de revisão sem aceder aos dados de utilizadores; juntamente com P1.1 (8) e P1.2 (10), verificou que o lançamento financeiro e os registos públicos continuam fechados. https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40415051549

**Interpretação:** avaliação da P1.3 concluída; remediação `auth_leaked_password_protection` **não concluída** no plano Free. O aviso real persiste; a P1.3 permanece assinalada como pendência de segurança antes de qualquer lançamento.
