# Prompt para terminar o BTC Strategy Pro V20 com uma experiência simples

Preparada em 25/10/2026. Copiar o conteúdo abaixo para o chat que continuará o projeto. É uma consolidação dos pedidos recuperáveis, do código e das evidências; não afirma acesso integral a todos os chats anteriores.

---

Quero terminar o meu projeto existente **BTC Strategy Pro V20**. Sou Luis Matos. A prioridade passou a ser corrigir a experiência que está confusa e com erros. Já pedi várias vezes uma app igual à Demo de teste, simples de utilizar e com as funcionalidades que construímos. Não quero outra aplicação, mais painéis técnicos, novos blocos inventados ou mais complexidade.

## 1. Resultado que quero

Uma única Web/PWA com contas privadas e modo Demo preservado. A conta deve ter **o mesmo design da Demo local de teste existente**: organização, cores, cartões, gráficos, tabela, navegação e percurso guiado. As diferenças necessárias são os dados reais declarados, autenticação e confirmação da gravação. Não basta dizer que os dois modos usam o mesmo motor ou alguns componentes: comparar o resultado visual e os percursos completos.

A referência vigente é o modo **«Experimentar Demo» da prévia V20**, não escolher uma versão histórica ao acaso. Manter os cinco menus **Início, Estratégias, Mercado, Risco e Conta**. Preservar a identidade Midnight Exchange, azul-petróleo/ciano, e os ativos aprovados existentes; a referência histórica ao logótipo 02 não autoriza inventar um novo logótipo.

Quero conseguir perceber, sem ajuda no chat: onde está o meu dinheiro, o que já comprei, qual a margem realmente atribuída, as próximas compras na descida, os riscos e o que tenho de fazer a seguir. Cada ação tem de explicar o que vai guardar e mostrar o resultado depois de confirmar.

## 2. Continuar do ponto certo

- GitHub: https://github.com/ThunderShockPT/btc-strategy-pro
- Branch: `qa/v20-block12-recovery-20261022`.
- PR #34: https://github.com/ThunderShockPT/btc-strategy-pro/pull/34
- Head verificado nesta revisão: `a46a67cee1accdae7d6d23481ba299dba8d4d340`.
- Código/evidência da entrega anterior: `2a3e3c3159f1742d9a54e2850749adf9c3505455`.
- Base do PR: `perf/v20-bounded-risk-paths`, `1177be0f7528ff83350c6e6e170e8b1886374304`.
- Prévia privada: https://btc-strategy-pro-v20-preview.wintrythyme34.chatgpt.site
- Última publicação verificada: publicação 11 da **app V20**, fonte Sites `599a352e56f831fe47c68aab6882ee82234102d5`; não é uma aplicação V11.
- Supabase exclusivo BTC: `oftzqqjbwonngubihrsd`.

Revalidar head remoto, CI, publicação e funções antes de alterar. Preservar alterações posteriores. A main/site público estavam na V19.1, commit `d26545f36acda2f2c464626fb93ce688d41309af`; existem 34 PRs encadeados no último inventário. Não reiniciar a partir da main antiga nem fazer merge cego da cadeia.

Se houver ZIP de continuidade, verificar o manifesto com `RETOMAR_PROJETO.py`. O ZIP de 24/10 continha 332 ficheiros do snapshot `f78a53bc4c4acda479c4e0d6a2af9d9c633f7afc`, anterior às entregas seguintes. É recuperação, não motivo para sobrepor código mais recente. Ler os ficheiros 00/02/03/04/05 desse pacote quando disponíveis. Sem GitHub, trabalhar no snapshot mais recente disponível e identificar o que não está sincronizado. Não fingir que se recuperaram ficheiros ou conversas indisponíveis.

## 3. Corrigir primeiro a experiência, não acrescentar mais opções

Reproduzir os problemas atuais em contas QA novas. Fazer inventário dos campos e botões visíveis e seguir cada um até ao resultado. Prioridade: entrar → abrir a carteira existente → compreender saldos → registar uma compra → rever plano → confirmar → ver recibo e histórico → sair e voltar a entrar.

Eu disse que criei uma carteira com **1000 USD** e tentei registar uma primeira compra de **200 USD**. Não presumir que essa compra foi gravada: verificar o diário autorizado antes de corrigir ou pedir outro registo. Não duplicar, apagar ou reiniciar a minha carteira para testar. Não confirmar operações por mim. Usar dados QA para os ensaios.

