# V20 — etapas restantes do Bloco 12

Atualizado em 21/10/2026, após 12D5C. As seis etapas abaixo organizam o trabalho ainda necessário; não são seis etapas já concluídas. Subdivisões técnicas não alteram os critérios de aceitação.

| Etapa | Entrega | Critério para concluir |
| --- | --- | --- |
| 12D — contexto financeiro e desempenho | Preços públicos identificados, regras versionadas, histórico/liquidez, revisão consistente e processamento adequado ao runtime | Dados recentes e verificáveis; sem trocar last por mark; sem fabricar observações; confirmação consistente; carga financeira medida no runtime escolhido |
| 12E — interface e sincronização | Ligar carteira, planos, movimentos e correções à conta, incluindo revisão de carteiras existentes | Fluxos completos com sessão, conflitos e offline tratados; preservar Demo, histórico e backups Beta |
| 12F — privacidade | Preferências, termos, portabilidade e eliminação de conta | Operações autenticadas, isoladas, auditadas e documentação revista |
| 12G — backups e migração | Recuperação do servidor e migração gradual compatível com V19 | Backup e ensaio de restauro antes da aplicação; reconciliação; rollback; nenhum apagamento ou reinício de conta |
| 12H — autenticação e email | SMTP exclusivo BTC, confirmação, recuperação e isolamento real | Testes com duas contas Auth reais, proteção contra abuso e recuperação comprovada; sem recursos do Racing Horse Manager |
| 12I — validação integrada | Concorrência, reinício, sessões, offline, migração e recuperação entre dispositivos | Testes ponta a ponta aprovados; todas as verificações da política de abertura satisfeitas; sem pendências críticas do Bloco 12 |

## Situação da etapa atual

12D1 implementa o adaptador de cotação pública e o provider de avaliação manual. 12D2 reduz as validações e reconstruções repetidas, com resultados completos iguais nos casos de regressão e redução média de CPU de 73,7% e 59,9% nos dois casos medidos. 12D3 permite pausar por candidato/cenário, retomar checkpoints serializados e assinados, e bloquear estados alterados, expirados ou de outra build. A maior unidade medida foi 895,45 ms CPU local, em históricos de um evento. 12D4 acrescenta armazenamento privado e leases com commit condicionado à sessão, versão e origem; a recuperação entre workers e após dump/restauro foi testada em PostgreSQL de QA, sem ativação na produção. 12D5A acrescenta os caminhos HTTP autenticados de criação, avanço, estado, resultado e cancelamento, com limites partilhados e teste de resultado completo sem alterações financeiras; não estão compostos no runtime alojado. 12D5B guarda o contexto das revisões no servidor e confirma sem consultar nova cotação, com prazo SQL, sessão e origem verificados; 538 testes V20 locais e 20 testes PostgreSQL nativos de QA passaram. 12D5C liga cálculos de ciclos concluídos e assinados à revisão e confirmação, sem repetir os cenários nem prolongar o prazo original; 543 testes V20 locais e 21 testes PostgreSQL de QA passaram. O fluxo retomável de perfis ainda não está ligado. Continua em desenvolvimento: histórico e profundidade não são inventados a partir de um ticker. Não há ligação de contas Kraken. A aplicação permanece fechada à escrita financeira pública.

Antes de concluir 12D, faltam:

1. Fonte verificável de histórico e liquidez para os perfis, com validade e proveniência.
2. Completar o fluxo retomável de perfis. O novo workflow plan-calculation já aproveita o resultado concluído dos ciclos, sem repetir cenários e com prazo original preservado. Os planos com profilePolicyVersion continuam a exigir revisão de perfil; esse fluxo ainda repete a pesquisa síncrona. Os fluxos anteriores mantêm-se para compatibilidade.
3. Resolver o custo da pesquisa de ciclos sem relaxar o critério de sobrevivência a falhas de adição de margem. A divisão 12D3 preservou os resultados e reduziu a maior unidade medida para cerca de 0,90 s CPU local nos casos de histórico pequeno. A persistência/coordenação já foi implementada e testada em PostgreSQL de QA. A camada HTTP autenticada foi implementada; faltam a sua composição no runtime/dispatcher, a integração do contexto revisto, retenção/capacidade, históricos grandes e validação em Deno/SQL alojados. Um cenário ainda indivisível pode exigir granularidade adicional; não se considera aprovada a execução em Edge.
4. Medir Node versus runtime efetivo, SQL, Auth e concorrência; validar o endereço de ingresso e a admissão no ambiente alojado.

Não se passa para 12E deixando estes pontos críticos por resolver. A política cloud continua fechada.

## Blocos principais posteriores

| Bloco | Conteúdo |
| --- | --- |
| 13 — alertas e tutorial permanente | Avisos de margem, reforços, caixa, funding e revisão do plano; ajuda contextual e tutorial acessível na Conta |
| 14 — auditoria financeira final | Validação independente dos cálculos, invariantes e cenários extremos; comparação com documentação e exemplos oficiais Kraken, sem integração de conta; limitações e divergências explícitas |
| 15 — Beta e preparação de lançamento | QA web, Android/S25 e PWA; privacidade, atualização/offline, testes com utilizadores e decisão de publicação após critérios aprovados |

Faltam quatro blocos principais contando o Bloco 12 em curso. Depois do 12 ficam três: 13, 14 e 15. Não existe data de lançamento garantida por esta contagem.
