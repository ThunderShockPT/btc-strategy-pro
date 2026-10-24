# V20 — Bloco 2: dados e migração preparada

21/10/2026 · Cenário de corretora declarado manualmente · Sem contas Kraken ligadas.

## Entrega

A migração SQL é aditiva e foi criada com `supabase migration new`. Acrescenta cinco tabelas, sem alterar as duas tabelas existentes. Foi aplicada apenas num PostgreSQL isolado PGlite, com identidades SQL de teste. Não foi aplicada ao projeto Supabase público. O frontend V19.1 não carrega os novos módulos e os dados reais não foram migrados ou apagados.

| Estrutura | Responsabilidade |
|---|---|
| `projects` / `project_snapshots` | Projeto e payload V1 continuam preservados; não há reset |
| `btcsp_legacy_imports` | Payload original, hash, proprietário e estado staged; sem ativação automática |
| `btcsp_financial_events` | Factos imutáveis: capital, margem, compras, vendas, custos, correções, anulações, reversões e aplicação de plano |
| `btcsp_plan_versions` | Configuração versionada, perfil, preço/instante de referência, piso, ciclos e ordens no JSON de configuração |
| `btcsp_calculation_runs` | Resultados derivados com versão de motor, regras, pressupostos e revisão de factos utilizada |
| `btcsp_preference_versions` | Preferências versionadas da conta da aplicação |

Não existe tabela de credenciais Kraken. A decisão vinculativa e o requisito de cotações públicas estão em `V20_PRODUCT_DECISIONS.md`. As referências antigas a uma integração privada foram retiradas da especificação do Bloco 1 e das limitações do manifesto.

## Factos, versões e correções

Cada evento tem UUID, projeto, proprietário, revisão, chave de idempotência, origem, cenário, tipo, data efetiva, data de registo, factos e versão do esquema. Correções/anulações/reversões exigem alvo e motivo. As chaves estrangeiras impedem referenciar uma operação ou plano de outro proprietário, projeto ou cenário.

Os triggers rejeitam UPDATE/DELETE nas cinco novas tabelas, incluindo alterações pelo proprietário de staging. A eliminação normal de projeto não pode apagar esse histórico em cascata. A portabilidade e eliminação definitiva por privacidade precisam de um processo privilegiado próprio no Bloco 12/15; não está implementado neste bloco e terá de existir antes de abrir contas públicas.

Não há ainda uma API financeira de escrita exposta ao cliente. O papel autenticado recebe apenas SELECT protegido por RLS e o papel anónimo não lê estas tabelas. Isto evita expor um livro de eventos gravável antes de existir o motor capaz de validar saldos e vendas posteriores. Nenhuma função SECURITY DEFINER foi acrescentada.

Constraints garantem formato, referências, versões únicas e ausência de chaves de idempotência repetidas. Ainda não garantem a conservação financeira: os factos JSON necessitam de validação por tipo de comando e reconstrução pelo motor. Não interpretar a existência de um evento como prova de saldo suficiente ou de execução numa corretora. Os comandos transacionais com revisão esperada serão ligados ao motor e à cloud nos blocos respetivos.

Os preços de plano são `numeric` com limites e escala verificados por constraint, sem typemod que arredonde silenciosamente casas adicionais. Valores financeiros JSON serão strings decimais; o motor do Bloco 3 fará as operações exatas, antes de as aceitar como comandos válidos.

## Preparação V1 → V2 sem adulterar o histórico

`legacy-migration.js` expõe `prepareProject`. É uma preparação pura e assíncrona: não lê ou escreve LocalStorage, não chama APIs e não altera o objeto recebido.

1. Valida o projeto, versão V1 e estrutura dos registos.
2. Conserva integralmente o payload, incluindo auditoria, dados anulados, parâmetros e metadados.
3. Calcula SHA-256 de uma serialização canónica, independente da ordem das chaves.
4. Produz IDs determinísticos por proprietário, projeto, conteúdo e operação. A chave única no servidor impede importar novamente a mesma origem.
5. Produz candidatos separados em `legacy_descida` e `legacy_subida`. Nunca os soma numa única posição real.
6. Conserva operações anuladas e identifica a origem como Demo legada, mesmo quando o projeto antigo tinha o rótulo real.
7. Não converte o parâmetro de margem hipotética num movimento realizado. Não cria um saldo inicial a partir do capital configurado; devolve `manualOpeningBalance=null` e solicita revisão posterior.
8. Não divide nominal por preço em vírgula flutuante para inventar uma quantidade executada: conserva os factos de origem e aguarda o motor decimal.

Uma alteração do payload produz uma nova versão de importação; não se deve ativar outra vez os candidatos como se fossem negociações novas. A conciliação de IDs e a confirmação de conversão pertencem à ativação futura do migrador. A sua ativação automática permanece falsa. O original V1 e a recuperação local só serão retirados depois dos critérios cloud da V20.

## Testes executados

A suite `node --test scripts/test-v20-data.cjs` aplica a migração real numa base isolada, insere dados sintéticos e exerce roles e constraints PostgreSQL. Inclui:

- Preservação exata do snapshot V1 e capital original.
- RLS nas cinco tabelas e consultas com duas identidades SQL distintas.
- Sem acesso anónimo, sem escrita direta autenticada e sem funções definer novas.
- Bloqueio de falsificação de proprietário e de referências entre projetos/cenários.
- Eventos imutáveis; duplicados de revisão e idempotência recusados.
- Falha de uma transação sem deixar a primeira escrita parcial.
- Eliminação de projeto recusada se houver histórico financeiro.
- Migração determinística, preservação das alternativas e de anulações/auditoria.
- Validação de dados legados incorretos antes de qualquer escrita.
- Preços inválidos/NaN/excesso de precisão rejeitados sem arredondamento oculto.
- Exportação da base isolada e restauro numa segunda instância, com verificação dos snapshots, eventos, RLS e triggers.

Este restauro é um ensaio local de esquema e dados sintéticos, não um backup/restauro do servidor Supabase nem um teste Auth com emails reais. A PGlite usa uma ligação exclusiva: estes testes não provam concorrência entre clientes em produção. Esta continua planeada para o Bloco 12.

## Critérios de aplicação em produção

Antes de aplicar esta migração ao projeto público: confirmar o esquema-base e o checkpoint, obter backup de servidor recuperável, ensaiar conversão dos projetos representativos, concluir comandos financeiros validados, rever permissões e testar conflitos. A migração usa uma transação e o histórico de migrações deve impedir reaplicação; a idempotência de movimentos é garantida por chaves próprias, não por executar DDL repetidamente.

Não foram ativados login público, sincronização financeira nova ou escrita em tabelas financeiras. Não há preview visual porque este bloco acrescenta estrutura e testes, sem alterar a interface.

Próximo: Bloco 3 — motor decimal de posições, PnL, margem e custos, já compatível com registos manuais e os eventos preparados. Faltam 13 blocos principais, do 3 ao 15; aplicação cloud e QA de produção mantêm os seus critérios próprios.
