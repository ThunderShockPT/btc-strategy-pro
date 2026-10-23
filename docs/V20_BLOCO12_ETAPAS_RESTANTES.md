# V20 — etapas restantes do Bloco 12

Atualizado em 23/10/2026, após 12D23 e preparação do painel da conta ligado aos cálculos retomáveis. As seis etapas abaixo organizam o trabalho ainda necessário; não são seis etapas já concluídas. Subdivisões técnicas não alteram os critérios de aceitação.

| Etapa | Entrega | Critério para concluir |
| --- | --- | --- |
| 12D — contexto financeiro e desempenho | Preços públicos identificados, regras versionadas, histórico/liquidez, revisão consistente e processamento adequado ao runtime | Dados recentes e verificáveis; sem trocar last por mark; sem fabricar observações; confirmação consistente; carga financeira medida no runtime escolhido |
| 12E — interface e sincronização | Ligar carteira, planos, movimentos e correções à conta, incluindo revisão de carteiras existentes | Fluxos completos com sessão, conflitos e offline tratados; preservar Demo, histórico e backups Beta |
| 12F — privacidade | Preferências, termos, portabilidade e eliminação de conta | Operações autenticadas, isoladas, auditadas e documentação revista |
| 12G — backups e migração | Recuperação do servidor e migração gradual compatível com V19 | Backup e ensaio de restauro antes da aplicação; reconciliação; rollback; nenhum apagamento ou reinício de conta |
| 12H — autenticação e email | SMTP exclusivo BTC, confirmação, recuperação e isolamento real | Testes com duas contas Auth reais, proteção contra abuso e recuperação comprovada; sem recursos do Racing Horse Manager |
| 12I — validação integrada | Concorrência, reinício, sessões, offline, migração e recuperação entre dispositivos | Testes ponta a ponta aprovados; todas as verificações da política de abertura satisfeitas; sem pendências críticas do Bloco 12 |

## Situação da etapa atual

12D1 implementa o adaptador de cotação pública e o provider de avaliação manual. 12D2 reduz as validações e reconstruções repetidas, com resultados completos iguais nos casos de regressão e redução média de CPU de 73,7% e 59,9% nos dois casos medidos. 12D3 permite pausar por candidato/cenário, retomar checkpoints serializados e assinados, e bloquear estados alterados, expirados ou de outra build. A maior unidade medida foi 895,45 ms CPU local, em históricos de um evento. 12D4 acrescenta armazenamento privado e leases com commit condicionado à sessão, versão e origem; a recuperação entre workers e após dump/restauro foi testada em PostgreSQL de QA, sem ativação na produção. 12D5A acrescenta os caminhos HTTP autenticados de criação, avanço, estado, resultado e cancelamento, com limites partilhados e teste de resultado completo sem alterações financeiras; não estão compostos no runtime alojado. 12D5B guarda o contexto das revisões no servidor e confirma sem consultar nova cotação, com prazo SQL, sessão e origem verificados; 538 testes V20 locais e 20 testes PostgreSQL nativos de QA passaram. 12D5C liga cálculos de ciclos concluídos e assinados à revisão e confirmação, sem repetir os cenários nem prolongar o prazo original; 543 testes V20 locais e 21 testes PostgreSQL de QA passaram. 12D5D liga também os perfis Seguro, Equilibrado e Arriscado, incluindo alterações de planos já aprovados, sem repetir cenários nem alterar o piso sem decisão explícita; 549 testes V20 locais e 22 testes PostgreSQL de QA passaram. O provider de histórico/liquidez de produção ainda não está concluído. 12D6 compõe os serviços privados no runtime, com identidade validada uma vez por pedido e sessão SQL verificada em cada transação; configuração incompleta mantém indisponibilidade. Passaram 553 testes V20 locais e 23 testes PostgreSQL de QA. O entrypoint de produção continua sem providers reais e fechado. 12D7A acrescenta recolha pública validada de candles de marcação completos e livro de ordens, com replay real. Passaram 567 testes V20 locais e 23 testes PostgreSQL de QA. O ensaio real funcionou em cerca de 4,84 s com limite de 10 s, mas o limite normal de 3 s falhou; a latência não está aprovada. Em 12D7B, a opção 1 foi aprovada e implementada: apenas tamanho visível ao melhor ask, mantendo a participação dos perfis; o contexto público conserva fontes e datas e limita checkpoints/revisões à validade mais curta. Passaram 579 testes na bateria completa, mais as suites finais de 14 casos do provider e 6 de revisões (com três casos adicionais). Em 12D7C, os candles fechados passam a ser reutilizados apenas dentro da validade original, reduzindo pedidos repetidos; foram acrescentados diagnóstico por fonte e cinco testes com os exemplos das imagens Kraken. Passaram 593 testes V20 locais. O novo ensaio normal de 3 s voltou a falhar; o ensaio diagnóstico de 10 s terminou em cerca de 5,43 s. A ativação no entrypoint e a latência continuam pendentes. Em 12D8, seis cargas sequenciais e três concorrentes foram executadas com históricos grandes, preservando resultados e inputs. Com 5000 movimentos, uma unidade atingiu 3,88 s CPU local mesmo com maxCycles=1; a capacidade continua bloqueada e exige dividir cada cenário em passos menores. Quatro testes novos da ferramenta de QA passaram. Em 12D9, uma entrega agrupada acrescenta retoma dentro dos cenários, compactação das regras e do prefixo histórico, ajustes da fila/API e migração operacional preparada. Passaram 614 testes V20 finais; a migração passou em PostgreSQL de QA com 23 testes. O desempenho alojado permanece por aprovar: há passos com várias ações e custo de reconstrução/assinatura a medir. Continua em desenvolvimento: histórico e profundidade não são inventados a partir de um ticker. Não há ligação de contas Kraken. A aplicação permanece fechada à escrita financeira pública.

