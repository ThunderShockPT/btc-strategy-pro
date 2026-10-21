# V20 — Bloco 4: liquidação estimada e margem isolada

Data: 2026-10-21. Base: bloco 3, `feat/v20-financial-engine`.
Estado: módulo independente, sem ligação à interface, contas Kraken, transferências, base de dados ou produção. O preço apresentado é uma estimativa local; não é um preço oficial Kraken nem uma promessa de proteção.

## Entrega

`position-risk.js` reutiliza a reconstrução de factos de `financial-engine.js` e a função comum `marginRequirements`. APIs puras:

| API | Resultado |
| --- | --- |
| `estimate(input)` | Fronteira positiva de manutenção estimada, intervalo numérico, folga ao mark e metadados |
| `inverse(input, {floorUSD, bufferUSD, useReservedMargin})` | Margem total, transferência adicional, caixa elegível e capital em falta |
| `previewTransfer(input, {direction, amountUSD, minimumBufferUSD, useReservedMargin})` | Comparação antes/depois e impedimentos, sem executar movimentos |
| `simulate(input, {steps})` | Primeiro incumprimento, trajetória declarada e diário hipotético reconstruído |

Valores monetários são strings decimais. Resultados imutáveis. `ledgerChanged`, `ordersExecuted` e `transfersPerformed` são sempre falsos. `projectedLedger` nunca deve ser persistido como se fossem operações realizadas. Nenhuma destas APIs autoriza recomendações financeiras.

## Modelo e limites

Âmbito: posição LONG conjunta PF_XBTUSD, USD, Multi-M EEE, isolada e alavancagem selecionada 10×; plataforma e categoria de cliente são parâmetros declarados. Não se infere a elegibilidade do utilizador nem o estado real de uma conta.

Com quantidade Q, custo remanescente B, margem isolada M, manutenção MM e mark P:

`folga(P) = M + Q × P − B − MM(B)`

A tabela aplicável de manutenção é selecionada sobre o nominal de entrada remanescente, conforme a documentação auditada no bloco 1. Mudanças de quantidade, escalão ou versão de regras obrigam a nova avaliação. Nesta versão, com posição e regras constantes entre eventos, a função é linear e contínua: uma bisseção com intervalo verificado encontra a única fronteira positiva. Não se afirma que esta função cobre todo o processo real de liquidação. Futuros modelos de garantia, escalões dependentes do mark ou descontinuidades exigirão outros intervalos e tratamento explícito; não devem ser introduzidos alterando apenas uma constante.

A bisseção usa Decimal de 80 algarismos, limite de 256 iterações e tolerância de preço de 0,00000001 USD. Devolve um intervalo arredondado para fora. A precisão numérica não representa precisão face à corretora. Uma posição totalmente coberta sem raiz positiva não recebe um preço inventado nem uma classificação de segurança garantida.

A igualdade na manutenção é tratada como paragem conservadora do simulador. É uma política explícita do cenário; não pretende reproduzir o instante exato de execução da Kraken. O preço de chegada num gap, a fronteira matemática e um preço de execução são campos distintos. Custos, mark efetivo, liquidez, slippage, regras de proteção de equity e execução real podem produzir resultados diferentes.

## Caixa, inversa e transferências

Para piso F e folga desejada S, a necessidade matemática é `max(0, B − Q×F + MM + S)`. A diferença positiva face a M é uma possível transferência, nunca um depósito presumido. As reservas para ordens e a reserva protegida são excluídas da caixa elegível; a reserva para margem só é disponibilizada com `useReservedMargin: true`. O resultado nunca excede a caixa efetiva depois das outras reservas.

`model-fundable` significa apenas que os montantes cabem no cenário declarado. Se a posição já atingiu a manutenção, a inversa devolve `too-late-under-current-scenario`; não promete que uma transferência a recupera. Uma folga zero coloca o piso na fronteira matemática, não numa proteção efetiva. O planeador deverá mostrar estes estados em linguagem clara, incluindo «Plano inviável com a caixa e as condições atuais» para insuficiência de capital.

A prévia de retirada exige margem não negativa, folga superior ao mínimo escolhido e equity da posição restante suficiente para a margem inicial. Isto é uma verificação local conservadora, não a autorização da Kraken para levantar margem.

Exemplo independente, sintético: Q=0,01 BTC, entrada=100 000 USD, B=1 000 USD, M=100 USD e MM=50 USD. A fronteira é 95 000 USD. Um depósito de 500 USD leva o capital contribuído de 2 000 a 2 500 USD e a carteira livre contabilística de 1 900 a 2 400 USD, mantendo a fronteira em 95 000 USD. Só uma transferência explícita de 50 USD para margem leva M a 150 USD, carteira a 2 350 USD e fronteira a 90 000 USD. Valores sem custos neste exemplo.

## Sequência cronológica

Cada passo exige `at` UTC crescente, `markPriceUSD`, `transition: continuous | gap` e ações opcionais. Uma ação exige `outcome: filled | failed | unfilled`. Apenas `filled` contém os eventos financeiros canónicos, com revisões consecutivas e hora efetiva igual à do passo. Estes são pressupostos hipotéticos explícitos; não são ordens nem execuções observadas.

