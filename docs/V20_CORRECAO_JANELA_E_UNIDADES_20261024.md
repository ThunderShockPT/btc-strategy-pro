# Correção da janela vazia e clareza das unidades

A janela vazia foi reproduzida ao fechar um formulário com o botão interno «Fechar registo». A versão 7 descartava o formulário e a revisão, mas não fechava o diálogo exterior; o estado «Proposta por confirmar» podia ficar visível sem proposta. O mesmo contrato de fecho aplicava-se aos formulários de movimentos e nova carteira.

A correção encaminha esses botões para o fecho do diálogo, volta ao estado da carteira carregada e retira os erros da operação descartada. Uma janela sem operação oferece uma saída explícita em vez de um painel vazio. Nenhum destes passos acrescenta eventos ou confirma um plano.

O aviso INVALID_FILL_PRECISION_OR_INSTRUMENT passa a explicar que quantidade é BTC e preço é USD por BTC, e remete para o conversor de nominal. O caso de teste «84000 BTC a 84000 USD» continua bloqueado. Uma revisão bloqueada deixa de anunciar eventos a acrescentar; o nominal é apresentado como declarado. Não se corrige nem confirma silenciosamente a quantidade introduzida.

Os testes cobrem o fecho interno dos três formulários, descarte de uma revisão bloqueada sem gravação, e um percurso pela interface privada de cálculo, revisão desmarcada, confirmação explícita e recibo. Esse percurso usa o handler HTTP e PGlite com Auth e fontes explicitamente simuladas. Os factos históricos fictícios conservam a sua própria evidência de regras; não se validam compras antigas com observações novas. Não representa uma nova certificação de fontes públicas ou do ensaio máximo 5000/12.

Na inspeção de leitura, o servidor tinha cálculos concluídos e preservava o diário financeiro do proprietário. Foi também observado um bloqueio de profundidade admissível do plano; o respetivo texto passa a explicar a restrição. A admissão A estrita, os prazos, os preços, os pisos e as funções cloud não são alterados nesta correção. O resultado CI e a versão publicada são registados depois da sua conclusão.

O novo ensaio rápido detetou ainda uma perda involuntária dos milissegundos da data ao editar outros campos. A data inicial do rascunho passa a ser preservada até a pessoa editar o próprio campo da data. Não se alteram datas de fontes, não se ajusta a execução para passar uma regra histórica e o servidor mantém a verificação da evidência válida para a data declarada.

## Publicação e evidência

O CI [40134162160](https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40134162160) passou as sete tarefas no commit `14713f29867ac2518a73b136f316b7eaf3910c92`. Os quatro testes de browser incluem a navegação em dois tamanhos, fechos internos, o percurso privado de cálculo/revisão/confirmação/recibo e a recusa de uma quantidade inválida. O teste da recusa escolhe explicitamente um ciclo manual de QA, pois o ciclo anterior já estava fechado após a revisão do plano; não se altera o motor para aceitar uma etapa fechada.

Foi publicada a versão 8 no mesmo Site privado, a partir do commit de artefacto `d6d3ec36cb1718b5dcf01e7c983d9d48cd6fd3e7`. Ver [recibo de CI/publicação](qa/V20_DIALOG_UNITS_RELEASE_20261024.json). A chave da sessão e a audiência só do proprietário são preservadas. O arquivo final não inclui o Auth simulado de QA nem o contacto administrativo. Não se alteraram funções, migrações ou política cloud nesta correção.

Durante a gravação inicial do código houve um commit com árvore incompleta. A árvore completa da branch anterior foi reposta no commit `2870b8aa60a41568c4a569c21c5ef0799fb6c139`, antes de qualquer publicação. O estado final foi comparado com `1925cfc`: contém a correção e os testes, sem ficheiros removidos; não foi recriado a partir da main. A aplicação publicada e os dados não foram afetados por esse erro de gravação.

O teste interativo de fecho foi observado na prévia com dados fictícios. Após uma interrupção, essa sessão de browser deixou de estar disponível; a verificação final do percurso completo está no browser do CI acima. Não se apresenta uma imagem anterior como prova desta correção. O teste físico no S25 e as restantes pendências do Bloco 12 continuam abertos.

Para obter a atualização, recarregar a página (Ctrl+F5 no PC). Num registo pelo nominal, preencher o montante USD e o preço USD/BTC, converter e conferir a quantidade efetivamente executada e a comissão. A conversão arredonda ao lote e apresenta o remanescente; não altera automaticamente um registo real ou uma data para o tornar admissível.
