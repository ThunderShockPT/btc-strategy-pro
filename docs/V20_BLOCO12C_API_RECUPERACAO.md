# V20 — Bloco 12C, parte 1: API autenticada e ensaio de recuperação

21/10/2026. Código implementado e testado em ambientes isolados. O Bloco 12C continua em curso; a cloud financeira e o registo público não foram ativados.

## Entrega concreta

| Ficheiro | Responsabilidade |
|---|---|
| `backend/supabase-auth.cjs` | Validação remota da identidade no Auth exclusivo BTC e verificação SQL da sessão ativa |
| `backend/http-api.cjs` | Protocolo HTTP de estado, preparação e confirmação, com proprietário derivado da identidade verificada |
| `backend/atomic-store.cjs` | Validação da sessão dentro das transações, incluindo imediatamente antes das escritas; leitura autenticada de estado |
| `cloud-client-v20.js` | Cliente de sincronização explícita: comparar, confirmar, repetir com a mesma chave e rever conflitos |
| `backend/backup-envelope.cjs` | Cifragem autenticada de um arquivo PostgreSQL de origem controlada, exclusivamente no servidor |

Os módulos não estão incluídos na interface pública nem instalados num runtime remoto. O handler usa o padrão Fetch Request/Response e necessita do adaptador de alojamento, ligação PostgreSQL, contexto financeiro atualizado e controlo de admissão do servidor. Estes elementos operacionais ainda não estão configurados. Não existe endpoint público utilizável nesta entrega; a pré-visualização visual mantém a versão 11B.

## Autenticação e sessão

O autenticador só contacta `https://oftzqqjbwonngubihrsd.supabase.co/auth/v1/user`. O cliente não escolhe projeto, domínio ou issuer. A consulta de metadados à base BTC confirmou os campos `auth.sessions.id/user_id/not_after` e `auth.users.id/email_confirmed_at/deleted_at/banned_until`; não foram lidos emails ou dados de contas. O projeto está ACTIVE_HEALTHY e usa PostgreSQL 17.11.0.003.

A descodificação local do JWT apenas faz verificações preliminares de formato, issuer, audience, role, expiração e session_id. Não é usada como prova criptográfica. A autenticação depende da resposta válida do servidor Auth para o bearer token recebido. A resposta tem de identificar o mesmo utilizador, não anónimo e com email confirmado. Não se usa `user_metadata` para autorizar acesso.

O pedido autenticado conserva a identidade apenas durante esse pedido, evitando repetir a consulta remota dentro do mesmo handler. Não existe cache de identidade entre pedidos. Cada transação consulta a sessão e a conta no PostgreSQL: sessão removida/expirada, conta apagada/bloqueada ou confirmação removida impedem acesso. O bloqueio `FOR SHARE` mantém a validação coerente com uma eliminação concorrente da sessão; uma revogação ocorrida durante o cálculo é detetada antes da gravação.

O processo de backend necessita de permissões SQL específicas para ler e bloquear essas linhas Auth. Essas permissões de produção não foram concedidas nesta fase. Sem elas, a API falha fechada. A configuração final deverá usar uma ligação de servidor com permissões revistas; nenhuma chave privilegiada ou password de base de dados é enviada ao browser.

## Protocolo HTTP e cliente

- `GET /api/v20/health`: indica disponibilidade configurada, sem dados financeiros.
- `POST /api/v20/state`: lê o estado integral do projeto pertencente à conta validada.
- `POST /api/v20/prepare`: reconstrói o estado e devolve a comparação calculada no servidor.
- `POST /api/v20/commit`: exige confirmação da comparação, versão/hash e chave de idempotência; usa a transação do Bloco 12B.

O JSON só aceita os campos esperados; ownerId fornecido pelo cliente é recusado. A origem CORS é uma lista HTTPS explícita, sem wildcard ou cookies. O endereço de origem para admissão deve vir do adaptador de alojamento e não de headers encaminhados livremente pelo cliente. Limites de bytes, timeout da consulta Auth, timeout do cliente, respostas sem cache e mensagens de erro sem detalhes internos estão implementados. O handler exige a função de admissão antes de aceder ao Auth; um limitador distribuído de produção ainda tem de ser ligado, e os testes que injetam allow/deny não demonstram proteção real contra abuso em produção.

O cliente mantém tokens e estado apenas em memória, por instância. Não cria gravações em background nem coloca bearer/refresh tokens em URLs ou LocalStorage. Só confirma uma proposta explícita do servidor. Uma resposta perdida após um commit conserva o pedido e a chave originais para repetição idempotente. Um conflito exige nova comparação; não recalcula e reaplica uma estratégia silenciosamente.

Uma leitura offline conserva apenas uma cópia marcada como offline; não inventa sincronização. Depois de um commit confirmado exige nova leitura. Trocar de conta ou receber 401 limpa o estado privado. `clearSession()` deve ser ligado ao evento de logout/mudança de conta no frontend: invalida também as respostas em trânsito, impedindo que uma resposta antiga volte a preencher a carteira. Esse hook de interface ainda não está ligado porque o modo cloud continua desativado. Se a aplicação terminar durante uma operação de resultado incerto, será necessária conciliação com o servidor após voltar a entrar; a fila desta versão é deliberadamente apenas em memória e não promete recuperação persistente desse pedido.

