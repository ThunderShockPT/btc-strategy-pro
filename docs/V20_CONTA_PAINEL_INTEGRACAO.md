# V20 — painel da conta e cálculos retomáveis

23/10/2026. Trabalho preparado no PR #34. Não conclui o Bloco 12 nem ativa a conta online publicada.

## Entrega

`account-workflow-v20.js` liga o cliente autenticado à leitura da carteira, cálculo retomável, proposta do servidor e confirmação. Os avanços são sequenciais, apenas após respostas válidas, sem repetição automática de pedidos incertos. Uma sessão de cálculo pode ser pausada; consultar/continuar reconcilia primeiro o estado. Um início incerto repete explicitamente a chave original. Uma confirmação incerta recupera o recibo idempotente original.

`account-view-v20.js` apresenta a carteira, versão do plano, perfil, referência, piso, progresso e validade original. A revisão mostra os parâmetros e reservas antes/depois e as compras na ordem devolvida pelo motor, com Entrada/Primeiro reforço/Segundo reforço. Não recalcula saldos, reservas ou preços. A aceitação é desmarcada a cada nova apresentação; propostas inaplicáveis ou expiradas não autorizam confirmação. O servidor continua a verificar todos os critérios financeiros e temporais.

A página Conta da prévia inclui o painel, com estado indisponível por defeito. A composição autorizada pode fornecer um cliente já autenticado por `BTCV20AccountConnection.attach(client)` e deve propagar logout/troca de conta através de `clearSession()`/`detach()`. Este ponto de integração não fornece login, não contorna a política de abertura e não copia a carteira Demo para o servidor. O cliente HTTP não é incluído no bundle Demo; o alojamento terá de o fornecer na composição autenticada.

Ao sair da página ou ocultá-la, os avanços param após o pedido em curso; voltar não retoma automaticamente. Troca de conta, logout e revogação SQL eliminam o estado privado apresentado. Uma resposta tardia não o restaura. Uma falha de ligação identifica a última leitura como potencialmente desatualizada.

## Verificação

`node --test scripts/test-account-workflow.cjs scripts/test-cloud-calculations.cjs scripts/test-onboarding-preview.cjs scripts/test-app-workflows.cjs`

A suite do painel usa o cliente real, API HTTP, fila/checkpoints e migrações em PGlite, com identidade, fontes e histórico sintéticos de QA. Cobre confirmação sem alterar os movimentos, respostas perdidas no início/avanço/commit, recibo único, pausa/cancelamento, expiração, troca de conta, logout durante pedido, revogação SQL e conflito de segundo dispositivo. Cobre ainda escaping, ordem dos reforços, aceitação explícita, pausa ao ocultar e desmontagem dos eventos. Não é um teste visual num browser nem um ensaio de Auth real ou Edge completo.

A CI anterior, do commit 79d2c26b2942899ccc4324fa3bc44ec50409962d, terminou com sucesso: execução 39957594653. A nova entrega acrescenta a suite do painel ao workflow obrigatório.

## Movimentos da conta

O painel inclui registo de capital adicionado/retirado e de margem adicionada/retirada. Exige montante, data de ocorrência, declaração de que o movimento já aconteceu e uma segunda aceitação da comparação do servidor. Mostra capital, caixa, caixa livre, margem e liquidação antes/depois, além de avisos específicos do motor. Não executa transferências nem aplica novos ciclos automaticamente.

Editar qualquer campo invalida a revisão. Um commit incerto bloqueia outro movimento até recuperar o recibo. Uma resposta de comparação perdida pode repetir o mesmo pedido, conservando IDs, chave e datas originais. Dados de mercado anteriores ao registo originam 422; datas nunca são alteradas para caber numa cotação. Histórico alterado noutro dispositivo origina conflito 409 e exige atualização. Após registo, limpa o formulário e invalida a apresentação do cálculo anterior; o servidor exige nova revisão do plano.

A suite `scripts/test-account-movements.cjs` cobre os quatro tipos, caixa/margem/BTC, validações, edição, respostas perdidas, recibo único, logout, conflitos e datas posteriores ao contexto. `backend/http-api.cjs` passa a expor três erros de domínio já existentes como 422/409, mantendo erros internos ocultos; o manifesto de checkpoints foi regenerado, invalidando checkpoints de builds anteriores. Não houve alteração de regras financeiras, prazos, schema ou política de abertura.