### Regra obrigatória para todas as caixas

Cada campo deve ter nome simples, unidade, explicação curta junto ao campo e exemplo identificado como exemplo. Dizer se é obrigatório, onde encontro o valor e para que serve. O placeholder sozinho não substitui a explicação. Mostrar só o necessário para a ação escolhida; opções avançadas continuam acessíveis quando necessárias.

- **Capital inicial:** dinheiro inicialmente atribuído ao acompanhamento; explicar se começa sem posição. Criar carteira não executa compra nem transfere margem.
- **Valor da compra em USD e quantidade BTC:** tornar explícita a diferença. A conversão já existe e deve integrar um percurso compreensível, sem duas caixas contraditórias ou um botão cujo efeito não se entende. Exemplo fictício: compra nominal de 200 USD a 100 000 USD/BTC corresponde a 0,002 BTC. Não multiplicar novamente por 10. Mostrar arredondamento ao lote e pedir conferência da quantidade realmente executada.
- **Margem efetivamente atribuída:** registo separado. Não inferir a margem real dividindo a compra por 10, nem tratar depósito na caixa como transferência de margem.
- **Preço:** USD por BTC da execução, distinto do mark atual e da referência do plano.
- **Comissão:** preferir valor efetivamente pago em USD no registo; explicar separadamente a taxa do cenário. Onde for pedida taxa decimal, mostrar a equivalência: 0,0005 = 0,05%. Não preencher custos desconhecidos com zero.
- **Funding:** pago/recebido, montante e momento; explicar o termo. Campos de referência técnica devem ser geridos pela aplicação quando isso não inventar ou duplicar factos.
- **Ciclo e etapa:** selecionar com nomes humanos e contexto da compra; não obrigar a escrever `cycle-1` em caixas livres para uma escolha corrente.
- **Data:** hora local legível, sem pedir ISO/UTC ao utilizador. Não alterar silenciosamente datas já introduzidas.
- **Reservas, piso e horizonte:** explicar a consequência; distinguir pressupostos futuros de valores já realizados. Não mudar um piso preservado para obter aprovação do cálculo.

Aceitar vírgula e ponto decimal de forma consistente. Validar perto do campo. Mensagens devem identificar o campo, a causa e uma correção possível, preservando o que escrevi. Não apresentar `trade_buy`, UUIDs, hashes, códigos internos ou tabelas técnicas como conteúdo principal. Podem existir em detalhes de auditoria.

Um erro de rede, sessão, regra histórica ausente ou proposta expirada não é o mesmo que um valor mal introduzido. Explicar a diferença e permitir recuperar o percurso. Atualizar fontes ou preparar nova revisão quando permitido, conservando os factos e mostrando quaisquer alterações; nunca renovar artificialmente o prazo ou confirmar sem nova aceitação.

A primeira utilização deve ser guiada; operações rotineiras não devem obrigar a reler todo o tutorial quando já existe aceitação válida. Manter ajuda contextual disponível. Termos/riscos continuam sujeitos a aceitação explícita quando necessária.

A importação de posição aberta é uma opção própria para quem já a tem. Não tornar esse formulário extenso, exportações ou ficheiros um passo obrigatório para utilizar uma carteira nova. Explicar previamente as limitações reais e bloquear sem inventar factos quando faltarem dados.

## 4. Regras financeiras aprovadas — preservar

Modelo C adaptativo: ciclos numerados e dinâmicos conforme capital, posição, reservas e perfil. Cada ciclo distribui o orçamento nominal em três compras **20%/30%/50%**, com reforços **na descida**. Não voltar a grupos fixos A–E.

Perfis Seguro/Equilibrado/Arriscado: distâncias de referência **40 000/20 000/10 000 USD**. Não são garantias de liquidação ou retorno. Manter **admissão A estrita**, incluindo sobrevivência ao cenário de falha de margem; não aceitar a alternativa condicional para fazer testes passarem.

Referência contratual: Kraken Futures EEE, `PF_XBTUSD`, perpétuo linear Multi-M, USD, margem isolada a 10×. **Não ligar contas Kraken, pedir API keys, ler posições privadas ou executar ordens.** Operações, custos, funding, depósitos e transferências de margem são declarados manualmente. A conta Supabase é só da aplicação.

