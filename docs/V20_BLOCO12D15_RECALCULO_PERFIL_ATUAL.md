# Bloco 12D15 — recálculo do perfil atual

## Comportamento

Um pedido `calculations/enqueue` sem `profileChange`, numa carteira manual com `public_mark`, passa a recalcular o perfil do plano atual. Usa o provider de fontes e a política de perfis já aprovados: perfil atual, `floorMode=preserve` e admissão estrita. Não exige um `cyclePolicy` separado que o provider público não fornecia.

A pesquisa, o resultado, a revisão e a confirmação usam o mesmo caminho dos perfis explícitos. Isso conserva também as verificações finais de profundidade, reservas e sobrevivência à falha de reforços. O resultado público deste recálculo tem o formato de preview de perfil, com os ciclos em `cycles`; não se trata do resultado bruto do caminho legado. Antes desta entrega, esse pedido público não tinha um fluxo funcional. Os caminhos Demo e de mark manual mantêm o contrato anterior.

O checkpoint assinado distingue a escolha `current-profile` de uma alteração explícita de perfil. Repetir o pedido sem escolha reutiliza o trabalho existente; reaproveitar a chave para uma escolha explícita é conflito. Uma repetição não escolhe novamente o perfil nem renova as fontes. Uma mudança do estado de origem invalida o trabalho pelas verificações já existentes.

O prazo continua limitado pela menor validade de ticker, livro, histórico e regras, com a admissão provisória de 45 segundos antes de preparar e assinar. A pesquisa não escreve movimentos. Confirmar o plano exige revisão e confirmação autenticadas; não executa trades nem transferências Kraken.

## Verificações

O teste do provider percorre Seguro, Equilibrado e Arriscado, confirma o perfil atual, piso preservado, admissão estrita, validade do histórico e estado original intacto. Sem provider confiável de perfis, o serviço recusa o recálculo.

O ensaio integrado cobre rejeição 425 perto da fronteira, zero trabalhos após rejeição, criação posterior com a mesma chave e contexto novo, repetição noutro worker e conflito ao tentar trocar o perfil pela mesma chave. O resultado completo é igual ao cálculo direto. Revisão e confirmação conservam o prazo e não recolhem novas fontes. Eventos, BTC, caixa, margem e piso são preservados. Após aprovar o plano, um novo recálculo sem escolha chega novamente à revisão de perfil, conservando perfil e piso; não é encaminhado para a revisão legada que recusa planos regidos pela política de perfis.

Os testes usam respostas, regras, identidades e relógio SQL sintéticos em PGlite, como no 12D14. Não são ensaio alojado, prova de latência, concorrência física ou validação de contas reais.

## Restante do Bloco 12

A lacuna identificada no PR para os pedidos públicos sem alteração de perfil fica resolvida no código e nos testes isolados. 12D continua aberto para composição no entrypoint, fluxo alojado completo com sessão real, capacidade com históricos/ciclos máximos, concorrência, ingresso e memória de pico. Depois ficam 12E–12I e o teste Samsung S25 antes do Bloco 13. Nenhum deploy ou migração de produção foi efetuado nesta etapa.