## Execuções e correções na conta

O painel permite declarar compras e vendas por ciclo, completas ou parciais, com quantidade realmente executada, preço, comissão efetiva e data. O remanescente de uma ordem parcial não é convertido em exposição. Nas vendas, o destino do PnL é explícito: caixa ou margem isolada. A revisão apresenta os saldos e BTC antes/depois, PnL realizado, comissões, nominal, ciclo e data, sempre provenientes do motor do servidor. Ordens pendentes não são registos de execução.

O histórico auditável tem páginas de 50 registos originais. Mostra valores originais/atuais, versões e motivos das alterações. Permite corrigir quantidades/preços/datas ou montantes de fees/funding, anular, restaurar e reverter a última correção. As correções acrescentam eventos e preservam os originais. A inclusão de comissões associadas numa anulação/restauração é explícita e cria um lote atómico. Limpeza ou reposição de vínculos ao plano exige aceitação separada, além da confirmação do registo. O motor bloqueia alterações incompatíveis com a restante história.

Uma comparação perdida conserva IDs, chave e datas. Editar dados invalida a proposta; conta alterada ou logout limpam formulário e histórico. Um registo confirmado invalida a apresentação do cálculo anterior e pede revisão do plano. A suite `scripts/test-account-executions.cjs` verifica compra+fee atómicas, venda parcial/PnL, oversale bloqueada, edição, validações, correções/versões/vínculos, comissões associadas, resposta perdida, logout, conflito e contexto temporal. São testes HTTP/PGlite isolados; ainda não são QA visual em browser, SMTP ou fluxo alojado completo.

Limites da primeira ligação visual: vendas distribuídas simultaneamente por vários ciclos/allocations, edição do ciclo/destino do PnL de uma execução existente e seleção de lotes arbitrários de correção ainda não têm formulário. O backend possui contratos mais abrangentes; não se enviam campos financeiros em JSON livre para contornar o formulário.

## Diretório e criação de carteiras

A rota autenticada `wallets` consulta apenas projetos V20 inicializados do próprio utilizador e do cenário selecionado. Devolve metadados mínimos, sem saldos, eventos ou dados de outras contas, em páginas de 50 por cursor UUID. Reutiliza o limite de leitura existente e valida a sessão SQL em cada transação. Não lê carteiras V19 como se fossem V20.

O cliente permite selecionar uma carteira com descarte das revisões e estado anterior; a seleção exige nova leitura autenticada. Pedidos financeiros incertos bloqueiam a troca de carteira. A criação reutiliza `wallet-create`: só abre uma carteira sem posição, com capital declarado, perfil e reservas explícitos, seis temas do tutorial, compreensão de risco e versões de documentos Beta. Uma posição existente precisa de histórico próprio; não é importada nem substituída por um saldo. A confirmação guarda um recibo idempotente e a mesma carteira é recuperada se a resposta se perder.

A proposta apresenta o prazo efetivo guardado no SQL. Este metadado de apresentação não faz parte do hash financeiro já existente e não autoriza prolongar fontes: a confirmação continua a usar o payload privado e os prazos SQL/regras/contexto. Os documentos mostrados são referências Demo/Beta, com ligações de leitura; ainda não são a revisão de privacidade e termos para contas online. A política de abertura continua fechada.

A suite `scripts/test-account-wallets.cjs` cobre isolamento, paginação de 51 carteiras, cursor inválido, seleção, criação sem escrita prévia, capital sem BTC/margem inventados, tutorial, resposta perdida, recibo único, sessão revogada e prazo SQL expirado. A confirmação e os metadados do prazo mantêm os testes do contrato de carteira existentes.

## Backup autenticado da carteira

A rota `export` devolve uma fonte financeira completa e consistente, validada pelo contrato de persistência, com digest SHA-256, revisão, hash da origem e data do relógio SQL. Reutiliza autenticação remota, sessão SQL, lock de leitura e limite partilhado de leituras. Não consulta nem devolve tabelas Auth, passwords, tokens de sessão, configurações ou chaves de assinatura. O ficheiro inclui os factos, planos, recibos e notas que fazem parte da fonte desta carteira; pode conter informação privada e não é cifrado como o backup administrativo pg_dump.

