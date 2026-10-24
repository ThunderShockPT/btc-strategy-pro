# Bloco 12D13 — admissão temporal

O início de um cálculo manual com mark público exige agora pelo menos 45 segundos de validade remanescente. A verificação ocorre antes da preparação da pesquisa e novamente antes da assinatura. É um limiar operacional provisório: não altera regras financeiras nem garante que o fluxo alojado completo caiba nesse prazo. Continua a ser necessário medi-lo com sessão, fila e concorrência reais.

A validade continua a ser a menor das fontes e das regras. Se faltar tempo devido ao histórico fechado, a API responde HTTP 425, `CALCULATION_WINDOW_TOO_SHORT`, motivo `WAIT_FOR_CLOSED_HISTORY`, `retryAt` e `Retry-After`. O instante é a fronteira original do histórico, apenas uma indicação para recolher dados novos: não garante disponibilidade de novo candle e não autoriza reutilizar ou prolongar o contexto antigo. Não há espera nem repetição automática implementada na interface.

Quando as regras estão perto de expirar, a API responde HTTP 422 e `CALCULATION_RULE_WINDOW_TOO_SHORT`, motivo `RULE_REVIEW_REQUIRED`, sem indicação de repetição. Atualizar preços não renova regras. Outras fontes com prazo curto recebem o motivo `REFRESH_MARKET_CONTEXT`, sem inventar um instante de recuperação. A rejeição ocorre antes da inserção na fila. Os caminhos Demo e de marcação manual conservam o comportamento anterior.

## Regressão e reprodução

Testes cobrem limite exato de 45 segundos, expiração, regras, datas e orçamentos inválidos; contexto público curto rejeitado e contexto recente admitido sem alterações financeiras; resposta autenticada 425, zero trabalhos após rejeição e criação posterior com a mesma chave após remover o impedimento na dependência de teste. Este último teste injeta o bloqueio temporal na fila Demo para verificar a integração HTTP/SQL; não representa uma sessão alojada real com fontes públicas.

O manifesto do motor inclui a nova política. Checkpoints de uma build anterior continuam incompatíveis. O gerador de diagnóstico recusa fixtures de outra build antes de emitir a capacidade temporária. Para um novo diagnóstico, gerar primeiro fixtures com `node scripts/qa/build-hosted-fixtures.cjs`; o teste de arranque usa amostras pequenas isoladas. O arquivo e o bundle exato de 12D12 permanecem evidência histórica daquela build, sem reinterpretação como validação da build atual.

## Por concluir

A implementação da admissão está preparada e testada localmente; a resolução operacional da janela depende de recolher contexto novo e demonstrar que o fluxo completo termina a tempo. Não foi efetuado novo deploy, migração, ligação de conta Kraken ou escrita financeira. 12D permanece aberto, seguido de 12E–12I e do teste Samsung S25 antes do Bloco 13.