A sequência verifica a descida antes de executar qualquer ação no preço de chegada. Uma liquidação anterior impede compras, depósitos ou adições tardias de ressuscitar o cenário. Não se presume execução de ordens atravessadas num gap. Para estudar um reforço numa trajetória contínua, é necessário declarar um passo no seu nível e a respetiva execução. Uma alteração das regras no passo é aplicada após a chegada do mark e antes das ações; incumprimentos pela nova manutenção são identificados separadamente.

Cada prefixo de eventos de uma ação é reconstruído e validado. Uma compra nova precisa de margem nominal atribuída e equity inicial suficiente ao mark. Uma ação impossível é rejeitada atomicamente na projeção; o primeiro erro é preservado e eventos posteriores não são presumidos. Isto não descreve atomicidade de execuções na corretora: operações reais parciais devem ser registadas como factos separados.

Uma liquidação parcial não é inventada a partir de uma percentagem. `liquidationFill.events` só pode conter vendas e custos explicitamente fornecidos num passo que tenha atingido manutenção. Reconstrói quantidade, margem, PnL e custos; se a manutenção continuar em falta, o caminho para. A fronteira inicial permanece no relatório mesmo que a venda parcial restaure a folga. Sem preços, quantidades e custos externos adequados, isto é apenas um cenário sintético.

Para mudanças de tabela, `buyRulesByEvent` associa cada compra ao snapshot declarado e válido na sua data. A reconstrução usa essas regras para a exigência inicial histórica; a margem atual usa a tabela atual. O simulador conserva snapshots de compras anteriores e atribui a tabela vigente às compras hipotéticas novas. Não é uma integração oficial nem um comprovativo de regras da conta; persistência e importação auditável destes snapshots dependem dos blocos posteriores.

O funding só entra através de liquidações contabilísticas explícitas (`funding`), pagas ou recebidas na carteira geral, como no bloco 3. Não se inventa uma taxa futura nem se debita margem e carteira duas vezes. Cenários temporais de 1/7/30/90 dias são trabalho do bloco 9. Regras expiradas interrompem o cálculo em vez de serem usadas silenciosamente.

## Verificação e aceitação

`node --test scripts/test-position-risk.cjs`: 32 testes, incluindo 100 carteiras comparadas com um oráculo aritmético independente em inteiros; monotonia da margem; raiz sem posição; depósitos versus transferências; reservas; piso inviável; gaps; ações falhadas; reforços tardios; custos; saídas parciais; exposição conjunta; mudanças de escalão e regras; preservação de compras históricas; imutabilidade e validação temporal. O exemplo manual de 95 000/90 000 USD não usa a bisseção como oráculo.

Execução local concluída em 2026-10-21: 96 testes Node aprovados (18 regras, 18 dados, 28 motor e 32 risco), zero falhas; 386 verificações Beta aprovadas (19 autenticação, 26 sincronização, 38 publicação, 37 responsividade e 266 planeamento legado). Os 28 ficheiros da versão original mantêm conteúdo idêntico. Estas verificações de responsividade são automatizadas e não substituem QA visual ou testes num dispositivo físico. O teste de exportação/restauro usa PGlite local, não prova recuperação da cloud em produção. O workflow de CI instala dependências fixadas no lockfile antes de executar todas as suites.

Aceitação deste bloco: cálculo local reproduzível; mesma fonte de margens do bloco 3; estimativa e execução distintas; primeiro incumprimento preservado; sem duplicação de capital ou margem; nenhuma escrita no diário real. Não equivale a aprovação de lançamento. Não existe comparação com uma conta Kraken real, pois o produto não terá ligação a contas; permanece por obter exemplos externos adequados para reconciliação independente na auditoria final.

## Fontes e continuidade

Consultar `V20_BLOCO1_KRAKEN.md` e o snapshot versionado em `rules/kraken/`. Fontes oficiais principais:

- https://support.kraken.com/pt/articles/4844463246100-margining-liquidations-multi-collateral-derivatives
- https://support.kraken.com/pt/articles/derivatives-margin-schedule-and-maximum-leverage-eea
- https://support.kraken.com/pt/articles/perpetual-contract-specifications-for-clients-in-the-eea
- https://support.kraken.com/articles/360022835671-equity-protection-process-derivatives

Limitação aberta: execução parcial e EPP reais não estão calibrados contra dados de uma posição externa; não se usa a percentagem de um exemplo genérico como regra garantida EEE. Regras de margem versionadas e estado de atualização continuam visíveis no resultado.

Próximo: bloco 5, caixa dinâmica e comparação de planos após depósito/retirada, com confirmação antes de aplicar alterações. Faltam 11 blocos principais (5–15). Integração visual e prévias utilizáveis ocorrerão nos blocos de interface; HTML, PWA, autenticação, main e Supabase de produção ficam preservados neste checkpoint.
