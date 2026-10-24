# 12I — Conta, cálculo e confirmação no alojamento

Em 24/10/2026 passou um ensaio HTTP no Edge do projeto BTC com Supabase Auth e PostgreSQL reais. O relatório `qa/V20_12I_HOSTED_ACCOUNT_20261024.json` regista 32 passos. As duas identidades são fixtures provisionadas por administração, com email confirmado administrativamente: não houve envio nem ensaio SMTP. Preços, regras e âmbito `demo_long` são sintéticos.

O percurso criou uma carteira de 2000 USD, repetiu a confirmação após descartar a resposta, verificou isolamento entre contas e rejeição de JWT adulterado. Iniciou uma alteração explícita de perfil, avançou o cálculo, publicou uma nova versão da função e retomou o mesmo trabalho noutro worker. O prazo original foi preservado. Revisão e confirmação criaram a versão seguinte do plano sem alterar os factos financeiros. Um depósito de 500 USD, também com resposta descartada e repetição, terminou com 2500 USD de caixa, zero BTC e zero margem. A exportação foi reconstruída e validada; logout global tornou o JWT anterior inválido.

## Falha observada e alteração limitada

O primeiro percurso com dois passos por unidade expirou corretamente; cada avanço HTTP alojado levou cerca de 3,5–4 segundos. A evidência está em `qa/V20_12I_HOSTED_ACCOUNT_DEADLINE_20261024.json`. Não se prolongaram prazos. O checkpoint passou a permitir até oito passos apenas com até 100 eventos e 256000 bytes serializados; até 5000 eventos/4 MB mantém no máximo dois e acima disso um. Continua limitado a um cenário por unidade. Comparações completas verificam equivalência e os testes conservam rejeição de fontes expiradas. O manifest do bundle foi regenerado.

Os relatórios BOOT e ROUTING conservam falhas de empacotamento e prefixo da ferramenta QA, corrigidas antes do percurso final. O teste do bundle construído impede dependência dinâmica de `__dirname` no Edge. A função tem capability com prazo, duas identidades fixas e âmbito sintético; não abre a política pública nem aceita identidades arbitrárias.

## Encerramento e limites

O percurso final usou as versões 8 e 9 da função temporária. A versão 10 substituiu todo o código por resposta estática 503 `QA_COMPLETE_CLOSED`. SQL confirmou duas contas QA bloqueadas, zero sessões, dois eventos financeiros e três recibos mantidos para auditoria. A health pública continua 200 com `cloudAvailable:false`. Segredos, passwords, capabilities e JWTs não fazem parte dos relatórios ou do repositório.

Este resultado comprova o percurso API alojado para uma origem pequena e fontes sintéticas. Não aprova carga máxima, CPU/memória de oito passos com 100 eventos, concorrência, ingresso, todas as janelas de admissão de 45 segundos ou preços públicos. Não substitui bootstrap/frontend alojados, SMTP, privacidade, migração/restauro integral ou S25. O Bloco 12 e os gates de lançamento permanecem abertos/fechados, respetivamente.
