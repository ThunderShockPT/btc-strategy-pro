# V20 — Bloco 12C, parte 2: execução Edge e admissão partilhada

21/10/2026. Escrita financeira e registo público mantêm-se fechados.

## Implementação

O backend existente foi empacotado para as Edge Functions do Supabase BTC. O pacote inclui os mesmos módulos financeiros e o driver pg resolvido pelo lockfile; não cria um segundo motor. O build usa esbuild 0.28.2 fixado e produz um módulo ESM de 442 341 bytes, SHA-256 `dc1066892f1ab9d995b9dc9c5960ec2ab691cf429d136e60439b8f9564006dfd`.

`backend/edge-runtime.cjs` adapta o prefixo da função ao protocolo HTTP anterior. Aceita os dois formatos de caminho do gateway, sem admitir caminhos de outra função. As origens HTTPS permitidas são as da aplicação GitHub Pages e da pré-visualização privada existente. A resposta de saúde não devolve segredos, preços ou dados financeiros.

`policies/cloud-release-20261021.json` mantém nove critérios por cumprir, aprovação financeira falsa e workflows em falta. A autorização não depende de uma flag do browser. Enquanto fechado, o runtime não lê credenciais, não abre ligações, não chama Auth e recusa estado/preparação/confirmação com 503. Alterar variáveis de ambiente não basta para abrir esta versão: falta ligar o provider financeiro e rever a política de release no código.

O driver precisa ainda de validação em Deno com ligações reais e cargas financeiras representativas. Os testes SQL nativos usam Node/pg; o teste de arranque Edge fechado não comprova o caminho financeiro. As chamadas opcionais de pg-native/cloudflare não são utilizadas nesta configuração.

## Ligações e admissão

`backend/pg-database.cjs` valida a ligação direta ao host do projeto BTC ou um pooler com o utilizador desse projeto. Recusa outros hosts/projetos, parâmetros arbitrários e TLS desativado. O pool limita-se a uma ligação por worker e mantém verificação do certificado. Depois de validado, sslmode é retirado da URL para não substituir a configuração TLS explícita. Todas as instruções de uma transação usam o mesmo cliente; há limites locais de statement/lock, commit antes de release e rollback. Se o rollback falhar, a ligação é descartada.

A migração `20261021140705_v20_request_admission.sql`, criada com CLI, acrescenta apenas contadores operacionais privados: RLS, sem acesso anon/authenticated e índice de expiração. Não contém factos financeiros ou IPs em claro. Continua preparada, sem aplicação ao Supabase real.

`backend/request-admission.cjs` usa HMAC-SHA256 e chave de 32 bytes exclusiva do servidor. Os workers partilham uma janela e contador PostgreSQL, com relógio da base. O incremento atómico é limitado ao teto + 1; a limpeza remove até 100 janelas expiradas por chamada, com skip locked.

Os limites técnicos iniciais são 60 leituras/minuto e 12 preparações ou confirmações/minuto por endereço. Não alteram regras de risco e precisam de ensaio com tráfego real e endereços partilhados. Janelas fixas permitem rajada adicional na passagem do minuto; não constituem proteção completa contra ataques distribuídos. O runtime não confia em X-Forwarded-For livremente fornecido pelo cliente. Sem endereço de ingresso fiável, o handler recusa o acesso; essa integração necessita de validação antes da abertura.

O cliente passa a suportar o prefixo exato da função BTC. Uma resposta 429 durante uma repetição de resultado incerto mantém o pedido e a chave originais, em vez de os perder. Há regressão explícita para este caso.

## Verificação

- **447/447 testes V20 locais**, sem falhas/ignorados: inclui 10 testes de runtime/adaptador/admissão, 2 regressões do cliente e 1 teste do pacote ESM real com serve simulado.
- **386 verificações V19** aprovadas: Auth 19, cloud isolada 26, release 38, responsividade 37 e planeador 266.
- **10/10 testes PostgreSQL 17.11 na CI**, incluindo 8 anteriores de concorrência/sessões/restauro, contador partilhado com 8 pedidos simultâneos (3 aceites) e teste do novo adaptador transacional numa ligação real.

A primeira execução do teste do pool usou uma fixture sem método connect; a fixture foi corrigida e a suite completa repetida. Não foram flexibilizadas regras financeiras. O ensaio local do pacote usa Node com Deno.serve simulado: não é apresentado como execução Deno. O arranque remoto fechado deve constar do checkpoint de implantação com as respostas realmente observadas.

Os testes Auth continuam a utilizar identidades simuladas em bases isoladas, sem equivaler a dois logins reais de produção.

## Limites e continuação

Este sub-bloco não ativa contas, sincronização financeira, migração de projetos ou cópias automáticas de servidor. Mantém as migrações preparadas, main/GitHub Pages, dados e backups Beta. O provider financeiro, onboarding e mudanças de plano precisam ainda de ligação. O ingresso, permissões e carga do runtime necessitam de validação. SMTP próprio, confirmação/reset, duas contas reais, retenção/rotação de chaves, restauro Supabase de produção e portabilidade/eliminação continuam pendentes.

Checkpoint anterior: `34c11a89a6450808db8890f011060a404e7da14e`. Branch: `feat/v20-edge-runtime`. Faltam **4 blocos principais (12–15)**; o 12 está em curso.

Fontes oficiais: documentação Supabase de Edge Functions, integração PostgreSQL, secrets e limites. O limite de CPU de 2 segundos por pedido exige medir workloads financeiros representativos antes de aprovar escrita; os testes unitários não substituem essa medição.


## Instalação e verificação remotas executadas

Foi instalada a função `btcsp-v20-api`, versão 1, no projeto exclusivo `oftzqqjbwonngubihrsd`. O bundle testado acima foi enviado integralmente. A implantação devolveu ACTIVE. Por HTTPS foram observados GET health = 200 com cloudAvailable=false, POST commit = 503 CLOUD_NOT_ENABLED e origem estrangeira = 403 ORIGIN_NOT_ALLOWED. O header X-BTCSP-Build correspondeu a v20-edge-runtime-12c2.1. IDs e hashes constam de V20_BLOCO12C2_DEPLOYMENT.json.

O verificador JWT do gateway está desligado porque o corpo da API implementa a sua própria validação Auth e de sessão, permitindo a consulta pública de saúde. Isto não abre os dados financeiros: as rotas de dados continuam bloqueadas antes de aceder a Auth ou SQL, e a futura abertura exige a política e os providers revistos. Não se apresenta esta configuração como teste de autenticação financeira remota, que ainda não foi executado.

A CI 39615236268 aprovou ambos os jobs no código 7f00e61578ae974ab3b07e82d3759916c5899c0f; o job PostgreSQL 119274379863 aprovou os 10 testes. O teste local do pacote foi complementado pelo arranque efetivo no runtime hospedado, sem inferir daí aprovação de ligações SQL/driver/carga em Deno.

Não foram aplicadas migrações nem ativado o frontend cloud. Esta é a primeira instalação do backend V20 fechado, não uma publicação da aplicação ou abertura de contas. Não houve emails, ordens Kraken ou alteração de dados reais.