Preços públicos sem autenticação estão autorizados. Usar mark Futures com símbolo, origem, idade e reconexão; nunca substituir por last ou spot. Séries inventadas pertencem apenas à Demo identificada. Não inventar histórico de velas para tornar o gráfico privado semelhante.

Separar capital/caixa, margem atribuída, exposição, reservas e planos. Acrescentar dinheiro à caixa não acrescenta margem à posição. Recalcular a partir dos factos reais, conservando compras existentes e custos. Usar os motores Decimal partilhados; não criar fórmulas financeiras alternativas no frontend.

Permitir compras, vendas totais/parciais e por vários ciclos, saídas curtas/intermédias/prolongadas, movimentos de capital/margem, custos, funding e correções. Correções, anulações e restauros operacionais do diário acrescentam eventos auditáveis; não apagam o original. A eliminação da conta por privacidade exige processo próprio e política explícita, não uma presunção de retenção eterna.

Mudanças de plano exigem revisão imutável e confirmação explícita. Respostas perdidas não duplicam comandos. Revalidar sessão, origem, regras e estado na transação. Manter a validade original e tempo útil para ler a revisão. Não tratar equivalência com o próprio motor como auditoria financeira independente.

## 5. O que existe e o que continua incompleto

Há motores financeiros, diário auditável, risco, reservas, ciclos, perfis/saídas, simulação temporal, tutorial, Demo, autenticação, API, persistência atómica, fila durável, checkpoints e recibos. Reutilizar estes componentes. **Implementado ou com CI verde não significa utilizável ou terminado.** A minha reclamação atual exige reproduzir e corrigir a experiência.

No último estado verificado:

- Sete migrações V20 instaladas, 14 tabelas com RLS. Não reaplicar por diferenças de nomes/datas locais.
- Função privada `btcsp-v20-private-test` v12 disponível; produção `btcsp-v20-api` v1 com `cloudAvailable:false`.
- QA temporária `btcsp-v20-account-qa` v41 fechada; runtime QA v20 e provisionamento privado v11 fechados. Não reutilizar credenciais/capacidades antigas.
- O percurso alojado **5000 movimentos/12 ciclos** já teve cálculo, revisão e recibo dentro do prazo com pausa QA de 15 s, documentado em `V20_BLOCO12_CONFIRMACAO_PRAZO_20261024.md`. Regras desse ensaio eram explicitamente sintéticas. Não repetir como estado atual a falha de confirmação do ZIP antigo; também não chamar isso aprovação humana/S25 ou prova de todas as condições de carga.
- Portabilidade de negócio verificada com 5000 eventos, limite 64 MB e exclusões explícitas; não é restauro integral nem eliminação da conta.
- Importação manual/reconciliação alojada passou com quatro eventos, fontes históricas datadas, confirmação antes do prazo e replay sem duplicação; limite atual 250 movimentos/64 KB e cobertura histórica restrita. Ainda falta o percurso completo de aceitação no navegador/S25. Isto não substitui o ensaio financeiro 5000/12.
- Apresentação do plano/capital e histórico de versões partilhada entre Demo e conta. **Fidelidade visual e usabilidade integral continuam por aprovar.**

Faltam privacidade/eliminação/documentos finais, restauro operacional completo, evidência restante de ingresso/abuso/concorrência/memória, experiência integral no S25 e integração/release da cadeia de PRs. Conferir `docs/V20_PENDENCIAS_20261024.csv` e os relatórios mais recentes; os documentos antigos conservam estados ultrapassados.

## 6. Infraestrutura e dados

Só infraestrutura BTC. Nunca Supabase, SMTP, domínios ou dados do Racing Horse Manager. Não publicar contactos pessoais do administrador. Não tratar email administrativo como SMTP.

Ainda não forneci domínio BTC. Avançar tudo o que não depende dele e manter envio real/recuperação por email como pendência explícita. Não comprar domínio, subscrever serviços ou gerar custos por pressuposto. Não simular emails como enviados nem contornar confirmação para abrir acesso público.

Começo de novo na V20; não exigir migração V19 para usar a minha conta. Preservar versões antigas e os dados existentes. Importação/reconciliação de posição aberta continua separada. Testes devem usar contas QA novas, isoladas, encerradas no fim, com sessões revogadas.

## 7. Ordem para terminar, sem novas subdivisões

