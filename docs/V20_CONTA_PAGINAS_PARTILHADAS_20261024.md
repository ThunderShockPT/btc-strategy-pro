# V20 — páginas da Demo ligadas à conta privada

Continuidade do PR #34 a partir de eba3e96eca104ffd290dc1bc4fb60867e269c6c1. O relato do utilizador expôs uma integração incompleta: o painel técnico de operações ocupava as páginas privadas. Esta entrega reutiliza os componentes de Início, Estratégias, Mercado, Risco e Conta, alimentados pela API autenticada.

O diário, a margem efetivamente registada, as reservas e o plano guardado continuam separados. A avaliação pública produz uma projeção de leitura; não altera factos, referência ou piso. A interface identifica a data da avaliação. O mark PF_XBTUSD nunca é substituído por last ou spot. A Conta concentra as carteiras, exportação e histórico. Os formulários abrem numa janela própria, com comparação, aceitação desmarcada, prazo e confirmação explícita.

A calculadora opcional de nominal usa o motor partilhado e arredonda ao lote. A quantidade e a comissão reais continuam a ser declarações manuais. As simulações locais da conta têm uma lista fechada de operações de leitura; as confirmações da Demo não aceitam dados privados.

Uma janela de cálculo insuficiente com motivo WAIT_FOR_CLOSED_HISTORY permite aguardar uma nova vela fechada, com pausa/cancelamento e até quatro tentativas. Cada tentativa recolhe fontes novas e é revalidada pelo servidor. Não se estende a validade, não se alteram datas e não se confirma pela pessoa. Outros motivos mantêm os respetivos bloqueios.

Os assets do host usam o identificador do commit no URL para evitar a reutilização do bundle antigo pelo service worker. A chave de sessão existente é preservada. Documentos e dados de conta não entram na cache offline.

## Verificação desta alteração

- 67 testes direcionados passaram, abrangendo cliente, fluxo, movimentos, execuções/correções, carteiras, planos, projeções e espera por fontes válidas.
- Verificação interativa no browser dos cinco ecrãs e da conversão 200 USD / 100000 USD por BTC = 0,002 BTC. A imagem `qa/V20_PRIVATE_ACCOUNT_CARDS_QA_20261024.jpg` usa exclusivamente dados inventados e Auth simulada; não demonstra uma sessão alojada real nem um teste físico S25.
- Os novos testes de browser em CI cobrem 393 e 1280 px. O resultado CI e o ensaio alojado serão registados após a conclusão; não são aprovados por antecipação.
- Nenhum comando financeiro desta entrega é executado com a identidade do proprietário. A sua carteira é apenas inspecionada em leitura para detetar o problema relatado. Identificadores privados não são publicados neste relatório.

## Limites e sequência

A prévia permanece no Site privado existente e o acesso público de produção continua fechado. O Bloco 12 permanece aberto: importação de posição existente, privacidade/eliminação/portabilidade integral, restauro operacional, capacidade e teste físico S25 mantêm critérios próprios. SMTP depende de domínio BTC e continua separado. Os Blocos 13–15 não ficam aprovados por esta integração.
