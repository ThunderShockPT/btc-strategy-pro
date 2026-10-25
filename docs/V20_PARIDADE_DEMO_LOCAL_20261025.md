# V20 · apresentação partilhada com a Demo local · 25/10/2026

A referência indicada pelo proprietário é o **modo Demo local desta prévia V20**. A Demo original V19.1 mantém-se preservada no projeto. A integração anterior partilhava algumas páginas, mas o plano e a sua revisão tinham duas apresentações distintas.

## Alteração

- `previews/plan-presentation.js` apresenta os resultados dos motores existentes nos dois modos. Não calcula estratégias nem grava factos.
- Estratégias mostra o mapa dos três níveis por ciclo, a sequência descendente com nominal executável e BTC, cartões 20/30/50 e Tabela Chaves. Etapas preenchidas, parciais e fechadas continuam distintas.
- A revisão autenticada de um plano e a revisão da criação de carteira apresentam o mesmo resumo, mapa, margem adicional por etapa, custos, reservas e distribuição da Demo. Conservam a aceitação por marcar, o hash e prazo originais e a confirmação no servidor.
- Início apresenta a repartição da caixa livre, reservas e margem atribuída a partir do diário. Reservas não são somadas ao capital uma segunda vez.
- A escolha de perfil da criação de carteira usa os mesmos três cartões da Demo. Custos e horizonte ficam numa secção própria. Não são preenchidos custos, valores ou consentimentos em nome da pessoa.
- A lista inicial de três compras pode ser expandida para consultar todas. A Tabela Chaves e o mapa deslocam-se dentro da sua região no telemóvel.

O mapa é uma representação dos **níveis do plano sem escala temporal**, não um histórico de cotações ou velas. Mercado conserva o mark público PF_XBTUSD e o gráfico da sessão. Valores financeiros e quantidades vêm dos motores partilhados; Decimal apenas posiciona elementos gráficos e formata a apresentação.

Um plano guardado sem cálculo recente não inventa uma margem por etapa. O ecrã pede nova revisão após movimentos. Uma leitura com outra revisão do histórico não é misturada com a proposta imutável.

## Verificação realizada antes do CI

- 39 testes locais direcionados passaram: apresentação, carteira, workflow da conta, Worker Demo e adaptadores de navegação.
- Comparação no navegador com os mesmos factos fictícios: HTML do plano guardado idêntico entre conta e Demo. Comparação automática adicional do gráfico de capital e da revisão preparada.
- Captura `qa/V20_PLANO_PARTILHADO_QA_20261025.jpg`: conta **fictícia** de QA; não representa a carteira do proprietário nem aprovação de dados de mercado reais.
- Os testes de navegador do repositório foram ampliados para comparar os dois modos a 393 e 1280 px, abrir a tabela sem ultrapassar a largura da página e conservar o perfil escolhido ao editar outro campo. O CI é registado na evidência da entrega, depois de terminar.

## Limites e estado

Esta entrega não altera a política financeira, os critérios A estritos, o piso, os prazos, as fontes, o backend ou o esquema. Não confirma operações com a identidade do proprietário. Os testes sintéticos não substituem os ensaios alojados já versionados.

A equivalência dos componentes implementados é verificada com factos iguais; a **aprovação visual no Samsung Galaxy S25 físico continua pendente**. A criação e o diário mantêm as exigências próprias da conta privada. Importação de posição, privacidade/eliminação/portabilidade integral, restauro e capacidade pendentes continuam no Bloco 12. SMTP depende de domínio BTC. Blocos 13–15 e lançamento não são declarados concluídos.

## Testar nesta entrega

1. Abrir a prévia privada habitual e atualizar a página.
2. Em Início, consultar «Onde está o capital».
3. Em Estratégias, consultar mapa, montantes pendentes, distribuição 20/30/50 e «Abrir Tabela Chaves».
4. Comparar a organização com «Experimentar Demo». Os valores só coincidem se os factos forem os mesmos; a tua conta não é copiada para a Demo.
5. «Recalcular e rever» apresenta a proposta e a validade. Confirmar continua a ser uma decisão explícita tua.
