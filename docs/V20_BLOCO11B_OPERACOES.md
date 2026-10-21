# Bloco 11B — operações, correções e saídas

## Continuidade e recuperação

Continuação no repositório BTC Strategy Pro, branch isolada `feat/v20-trade-journal-ui`, a partir do checkpoint 11A. A prévia privada existente e os namespaces Demo são preservados. Sem merge em main, alterações à base de dados ou publicação no GitHub Pages. A versão anterior continua disponível no histórico de alojamento.

## Implementação

- Formulários de compra e venda em Estratégias e Conta, com escolha explícita entre simulação e execução realizada no cenário Demo. Uma simulação não pode ser confirmada como facto.
- Quantidade preenchida distinta da quantidade total pedida. Execução parcial conserva apenas BTC preenchido na posição e guarda o remanescente como metadado da ordem original; não cria uma compra futura nem presume execução posterior.
- Conversor opcional nominal USD → BTC usa Decimal, lote mínimo/incremento e remanescente explícito. Não confunde nominal com margem nem com caixa.
- Registo de comissão efetivamente paga, num evento separado da execução e no mesmo conjunto atómico local. Compras não debitam o nominal como se fossem compras spot. Não há transferência automática de margem.
- Vendas parciais num ciclo ou fecho total com alocações explícitas entre todos os ciclos. Não se escolhe uma regra FIFO implícita. PnL tem destino explícito; margem não é libertada automaticamente.
- Compras de ciclos com plano exigem etapa ativa 20/30/50. A referência ao fill é acrescentada numa nova versão do plano; o plano original não é alterado. Reenvios são idempotentes, incluindo quando essa ligação mudou a versão do plano.
- Histórico com detalhes, editar/corrigir, anular, restaurar e reverter última correção. Mostra estado/versão válidos e conserva os factos originais. Eventos de ajuste mostram motivo, ligação à operação original, datas e valores anteriores/novos.
- Correções de quantidade, preço, ciclo, data, montante de comissão/funding, direção de funding, destino de PnL e alocações de vendas. Comissão ligada pode ser corrigida/anulada/restaurada em lote explicitamente selecionado.
- Se uma correção/anulação invalida referências do plano, a revisão identifica quantas ligações seriam removidas; é necessária aceitação adicional. Os factos e as ordens antigas não são apagados. A estratégia fica para revisão, sem aplicar novos ciclos automaticamente.
- Alterações antigas que tornam uma venda posterior impossível são bloqueadas. Não é proposto apagar execuções na corretora; todos os ajustes são locais.
- Objetivos de saída por horizonte declarado de 7/30/90 dias, independentes do perfil. Objetivo líquido refere-se ao incremento da saída; custos históricos da conta são explicitamente excluídos desse alvo. Funding futuro é um montante assumido pago/recebido, não juros fixos nem previsão temporal.
- Simulação de saída parcial/total com preço de execução e mark distintos, custos, funding, destino de PnL, libertação de margem opcional, execução falhada e caminho contínuo/gap. Mostra bruto/líquido, custos, exposição restante e risco. Nunca converte uma simulação em execução registada.

## Arquitetura

`execution-workflow.js` prepara/verifica a revisão e a criação de eventos. Usa Core/Risk/Journal/Corrections para reconstrução, liquidação e integridade; não substitui as suas fórmulas. SHA-256 cobre comando, estado de base, efeitos e eventual versão do plano. Alterar o estado ou o resumo bloqueia confirmação. A verificação é local e não é autorização de servidor.

`previews/trading-views.js` gere formulários. `previews/app-workflows.js` encaminha o Worker para os motores, limitando a interface a factos Demo. `exit-planner.js` existente continua a calcular alvos/saídas. Datas usam seletor UTC; as datas dos registos pertencem ao cenário fixo de teste e não alegam transações reais.

O núcleo armazena fills financeiros como `executionStatus: executed`, mesmo quando são preenchimentos parciais de uma ordem. O envelope imutável `execution_metadata` contém `fillStatus`, quantidade pedida, remanescente, etapa e fingerprint do comando. O Bloco 12 deve persistir integralmente estes metadados e respetivas ligações na migração, em vez de guardar apenas `facts` e perder informação da ordem. Ordens pendentes/canceladas/não preenchidas não são disfarçadas de fills financeiros; a gestão persistente dessas ordens faz parte da integração de dados do Bloco 12.

Revisões antigas são invalidadas quando os campos mudam, incluindo respostas assíncronas tardias. O mesmo cuidado foi aplicado à comparação de movimentos do 11A. Histórico paginado, valores escapados e Decimal mantidos. Nenhuma credencial ou operação Kraken foi introduzida.

## Validação executada

- 384/384 testes V20: 362 anteriores, 19 do fluxo de execuções e 3 novos protocolos do Worker.
- Inclui compras com comissão, vendas parciais, fecho total multi-ciclo, preenchimento parcial, saldo insuficiente/margem insuficiente, limite de precisão/data, reenvio, revisão alterada/obsoleta, correção, anulação coerente de compra+comissão, reversão e proteção de vendas posteriores.
- Propriedade: 50 fechos completos comparados com um oráculo independente inteiro de PnL; quantidade, margem e caixa verificadas sem criação de dinheiro.
- Worker com Web Crypto e mensagens clonadas no próprio realm: compra parcial confirmada, correção sem eliminar original e simulação de saída apenas hipotética.
- 386 verificações Beta aprovadas: auth 19, cloud isolada 26, release 38, responsividade 37, planeador legado 266.
- QA CUA: formulários de compra/correção; conversão 500 USD → 0,005 BTC e correção 50 USD → 0,0005 BTC a 100 000; seletor de data; alvo líquido 50 USD a 105 053 USD; saída parcial 0,004 BTC a 110 000: bruto 40, comissão 0,22, líquido 39,78, remanescente 0,006 BTC e exposição 660.
- Compra/saída/correção a 280 px sem transbordo horizontal. Confirmações financeiras mantidas bloqueadas no navegador QA HTTP; protocolo completo testado no Worker com Web Crypto, sem bypass. A confirmação pelo utilizador no alojamento HTTPS e o ensaio físico S25 continuam por executar.

## Limites e sequência

É um diário Demo local e um conjunto de simulações. Não há importação Kraken, dados de conta oficiais, sincronização real, liquidação garantida, probabilidade de lucro ou política de risco alterada. A auditoria independente e reconciliação com exemplos oficiais continuam no Bloco 14. O protótipo não está aprovado para lançamento público nem para servir de recomendação financeira real.

Faltam os blocos 12 (backend/cloud/isolamento/concorrência/restauro e ordens), 13 (alertas/ajuda contextual), 14 (auditoria financeira independente) e 15 (QA Beta/privacidade e decisão de publicação). Melhorias a avaliar nesses blocos: fluxo simplificado para leigos, dados históricos de mercado validados, streaming/reconexão, marcação manual da posição com proveniência, e testes físicos de teclado/PWA.
