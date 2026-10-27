# BTC Strategy Pro V20 — Fase pós-34 · P1.1/8 — Auditoria real de infraestrutura sem alterações

**Data:** 26 de outubro de 2026  
**Objetivo:** preparar a futura validação de contas reais, mantendo `main` V19.1, a Demo V20 Netlify e os dados de produção intactos.  
**Resultado:** **AUDITORIA READ-ONLY CONCLUÍDA; LANÇAMENTO FINANCEIRO: NO_GO**.  
**Fonte de evidência:** Supabase API e consultas exclusivamente `SELECT` a catálogos Postgres do projeto `oftzqqjbwonngubihrsd`, advisories Supabase de segurança/desempenho, código-fonte de 2 Edge Functions, git policy e CI. Não foram criadas contas, acionados emails, transferidas margens ou realizados pedidos com ordens.

## 1. Resultados efetivamente observados na infraestrutura

| Área auditada | Resultado | Interpretação |
|---|---|---|
| Estado do projeto | `ACTIVE_HEALTHY`, Postgres 17 | Projeto existente e acessível; saúde técnica não comprova segurança |
| Tabelas | 14 no total: 8 `public` e 6 `btcsp_private` | Cobertura de esquema confirmada |
| RLS | 14/14 com RLS ligado | Positivo, mas não substitui ataque simulado com duas contas |
| Permissões `anon` | 0 concessões diretas de tabelas nos schemas auditados | Reduz superfície da Data API |
| 6 tabelas financeiras públicas | política `SELECT` apenas de `owner_id=auth.uid()` | Sem `INSERT/UPDATE/DELETE` direto para clientes autenticados nessas 6 tabelas |
| `public.projects` e `public.project_snapshots` | políticas de CRUD por proprietário e `WITH CHECK` nos `UPDATE` | Legado V19.1 em funcionamento; **não remover** sem avaliar impacto |
| 6 tabelas privadas | RLS ligado, 0 políticas, sem `USAGE` para `anon`/`authenticated` | **Deny-by-default intencional provável**, não concluir vulnerabilidade por este aviso |
| Views em `public`/`btcsp_private` | 0 | Sem superfície de vista a contornar RLS nestes schemas |
| `SECURITY DEFINER` nesses schemas | 0 | Nenhum encontrado na área revista |
| Função `btcsp_touch_updated_at` | `EXECUTE` herdável por `anon` | Parece função trigger não privilegiada; rever concessão antes de abrir a API, sem mexer já |
| Edge Functions Supabase | 5 `ACTIVE`, **5/5 com `verify_jwt=false`** | **Exige auditoria de cada caminho**: `false` não prova acesso não autenticado, porque o código pode validar tokens |

## 2. Avisos do Supabase verificados em 26/10

### Segurança

1. **WARN `auth_leaked_password_protection`** — proteção contra palavras-passe conhecidamente comprometidas está **desativada**. É um ponto de segurança real a tratar antes de registos públicos, sujeito às opções/limitações do plano Supabase. <https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>
2. **INFO `rls_enabled_no_policy`: 6 tabelas privadas** — parecem corretamente reservadas ao backend e não acessíveis por utilizadores diretos. Nunca adicionar políticas permissivas só para eliminar o aviso. <https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy>

### Desempenho

3. **INFO `unindexed_foreign_keys`: 9** — avaliar `EXPLAIN`, perfis de acesso e índices compostos antes de alterações ao esquema; não adicionar índices automaticamente à base ativa. <https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys>
4. **INFO `unused_index`: 3** — não apagar índices só porque o contador de utilização está a zero. <https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index>

## 3. Edge Functions — preocupação prioritária

Funções encontradas ativas: `btcsp-v20-api`, `btcsp-v20-runtime-qa`, `btcsp-v20-account-qa`, `btcsp-v20-private-provision` e `btcsp-v20-private-test`.

**Todas têm `verify_jwt=false`.** Inspeção **parcial, apenas de código** das funções `btcsp-v20-api` e `btcsp-v20-account-qa` confirmou verificações explícitas de `Authorization: Bearer`, admissão/rate-limit, validação de dados do JWT e chamada ao serviço Supabase `/auth/v1/user` para verificar a sessão. A lógica de escrita cloud depende ainda de uma política interna `financialCloudApproved:true` e de todos os controlos aprovados, condição **não satisfeita** atualmente.

