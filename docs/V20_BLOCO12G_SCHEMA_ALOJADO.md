# V20 — preparação da estrutura alojada

24/10/2026. Projeto exclusivo BTC Strategy Pro: `oftzqqjbwonngubihrsd`.

## Estado e âmbito do ponto de recuperação

A leitura atual encontrou zero utilizadores Auth, zero projetos e zero snapshots. As duas tabelas V19, três funções públicas, oito políticas, triggers, constraints, índices e permissões foram capturados em `docs/qa/V20_12G_PUBLIC_SCHEMA_BEFORE_20261024.json`, incluindo as permissões por defeito reais e o histórico das quatro migrações anteriores. O ficheiro não contém utilizadores, passwords, tokens, chaves ou dados financeiros. É um ponto de recuperação do esquema de aplicação **vazio**, não um backup integral do projeto Supabase, Auth/Storage/configurações nem de uma base com dados.

O restaurador recusa contagens diferentes de zero ou outro projeto/âmbito. O ensaio cria dependências Auth mínimas apenas no laboratório, restaura o esquema público capturado, instala as sete migrações V20 e verifica preservação de constraints, funções V19, triggers e isolamento. Também aplica todas as migrações dentro de uma transação e comprova que o rollback devolve o laboratório ao estado anterior. São 14 tabelas após a instalação: oito públicas e seis privadas, todas com RLS. Anónimos e utilizadores autenticados não recebem escrita nas novas tabelas.

O teste local usa PGlite e identifica explicitamente esse adaptador. A CI executa o mesmo ensaio num PostgreSQL nativo descartável, com endpoint limitado a loopback; a instalação alojada só deve começar depois desse resultado. O teste nativo de pg_dump cifrado/pg_restore já existente continua obrigatório e distinto deste ponto de recuperação do esquema vazio.

## Ajuste antes da instalação

A função privada `reject_calculation_job_rebase` passa a declarar `SECURITY INVOKER` e `search_path` vazio, como as outras funções financeiras. A alteração é feita na migração ainda não aplicada ao alojamento; não altera factos, limites, lotes, regras financeiras ou prazos. O ensaio usa as permissões por defeito reais da instância para detetar diferenças face às bases de teste simplificadas anteriores.

O esquema real também contém o limite V19 de capital inicial entre 100 e 1 000 000 000 USD. A criação de carteira V20 passa a validar esse limite antes de preparar a proposta, devolvendo 422 com mensagem explicativa, em vez de falhar no INSERT após a confirmação. O campo da conta informa o mínimo. O motor Demo não foi alterado e nenhum capital é ajustado automaticamente. O ensaio cria e confirma uma carteira V20 de 2 000 USD sobre as colunas reais, recupera o recibo idempotente e comprova ausência de exposição BTC inventada e isolamento de outra identidade.

## Condições da instalação alojada

- Reconfirmar o projeto, as contagens vazias e a ausência de tabelas V20 antes do primeiro DDL.
- Aplicar apenas as sete fontes versionadas, pela ordem dos nomes, e registar versões alojadas e hashes das fontes. A execução por MCP pode atribuir versões de aplicação diferentes dos nomes dos ficheiros; o registo de correspondência deve ser consultado antes de usar ferramentas de sincronização de migrações.
- Verificar as 14 tabelas, RLS, políticas, ausência de escrita de clientes, funções privadas, preservação V19 e consultores de segurança.
- Manter a política de abertura e o endpoint financeiro público fechados. DDL instalado não significa aprovação de contas públicas, SMTP, restauro integral, privacidade, desempenho ou fluxo financeiro alojado.
- Não apagar tabelas nem históricos para voltar atrás. Antes de qualquer reversão futura, comprovar ausência de novas contas/dados e usar o ponto de recuperação adequado ao estado de então.

## Resultado alojado

As sete migrações foram aplicadas e verificadas em 24/10/2026, depois do ensaio PostgreSQL 17.11 aprovado no job 120778823226 da CI 40062499559. A verificação alojada confirmou 14 tabelas com RLS, 14 políticas públicas, ausência de qualquer privilégio de escrita dos clientes nas tabelas V20 e ausência de acesso dos clientes ao schema privado. As três funções V19 conservam os mesmos hashes de definição. Contagens de utilizadores/projetos/snapshots continuam em zero. Os projetos locais/Demo não foram convertidos nem substituídos.

O consultor não devolveu níveis WARN/ERROR. As seis observações INFO correspondem às seis tabelas privadas com RLS sem políticas, bloqueadas por defeito e sem grants para clientes; não se adicionaram políticas permissivas para ocultar esse resultado. Referência: [RLS enabled, no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Uma colisão de versões do serviço de migrações no mesmo segundo ocorreu depois de o SQL de request_buckets já ter sido confirmado pelo COMMIT da fonte. O estado vazio, constraints, índice, RLS e permissões foram inspecionados antes do registo protegido dessa migração. Nas fontes seguintes foram removidos apenas os delimitadores BEGIN/COMMIT do payload, deixando a transação a cargo do serviço e separando os pedidos. Nenhuma tabela ou facto foi eliminado. A correspondência entre nomes de fonte, SHA-256 e versões alojadas está em `docs/qa/V20_12G_HOSTED_SCHEMA_RESULT_20261024.json`.

O ponto de recuperação e o ensaio cobrem o esquema de aplicação vazio. Auth/Storage/configurações, retenção e chaves de backups, restauro integral, migração de projetos locais existentes e fluxo financeiro autenticado no alojamento continuam por validar. Não se alteraram as flags de aprovação cloud/SMTP/privacidade, nem se marcou o Bloco 12 como concluído.