### Atualização agrupada 12D10–12D11

12D10 elimina a reconstrução repetida para obter o ledger e a projeção efetiva: 617 testes V20, 386 verificações Beta e 23 PostgreSQL passaram na CI do commit e812a5692938004d528564433998590f5c10ae29. 12D11 agrupa até dois passos em pedidos de menor carga e conserva um passo para bases acima de 1000 eventos ou pesquisas acima de 1500000 bytes. Na amostra isolada de 1000 movimentos e 12 ciclos, os avanços desceram de 203 para 104 e o tempo local somado de 33.16 para 24.07 segundos, com resultado completo igual e input intacto. O prazo não aumentou e pode ser inferior a 60 segundos conforme a validade mais curta das fontes. Os relatórios próprios distinguem os testes locais da CI. Estas otimizações não concluem a etapa nem aprovam o alojamento.

### Ensaio alojado 12D12

O diagnóstico reproduzível passou nove unidades sintéticas no alojamento, com resultados completos iguais e histórico intacto; máximo CPU observado 1533 ms. Quatro recolhas públicas passaram no timeout normal de 3 s. Uma consulta SQL read only passou com TLS verificado após corrigir o bootstrap dos globais Node no bundle QA. A função temporária foi encerrada na versão 10. São amostras isoladas, não o fluxo completo com sessão real, fila e concorrência. Foi confirmada uma janela de apenas 2817 ms de validade perto do fecho de minuto: a admissão temporal continua um bloqueio, sem prolongar validade. Ver relatório V20_BLOCO12D12_ENSAIO_ALOJADO.md e SUMMARY JSON.

### Admissão temporal 12D13

Implementada admissão mínima provisória de 45 segundos para cálculos manuais com mark público, antes de preparar e assinar. A API devolve 425 com indicação de recolha futura quando o histórico deixa pouco tempo, sem inserir trabalho; regras perto de expirar exigem revisão com 422. Não prolonga validade nem implementa espera automática. Fixtures antigas passam a ser recusadas pelo gerador QA. Ver V20_BLOCO12D13_ADMISSAO_TEMPORAL.md. Falta comprovar o fluxo alojado completo dentro da janela; 12D permanece aberto.

### Fluxo integrado 12D14

Três testes isolados ligam os adaptadores públicos ao runtime HTTP, fila, pesquisa dos três perfis, retoma entre workers, revisão e confirmação. Cobrem rejeição perto do minuto, recolha de histórico novo, resultados iguais ao cálculo direto, validade original, isolamento, revogação de sessão e confirmação tardia recusada, com posição manual já existente. Corrigida a propagação do relógio de servidor para Auth/checkpoints. Fontes, identidade e relógio SQL são sintéticos em PGlite: isto não substitui o ensaio alojado com sessão real nem comprova capacidade. Ver V20_BLOCO12D14_FLUXO_PUBLICO_INTEGRADO.md.

### Recálculo do perfil atual 12D15

