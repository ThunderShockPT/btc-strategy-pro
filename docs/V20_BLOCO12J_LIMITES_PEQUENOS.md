# 12J — Limites do agrupamento de origens pequenas

Em 24/10/2026 foram ensaiadas 16 unidades sintéticas no Edge BTC, com 100 e 101 movimentos e limite de 12 ciclos. Incluem início, avanço selecionado pelo custo CPU local, resultado e origem da revisão de perfil. Para 100 movimentos foram selecionados também dois avanços dentro do limite de oito passos: pesquisa serializada de 209035 bytes no percurso simples e 215893 no perfil. A seleção separada evita confundir o avanço mais caro com o ramo de oito passos: o crescimento do estado pode devolver uma origem de 100 eventos ao limite de dois passos.

Todos os 16 pedidos autorizados devolveram HTTP 200, hash do resultado completo igual e fixture intacta. Um pedido sem capability foi recusado com 401. O teste usa o módulo de checkpoint real e o bundle Edge construído; não envolve contas nem escrita financeira. Os oito testes do handler e do bundle também passaram localmente.

A função temporária serviu a versão 15 e foi imediatamente substituída pela versão 16, estática e fechada com HTTP 503 `QA_COMPLETE_CLOSED`. A health principal mantém `cloudAvailable:false`; não houve publicação do frontend nem alteração dos gates financeiros. O pedido de logs não devolveu registos utilizáveis: não se apresenta tempo CPU de worker ou memória de pico como medidos.

Os ficheiros `qa/V20_12J_SMALL_BOUNDARY_*` preservam o relatório HTTP, manifesto de hashes, fixtures e bundle exatos comprimidos, sem a capability. O SUMMARY inclui hashes dos artefactos e o maior tempo de operação observado. O gerador aceita `--small-boundary`; a execução sem argumento conserva a matriz anterior de maior carga.

São unidades selecionadas com regras, preços e relógio sintéticos. Não aprovam todos os estados de oito passos, concorrência, ingresso, memória de pico, sessão/fila completa, admissão com fontes públicas ou a capacidade máxima alojada. O Bloco 12 continua aberto.
