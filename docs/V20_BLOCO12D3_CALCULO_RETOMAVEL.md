# V20 — 12D3: pesquisa de ciclos por unidades retomáveis

21/10/2026. Branch feat/v20-resumable-cycle-search, a partir de dddcf7690ebb0801c0e3e59b4a86f7c2ebd3acd8. Escrita financeira e registo público permanecem fechados.

## Implementação

cycle-planner.js passa a separar a preparação da pesquisa, a avaliação dos candidatos por cenário e a obtenção do resultado completo. beginSearch cria o trabalho; advanceSearch avança um cenário por predefinição; searchResult recusa trabalhos incompletos. generate mantém a API anterior e percorre o mesmo motor até concluir. Não foi criado um segundo motor matemático.

Cada candidato financiável é avaliado na mesma ordem anterior: descida, subida, volatilidade, gap, ordens não executadas, execuções parciais e adições de margem falhadas. Só depois dos sete cenários pode ser selecionado ou rejeitado. Se não passar, a pesquisa continua no candidato seguinte. O teste de caixa continua a preceder a simulação. Uma interrupção não transforma um resultado parcial em plano viável ou inviável.

O checkpoint é JSON serializável e preserva o preço de referência, regras, inputs, candidatos, auditoria, cursor e resultados já avaliados. Não depende da memória de um worker. Mantêm-se o limite técnico de 12, os arredondamentos, a precisão decimal, as regras de margem e a política estrita aprovada.

## Serviço interno do servidor

backend/calculation-checkpoints.cjs fornece start/advance/result, sem endpoint público. A chave HMAC-SHA256 de 32 bytes é copiada para memória privada do serviço. Cada envelope autentica todo o checkpoint, o proprietário, projeto, cenário, hash do estado de origem e prazo. Não confia num hash de carteira enviado pelo cliente: loadSnapshot deve usar o adaptador Store.snapshot existente, com Auth e sessão SQL verificados.

Cada continuação relê o estado autenticado e recusa alterações da carteira ou do plano, mesmo sem nova execução financeira. Sessões revogadas são recusadas. O prazo é limitado a 60 segundos, ao prazo da cotação manual e à validade das regras, prevalecendo o mais próximo. É verificado antes e depois das esperas assíncronas e novamente depois do cálculo. Não é renovado ao progredir ou repetir pedidos.

Uma repetição da mesma unidade produz o mesmo envelope, sem duplicar cenários ou movimentos. Não há compras, depósitos, transferências, aplicação de planos ou persistência financeira. O serviço exige a política requireFailedMarginSurvival=true; a comparação condicional do motor puro continua sem permissão para aplicação.

policies/calculation-checkpoint-build-20261021.json contém hashes dos módulos financeiros envolvidos e do lockfile. O manifesto entra na assinatura do checkpoint. Um envelope de outra build é recusado, mesmo que a assinatura ainda seja válida. Um teste compara os hashes com os ficheiros reais, evitando misturar resultados de versões diferentes. scripts/build-calculation-manifest.cjs regenera o manifesto quando esses ficheiros são deliberadamente alterados. A chave real ainda não foi configurada ou implantada.

## Medição executada

V20_BLOCO12D3_BENCHMARK.json contém três execuções por caso. O ensaio inclui preparação, verificação/assinatura e continuação, com serialização JSON; utiliza Node local, tempo sintético fixo e adaptadores de sessão/carteira de QA sem rede ou SQL.

| Capital sintético | Limite configurado | Eventos originais | Unidades por execução | Máximo CPU por unidade |
| --- | --- | --- | --- | --- |
| 2 000 USD | 12 | 1 | 7 | 328,56 ms |
| 50 000 USD | 12 | 1 | 7 | 895,45 ms |

Preparação: máximos CPU de 117,32 ms e 22,31 ms. Obtenção final: 22,02 ms e 33,96 ms. São medidas por etapa, não uma promessa de tempo total. A serialização e a revalidação acrescentam trabalho total em troca de retomada e unidades menores.