1. **Corrigir a experiência existente:** comparar as cinco páginas e diálogos com a Demo local; reproduzir os erros; simplificar formulários e linguagem; resolver o percurso normal completo sem me pedir para repetir tentativas às cegas.
2. **Validar integração e gravação:** testar cada botão com API/SQL reais, saldos, recibos, correções, sessão expirada, atualização da app, offline, reconexão e dois dispositivos/pedidos concorrentes. Nenhum erro pode ficar escondido atrás de uma mensagem genérica ou de um botão que nada faz.
3. **Completar as pendências técnicas do Bloco 12:** privacidade, eliminação e portabilidade com cobertura clara; backups/restauro operacional com retenção, configuração e rollback; carga representativa e segurança. SMTP separado até existir domínio. Não reduzir o caso 5000/12 nem enfraquecer regras para declarar sucesso.
4. **Entregar uma versão privada estável para o Samsung Galaxy S25:** Chrome/Android/PWA, teclado, decimais, scroll, diálogos, login/logout, offline e percurso até recibo. O agente faz os ensaios que consegue; eu faço a parte física inevitável. Um browser a 393 px não equivale a um S25 físico.
5. **Só depois seguir os blocos aprovados:** 13 alertas/tutorial; 14 auditoria financeira independente; 15 QA final/documentos/Beta/lançamento. Preparar a integração dos PRs preservando história e V19. Não marcar gates ou lançamento aprovados sem evidência.

### Exemplo de aceitação funcional

Numa conta QA, criar carteira sem posição com 1000 USD. Explicar e registar separadamente a margem realmente colocada. Registar uma compra nominal de 200 USD com preço e custos fictícios explícitos compatíveis com as regras do ensaio. Mostrar BTC correspondente e limites de lote, sem presumir margem. Rever plano com os factos existentes; confirmar explicitamente; receber um único recibo; verificar saldos e histórico após voltar a entrar. Corrigir/anular/restaurar uma execução e verificar conservação de factos. Acrescentar 500 USD à caixa e comprovar que a margem da posição não mudou por causa do depósito. Testar proposta expirada e resposta perdida sem duplicação.

Este exemplo é QA, não instrução para operar ou alterar a minha carteira real.

## 8. Forma de trabalhar e comunicar

Usar GitHub como fonte e relatórios versionados. Trabalhar em entregas completas, sem pedir sucessivamente «Avançar» para decisões técnicas rotineiras. Não acrescentar funcionalidades fora do pedido. Simplificar a interface mantendo os controlos financeiros necessários.

Antes de corrigir, distinguir problema reproduzido de hipótese de leitura do código. Não afirmar «tudo funciona», «igual à Demo» ou «bloco fechado» com base em contagens de testes. Mostrar que o percurso foi realmente concluído. Atualizações curtas: problema encontrado, correção e resultado. No fim: o que mudou, como foi testado, o que posso testar e o que falta. Não prometer prazo ou fecho imediato sem demonstração.

**Primeira entrega esperada:** diagnóstico curto dos principais problemas de utilização, lista limitada das correções necessárias e execução da primeira correção completa. Não começar por uma nova arquitetura, um novo painel ou mais relatórios técnicos sem corrigir o percurso normal da app.

## Fontes de continuidade

Ler os relatórios atuais `V20_PARIDADE_DEMO_LOCAL_20261025.md`, `V20_IMPORTACAO_POSICAO_ABERTA_20261025.md`, `V20_PORTABILIDADE_E_BACKUP_20261025.md`, `V20_BLOCO12_CONFIRMACAO_PRAZO_20261024.md`, `V20_PRODUCT_DECISIONS.md` e `V20_PENDENCIAS_20261024.csv`. Ver `docs/qa/V20_OPEN_POSITION_IMPORT_RELEASE_20261025.json` e evidências associadas.

Código principal: `previews/app-views.js`, `app.css`, `onboarding-ui.js`, `plan-presentation.js`; `account-view-v20.js`, `account-wallet-view-v20.js`, `account-execution-view-v20.js`, `account-import-view-v20.js`, `account-workflow-v20.js`, `cloud-client-v20.js`; motores financeiros partilhados e `backend/`. Os diretórios históricos são consulta, não código a sobrepor.

A instrução mais recente do proprietário prevalece sobre resumos históricos. Quando uma informação não foi recuperada, dizer isso em vez de a inventar.
