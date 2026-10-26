# BTC Strategy Pro V20 — P1.4/8 · Isolamento de contas com RLS e API (26/10/2026)

**Estado:** testes de isolamento local **APROVADOS**, aceitação das contas reais **PENDENTE**.  
**Projeto:** `oftzqqjbwonngubihrsd`. **Nenhum pedido de escrita foi enviado ao Supabase alojado**; nenhuma conta, sessão ou carteira real foi criada ou alterada.  
**Resultados GitHub Actions:** <https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40420831201> — **25/25 PASS, 0 FAIL**, sendo **7** casos de PostgreSQL RLS em base local descartável com duas identidades sintéticas e **18** regressões HTTP do backend, também com dados de ensaio.

## 1. Observação read-only na base de dados alojada

Consultas `SELECT` aos catálogos `pg_policies` e `information_schema.role_table_grants` confirmaram:

- `public.projects`: `SELECT/INSERT/UPDATE/DELETE` exigem `owner_id = auth.uid()`; `INSERT` e `UPDATE` têm `WITH CHECK`.
- `public.project_snapshots`: políticas também exigem dono e vínculo a projeto próprio nas validações de leitura/inserção/atualização.
- 6 tabelas financeiras de V20: só `SELECT` do dono autenticado; sem permissão direta de escrita do cliente.
- Esquema `btcsp_private`: sem `USAGE` para `anon`/`authenticated`, confirmado na P1.1.

**Esta observação de regras não executa, por si só, pedidos reais como dois utilizadores autenticados.** Também não substitui verificações em Storage, RPC e endpoints Auth que venham a ser usados na Beta.

## 2. Verificações dinâmicas em QA descartável

Criado `scripts/test-v20-post34-two-account-rls-20261026.cjs`. Usa **PGlite/PostgreSQL com RLS real ativo**, não apenas filtros JavaScript. Replica as estruturas relevantes das políticas que foram verificadas no Supabase. As identidades A e B são UUIDs fictícios sem ligação aos utilizadores existentes.

| Cenário isolado | Resultado |
|---|---|
| A só vê projetos, snapshots e eventos A; B só os seus | PASS |
| B tenta ler ou mudar projeto/snapshot/evento de A | PASS, acesso negado/zero linhas |
| A ou B tentam falsificar `owner_id` ou inserir snapshot num projeto alheio | PASS, `WITH CHECK` bloqueia |
| Utilizador tenta `INSERT/UPDATE/DELETE` diretamente no diário financeiro | PASS, operação sem privilégios |
| Papel `anon` tenta ler tabelas públicas | PASS, recusado |
| Papel `authenticated` tenta aceder ao esquema privado | PASS, recusado |
| Verificação de que RLS estava efetivamente ativo em cada tabela do ensaio | PASS |

**Adicionalmente**, foram executados os **18 testes reais do código de API** em `scripts/test-authenticated-api.cjs` contra fixtures locais. Abrangem identidade remota simulada, sessões expiradas/revogadas/banidas/não confirmadas, troca de contas, negação de `ownerId` falsificado, falha antes da gravação, CORS, cache privada e replay de comandos. **A autenticação nestes casos usa fixtures**, não credenciais de utilizadores da instância pública.

## 3. Limites e bloqueios expressos

**Não declarar P1.4 como prova final de segurança na infraestrutura alojada.** Antes de lançamento é necessário um ensaio controlado e autorizado com **duas contas de QA realmente autenticadas** em ambiente isolado, com emails, tokens, armazenamento e políticas reais, incluindo recuperação de sessão. O harness antigo `btcsp-v20-account-qa` expirou em 25/10 e não deve ser reaberto implicitamente. Se tal ensaio implicar criar contas, gastar dinheiro, reconfigurar Supabase ou mexer em produção, solicitar autorização separada e plano de limpeza/backup, sem tocar nas carteiras existentes.

Além disso, permanecem pendentes:
- **P1.3:** proteção nativa de passwords comprometidas indisponível no Free e ainda desativada.
- **P1.2:** cinco Edge Functions com `verify_jwt=false`; revisão estática concluída, ensaio adversarial hospedado ainda não executado.
- **P1.5/8:** SMTP e recuperação de passwords/emails/redirecionamentos.
- **P1.6/8:** restauro cifrado e privacidade.
- **P1.7/8:** regras Kraken EEE para cálculo de liquidação, funding e margens em contexto real.
- **P1.8/8:** aprovação final independente para qualquer publicação financeira.

## 4. Estado e entrega

**34/34 etapas técnicas/arquitetura iniciais:** 100%, sem alterações.  
**Pós-plano P1:** P1.1/8 e P1.2/8 encerradas; P1.3/8 avaliada, mas bloqueada; **P1.4/8 com QA local aprovada e aceitação hospedada pendente**. Assim, não é legítimo afirmar `4/8` validada para produção. **Próximo trabalho independente sem mutações: P1.5/8**.

- Resultado CI: <https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40420831201>
- Teste RLS: `scripts/test-v20-post34-two-account-rls-20261026.cjs`
- Teste API: `scripts/test-authenticated-api.cjs`
- Workflow seguro: `.github/workflows/v20-post34-two-account-rls-qa.yml`
- Snapshot dos controlos e limites: `policies/v20-post34-two-account-rls-20261026.json`

**`financialCloudApproved:false`, `publicRegistrationApproved:false` e os nove checks permanecem fechados.** `main` V19.1, Netlify Demo e PR #35 draft não sofreram deploy, reset nem merge. Nenhuma ordem Kraken. **Produção = NO_GO**.
