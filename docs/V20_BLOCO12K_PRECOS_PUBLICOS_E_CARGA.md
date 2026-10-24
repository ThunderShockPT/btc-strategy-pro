# 12K — Preços públicos, recusa de perfil e carga alojada

Em 24/10/2026 foram ligados os adaptadores públicos reais de ticker, book e candles mark PF_XBTUSD ao runtime alojado, Auth real e SQL real. Não se usou conta ou chave Kraken. Históricos, utilizadores e regras são fixtures explícitas de QA: não se aprova a atualidade das regras Kraken nem o lançamento financeiro.

## Recusa correta com resposta errada

O primeiro plano fictício tinha referência de 100000 USD e piso de 80000. Com mark público observado próximo de 80665, o perfil equilibrado calculava dois reforços abaixo do piso. O motor recusou corretamente com `PROFILE_LEVELS_DO_NOT_FIT_ABOVE_FLOOR`, mas a API escondia esse erro de domínio como 503 `API_UNAVAILABLE`.

A API passa a devolver 422 com o código exato, e o painel apresenta uma explicação em português. Não muda piso, perfil, validade, cálculo ou movimentos. Um teste integrado reproduz o preço baixo, verifica zero trabalhos/recibos e compara o estado integral antes/depois. A versão alojada 15 confirmou a recusa 422 com Auth/SQL reais. As recusas tardias 425 também foram observadas, antes de inserir trabalho.

## Percurso completo pequeno — versão 17

Outra carteira fictícia foi provisionada num projeto novo, com piso declarado de 60000 USD e três movimentos. Não se alteraram os factos ou o piso do projeto anterior. O cálculo do perfil atual passou com preços públicos, dois avanços pedidos em simultâneo, revisão, confirmação explícita, repetição idempotente, versão 2 do plano e movimentos intactos. Terminou em sete avanços guardados e conservou a validade original. A sessão antiga foi recusada depois do logout.

O resultado HTTP completo foi comparado com `Profiles.preview` local usando o payload efetivamente guardado no SQL. São integralmente iguais; hash canónico `e46e1739a83d997b1688b00a64ca240e8e28f91354b18c1c398636aa8f0950e9`. A proveniência e a fronteira original de candles estão no relatório COMPATIBLE_V2. O payload sintético exato foi preservado comprimido para reproduzir a comparação.

## Limite máximo — versão 18: não aprovado

Uma terceira carteira fictícia contém 5000 movimentos e limite de 12 ciclos. Foi admitida com prazo original às 08:10:00 UTC. O enqueue demorou 11153 ms; os pedidos de avanço observados levaram aproximadamente 6,8–11,9 segundos. Apenas cinco avanços ficaram guardados antes de `CALCULATION_EXPIRED`. Não houve novo plano nem recibo: SQL verificou 5000 factos, uma versão do plano e zero confirmações financeiras nesse projeto; o head financeiro manteve-se igual.

Uma nova sessão real consultou o trabalho expirado, reconciliando-o para `blocked`/`CALCULATION_EXPIRED`. Um novo avanço continuou bloqueado, com o prazo e sequência 5 preservados. Não se prolongou a validade ou a lease para obter sucesso. Este ensaio falha o critério de conclusão da carga máxima, apesar de a mesma carga passar no laboratório. O próximo trabalho é reduzir o custo do percurso completo entre API, SQL e checkpoint e repetir a conclusão obrigatória. Não se deve aumentar o número de passos grandes sem medir também CPU por pedido.

Os valores de heap nos relatórios são amostras no fim do pedido, não memória de pico. Dois pedidos concorrentes sobre um trabalho não aprovam ingresso/abuso ou concorrência de múltiplas contas. A janela mínima de 45 segundos continua provisória e não garante esta carga.

## Preparação, falhas preservadas e encerramento

A primeira preparação QA tentou usar `manual` no campo legado `projects.mode`; a base real aceita `demo`/`real`. Corrigido o provisionador QA, conservando o esquema. Outro erro do construtor perdia metadados de variante ao renovar a capability, reutilizando o projeto antigo. Agora preserva os metadados, distingue projetos por fixture e recusa um head existente que não corresponde ao hash fixado; os testes verificam essa rejeição sem reset do histórico. As falhas anteriores ficam identificadas nos relatórios, sem contar como aprovação de capacidade ou indisponibilidade comprovada de uma fonte.

A versão 19 substituiu a função de ensaio por resposta estática 503 `QA_COMPLETE_CLOSED`. SQL confirmou duas contas QA deste ensaio bloqueadas, zero sessões, 5006 factos fictícios e um recibo conservados. O trabalho grande está bloqueado por expiração. A health principal continua com `cloudAvailable:false`; o frontend publicado e a função principal não foram republicados. Os utilizadores de QA anteriores permanecem separados.

Os relatórios `qa/V20_12K_*` conservam HTTP, proveniência, comparação direta, falhas e reconciliação. O bundle grande e as fixtures exatas estão comprimidos, sem passwords, JWTs ou capability. SMTP, privacidade, restauro integral, frontend alojado e S25 continuam pendentes, além do bloqueio de capacidade descrito acima. O Bloco 12 permanece aberto.
