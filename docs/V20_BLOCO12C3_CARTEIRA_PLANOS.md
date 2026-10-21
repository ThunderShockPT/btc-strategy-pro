# V20 — Bloco 12C3: criação atómica da carteira e versões dos planos

21/10/2026. Branch `feat/v20-wallet-plan-persistence`, a partir de `be26c82a6733628c0d4d6804ddcc535e7c4c6965`. Escrita financeira pública e registo público continuam fechados.

## Comportamento implementado

A criação inicial da carteira passa pelo protocolo preparar → rever → confirmar. O servidor guarda uma proposta temporária com o contexto financeiro que a gerou. A confirmação exige os seis tópicos do tutorial, versões dos documentos e aceitação explícita. A proposta expira em 60 segundos e não recebe um preço novo silenciosamente numa repetição. O relógio de confirmação pertence ao servidor.

`backend/wallet-store.cjs` cria projeto, capital inicial declarado, plano, registo de tutorial, cálculo e recibo de comando numa única transação. A inicialização reutiliza a validação financeira existente em `atomic-store.cjs`, extraída para `initializeInTransaction`. Não cria BTC, margem isolada ou operações executadas apenas por existir um plano. Uma falha tardia desfaz todos os registos. A mesma confirmação repetida devolve o recibo original, mesmo depois de a proposta expirar, sem duplicar capital.

O proprietário vem da sessão verificada. A sessão volta a ser validada dentro da transação. Um bloqueio transacional por proprietário serializa confirmações concorrentes; existem limites técnicos de 20 propostas pendentes e 50 projetos por proprietário. Estes limites operacionais não são regras financeiras. RLS isola os recibos; propostas temporárias e recibos de idempotência não são legíveis pelo cliente.

Demo e conta manual mantêm origens distintas. Um recibo Demo não conclui o tutorial de uma conta manual. Os documentos continuam com estado beta-review-pending: guardar uma aceitação não equivale a aprovar a documentação para lançamento.

O mesmo protocolo permite aplicar novas versões de reservas, ciclos e perfil, usando os motores existentes. Uma alteração de plano pode avançar a geração e o hash do estado sem alterar a revisão dos movimentos financeiros. Assim, outro dispositivo não consegue aplicar um plano antigo só porque nenhuma compra ocorreu entretanto. Os factos originais permanecem intactos; não há compra, depósito ou transferência de margem implícita.

O cliente não fornece preços ou políticas de risco para estas alterações: os providers do servidor fornecem o contexto aprovado. O modo condicional de margem não pode ser aplicado. A entrada legada de ciclos exige explicitamente requireFailedMarginSurvival=true, preservando a decisão de risco já aprovada. Planos sem fundos são recusados.

## Dados e compatibilidade

A migração preparada `20261021142525_v20_wallet_reviews_receipts.sql` acrescenta propostas privadas temporárias e recibos de tutorial imutáveis, com índices, constraints e RLS. Não foi aplicada à base Supabase real. Não substitui tabelas ou apaga projetos existentes. O esquema V1 é reproduzido nas fixtures, incluindo a coluna mode dos projetos.

O handler HTTP e `cloud-client-v20.js` transportam a confirmação do tutorial. O motor financeiro continua único. O restauro nativo foi ampliado para comparar também os recibos de tutorial e verificar as seis tabelas públicas V20 com RLS. Não foram alteradas as ordens ou margens na Kraken; não existe integração de contas Kraken.

## Verificação executada

- 16/16 testes específicos de carteira e planos: preparação sem factos, confirmação, repetição, expiração, adulteração, tutorial incompleto, rollback tardio, isolamento, projeto existente, concorrência de planos sem nova revisão financeira, perfil e contexto de servidor, HTTP/cliente, recibos manuais e bloqueio de política condicional.
- 386 verificações V19: Auth 19, cloud 26, release 38, responsividade 37, planeador 266.
- 13/13 testes PostgreSQL nativos: duas confirmações simultâneas da carteira, rollback completo, corrida de planos e dump/restauro cifrado numa segunda base de QA. Não equivalem a restauro da produção.
- Bateria completa e evidência CI no checkpoint abaixo.

O pacote Edge local foi reconstruído com 475 303 bytes. Não foi implantado: a função hospedada continua na versão fechada do Bloco 12C2. O teste local de arranque usa Node com serve simulado, sem representar validação financeira em Deno.

## Limites e continuação

Este sub-bloco implementa persistência e protocolo, sem disponibilizar a nova configuração cloud na interface pública. A pré-visualização visual continua na versão 11B. Não houve alterações a main, GitHub Pages, contas, saldos ou backups Beta.

Continuam necessários o provider financeiro ligado aos dados públicos/manuais, integração da interface com sessões reais, revisão de carteiras já existentes, validação de carga e ingresso no runtime Edge, SMTP exclusivo, confirmação/recuperação, duas contas reais, documentação de privacidade, portabilidade/eliminação e backups/restauro do servidor de produção. O tutorial e as regras de negociação não substituem esses testes. Não se enviaram emails nem se abriram contas públicas.

Sugestão: no próximo sub-bloco, ligar o contexto financeiro do servidor e medir pedidos completos no runtime, antes de qualquer migração ou abertura financeira. Faltam 4 blocos principais (12–15); o 12 continua em curso.

## Checkpoint final executado

- Código testado e comparado ficheiro a ficheiro com o remoto: `5c261efc1677927e76e547f48f4749c5acaaca22`.
- Bateria local completa: **463/463 testes aprovados**, zero falhas, zero ignorados, 69,23 segundos. Inclui os 16 testes novos de carteira/planos; não são somados outra vez.
- Regressões V19 repetidas: **386/386 verificações aprovadas**.
- CI final `39633465390`, job PostgreSQL `119337526787`: **13/13 aprovados**, incluindo restauro nativo. O resultado foi lido nos logs do job.
- PR de revisão: https://github.com/ThunderShockPT/btc-strategy-pro/pull/19, encadeada sobre #18, sem merge ou publicação.

A aceitação deste checkpoint é de implementação e testes isolados. Os testes de Auth usam identidades de QA; não demonstram SMTP ou duas contas reais. O Bloco 12 não está concluído e a abertura financeira permanece bloqueada.
