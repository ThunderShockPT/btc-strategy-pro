# BTC Strategy Pro V20 — Última decisão do plano (R1.4 / R2.4)

**Data:** 26/10/2026
**Estado:** avaliação técnica pronta; aprovação humana **pendente**.
**Objetivo:** permitir ao proprietário aceitar explicitamente o desenho financeiro do produto sem converter a autorização de continuar numa ordem real, garantia de liquidação ou autorização para publicar.

## 1. Regras já decididas que não voltaremos a discutir sem pedido

- Nome e visual: BTC Strategy Pro V20, Demo premium Bloco 8, cinco menus.
- **Modelo C adaptativo** é a direção selecionada anteriormente pelo proprietário; ciclos com três compras **20%/30%/50% do nominal do ciclo** e perfis Seguro / Equilibrado / Arriscado.
- Capital da **caixa** é diferente de **margem isolada**; adicionar saldo à caixa não reduz automaticamente o preço de liquidação de posições existentes.
- Reforços planeados são **cenários**, não transferências de margem já efetuadas. Gate estrito exige avaliar a trajetória na qual não houve reforço.
- O piso de stress é o **nível de teste** (−40k / −20k / −10k face à referência, conforme perfil), não limite de compra obrigatório e não garantia de que a corretora evite liquidação.
- Cotações e regras Kraken EEE, funding, mark price e manutenção necessitam de validação atual e de conta real. Não autorizar execução de ordens.

## 2. Escolha que ficou em aberto: a distribuição das entradas

Exemplo ilustrativo comum de R2: BTC referência 80.000 USD, capital da carteira 2.000 USD, cinco ciclos com 1.000 USD de **nominal teórico cada**, perfil Equilibrado com piso de stress 60.000 USD, isolated 10x. Os 1.000 USD por ciclo **não** representam dinheiro já atribuído como margem e podem ultrapassar a carteira se usados simultaneamente sem orçamento.

| Desenho estudado | Última entrada da grelha | Principal risco/limite | Papel proposto |
|---|---:|---|---|
| A–E clássico (1k entre ciclos, 8k reforços) | 60.000 USD | Uma entrada exatamente no piso, **rejeitada** pelo gate estrito; muitos gaps/ordens não modelados | Preservar no comparador como referência histórica, não como grelha automática |
| V20 Beta concentrada (0,3% entre ciclos, 1,5% reforços) | ~76.640 USD | As compras ficam muito juntas face ao piso de 60k; uma descida prolongada cria maior pressão de margem | Manter só como cenário Beta comparável, sem declarar proteção |
| **C adaptativo com distribuição parametrizada** | **Não fixar sem testes** | Depende dos espaçamentos, caixa, margem efetiva, funding e viabilidade por perfil | **Direção proposta** para o produto, permitindo comparar cenários e salvar rascunhos sem executar |

No estudo sintético R2 (trajetória 80k→60k→85k, hipótese de fills completos, funding ilustrativo e reserva), as perdas não realizadas a 60k foram aproximadamente −516,90 USD no clássico, −1.143,27 USD na V20 concentrada e −542,15 USD na alternativa experimental. **Estes números não são previsões, não representam custos reais de Kraken confirmados e não verificam sobrevivência à liquidação.** A alternativa experimental de 1.500 USD / 7.000 USD continuava igualmente a ter entrada no piso, logo não pode ser promovida como solução.

## 3. Proposta de aceitação de arquitetura — sem alterar parâmetros financeiros ativos

Aprovar **apenas** as seguintes regras funcionais para continuar desenvolvimento:

1. **Modelo C como principal** com distâncias entre compras e ciclos ajustáveis e legíveis por perfil; não fixar grelha oculta.
2. Comparador **Clássico A–E vs V20 Beta vs C parametrizável**, com aviso de planos inválidos. A–E permanece sempre visível apenas como referência.
3. Piso estrito: rejeitar qualquer compra no piso ou abaixo; calcular faixas de compras acima do piso **sem prometer proteção**. Nenhum auto-repair ou auto-espaçamento não auditado.
4. Separação de **caixa, reserva protegida, margem atribuída, funding/comissões e reforços futuros**; recalcular com as operações realmente executadas/importadas, não com promessas.
5. Perfil Seguro/Equilibrado/Arriscado ajusta **cenários** e orçamento com visibilidade; contas e operações reais exigem gates externos, validação do utilizador e documento Kraken atualizado.
6. Não alterar `policies/profiles-beta-20261021.json`, `financialCloudApproved:false` ou `publicRegistrationApproved:false` com base neste parecer.
7. Se o utilizador pedir **parâmetros de compra reais**, essa é uma decisão separada, exigindo investigação/ensaios de execução e risco, não abrangida pela aceitação de arquitetura.

**Resposta de aprovação explícita requerida:** «Aprovo apenas a arquitetura do Modelo C adaptativo com Clássico A–E como comparador, piso estrito e margem efetiva separada. Não aprovo ordens reais nem parâmetros finais de preço.»

Alternativa de revisão: «Quero rever os espaçamentos das compras e os ciclos antes de aceitar a arquitetura.»

## 4. Gates e progresso

O fecho **técnico** de R1.4/34 exige que o proprietário veja e aceite/peça alterações desta proposta, e que essa decisão seja registada sem extrapolar autorizações. O estudo R2.4 mantém-se documentado e pode orientar as simulações; não assume lucro ou proteção.

**Até haver a resposta explícita:** continuar em **33/34 (97,1%)**, com `PR #35` draft, `main` pública V19.1 sem alterações, demo Netlify fictícia e riscos financeiros não certificados. Mesmo com a aceitação de arquitetura, a aprovação financeira de produção, contas, restauro e execução Kraken ficam **separadamente bloqueadas**.

Fontes internas: `docs/V20_R1_ETAPA4_REVIEW_20261025.md`, `docs/V20_R2_ETAPA4_CONCLUSOES_20261025.md`, `docs/V20_R2_ETAPA4_QA_20261025.md`, `policies/profiles-beta-20261021.json`, `policies/cloud-release-20261021.json`.
