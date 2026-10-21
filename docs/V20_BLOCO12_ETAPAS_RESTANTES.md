# V20 — etapas restantes do Bloco 12

Atualizado em 21/10/2026, após 12D2. As seis etapas abaixo organizam o trabalho ainda necessário; não são seis etapas já concluídas. Subdivisões técnicas não alteram os critérios de aceitação.

| Etapa | Entrega | Critério para concluir |
| --- | --- | --- |
| 12D — contexto financeiro e desempenho | Preços públicos identificados, regras versionadas, histórico/liquidez, revisão consistente e processamento adequado ao runtime | Dados recentes e verificáveis; sem trocar last por mark; sem fabricar observações; confirmação consistente; carga financeira medida no runtime escolhido |
| 12E — interface e sincronização | Ligar carteira, planos, movimentos e correções à conta, incluindo revisão de carteiras existentes | Fluxos completos com sessão, conflitos e offline tratados; preservar Demo, histórico e backups Beta |
| 12F — privacidade | Preferências, termos, portabilidade e eliminação de conta | Operações autenticadas, isoladas, auditadas e documentação revista |
| 12G — backups e migração | Recuperação do servidor e migração gradual compatível com V19 | Backup e ensaio de restauro antes da aplicação; reconciliação; rollback; nenhum apagamento ou reinício de conta |
| 12H — autenticação e email | SMTP exclusivo BTC, confirmação, recuperação e isolamento real | Testes com duas contas Auth reais, proteção contra abuso e recuperação comprovada; sem recursos do Racing Horse Manager |
| 12I — validação integrada | Concorrência, reinício, sessões, offline, migração e recuperação entre dispositivos | Testes ponta a ponta aprovados; todas as verificações da política de abertura satisfeitas; sem pendências críticas do Bloco 12 |

## Situação da etapa atual

12D1 implementa o adaptador de cotação pública e o provider de avaliação manual. 12D2 reduz as validações e reconstruções repetidas, com resultados completos iguais nos casos de regressão e redução média de CPU de 73,7% e 59,9% nos dois casos medidos. Continua em desenvolvimento: histórico e profundidade não são inventados a partir de um ticker. Não há ligação de contas Kraken. A aplicação permanece fechada à escrita financeira pública.

Antes de concluir 12D, faltam:

1. Fonte verificável de histórico e liquidez para os perfis, com validade e proveniência.
2. Fixar a proposta revista no servidor durante o prazo de confirmação. O adaptador SQL atual volta a obter contexto ao confirmar; uma nova cotação muda o hash e exige nova revisão. Não basta ligar um feed continuamente variável.
3. Resolver o custo da pesquisa de ciclos sem relaxar o critério de sobrevivência a falhas de adição de margem. A otimização 12D2 reduziu o custo, mas o caso de 50 000 USD ainda registou máximo de cerca de 6,3 s CPU e média de 3,2 s no ensaio comparado. Não aprova o cálculo síncrono integral para um orçamento de 2 s por pedido Edge; faltam repartição/processamento adequado e validação real.
4. Medir Node versus runtime efetivo, SQL, Auth e concorrência; validar o endereço de ingresso e a admissão no ambiente alojado.

Não se passa para 12E deixando estes pontos críticos por resolver. A política cloud continua fechada.

## Blocos principais posteriores

| Bloco | Conteúdo |
| --- | --- |
| 13 — alertas e tutorial permanente | Avisos de margem, reforços, caixa, funding e revisão do plano; ajuda contextual e tutorial acessível na Conta |
| 14 — auditoria financeira final | Validação independente dos cálculos, invariantes e cenários extremos; comparação com documentação e exemplos oficiais Kraken, sem integração de conta; limitações e divergências explícitas |
| 15 — Beta e preparação de lançamento | QA web, Android/S25 e PWA; privacidade, atualização/offline, testes com utilizadores e decisão de publicação após critérios aprovados |

Faltam quatro blocos principais contando o Bloco 12 em curso. Depois do 12 ficam três: 13, 14 e 15. Não existe data de lançamento garantida por esta contagem.
