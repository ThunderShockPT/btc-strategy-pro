# BTC Strategy Pro V20 — Pós-34 · P1.2/8 — Auditoria das 5 Edge Functions

**Data:** 26 de outubro de 2026  
**Âmbito:** análise **read-only** do código-fonte exato das cinco funções publicadas no projeto Supabase `oftzqqjbwonngubihrsd` e dos respetivos guardas no GitHub.  
**Resultado:** revisão do código e inventário concluídos; **não** equivale a teste de intrusão com duas contas nem aprovação de produção. **NO_GO** permanece.

## Inventário da infraestrutura realmente publicada

| Função / versão | `verify_jwt` | Estado observado no código implantado | Classificação para Beta |
|---|---|---|---|
| `btcsp-v20-api` v1 | `false` | API normal; GET de saúde informa estado, mas o controlo financeiro `financialCloudApproved:false` e os nove checks encerram operações. Tem validação Bearer, sessão Supabase `/auth/v1/user`, `auth.sessions`, propriedade e admissão de pedidos quando ativado | **Fechada por política**, rever execução real antes de ativação |
| `btcsp-v20-runtime-qa` v20 | `false` | Função substituída por uma única resposta `503 QA_COMPLETE_CLOSED` e `Cache-Control:no-store` | **Encerrada**; não reutilizar |
| `btcsp-v20-account-qa` v42 | `false` | Harness restrito a dois utilizadores e projetos fictícios; exige SHA-256 de capacidade com comparação temporalmente segura e limita rotas e IDs. Configuração com validade até **25/10/2026 09:57:44 UTC** (expirada). Suporta `/bootstrap` e `/finish` apenas pela capacidade QA e não é interface de produção. Em execuções isoladas constrói política temporária permissiva **só para ensaios** | **Expirada, não autorizar reutilização nem copiar gates QA para produção** |
| `btcsp-v20-private-provision` v11 | `false` | Função implantada substituída por `503 PRIVATE_PROVISION_CLOSED` e `Cache-Control:no-store` | **Encerrada**; provisionamento administrativo indisponível por este endpoint |
| `btcsp-v20-private-test` v12 | `false` | API de teste ainda ativa, exige utilizador da allowlist fixa, sessão validada pelo serviço Auth e `auth.sessions`, etiqueta verificada em `raw_app_meta_data` e checks no interior da transação. Também tem restrições de método/origem e um cabeçalho que afirma produção não aprovada | **Teste restrito ainda ativo**. Não equiparar a uma aplicação pública autenticada; avaliar desativação controlada antes de produção |

**Nenhuma das cinco tem `verify_jwt:true` na configuração implantada.** Segundo a arquitetura Supabase existem duas camadas distintas: a plataforma, e a lógica de autenticação executada dentro da função. Desativar a primeira exige provar a segurança da segunda; não é automaticamente uma vulnerabilidade confirmada, nem motivo para alterar a configuração sem testes. Fonte Supabase: <https://supabase.com/docs/guides/functions/auth-headers>.

## Análise de segurança e riscos pendentes

1. **Política de produção — fechada.** A função principal consulta explicitamente o ficheiro `policies/cloud-release-20261021.json`: `financialCloudApproved:false`, `publicRegistrationApproved:false`, nove condições de infraestrutura falsas. Não houve alteração deste ficheiro, contas, base de dados ou funções na auditoria.
2. **Controlo do dono:** na API principal, a verificação do Bearer é acompanhada de consulta `/auth/v1/user` e validação de sessão `auth.sessions`; confirma-se a presença destes guardas no código, **não** que todas as combinações de rota e estado estejam seguras em execução.
3. **Harness QA fechado/expirado:** as duas funções encerradas não fornecem rotas funcionais; o harness de contas possui prazo vencido e credencial de capacidade específica. **A sua política temporária ativada não é uma licença para abrir a política financeira geral.**
4. **API privada de teste:** mantém acesso privilegiado potencial via backend e usa chaves derivadas e sessão em contexto de testes. Não remover ou modificar automaticamente — fazê-lo pode quebrar ensaios e preservação dos dados; preparar plano de descontinuação segura.
5. **Riscos ainda sem ensaio dinâmico:** sem token, token inválido/expirado, troca de `ownerId`, replay, dupla conta, CORS/CSRF com pedidos maliciosos, proteção de limites de pedidos, restauro e rotação de segredos. Estas são **tarefas ainda abertas** e não resultados aprovados.
6. **Credenciais e dados pessoais:** a auditoria gravada em GitHub contém apenas nomes, versões, hashes e descrições de guardas. **Não** foram publicadas capacidades, IDs privados de teste, tokens, passwords, conteúdos reais de utilizadores ou segredos do Supabase.

## Artefactos e verificações

- `policies/v20-post34-edge-functions-audit-20261026.json` — classificação de cada função, versão e hash do código implantado.
- `scripts/test-v20-post34-edge-function-audit-20261026.cjs` — 10 testes automatizados em código e política, sem chamadas às funções reais.
- Workflow de regressão reduzida `.github/workflows/v20-post34-security-audit.yml`. Os testes de P1.1 (8) continuam presentes.
- P1.1 `docs/V20_POS34_P1_ETAPA1_AUDITORIA_SUPABASE_20261026.md` guardado como checkpoint anterior, sem recontar as 34 etapas.

**Limite dos testes automatizados:** atestam que a classificação e os guardas continuam coerentes com a revisão de 26/10; não obtêm provas live de resistência a abuso, não ensaiam troca de contas e não demonstram recuperação de conta real.

## Progresso fixo

**Blocos antigos:** 34/34 (100% técnico/arquitetura).  
**Fase pós-plano:** P1.2/8 revista; **2/8 preparações concluídas**. Próxima **P1.3/8** — proteção de passwords comprometidas, respeitando limitações do plano Supabase e exigindo autorização para qualquer alteração real de Auth. Posteriormente P1.4 (duas contas), P1.5 (email/SMTP), P1.6 (restauro), P1.7 (Kraken), P1.8 (release).

**GO/NO-GO para contas públicas, dinheiro real e operações Kraken: NO_GO.** PR #35 draft, `main` V19.1 e Demo isolada intactas.
