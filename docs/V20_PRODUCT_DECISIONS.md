# V20 — Decisões de produto vinculativas

Atualização de 21/10/2026, após indicação do proprietário.

## Operação manual, sem ligação a contas de corretoras

A BTC Strategy Pro não liga contas Kraken, não solicita API keys da Kraken e não sincroniza posições, saldos, negociações ou transferências da corretora. Não haverá permissões de negociação nem de leitura de conta. A autenticação Supabase continua a ser apenas a conta da BTC Strategy Pro.

O utilizador declara manualmente compras, vendas, depósitos, margem, custos e funding realizados. A aplicação separa-os dos planos e recalcula os resultados. As regras públicas Kraken EEE continuam a ser o cenário contratual de referência; a plataforma/classe de margem e as taxas são pressupostos declarados, não dados de conta confirmados pela corretora. Um resultado conserva essa identificação.

As referências anteriores a uma futura ligação de leitura de conta, reconciliação automática ou necessidade de dados de uma conta ligada ficam substituídas por esta decisão. A validação independente do modelo usa documentação, metadados públicos e exemplos declarados, sem exigir conta ligada. A indicação de “liquidação Kraken” só poderá ser um valor introduzido manualmente pelo utilizador, com origem e data; nunca um valor apresentado como recebido de uma integração inexistente.

## Preços públicos contínuos

Objetivo: receber preços de forma contínua enquanto a aplicação está ativa e atualizar a apresentação com baixa latência, com reconexão automática. Não prometer ausência absoluta de atraso nem apresentar preços antigos como atuais.

A fonte pública preferida para o contrato de referência é o ticker Futures PF_XBTUSD, que expõe último negócio, mark, índice e estados do mercado sem autenticação de conta. A documentação indica publicação de deltas limitada a uma vez por segundo. A escolha evita confundir um preço spot de outra bolsa com o mark do perpétuo.

Fonte: https://docs.kraken.com/exchange/api-reference/futures-websocket/ticker

O futuro adaptador de mercado deverá:

- Guardar separadamente instante da fonte e instante de receção, símbolo, bolsa, moeda e tipo de preço.
- Reconectar com espera progressiva e jitter, evitar conexões duplicadas e descartar mensagens antigas recebidas fora de ordem.
- Atualizar a interface sem recalcular gráficos completos a cada mensagem e sem bloquear formulários.
- Mostrar “atualizado”, “a reconectar”, “sem ligação” e idade da última cotação; heartbeat não equivale a novo preço.
- Usar REST público como recuperação, respeitando limites; uma fonte spot alternativa nunca substitui silenciosamente o mark.
- Recuperar a cotação ao regressar do segundo plano ou reabrir a PWA. Sem rede, identificar o preço guardado como desatualizado.

Não foram implementados neste bloco o WebSocket nem a interface de preços. O requisito passa a integrar Mercado, o motor de simulação e os testes de experiência. Não serão necessários segredos ou credenciais do utilizador para obter estas cotações públicas.

## Continuidade dos blocos

O Bloco 2 pode avançar com esta arquitetura manual. Os pontos matemáticos ainda em validação no Bloco 1 não são resolvidos por ligar uma conta e não devem forçar essa funcionalidade. As estimativas mantêm rótulos e restrições até os testes do motor as sustentarem. Alterações de capital e correções históricas continuam sujeitas às regras V20, sem movimentos automáticos numa corretora.