Os resultados finais foram comparados integralmente com generate em todas as amostras. Isto não demonstra desempenho em Deno alojado, com Auth/SQL reais, concorrência ou milhares de movimentos. Um cenário continua a ser uma unidade indivisível: se um histórico grande a tornar demasiado pesada, será necessária granularidade adicional ou execução adequada. Não existe limite rígido de CPU garantido pelo parâmetro de uma unidade.

## Testes e falhas encontradas

Os 24 testes novos abrangem seis casos de referência anteriores à otimização, serialização em cada pausa, resultado incompleto, zero viável/inviabilidade, lotes inválidos, adulteração, âmbito, chave, build, expiração da cotação/regras, espera SQL, preparação longa, sessão revogada, repetição, novo processo Node e ligação ao adaptador PostgreSQL de QA.

Durante a extração da função final foi detetada uma referência a ctx fora do novo âmbito. Foi corrigida; os seis hashes completos de referência voltaram a coincidir. O primeiro teste PostgreSQL nativo tentou reutilizar uma política de QA com reserva de 100 USD depois de outro teste a aumentar para 200. O motor recusou a redução. A fixture passou a preservar a reserva existente; não foi relaxada a regra.

A identidade remota Auth é simulada nos testes de QA. Sessões e consultas financeiras são verificadas em SQL; isto não substitui dois logins reais, SMTP ou testes de produção. Os hashes anteriores são regressão, não auditoria financeira independente.

## Integração que permanece pendente

Não há ainda fila durável, agendador, leases/CAS ou gravação automática destes envelopes numa tabela privada. O teste de retomada fornece o checkpoint serializado a outro processo; não é apresentado como recuperação automática de uma fila de produção. Duplicar uma unidade não altera dinheiro, mas poderá duplicar trabalho CPU até existir coordenação persistente.

Não foi exposto um endpoint para enviar checkpoints pelo frontend. Os envelopes contêm dados financeiros e devem permanecer no servidor, associados à conta; a chave nunca pode entrar no frontend. A chave de produção deve ser exclusiva BTC, com rotação/retencão adequada. Nenhum recurso do Racing Horse Manager foi usado.

A futura integração deve guardar o contexto revisto e o progresso no servidor, revalidar o hash do projeto e exigir a confirmação explícita antes de aplicar um plano. O adaptador SQL financeiro atual continua a reconstruir a proposta na confirmação; esta refatoração não abre automaticamente esse fluxo a preços variáveis.

12D continua em curso: faltam persistência/coordenação dos trabalhos, integração do contexto revisto, histórico/liquidez verificáveis e ensaio no runtime efetivo. Permanecem as seis etapas de 12D a 12I e os quatro blocos principais contando o 12.

Não houve alterações a main/GitHub Pages, dados reais, migrações, emails ou implantação. A pré-visualização visual mantém a versão anterior; esta fase altera processamento interno.

## Checkpoint final executado

- 511/511 testes V20 locais, zero falhas/ignorados, 80,68 s. Os 24 testes novos estão incluídos neste total.
- 386 verificações V19 executadas: Auth 19, cloud 26, release 38, responsividade 37, planeador 266.
- CI 39643687392 concluída com ambos os jobs aprovados no código d9780fdfa56c27b1e0b918b2d86acb0671a7324b.
- Job PostgreSQL 119373558395: 14/14 aprovados, incluindo a nova continuação entre duas instâncias, repetição determinística, sessão revogada e restauro isolado anterior. Logs lidos após a conclusão.
- Os nove ficheiros de código/testes/configuração foram comparados com o remoto e coincidem integralmente.
- Bundle fechado reconstruído localmente com 478 957 bytes; teste de arranque aprovado. Não foi implantado e não contém uma nova rota de continuação.

A aprovação deste checkpoint é de implementação e regressão isoladas. Não conclui 12D nem abre sincronização, contas ou aplicação automática de planos.
