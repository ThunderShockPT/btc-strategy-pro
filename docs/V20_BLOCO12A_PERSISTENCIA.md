# V20 — Bloco 12A: auditoria cloud e contrato de preservação

21/10/2026. Estado: staging local implementado e testado; sincronização V20 não ativada.

## Auditoria executada no projeto correto

Foram feitas consultas apenas de leitura ao Supabase `oftzqqjbwonngubihrsd`. A base contém `projects` e `project_snapshots`, com RLS ativo, políticas por proprietário e a chave UNIQUE(id, owner_id) exigida pela migração do Bloco 2. No instante da auditoria: zero utilizadores, zero projetos e zero snapshots. Isto não significa que os projetos locais dos navegadores estejam vazios. Não foram consultados emails ou registos financeiros privados.

Existem quatro migrações: `20261020095408`, `20261020095657`, `20261020194325`, `20261020194843`. Não existem Edge Functions. As funções públicas `btcsp_save_project_v1`, `btcsp_delete_project_v1` e `btcsp_touch_updated_at` são SECURITY INVOKER. Os papéis autenticados ainda têm permissões CRUD diretas nas tabelas V1, limitadas pelas políticas de proprietário: o RPC V1 não é a única via de escrita. A V20 deve restringir a escrita financeira ao caminho validado, sem confundir a existência do RPC com imposição de atomicidade a todos os clientes.

`V20_BLOCO12A_CHECKPOINT.json` conserva colunas, constraints, índices, políticas, definições das funções e contagens observadas. É um checkpoint de metadados para comparação e recuperação técnica, não um backup completo do servidor. O código parte do checkpoint GitHub `f7508b9fb43616e11445657ea7a4f096dd519eac`, preservado na branch anterior; esta entrega usa `feat/v20-persistence-contract`. Não houve DDL, alteração de configuração Auth, envio de email ou migração de dados no servidor.

## Incompatibilidades identificadas

A migração aditiva do Bloco 2 ainda não está aplicada. A tabela de eventos proposta contém `facts`, mas o Bloco 11B passou a acrescentar `execution_metadata` ao envelope do evento. Guardar apenas `facts` perderia a quantidade pedida, quantidade não executada, estágio e fingerprint da execução. A gravação futura deverá conservar o envelope completo e verificar a coerência dos campos indexados com esse envelope, na mesma transação.

As versões anteriores dos planos também são necessárias: uma anulação remove uma ligação a um fill e uma reposição pode precisar da ligação histórica original. Não basta substituir o plano atual por JSON. Recibos do tutorial, dados originais, referências de correção e extensões reconhecidas na fase seguinte devem ser preservados ou recusados explicitamente; nunca descartados por serialização parcial.

Há duas diferenças de limites a resolver na camada transacional: a configuração de cada plano tem limite SQL de 500 000 bytes, enquanto o rascunho Demo tem limite por texto JS; o pacote completo não é uma única linha SQL. Um pacote de staging não deve ser gravado cegamente na antiga coluna de snapshot com limite de 1,5 MB.

## Implementação concreta

`backend/persistence-contract.cjs` prepara e relê um pacote versionado, sem rede, sem escrita e sem ativação automática. Conserva integralmente o estado JSON recebido, incluindo os envelopes originais dos eventos, histórico dos planos, recibos e extensões. Rejeita valores que JSON normalmente apagaria ou converteria silenciosamente, números inteiros inseguros, arrays esparsos, ciclos e objetos especiais. O limite técnico do pacote é 8 MB UTF-8, sem truncagem; cada configuração de plano mantém 500 000 bytes, facts 64 000 bytes e envelope de evento 128 000 bytes. Estes são limites técnicos de staging, não novos limites de risco ou garantias do servidor.

O contrato verifica o âmbito proprietário/projeto/cenário, IDs e versões de planos únicos, plano atual mais recente, limites de tamanho e coerência entre quantidade executada/pedida/não executada. Reconstrói os saldos através do mesmo motor decimal; resultados derivados eventualmente presentes no pacote não substituem essa reconstrução. Uma correção continua a ser um evento novo: o original não é reescrito.

O SHA-256 canónico deteta corrupção acidental e alterações entre preparação e leitura. Não autentica o utilizador nem torna os factos oficiais. Um atacante pode recalcular o hash; a API futura terá de autenticar, obter as regras e os factos autoritativos do servidor e validar comandos. Um pacote que inclui regras, preços ou operações declaradas continua apenas em staging. Os resultados não comprovam execuções Kraken, atualidade de preços nem elegibilidade de uma recomendação.

## Testes executados

- 11 testes novos passaram: preservação integral, execução parcial e comissão, duas versões de plano, corrupção, âmbito de três dimensões, eventos inválidos/duplicados, JSON inválido, limites UTF-8, metadados incoerentes, hash independente da ordem das chaves e anulação auditável.
- Suite V20 completa: **398/398**, sem falhas ou testes ignorados.
- Regressões V19: **386 verificações** — Auth 19, cloud isolada 26, release 38, responsividade 37, planeador 266.
- Sintaxe do módulo backend verificada. A CI foi atualizada para executar o contrato e incluir a nova branch.

As primeiras duas execuções da suite nova detetaram erros na preparação dos testes: estágio fechado na fixture e tentativa de modificar um resultado congelado. As fixtures foram corrigidas e toda a suite foi novamente executada. Não foram ocultadas falhas de produção nem flexibilizadas regras do motor para aprovar testes.

Estes testes são de staging e de regressão local. Não demonstram isolamento Auth entre duas contas reais, concorrência PostgreSQL entre ligações, SMTP, backups de servidor ou recuperação cloud. Não houve alteração de interface, por isso mantém-se a pré-visualização privada do Bloco 11B.

## Continuação do Bloco 12

12B: preparar migração complementar que conserve envelope e versões, comandos com revisão esperada e idempotência, transação de evento+comissão+plano, reconstrução autoritativa e ensaios de concorrência. Testar em ambiente isolado antes de aplicar ao servidor.

12C: autenticação e sincronização integrada, isolamento de duas contas, confirmação e recuperação de acesso com SMTP exclusivo, recuperação de servidor e processo de portabilidade/eliminação de conta. Só ativar registo/sincronização após critérios cumpridos. Os backups locais Beta mantêm-se até esse momento.

Melhoria recomendada: obter inventário e checkpoint antes de cada migração, comparar o esquema com o manifesto esperado e abortar em divergências; adicionar reconciliação explícita entre o envelope financeiro e as colunas SQL indexadas. Não introduzir uma segunda fonte de saldos no frontend.

Referências consultadas: documentação oficial Supabase de RLS e changelog, incluindo avisos de TLS em 10/11/2026 e alterações PostgreSQL 15.19/17.11. Não foram usados SDKs novos ou extensões afetadas nesta entrega.

Faltam **4 blocos principais (12–15)**; o Bloco 12 está em curso. A main e a publicação pública não foram alteradas.
