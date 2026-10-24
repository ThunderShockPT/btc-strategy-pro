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

Pendente da CI nativa e da verificação imediata anterior ao DDL. Nenhuma migração alojada foi executada na preparação descrita acima. Os projetos locais/Demo não foram convertidos nem substituídos.
