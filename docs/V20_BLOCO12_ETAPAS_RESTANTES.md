# V20 — etapas restantes do Bloco 12

Atualizado em 21/10/2026, após 12D7A. As seis etapas abaixo organizam o trabalho ainda necessário; não são seis etapas já concluídas. Subdivisões técnicas não alteram os critérios de aceitação.

| Etapa | Entrega | Critério para concluir |
| --- | --- | --- |
| 12D — contexto financeiro e desempenho | Preços públicos identificados, regras versionadas, histórico/liquidez, revisão consistente e processamento adequado ao runtime | Dados recentes e verificáveis; sem trocar last por mark; sem fabricar observações; confirmação consistente; carga financeira medida no runtime escolhido |
| 12E — interface e sincronização | Ligar carteira, planos, movimentos e correções à conta, incluindo revisão de carteiras existentes | Fluxos completos com sessão, conflitos e offline tratados; preservar Demo, histórico e backups Beta |
| 12F — privacidade | Preferências, termos, portabilidade e eliminação de conta | Operações autenticadas, isoladas, auditadas e documentação revista |
| 12G — backups e migração | Recuperação do servidor e migração gradual compatível com V19 | Backup e ensaio de restauro antes da aplicação; reconciliação; rollback; nenhum apagamento ou reinício de conta |
| 12H — autenticação e email | SMTP exclusivo BTC, confirmação, recuperação e isolamento real | Testes com duas contas Auth reais, proteção contra abuso e recuperação comprovada; sem recursos do Racing Horse Manager |
| 12I — validação integrada | Concorrência, reinício, sessões, offline, migração e recuperação entre dispositivos | Testes ponta a ponta aprovados; todas as verificações da política de abertura satisfeitas; sem pendências críticas do Bloco 12 |

## Situação da etapa atual

12D1 implementa o adaptador de cotação pública e o provider de avaliação manual. 12D2 reduz as validações e reconstruções repetidas, com resultados completos iguais nos casos de regressão e redução média de CPU de 73,7% e 59,9% nos dois casos medidos. 12D3 permite pausar por candidato/cenário, retomar checkpoints serializados e assinados, e bloquear estados alterados, expirados ou de outra build. A maior unidade medida foi 895,45 ms CPU local, em históricos de um evento. 12D4 acrescenta armazenamento privado e leases com commit condicionado à sessão, versão e origem; a recuperação entre workers e após dump/restauro foi testada em PostgreSQL de QA, sem ativação na produção. 12D5A acrescenta os caminhos HTTP autenticados de criação, avanço, estado, resultado e cancelamento, com limites partilhados e teste de resultado completo sem alterações financeiras; não estão compostos no runtime alojado. 12D5B guarda o contexto das revisões no servidor e confirma sem consultar nova cotação, com prazo SQL, sessão e origem verificados; 538 testes V20 locais e 20 testes PostgreSQL nativos de QA passaram. 12D5C liga cálculos de ciclos concluídos e assinados à revisão e confirmação, sem repetir os cenários nem prolongar o prazo original; 543 testes V20 locais e 21 testes PostgreSQL de QA passaram. 12D5D liga também os perfis Seguro, Equilibrado e Arriscado, incluindo alterações de planos já aprovados, sem repetir cenários nem alterar o piso sem decisão explícita; 549 testes V20 locais e 22 testes PostgreSQL de QA passaram. O provider de histórico/liquidez de produção ainda não está concluído. 12D6 compõe os serviços privados no runtime, com identidade validada uma vez por pedido e sessão SQL verificada em cada transação; configuração incompleta mantém indisponibilidade. Passaram 553 testes V20 locais e 23 testes PostgreSQL de QA. O entrypoint de produção continua sem providers reais e fechado. 12D7A acrescenta recolha pública validada de candles de marcação completos e livro de ordens, com replay real. Passaram 567 testes V20 locais e 23 testes PostgreSQL de QA. O ensaio real funcionou em cerca de 4,84 s com limite de 10 s, mas o limite normal de 3 s falhou; a latência não está aprovada. A política de liquidez e o contexto automático continuam pendentes. Continua em desenvolvimento: histórico e profundidade não são inventados a partir de um ticker. Não há ligação de contas Kraken. A aplicação permanece fechada à escrita financeira pública.

Antes de concluir 12D, faltam:

1. Aprovar a política de liquidez utilizável e concluir a montagem do contexto para os perfis. O collector público de candles/livro já foi implementado e testado, mas não atribui orçamento de liquidez nem ativa o provider. Faltam mapeamento de unidades, coerência com o ticker e resolução da latência observada no prazo normal.
2. Ligar os providers validados ao entrypoint e ensaiar o pacote no runtime alojado, mantendo os gates fechados enquanto houver critérios por cumprir. A composição dos serviços e os fluxos retomáveis de ciclos/perfis já estão implementados e testados em QA.
3. Validar custo e capacidade com históricos grandes, retenção e concorrência. A maior unidade antes medida foi cerca de 0,90 s CPU local com histórico pequeno; isso não aprova o orçamento Edge. Um cenário ainda indivisível pode exigir maior divisão ou outro runtime, sem relaxar as condições financeiras.
4. Medir separadamente CPU, Auth, SQL e tempo total no ambiente efetivo; validar endereço de ingresso, admissão e configuração. Uma chamada Auth por pedido foi demonstrada em QA; rede, TLS e latências de produção ainda não foram validados.

Não se passa para 12E deixando estes pontos críticos por resolver. A política cloud continua fechada.

## Blocos principais posteriores

| Bloco | Conteúdo |
| --- | --- |
| 13 — alertas e tutorial permanente | Avisos de margem, reforços, caixa, funding e revisão do plano; ajuda contextual e tutorial acessível na Conta |
| 14 — auditoria financeira final | Validação independente dos cálculos, invariantes e cenários extremos; comparação com documentação e exemplos oficiais Kraken, sem integração de conta; limitações e divergências explícitas |
| 15 — Beta e preparação de lançamento | QA web, Android/S25 e PWA; privacidade, atualização/offline, testes com utilizadores e decisão de publicação após critérios aprovados |

Faltam quatro blocos principais contando o Bloco 12 em curso. Depois do 12 ficam três: 13, 14 e 15. Não existe data de lançamento garantida por esta contagem.