Resolvido o pedido público de ciclos sem mudança de perfil: reutiliza o perfil e piso do plano atual através do caminho validado de perfis, incluindo profundidade, reservas, sobrevivência estrita e validade original. A chave distingue recálculo de alteração explícita; repetições não criam novo trabalho nem renovam fontes. Testados o resultado completo, revisão/confirmação e novo recálculo de um plano já aprovado, sem alterar movimentos ou saldos. São ensaios isolados; não aprovam o fluxo alojado. Ver V20_BLOCO12D15_RECALCULO_PERFIL_ATUAL.md.

### Ambiente descartável Auth/SQL 12D16

Preparado o job real-auth-runtime com GoTrue oficial e PostgreSQL nativo em loopback da CI. Duas contas de QA entram por password; a suite percorre HTTP, fila, retoma, revisão/confirmação, assinatura inválida, isolamento e logout, com relógio real e sem recursos de produção. Fontes/regras continuam sintéticas; confirmação de email é automática apenas no laboratório. Não substitui medição no Edge alojado nem testes SMTP. Ver V20_BLOCO12D16_AUTH_SQL_ISOLADOS.md e resultado da CI no PR.

### Capacidade com Auth/SQL 12D17

A CI passa a medir quatro cargas independentes: 3 movimentos/1 ciclo, 1000/12, 5000/1 e 5000/12. Relatórios distinguem conclusão de rejeição ou expiração; o caso máximo não aprova capacidade apenas por bloquear corretamente. Comparação direta fora do tempo medido, métricas por ação e validação das referências de fees/histórico de QA. Resultados efetivos no PR; não equivalem a limites do Edge alojado. Ver V20_BLOCO12D17_CAPACIDADE_AUTH_SQL.md.

### Redução de replays 12D18–12D19

12D18 junta início e primeiro lote de cada cenário. A CI 39924812137 passou; 1000/12 concluiu em 16,116 s, 5000/1 em 41,562 s e 5000/12 expirou em 60,441 s sem alterações financeiras. 12D19 acrescenta reavaliação em memória com acumuladores Decimal exatos quando apenas o preço muda, mantendo replay integral em ações, novas regras e retomas. O novo ensaio de capacidade será registado na PR. Ver V20_BLOCO12D18_INICIO_STRESS.md e V20_BLOCO12D19_REAVALIACAO_EXATA.md. Estes passos não concluem 12D nem aprovam o Edge.

### Controlo SQL compacto 12D20

As operações de controlo deixam de transportar repetidamente o envelope completo: um avanço recebe-o na aquisição da lease, mantendo a autenticação e a origem integral. Resultado/revisão e idempotência continuam a ler o necessário. Acrescentadas métricas agregadas de consultas no laboratório, sem informação privada. Ver V20_BLOCO12D20_CONTROLO_SQL_COMPACTO.md e matriz efetiva na PR #34; isto não conclui 12D.

### Datas e cópias internas 12D21

Cada string exata de data passa a ser validada uma vez por reconstrução, mantendo todas as verificações temporais por evento. Ações copiam o array interno do histórico já destacado, sem serializar novamente todos os factos; o replay integral e o rollback continuam após cada evento. Ver V20_BLOCO12D21_DATAS_E_JOURNAL.md e resultados da matriz na PR #34. A capacidade máxima continua por aprovar.

### Ações transacionais em memória 12D22

O motor valida o histórico inteiro à entrada e aplica novos eventos da mesma ação sobre acumuladores exatos, com verificações por evento e rollback integral de valores, mapas, IDs, custos e trace. Retomas e mudanças de regras continuam a exigir replay integral. Os ledgers são comparados com replay completo após cada evento; não há alteração de lotes, prazos ou escrita financeira real. A primeira matriz concluiu a carga máxima em 55,316 s (CI 39941063091), com resultado completo igual, mas a repetição obrigatória expirou e falhou. O agrupamento máximo de dois passos passa a abranger até 5000 eventos/4 MB, com métricas de CPU de processo na QA e validação alojada ainda pendente. A conclusão passa a obrigatória também no caso máximo, com repetição em janela favorável de QA. Ver V20_BLOCO12D22_ACOES_TRANSACIONAIS.md e matriz efetiva na PR #34. Isto não aprova o Edge nem todas as janelas de admissão.

### Preparação de candidatos e CPU alojado 12D23