## Recuperação de base testada

O módulo de backup usa AES-256-GCM do Node, com nonce aleatório de 12 bytes, tag de 16 bytes e cabeçalho autenticado. Vincula o arquivo ao projeto BTC, versão do formato, identificação da chave, instante e origem QA/produção. A chave é fornecida pelo servidor e nunca incluída no envelope. O limite técnico atual é 64 MiB de arquivo; uma base maior precisa de processamento em stream/armazenamento apropriado e deve falhar explicitamente, sem truncagem.

Na CI, o utilitário oficial `pg_dump` do PostgreSQL 17.11 criou um arquivo custom da base QA. Esse arquivo foi cifrado, autenticado/decifrado e enviado ao `pg_restore` numa segunda base efémera. Foram comparados envelopes, ordem do histórico, planos e resultados reconstruídos pelo motor; foram também testados RLS e triggers append-only depois do restauro. As bases continham exclusivamente fixtures fictícias. O dump e a chave ficaram apenas na memória do ensaio e não foram publicados como artifacts.

Este teste é um restauro real do modelo PostgreSQL numa base independente, não um restauro do projeto Supabase de produção. Não inclui backup de configurações Auth/SMTP, ficheiros Storage, chaves de assinatura ou roles globais. Não existe ainda agendamento de produção, destino externo cifrado, gestão/rotação de chaves, retenção ou monitorização de falhas. A cifra do envelope não comprova a proveniência do dump; a criação e o restauro devem continuar restritos ao processo de servidor e a origens controladas. Não se aceitam dumps enviados livremente pelo utilizador para execução.

## Testes executados e evidência

**434/434 testes V20 locais**, sem falhas ou ignorados, incluindo:

- 16 testes novos de Auth/API/cliente: issuer e expiração, validação remota, metadados não confiáveis, sessão anónima/não confirmada, gate fechado, duas identidades, revogação durante cálculo, limites/admissão/origens, erros privados, confirmação explícita, retry após resposta perdida, mudança de conta, conflito, offline, preflight e resposta tardia após logout.
- 4 testes novos de backup: preservação dos bytes, nonce distinto, chave/versão/origem erradas, cabeçalho/cifra adulterados, truncagem e entradas inválidas.
- Todos os testes dos blocos anteriores, incluindo transações, correções e simulações.

**386 verificações V19 aprovadas:** Auth 19, cloud isolada 26, release 38, responsividade 37 e planeador 266. Sintaxe dos módulos novos verificada.

**8/8 testes nativos PostgreSQL 17.11 na CI**, execução `39612991733`, job `119266506469`, código `fa22fc28e1159ddb832f3a2eb5ab64f2c345f068`: cinco testes anteriores de concorrência/atomicidade/RLS, dois novos de sessão/revogação/bloqueio e um novo de dump cifrado/restauro. Os logs foram inspecionados; não se inferiu aprovação a partir da suite embutida.

Uma execução intermédia da CI falhou no ensaio de restauro porque o commit ainda não incluía a variável do container no workflow. A execução do conjunto completo, depois do commit do workflow, passou os oito testes. Não foi omitido nem transformado em skip o teste que falhou.

Os testes Auth usam respostas GoTrue simuladas, com tokens de fixture, e tabelas Auth em bases isoladas. Não comprovam login real, envio/receção de email ou assinatura real de tokens do Supabase público. Os testes SQL com duas identidades também não substituem dois utilizadores reais autenticados em dispositivos diferentes.

## Compatibilidade e próximos critérios

A branch parte de `d7c2369fb6948be4dad9e1229aec07ac9a971f52` (Bloco 12B). Não houve DDL, alteração de Auth, envio de emails ou gravações financeiras no Supabase real. As migrações aditivas continuam preparadas, sem aplicação em produção. A main e o GitHub Pages mantêm-se intactos. Os backups locais Beta permanecem disponíveis.

O próximo sub-bloco do 12C deve ligar o runtime ao Supabase exclusivo BTC, o contexto financeiro público/manual, onboarding e alterações de plano, controlo distribuído de abuso e frontend autenticado; preparar o destino/gestão de chaves/agendamento dos backups e ensaiar recuperação do ambiente real; validar SMTP exclusivo, confirmação, recuperação e duas contas reais. Portabilidade e eliminação de conta precisam do seu processo próprio. Só depois podem ser ativados registo público e sincronização financeira real.

Faltam **4 blocos principais (12–15)**; o 12 está em curso. Os blocos 13–15 não foram dados por concluídos por estes testes.

Fontes oficiais consultadas: documentação Supabase de sessões e getUser, Node Crypto, PostgreSQL 17 pg_dump/pg_restore. Não foram usados recursos, remetentes ou contas do Racing Horse Manager.
