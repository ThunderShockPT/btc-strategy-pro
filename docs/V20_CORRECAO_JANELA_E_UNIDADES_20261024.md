# Correção da janela vazia e clareza das unidades

A janela vazia foi reproduzida ao fechar um formulário com o botão interno «Fechar registo». A versão 7 descartava o formulário e a revisão, mas não fechava o diálogo exterior; o estado «Proposta por confirmar» podia ficar visível sem proposta. O mesmo contrato de fecho aplicava-se aos formulários de movimentos e nova carteira.

A correção encaminha esses botões para o fecho do diálogo, volta ao estado da carteira carregada e retira os erros da operação descartada. Uma janela sem operação oferece uma saída explícita em vez de um painel vazio. Nenhum destes passos acrescenta eventos ou confirma um plano.

O aviso INVALID_FILL_PRECISION_OR_INSTRUMENT passa a explicar que quantidade é BTC e preço é USD por BTC, e remete para o conversor de nominal. O caso de teste «84000 BTC a 84000 USD» continua bloqueado. Uma revisão bloqueada deixa de anunciar eventos a acrescentar; o nominal é apresentado como declarado. Não se corrige nem confirma silenciosamente a quantidade introduzida.

Os testes cobrem o fecho interno dos três formulários, descarte de uma revisão bloqueada sem gravação, e um percurso pela interface privada de cálculo, revisão desmarcada, confirmação explícita e recibo. Esse percurso usa o handler HTTP e PGlite com Auth e fontes explicitamente simuladas. Os factos históricos fictícios conservam a sua própria evidência de regras; não se validam compras antigas com observações novas. Não representa uma nova certificação de fontes públicas ou do ensaio máximo 5000/12.

Na inspeção de leitura, o servidor tinha cálculos concluídos e preservava o diário financeiro do proprietário. Foi também observado um bloqueio de profundidade admissível do plano; o respetivo texto passa a explicar a restrição. A admissão A estrita, os prazos, os preços, os pisos e as funções cloud não são alterados nesta correção. O resultado CI e a versão publicada são registados depois da sua conclusão.
