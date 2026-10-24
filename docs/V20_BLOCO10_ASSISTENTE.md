# V20 — Bloco 10: tutorial e configuração inicial

21/10/2026 · Base: `1c8402f9b3fb1714faa4b4f7339f4506eb264dde`, Bloco 9. Branch: `feat/v20-wallet-onboarding`.

## Resultado

Foi implementado o workflow `wallet-onboarding.js` e uma interface de teste funcional, construída a partir dos módulos reais dos Blocos 1–9. O guia apresenta um tema por vez, segue-se a configuração e depois a revisão com confirmação. A aplicação pública V19.1, o tutorial antigo, os projetos existentes e a produção Supabase permanecem inalterados.

A [prévia privada V20](https://btc-strategy-pro-v20-preview.wintrythyme34.chatgpt.site) está publicada num ambiente separado, com dados fictícios, sem ligação a contas Kraken. O acesso mantém-se privado ao proprietário. O código-fonte continua no repositório BTC Strategy Pro; esta publicação é um ambiente de teste, não uma aplicação substituta.

## Critérios de aceitação e decisões

- Seis temas curtos: ciclos 20/30/50; caixa/exposição/margem; liquidação; compras e adições de margem; perfis; depósitos e correções.
- Equilibrado preselecionado na interface, explicitamente sem avaliação de adequação pessoal.
- Capital inicial representado só por `opening_balance`. Nenhuma compra, adição de margem ou transferência é inferida.
- Perfil, piso, reserva pretendida, comissão declarada, reserva total de funding e horizonte são revistos antes de confirmar.
- Valores existentes, operações e referências permanecem preservados. Alterar capital existente exige movimento de caixa; o assistente não reescreve o saldo inicial.
- Novos ciclos vêm do motor aprovado, com admissão A estrita. É possível obter zero ciclos ou um plano inviável.
- Confirmação exige a revisão exata, seis temas, compreensão declarada e versões atuais dos documentos. A alteração de dados invalida a revisão.
- Nenhuma gravação cloud ou ativação de contas públicas. A confirmação devolve um pacote para o adaptador transacional do Bloco 12.

## Workflow e separação das origens

`calculate(context, request, {input, plan})` é uma vista de cálculo sem confirmação: `canApply=false`, `confirmationAvailable=false` e sem hash. Usa o mesmo motor matemático, sem alternativa de fórmulas. Serve também para leitura em ambientes sem Web Crypto, onde a confirmação permanece bloqueada.

`prepare(...)` cria a comparação e o hash com Web Crypto, sem escrever dados. `confirm(...)` verifica o hash do conteúdo, o estado completo e a confirmação explícita, recalcula e devolve `nextInput`, `nextPlan` e `tutorialReceipt`, sempre com `databaseWritten=false`, `planApplied=false` e `krakenTransferPerformed=false`.

O contexto separa `demo-preview` de `manual`. Em modo manual, valuation/observações não podem ser sintéticas; a cotação tem de estar no máximo a 60 segundos do instante avaliado, incluindo na confirmação. Regras já desatualizadas ou cotações insuficientes bloqueiam o cálculo específico. Em Demo, o instante e os dados são fixos e estão identificados visualmente; não são atualizados para parecerem reais.

`entry(...)` define o comportamento futuro de entrada: uma conta exige sessão autenticada, email verificado e proprietário identificado. Comprovativos Demo, de outra pessoa, de tutorial/documentos antigos ou incompletos não concluem o tutorial de conta. Ajuda permanece acessível. Esta política ainda não está ligada ao login público, cuja ativação continua sujeita aos gates de autenticação e cloud.

O comprovativo inclui ID, proprietário/projeto, versão do tutorial, seis temas, compreensão declarada, versões dos documentos de referência, instante de aceitação/registo, hash da revisão e origem. Os documentos mantêm `beta-review-pending`: o comprovativo não é aprovação jurídica, assinatura de autenticação, garantia de compreensão efetiva nem dispensa de explicar riscos. Os Termos Demo e a privacidade existentes são apresentados como referências; a revisão documental final permanece no Bloco 15.

## Carteira nova e existente

Uma carteira nova precisa de uma declaração explícita de ausência de posição aberta. Caso já exista posição, tem de ser registada/reconstruída antes de usar a revisão existente; o assistente não inventa os fills.

No cenário sintético de 2 000 USD sem posição, Equilibrado e referência BTC de 100 000 USD, o motor calculou 6 ciclos, piso de 80 000, reserva base de 400 e margem adicional planeada de 1 368,7145 USD. A carteira atual continua 2 000, a margem atribuída 0, a quantidade BTC 0 e a estimativa atual sem posição aberta. Os valores nominais executáveis diferem ligeiramente dos orçamentos 20/30/50 por arredondamento de lotes, explicitado na interface.

A revisão de um exemplo com 2 000 USD, 0,01 BTC já comprados e 500 USD de margem mantém os eventos, carteira de 1 500, margem de 500 e fronteira local de 55 000 USD. O piso de 80 000 e a referência existente são preservados por predefinição. Alterações de reservas ou novas ordens são só propostas. Ciclos históricos podem aparecer com etapas fechadas e valores efetivamente executados; não são reabertos automaticamente.

Uma reserva pedida pode ser aumentada, sem libertar silenciosamente uma reserva superior existente. Configurações maiores que o limite de 500 000 caracteres do workflow são recusadas. O horizonte fica como pressuposto declarado; não gera automaticamente funding ou rentabilidade para esse prazo.

## Interface e persistência Demo

O template e controlador estão em `previews/`. `npm run build:v20:onboarding` produz `build/v20-onboarding.html`, autónomo e sem recursos carregados por CDN. O Decimal 10.6.0 e os módulos reais são incorporados pelo builder a partir das dependências fixadas, preservando o aviso de licença da biblioteca.

Os cálculos decorrem num Worker, com progresso, cancelamento e proteção contra resultados antigos. Alterar um campo durante o cálculo cancela-o e invalida a proposta. O Worker é terminado e o URL temporário libertado. A interface aceita vírgula decimal e recusa separadores de milhares ambíguos. Os valores financeiros mantêm-se em strings decimais; a formatação não alimenta o cálculo com valores de vírgula flutuante.

O progresso e os pacotes Demo ficam em chaves próprias, separadas por proprietário fictício, projeto e versão do tutorial. A prévia não lê os backups ou chaves locais da Beta pública. As duas carteiras fictícias de teste têm IDs diferentes. Se o armazenamento falhar, a interface informa que a confirmação permanece apenas na sessão; não afirma gravação cloud. Rascunhos de revisões são retomados na configuração e precisam de novo cálculo.

A arquitetura prepara a associação à conta, mas a gravação real do saldo, plano e comprovativo deve ser autenticada, idempotente e atómica no servidor no Bloco 12. A revisão global deve incluir outras alterações concorrentes do projeto. Não se removem os backups locais nem se migram contas neste bloco.

## Verificação executada

- **343/343 testes Node aprovados**, nas doze suites, sem falhas ou testes ignorados.
- **34 testes novos**: 30 de onboarding/entrada/consentimento/integridade e 4 do artefacto Worker incorporado, incluindo preparação e confirmação completas com Web Crypto.
- **386/386 verificações da Beta aprovadas**: autenticação 19, sincronização isolada 26, release 38, responsividade estática 37 e planeador 266.
- Navegador real do ambiente de QA: seis temas, formulário, perfil inicial, cálculo de ciclos, validação de valores, vírgula decimal, revisão de posição existente e preservação de margem/quantidade. A conta fictícia existente não pode ter o capital inicial reescrito pelo formulário.
- Larguras reais de iframe de 280, 360, 393, 430 e 768 px: formulário sem scroll horizontal. O caso 280 tem 265 px úteis devido à barra de scroll do navegador de QA e também passou. A revisão com `2000,50` mostrou `2 000,50 USD`, margem atribuída 0 e scrollWidth igual ao clientWidth.
- Os 28 ficheiros da referência funcional auditada permanecem byte a byte iguais.

Limite explícito: o navegador de QA só acede ao endereço HTTP interno. Aí a confirmação fica bloqueada por falta de Web Crypto; o cálculo é permitido em modo de leitura. A preparação/confirmação do Worker foi executada com Web Crypto nos testes VM. A publicação privada HTTPS foi confirmada pelo serviço de alojamento; não se declara um teste de confirmação real nesse URL pelo navegador de QA. Não houve ensaio físico Samsung S25, teclado virtual Android, PWA instalada, autenticação real ou sincronização cloud neste bloco.

O ambiente privado usa o mesmo HTML gerado, com SHA-256 `b6eaa3b13240cbec4580c449340e13c8b8de04f8d2a4041b0ae32d52104bb27c`. Identidade e referência da publicação constam de `previews/host.json`, sem credenciais. O manifesto desse ambiente deve ser reutilizado nas atualizações; não criar outro Site para a mesma prévia.

## Continuidade e melhorias

Próximo: **Bloco 11 — renovação visual da aplicação**, integrando este assistente, Home, estratégias, mercado, risco e conta, com as distinções de factos/planos e ajuda contextual preservadas. **Faltam 5 blocos principais (11–15)**.

Recomendações para essa integração: reutilizar o Worker para cálculos pesados, destacar preenchimentos históricos acima do orçamento de uma etapa, apresentar avisos de preço desatualizado e testar o teclado virtual/S25 físico. O feed público futuro deve manter fonte, instante, estado de ligação e separação de mark/spot. A auditoria financeira independente permanece no Bloco 14; esta prévia não aprova publicação geral ou contas públicas.