O botão faz download apenas após ação explícita e depois de resolver qualquer confirmação financeira incerta. Logout invalida respostas tardias antes do download. O contrato de restauro revalida digest, âmbito e invariantes financeiros, sem gravar nem ativar dados automaticamente. O digest deteta corrupção; não é autorização nem assinatura de servidor. Não existe endpoint público de restauro por este ficheiro. O backup administrativo cifrado e respetivo pg_dump/pg_restore continuam a ter um ensaio separado em PostgreSQL nativo de QA.

Isto é portabilidade financeira por carteira, não uma exportação integral de todos os dados pessoais da conta. Preferências, pedidos de eliminação, retenção, termos de contas e restauro de produção continuam pendentes.

## Inspeção do alojamento em 23/10/2026

O projeto BTC está ativo e saudável, sem branches de desenvolvimento. A inspeção apenas de leitura encontrou `projects` e `project_snapshots` em public; o schema/tabelas V20 ainda não estão aplicados no alojamento. O único domínio de envio encontrado está associado ao Racing Horse Manager. Não foi reutilizado nem alterado. A passagem V19 → V20 e o SMTP próprio BTC são bloqueios concretos do fecho, além dos restantes critérios. Nenhum schema, conta ou recurso de produção foi alterado nesta inspeção.

## Ainda necessário

- Composição alojada completa e admissão temporal comprovadas; ingresso, concorrência e pico de memória.
- Login/recuperação e SMTP exclusivos BTC, com testes de email reais.
- Compor o painel com login no alojamento e validar cálculos, movimentos, execuções e correções nesse ambiente; restantes formulários indicados acima e importação/reconciliação de carteiras com posição aberta.
- Privacidade, portabilidade, eliminação, restauro e migração/reconciliação V19.
- Teste visual e ponta a ponta no S25 após disponibilizar o acesso de teste.

O entrypoint financeiro, registo público e política de abertura permanecem fechados. Nenhum recurso de produção ou do Racing Horse Manager foi alterado.


## Sessão e verificação no navegador — 23/10/2026

`account-session-v20.js` compõe o cliente HTTP com uma sessão fornecida pelo SDK do próprio projeto BTC. Verifica a identidade remota, email confirmado e sessão não anónima antes de montar o painel. Não inclui chaves ou SDK e não guarda credenciais. `scripts/build-account-host.cjs` produz o bundle separado que o alojamento pode carregar explicitamente; a Demo não o carrega e a política publicada continua fechada.

A página Conta aceita esta composição por `configureSession({supabase,supabaseURL})`. O formulário de acesso permite entrada e logout global, e o evento de recuperação apresenta exclusivamente a alteração de password, seguida de logout. Isto trata um link já recebido: não implementa ainda registo, envio de recuperação, configuração SMTP nem bootstrap autenticado no alojamento.

Renovação para o mesmo utilizador conserva o cliente, revisão e aceitação do painel financeiro. Troca de utilizador, logout e recuperação limpam o estado privado e invalidam respostas tardias. Uma falha tardia de uma verificação já substituída não pode desligar uma sessão mais recente. Os métodos Auth são executados fora do callback do SDK, para evitar bloqueios de sessão.

Passaram 15 testes da composição de sessão. O novo teste Chromium percorre a página completa, o cliente real, a API HTTP e PGlite: entrada, diretório, seleção, comparação de depósito, confirmação explícita com um único evento, renovação preservando a revisão, logout com leitura pendente, troca de utilizador e alteração de password em recuperação. Usa identidades/Auth e preços sintéticos de QA; não é um ensaio de email real ou do alojamento. Verifica ausência de scroll horizontal em 280, 360, 393, 430 e 1280 px; a revisão em 393 px foi também inspecionada visualmente. Os campos de movimento e data usam a largura da linha para evitar truncar o seletor e a data no telemóvel.

A suite de sessão e um job Chromium próprio passam a fazer parte da CI. A integração alojada, SMTP BTC, migração/restauro de produção, privacidade e QA no S25 continuam pendentes. O Bloco 12 permanece aberto.
