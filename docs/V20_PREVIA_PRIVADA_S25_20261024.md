# Prévia privada V20 para o primeiro teste no S25 — 24/10/2026

Continuação da branch `qa/v20-block12-recovery-20261022`, a partir de `576c57d4df25264123839b843e9b20ba5a1ba15a`. O PR34 continua draft e conserva a base encadeada `perf/v20-bounded-risk-paths`. A main e o GitHub Pages V19.1 não são substituídos por esta entrega.

## O que foi integrado

- O Site privado existente `btc-strategy-pro-v20-preview.wintrythyme34.chatgpt.site` recebe a distribuição da aplicação existente. `version-v20.json` identifica o commit GitHub do código servido. A audiência continua limitada ao proprietário.
- Conta com Supabase Auth, diretório de carteiras, criação revista, planos, registos manuais, correções, exportação por carteira e logout global. A Demo continua separada e não é carregada para a conta.
- Endpoint distinto `btcsp-v20-private-test`, com allowlist do servidor e metadado administrativo verificado no SQL em cada transação. A política de produção continua fechada. A interface não converte os gates da produção em true.
- Primeiro acesso por ligação privada de recuperação, sem enviar email. O proprietário define a própria password; o agente não a define nem a conhece. A confirmação administrativa da conta de teste não demonstra entrega ou posse de caixa de email. O serviço temporário de preparação é fechado após gerar o acesso.
- Vendas distribuídas por vários ciclos, correção do ciclo e destino do PnL, e anulação/restauro de uma seleção de registos. Formulários estruturados; comparação e aceitação continuam obrigatórias. As comissões ligadas podem integrar o mesmo lote. Os originais e os recibos são preservados.
- Mark público PF_XBTUSD por WebSocket Futures, com alternativa REST do mesmo mark; nunca last, spot ou credenciais Kraken. Valores com mais de 15 segundos deixam de ser apresentados como atuais. Há reconexão, pausa em segundo plano e invalidação offline.
- Manifesto PWA e cache apenas de recursos estáticos sem dados de conta. Não existe cache de Auth, API, navegação privada ou histórico financeiro. Instalação e atualização reais no S25 continuam por verificar.

## Fontes, cronologia e validade

O adaptador de instrumentos aceita apenas características e escalões EEE que coincidem com as regras revistas. Uma alteração exige nova revisão. Guarda a data real da resposta e mantém o estado parcial, as limitações documentais e o prazo de 24 horas já existente; não muda datas documentais nem estende uma fonte antiga. O snapshot público de 24/10 está versionado.

O ensaio detetou que recolher instrumentos depois do ticker podia colocar regras alguns milissegundos no futuro relativamente ao mark. A recolha agora obtém regras e observações antes de pedir um ticker realmente posterior a ambas. Não altera timestamps. Uma compra nova conserva a fonte anterior efetivamente conhecida quando essa fonte cobre a data declarada; compras antigas sem fonte válida continuam a exigir reconciliação.

O prazo da revisão de criação da carteira é limitado pelas próprias fontes. O timeout de transporte do cliente passou de 10 para 20 segundos, porque foram observadas respostas de preparação/gravação de 10–12 segundos no percurso de rede deste ensaio. Isto não altera os 60 segundos financeiros, o prazo dos checkpoints ou a validade original de qualquer fonte.

## Evidência e limites

`docs/qa/V20_PRIVATE_SITE_HOSTED_20261024.json` preserva as tentativas e o percurso aprovado. Usa duas contas QA novas, factos monetários inventados e preços/regras públicos reais. O proprietário não recebe carteiras ou movimentos QA.

Uma primeira tentativa foi recusada por profundidade insuficiente na melhor oferta. Outras detetaram a incoerência cronológica descrita acima. O percurso final criou uma carteira de teste e recuperou o mesmo recibo; acrescentou 500 USD ao capital, mantendo zero margem; exportou o histórico; recusou a leitura pela outra conta; terminou ambas as sessões. A seleção de liquidez e a admissão A estrita não foram alteradas.

Este ensaio pequeno de integração é separado da prova anterior de 5000 eventos com 12 ciclos e pausa QA de 15 segundos (`V20_CONFIRMATION_5000_12_20261024.json`). Não substitui essa prova, não é uma auditoria financeira independente e não aprova ingresso/memória em produção. A bateria local da entrega e o CI são registados junto da publicação; contagens de baterias diferentes não devem ser somadas como testes únicos.

O browser da prévia mostrou a página da conta sem erros de arranque, a troca para a Demo e o mark Futures atualizado. Não se introduziram credenciais pessoais no browser de QA. O login final e a escolha de password pertencem ao proprietário.

## Primeiro teste físico no S25

1. Abrir o Site privado com a conta ChatGPT proprietária. A ligação de primeiro acesso é fornecida em privado e não fica neste repositório. Se a autenticação exterior retirar o fragmento, abrir novamente essa ligação depois de entrar no Site.
2. Definir a password, entrar e criar uma carteira **de teste**, sem posição aberta. Ler o tutorial, indicar capital e custos assumidos e rever antes de confirmar. Uma recusa de liquidez/admissão deve permanecer uma recusa.
3. Reabrir a carteira, registar um depósito de teste e verificar que a margem não aumenta. Só registar margem e execuções já ocorridas no cenário de teste. Confirmar cada comparação conscientemente.
4. Experimentar correção/anulação/restauro, exportação, logout e nova entrada. Conferir teclado decimal, datas locais, navegação, tamanho dos controlos e ausência de scroll horizontal.
5. Instalar a PWA se o Chrome a disponibilizar; testar regresso do segundo plano, perda e recuperação de rede e atualização. Uma cotação antiga não pode continuar apresentada como atual. A conta exige rede.

O teste físico não foi executado pelo agente. O seu resultado é necessário antes de avançar o gate do S25 e o Bloco 13.

## Continua pendente

Não se declara o Bloco 12 fechado. Continuam pendentes a importação/reconciliação de posição aberta, portabilidade/eliminação integral da conta e documentos finais, restauro operacional completo, ingresso/concorrência/memória representativos e integração da cadeia de PRs. O domínio/SMTP BTC continua dependente do proprietário; não se utilizou o SMTP administrativo pessoal nem infraestrutura RHM. Seguem-se os blocos 13–15 conforme a sequência aprovada, incluindo auditoria financeira independente.