O ensaio no Edge encontrou HTTP 546 / CPU excedido nos inícios de 5000 movimentos/12 ciclos, incluindo perfil. Corrigida a reconstrução repetida por candidato: uma única projeção validada alimenta a preparação. A repetição passou 16 hashes completos; os workers dos dois inícios registaram 560 e 695 ms, com máximo global observado 900 ms. A função temporária foi encerrada na versão 14. A CI passou 658 testes V20, quatro cargas Auth/SQL obrigatórias e restantes regressões; a máxima concluiu em 47,446 s. Ver V20_BLOCO12D23_CPU_ALOJADO.md e artefactos V20_12D23_* em docs/qa. Ainda faltam fluxo alojado completo, ingresso, concorrência, pico de memória e validação de todas as janelas de admissão.

## Pendências consolidadas para fechar o Bloco 12

| Prioridade | Trabalho concreto | Situação verificável |
| --- | --- | --- |
| 1 | Fluxo completo no alojamento: sessão, fila, SQL, revisão e confirmação | CPU das unidades passou; fluxo completo apenas em CI com Auth/SQL real e fontes sintéticas. Última carga máxima: 45,819 s na CI 39949964653 |
| 2 | Validar admissão temporal, ingresso, concorrência e pico de memória | O mínimo provisório de 45 s é inferior a tempos máximos observados. Ainda não constitui garantia de conclusão; não aumentar validade das fontes |
| 3 | Ligar interface de carteira/planos/movimentos/correções e cálculos à conta | Painel da conta liga leitura, cálculo, revisão e confirmação na prévia, com cliente fornecido pela composição autenticada. Movimentos, compras/vendas por ciclo e correções auditáveis com comparação/confirmação ligados em QA. Diretório e criação sem posição ligados em QA. Login, importação de posições, formulários de alocações e testes alojados completos pendentes |
| 4 | Privacidade e ciclo de vida da conta | Backup financeiro autenticado por carteira implementado e validado em QA. Portabilidade integral, preferências, termos e eliminação da conta ainda pendentes |
| 5 | Recuperação e migração V19 | Produção ainda contém apenas projects/project_snapshots V19. Migrações V20 não aplicadas; restauro, reconciliação e rollback de produção pendentes. QA nativa já ensaia pg_dump cifrado e pg_restore |
| 6 | Email e recuperação de acesso exclusivos BTC | Inspeção confirmou que só existe domínio verificado do outro projeto. Falta domínio/remetente próprio BTC, SMTP e ensaio real de confirmação/recuperação. Duas contas descartáveis na CI não aprovam email de produção |
| 7 | Teste integrado e S25 | Preparar acesso de teste e roteiro de conta, cálculo, revisão, confirmação, offline, recuperação e segundo dispositivo; executar antes do Bloco 13 |

Não reabrir otimizações antigas sem uma falha que as justifique. Os relatórios históricos acima conservam os números da altura; a tabela constitui a lista atual de pendências. A política cloud continua fechada até os critérios estarem comprovados.

### Ligação do cliente aos cálculos

O cliente `cloud-client-v20.js` expõe início, avanço, estado, resultado e cancelamento, sem polling ou confirmação automática. Um início cuja resposta se perdeu conserva a mesma chave para repetição explícita; novo início e preparação financeira ficam bloqueados até reconciliar. Um avanço incerto pode ser consultado por estado. Logout e troca de conta eliminam o estado privado e invalidam respostas tardias. O painel da conta já utiliza este protocolo em QA isolada, com revisão de reservas e compras, pausa, aceitação explícita e recibos recuperáveis. Ver V20_CONTA_PAINEL_INTEGRACAO.md. A composição autenticada e os restantes fluxos continuam pendentes; o frontend publicado não foi alterado.

## Blocos principais posteriores

| Bloco | Conteúdo |
| --- | --- |
| 13 — alertas e tutorial permanente | Avisos de margem, reforços, caixa, funding e revisão do plano; ajuda contextual e tutorial acessível na Conta |
| 14 — auditoria financeira final | Validação independente dos cálculos, invariantes e cenários extremos; comparação com documentação e exemplos oficiais Kraken, sem integração de conta; limitações e divergências explícitas |
| 15 — Beta e preparação de lançamento | QA web, Android/S25 e PWA; privacidade, atualização/offline, testes com utilizadores e decisão de publicação após critérios aprovados |

Faltam quatro blocos principais contando o Bloco 12 em curso. Depois do 12 ficam três: 13, 14 e 15. Não existe data de lançamento garantida por esta contagem.