Isto é um resultado encorajador, mas **não é prova** de que todas as rotas das duas funções rejeitam sessões anónimas, nem de que as outras três Edge Functions exigem autenticação corretamente. Antes de aprovação, rever os cinco caminhos e executar testes autorizados de **sem token / token inválido / token de outra conta / conta não confirmada / sessão expirada / repetição de comando**, sem tocar em dados reais. Não mudar `verify_jwt` indiscriminadamente: a arquitetura utiliza validação aplicacional personalizada, e alterar esse parâmetro pode interromper QA/rotas legítimas.

## 4. O que foi preservado

- `policies/cloud-release-20261021.json`: **`financialCloudApproved:false`, `publicRegistrationApproved:false`** e os nove checks de produção **false**.
- `policies/v20-b15-release-evidence-20261025.json`: continua `QA_ONLY_DO_NOT_DEPLOY`; aprovações de contas e release independentes da aceitação da arquitetura C.
- PR #35 da branch `audit/v20-strategy-recovery-20261025` continua **draft**; sem merge nem deploy do site público.
- Nenhuma migração, SQL de escrita, alteração de Auth, criação de conta, uso de email ou operação Kraken.
- Resultado dos 34 blocos: **34/34 técnico e arquitetura**. A fase pós-plano **P1** não altera essa contagem.

## 5. Plano de validação pós-34 (separado dos 9 blocos anteriores)

| Etapa | Ação | Estado |
|---|---|---|
| **P1.1/8** | Auditoria real read-only de Supabase/RLS/Edge/advisors | **Concluída** |
| P1.2/8 | Rever autenticação/códigos de cada uma das 5 Edge Functions, incluindo rejeição por contexto | Pendente |
| P1.3/8 | Endurecer proteção de passwords, após aprovação e compatibilidade com plano | Pendente |
| P1.4/8 | Testes reais e isolados de Auth/RLS com duas contas de ensaio | Pendente |
| P1.5/8 | SMTP, confirmação de email, recuperação, URLs de redirecionamento e rate limit | Pendente |
| P1.6/8 | Backup cifrado, ensaio de restauro isolado, privacidade e retenção | Pendente |
| P1.7/8 | Revisão independente atualizada de regras Kraken Futures EEE/mark/funding/liquidação | Pendente |
| P1.8/8 | Ensaio de pré-lançamento, rollback e **autorização expressa separada para produção** | Pendente |

### Instrumentos criados nesta etapa

- `policies/v20-post34-supabase-security-audit-20261026.json` — instantâneo auditável dos resultados, **sem dados pessoais nem chaves**.
- `scripts/v20-post34-supabase-readonly-audit.sql` — verificações `SELECT` replicáveis de políticas, grants, views e funções.
- `scripts/test-v20-post34-supabase-security-audit-20261026.cjs` — 8 testes de integridade das evidências e de manutenção do **NO_GO** de produção.

**Cuidado:** os testes de CI verificam a consistência do instantâneo e das regras de segurança locais; **não** são testes de penetração nem RLS com utilizadores reais. Não concluir produção pronta se o teste CI ficar verde.

## Aprovação do proprietário (sempre limitada)

Foi dada aprovação **somente à arquitetura do Modelo C adaptativo**; não existe autorização para registo público, preços/regras reais de trading, contas financeiras ou ordens Kraken. Esta fase é investigação preparatória, não é um lançamento nem um pedido implícito de ativação de qualquer serviço.

**Próxima etapa autorizável sem risco de alteração:** P1.2 — auditoria de código das cinco Edge Functions, read-only, com relatório de bloqueios. Ativações de segurança, testes de contas reais e quaisquer alterações à produção só após autorização específica e verificação de impactos.


**Validação P1.1 confirmada em 26/10:** GitHub Actions https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40408407035 — **8/8 testes PASS, 0 FAIL** na workflow isolada `.github/workflows/v20-post34-security-audit.yml`, sem dependências externas, sem browser, sem segredos e sem acesso de escrita ao Supabase. Verificação adicional em CI confirmou explicitamente `financialCloudApproved:false`, `publicRegistrationApproved:false` e nove checks de produção fechados. Estes testes validam a consistência das evidências **de leitura** e bloqueios do repositório, não autenticação com duas contas ou RLS em execução real.