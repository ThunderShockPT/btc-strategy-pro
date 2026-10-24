# V20 — páginas da Demo ligadas à conta privada

Continuidade do PR #34 a partir de eba3e96eca104ffd290dc1bc4fb60867e269c6c1. O relato do utilizador expôs uma integração incompleta: o painel técnico de operações ocupava as páginas privadas. Esta entrega reutiliza os componentes de Início, Estratégias, Mercado, Risco e Conta, alimentados pela API autenticada.

O diário, a margem efetivamente registada, as reservas e o plano guardado continuam separados. A avaliação pública produz uma projeção de leitura; não altera factos, referência ou piso. A interface identifica a data da avaliação. O mark PF_XBTUSD nunca é substituído por last ou spot. A Conta concentra as carteiras, exportação e histórico. Os formulários abrem numa janela própria, com comparação, aceitação desmarcada, prazo e confirmação explícita.

A calculadora opcional de nominal usa o motor partilhado e arredonda ao lote. A quantidade e a comissão reais continuam a ser declarações manuais. As simulações locais da conta têm uma lista fechada de operações de leitura; as confirmações da Demo não aceitam dados privados.

Uma janela de cálculo insuficiente com motivo WAIT_FOR_CLOSED_HISTORY permite aguardar uma nova vela fechada, com pausa/cancelamento e até quatro tentativas. Cada tentativa recolhe fontes novas e é revalidada pelo servidor. Não se estende a validade, não se alteram datas e não se confirma pela pessoa. Outros motivos mantêm os respetivos bloqueios.

Os assets do host usam o identificador do commit no URL para evitar a reutilização do bundle antigo pelo service worker. A chave de sessão existente é preservada. Documentos e dados de conta não entram na cache offline.

## Verificação desta alteração

- 67 testes direcionados passaram, abrangendo cliente, fluxo, movimentos, execuções/correções, carteiras, planos, projeções e espera por fontes válidas.
- Verificação interativa no browser dos cinco ecrãs e da conversão 200 USD / 100000 USD por BTC = 0,002 BTC. A imagem `qa/V20_PRIVATE_ACCOUNT_CARDS_QA_20261024.jpg` usa exclusivamente dados inventados e Auth simulada; não demonstra uma sessão alojada real nem um teste físico S25.
- Os testes de browser passaram a 393 e 1280 px no CI 40117017707, incluindo sessão, confirmação, isolamento, saída, Demo separada e conversão de nominal. As sete tarefas desse CI passaram. A ligação da correção em lote à janela de revisão recebeu ainda uma verificação específica e novo CI no commit final.
- Nenhum comando financeiro desta entrega é executado com a identidade do proprietário. A sua carteira é apenas inspecionada em leitura para detetar o problema relatado. Identificadores privados não são publicados neste relatório.

## Ensaio alojado e preservação dos dados

O [relatório JSON](qa/V20_ACCOUNT_PAGES_HOSTED_20261024.json) regista o ensaio com duas identidades QA novas, Auth e PostgreSQL reais e fontes públicas reais. A carteira fictícia começa com 1000 USD. Uma compra com margem zero é bloqueada com INITIAL_MARGIN_NOT_ALLOCATED, sem acrescentar eventos. Só depois de registar uma margem fictícia inicial de 100 USD é confirmada uma compra nominal de 200 USD (0,002 BTC ao preço declarado fictício de 100000 USD), com comissão de 0,1 USD. Após uma pausa QA de 5 segundos na revisão, a gravação passa. O saldo é 899,9 USD e a margem permanece 100 USD; o mark público usado para avaliação está registado na evidência e não é confundido com o preço declarado da execução.

A anulação e o restauro da compra e da comissão produzem oito eventos no total. Os quatro factos anteriores ficam idênticos e a exportação coincide com o diário. A segunda identidade recebe 404 ao tentar ler a carteira da primeira. O novo cálculo termina numa proposta não aceite, sem alterar os factos ou o piso. Nesse ensaio ficaram 15,857 segundos de validade quando a proposta chegou: é uma medição deste percurso, não aprovação do tempo de leitura humana nem nova aprovação do caso máximo 5000/12, cuja evidência anterior continua separada.

O ensaio não usa a identidade financeira do proprietário. A comparação de leitura antes/depois confirma o mesmo head, revisão e eventos da sua carteira. O relato de uma compra já introduzida não autoriza fabricar ou confirmar um registo em falta. Identificadores e dados pessoais da carteira do proprietário ficam fora do relatório versionado.

No fim: 22 identidades QA bloqueadas e zero sessões QA em SQL; função private-test v10 apenas com o proprietário na allowlist; private-provision v11 fechada com 503 PRIVATE_PROVISION_CLOSED; funções antigas account-qa e runtime-qa continuam 503 QA_COMPLETE_CLOSED. A API financeira de produção continua cloudAvailable:false. As credenciais temporárias não são incluídas no código, Site ou relatórios. Não se instalaram migrações nesta entrega.

## Limites e sequência

A prévia permanece no Site privado existente e o acesso público de produção continua fechado. O Bloco 12 permanece aberto: importação de posição existente, privacidade/eliminação/portabilidade integral, restauro operacional, capacidade e teste físico S25 mantêm critérios próprios. SMTP depende de domínio BTC e continua separado. Os Blocos 13–15 não ficam aprovados por esta integração.
