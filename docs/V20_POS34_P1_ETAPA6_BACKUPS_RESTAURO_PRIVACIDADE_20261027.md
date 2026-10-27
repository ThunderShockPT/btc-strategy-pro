# BTC Strategy Pro V20 — P1.6/8 · Backup cifrado, restauro isolado e privacidade

**Data:** 27/10/2026  
**Âmbito:** BTC Strategy Pro V20, Supabase `oftzqqjbwonngubihrsd`, branch isolada `audit/v20-strategy-recovery-20261025`.  
**Resultado:** auditoria e implementação da bateria de QA; **produção ainda NO_GO**, sem extração ou escrita de dados alojados.

## 1. Risco de backups no plano atual

Confirmado por ferramenta Supabase `get_project` e `get_organization`: projeto ativo num plano de organização **Free**. Segundo a [documentação oficial Supabase Database Backups](https://supabase.com/docs/guides/platform/backups), os **backups automáticos diários geridos** estão incluídos nos planos **Pro, Team e Enterprise**, não no Free; neste último a Supabase recomenda `db dump` regulares e backups off-site.

**Isto não comprova que o proprietário não tenha feito cópias próprias.** A configuração real de backups externos, chaves, cron, rotação e política de retenção **não foi consultada nem demonstrada**. `PITR` também não foi verificado. Nunca criar um backup de dados reais sem autorização específica, custódia das chaves e destino de armazenamento acordados. Não supor custo zero para opções pagas.

## 2. Código auditado existente

**`backend/backup-envelope.cjs`:** uma abstração só de servidor que recebe bytes `pg_dump` já obtidos, cifra com **AES-256-GCM**, chave de 32 bytes, nonce aleatório de 12 bytes, tag de autenticação de 16 bytes. O cabeçalho AAD autentica formato, projeto, ID de chave, data e tipo de origem. Tamanho máximo do arquivo antes de cifrar: **64 MiB**. Não é um agendador de backups nem faz armazenamento off-site. Não guardar a chave junto do ficheiro.

**`scripts/test-atomic-postgres.cjs`:** já contém o cenário técnico de `pg_dump --format=custom` → envelope cifrado → validação → `pg_restore --exit-on-error` **numa segunda base de dados PostgreSQL descartável**, restaurando events/planos, saldos, cálculos e empregos privados, RLS, gatilhos de append-only e testes de acesso entre donos. Este teste não serve de evidência de restauro do Supabase em produção, incluindo GoTrue, Storage, configurações, links, DNS/SMTP e segredos. Também não mede um objetivo de tempo realista de recuperação.

**`backend/account-portability.cjs` e `scripts/check-wallet-backup.cjs`:** exportação do proprietário e validação de wallet por hash, revisão e âmbito, com `automaticRestoreAllowed:false`. **Portabilidade ≠ backup operacional**. A exportação de portabilidade pode conter informação pessoal (email e metadados de perfil) e detalhes financeiros; não é um artefacto apropriado para publicação ou envio não cifrado.

**Importante:** um estudo anterior `docs/V20_PORTABILIDADE_E_BACKUP_20261025.md` regista ensaios de exportação em contas QA e um endpoint posteriormente encerrado; não confirma política atual de retenção e não autoriza reabertura do harness.

## 3. Testes adicionados nesta P1.6

- `policies/v20-post34-backup-restore-privacy-audit-20261027.json`: snapshot dos riscos, provas e **campos explicitamente desconhecidos**, sem dados reais.
- `scripts/test-v20-post34-backup-restore-privacy-20261027.cjs`: 8 verificações sintéticas novas de cifra/nonce, adulteração, escopo, portabilidade, diferenças entre backup e restore, e bloqueio de produção.
- Regressões `scripts/test-backup-envelope.cjs` (4 casos) e `scripts/test-account-export.cjs` (6 casos).
- Workflow `.github/workflows/v20-post34-backup-restore-qa.yml` executa também o teste direcionado `native encrypted pg_dump restores...` com **PostgreSQL 17 descartável**, Postgres dentro do container de CI, sem chaves, emails ou dados da produção.
- Os testes CI não criam backups remotos, não executam recuperação sobre o projeto hospedado e não aprovam restauro de dados financeiros reais.

**Resultado CI:** será documentado apenas depois da confirmação de uma execução verde; um script presente no repositório não é teste executado.

## 4. Pontos ainda obrigatórios para Beta real

| Controlo | Estado |
|---|---|
| Encriptação e autenticação de backups sintéticos | Implementadas no código e testadas anteriormente |
| Restauro PostgreSQL isolado | Cenário existente em QA, execução dedicada desta etapa a verificar |
| Agendamento automático de backup operacional | **Não definido / não demonstrado** |
| Retenção off-site, acessos e localização | **Não definido** |
| Custódia da chave, recuperação e rotação | **Não definido** |
| RTO/RPO (perda de dados admissível e tempo de recuperação) | **Não definido** |
| Backup e restauração da camada Auth e Storage, segredos/configuração | **Não testado end-to-end** |
| Pedidos de eliminação de conta, retenção por categoria, privacidade | **Não implementados e validados integralmente** |
| Backups geridos Supabase Free | **Não incluídos pela subscrição** |
| Autorização do proprietário para mudar subscrição, executar dump alojado ou restauro | **Não concedida** |

**Não executar automaticamente:** `pg_dump` da conta real, `pg_restore` em produção, upgrade, backups com dados pessoais, rotação de chaves reais, políticas SQL de eliminação, escrita no Storage ou eliminação de contas.

## 5. Progresso

- Plano inicial V20: **34/34 (100% entrega técnica e de arquitetura, não operação financeira)**.
- P1.1 e P1.2: revisões de segurança concluídas.
- P1.3: auditoria concluída; mitigação de passwords comprometidas ainda bloqueada no Free.
- P1.4: RLS A/B aprovada em local descartável; aceitação alojada ainda pendente.
- P1.5: 44 verificações offline aprovadas; configuração SMTP e entrega alojadas pendentes.
- **P1.6:** auditoria e QA de backup/restauro isolado em curso; plano de retenção/recuperação de produção pendente.
- **P1.7:** atualização independente de Kraken Futures EEE, manutenção, funding, mark price e liquidação.
- **P1.8:** avaliação do lançamento e autorização expressa separada do proprietário.

**Estado de produção: NO_GO.** `financialCloudApproved:false`, `publicRegistrationApproved:false`, os nove controlos de lançamento continuam fechados. PR #35 *draft*; `main` V19.1, app pública, Netlify Demo, contas e Kraken intocados.
