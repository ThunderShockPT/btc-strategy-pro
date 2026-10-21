# V20 — Bloco 7B: política A estrita e fecho dos perfis

21/10/2026 · Base: Bloco 7A (`1ba7549b7e2997434d0f63d0064d2d304fe7ef60`).

## Decisão e âmbito

Depois da apresentação dos parâmetros e da proposta A para a Beta, o proprietário respondeu **«Avançar»**. Esta instrução foi entendida como autorização para seguir a proposta apresentada, **A — estrita**. A interpretação foi comunicada antes das alterações. Não foi interpretada como aprovação de publicação na main, registo público, integração de contas Kraken ou ativação cloud.

A política nova é `profiles-beta-2026-10-21.1`, em `policies/profiles-beta-20261021.json`. Conserva exatamente os parâmetros da proposta 7A: referências 40 000/20 000/10 000 USD; reservas base 30/20/10%; orçamento nominal por novo ciclo 25/50/75%; restantes limites de espaçamento, dados e domínio indicados no relatório anterior. O JSON original `profiles-proposal-20261021.json` e os cenários originais do Bloco 7A permanecem inalterados e desativados como registo histórico.

A aprovação é de uma política experimental da Beta. Não é validação estatística, avaliação de adequação pessoal, garantia de proteção ou decisão final de lançamento. Continuam pendentes a validação independente do Bloco 14, o QA e os gates de publicação.

## O que o código permite agora

`risk-profiles.js` carrega uma cópia imutável da política aprovada, verifica a versão e a admissão estrita e conserva a fonte/versão em cada resultado. Alterar o objeto JSON original depois de carregar o módulo não altera a política em uso.

Uma prévia A só tem `canApply=true` quando existe um candidato que passa os requisitos financeiros e os cenários do motor. Uma posição que atinja manutenção no caminho de falha de adições de margem continua a tornar o plano inviável; adicionar dinheiro apenas à carteira não altera esse resultado.

B continua disponível **só para comparação**, com `comparison-only-unapproved-admission` e `canApply=false`. Não se pode confirmar B usando uma revisão individual, um objeto editado ou a API genérica de ciclos sobre um plano que já tem perfil automático.

A confirmação de um plano A exige consentimento para o `reviewHash` exato, mesmo depois de a política de produto ter sido aprovada. O workflow reprocessa a proposta e rejeita estados alterados, premissas editadas, versões erradas e planos inviáveis.

`confirmProfileChange` devolve:

- `nextPlan`: nova versão da configuração, com perfil, piso escolhido, inventário preservado, versão de política, admissão A e premissas de mercado/custos para auditoria.
- `nextInput`: os mesmos eventos financeiros, com a nova afetação de reservas proposta.
- `status=prepared-for-persistence`, `databaseWritten=false`, `planApplied=false` e `krakenTransferPerformed=false`.

Isto prepara um resultado para persistência futura; não grava nem executa nada. A carteira e a margem factual não são alteradas por confirmar a estratégia. O adaptador do Bloco 12 ainda terá de autenticar, revalidar a política aprovada no servidor e gravar sob transação/revisão global. Hashes locais e metadados de decisão não constituem assinaturas de autorização.

## Depósitos depois de configurar um perfil

O workflow de caixa reconhece `configuration.profilePolicyVersion`. Já não aplica cegamente o orçamento USD antigo de uma política manual quando o capital muda.

Quando recebe `profileMarketContext` recente, compara o perfil antes/depois do movimento com:

- O mesmo perfil já escolhido e a admissão A.
- O piso, o preço/instante de referência e o inventário existentes preservados.
- O capital contabilístico atualizado, sem PnL flutuante.
- Novos orçamentos/reservas só como proposta, a confirmar separadamente.

Exemplo executado: 2 000 USD, 0,01 BTC abertos, 500 USD de margem já efetivamente atribuída. Depois de registar mais 500 USD na caixa, as contribuições passam a 2 500; a carteira passa de 1 500 para 2 000; a margem continua 500; a quantidade continua 0,01 BTC e a fronteira local estimada continua 55 000 USD. O orçamento nominal de eventuais ciclos Equilibrados novos passa de 1 000 para 1 250 USD na prévia. Os ciclos/ordens já planeados conservam os seus orçamentos, preços e associações de fills.

Mais capital não implica sempre mais ciclos: pode aumentar o orçamento por ciclo ou as reservas; continuam a aplicar-se os níveis, o limite técnico e o financiamento completo. A comparação identifica esses parâmetros, sem inventar uma contagem crescente obrigatória.

Sem contexto recente, ou com dados inválidos/antigos, o depósito realizado continua a poder ser preparado e confirmado. O recálculo do perfil devolve `requires-profile-review`, com motivo e contagem indisponível. O snapshot de mercado guardado na configuração é evidência histórica, não uma cotação atual reutilizada silenciosamente. Também não se ativa uma política antiga cuja versão não corresponda à aprovada.

`profileMarketContext` é um pressuposto da revisão, não um campo monetário do evento. Repetições idempotentes não criam outro depósito por mudar o contexto de mercado. Os movimentos apenas planeados continuam a ser projeções, sem saldo factual novo.

## Compatibilidade e rastreabilidade

A política base e os dados usados na comparação ficam guardados na configuração proposta, incluindo a indicação de dados sintéticos ou observação pública manual. O limite de tamanho da configuração é validado antes de devolver uma proposta confirmável. Não se apresentam preços sintéticos como dados oficiais de mercado.

As APIs genéricas de caixa continuam a registar factos. A API genérica de ciclos passa a exigir a revisão de perfil quando o plano tem `profilePolicyVersion`, impedindo que uma alteração isolada transforme um perfil A em B e mantenha o rótulo de perfil aprovado.

Não há migração automática de dados de utilizadores nem alterações nos esquemas Supabase. Planos antigos podem ser revistos explicitamente; as operações financeiras não são reescritas. A interface, PWA, autenticação, backups da Beta e versão pública permanecem preservados.

Os objetivos de saída continuam independentes dos perfis. Não foram alteradas as fórmulas de PnL, taxas, funding, alocações, preços-alvo, lotes ou retiradas de margem do Bloco 7A.

## Verificação e limites

A suite adicional `scripts/test-profile-approval.cjs` verifica a versão aprovada, parâmetros idênticos à proposta, confirmação individual obrigatória, recusa de B, recusa de A inviável, conservação de capital/margem/quantidade, ausência de bypass pela API de ciclos, depósito com/sem dados recentes, orçamento futuro após 2 000+500, preservação do piso/inventário, versões antigas, revisões obsoletas/alteradas e política imutável no navegador UMD.

A aprovação da Beta não elimina limitações: os perfis continuam a usar heurísticas declaradas, não probabilidades calibradas. O feed público e Worker ainda não estão integrados na app; os dados de mercado são explícitos nos testes. O chamador tem de fornecer uma avaliação atual para testar frescura; o servidor deverá injetar o seu instante no Bloco 12. Não foram realizados neste bloco testes com contas Kraken, dispositivos físicos, SMTP ou persistência cloud.

O script `npm run preview:v20:profiles` produz o relatório sintético da versão ativa em `V20_BLOCO7B_CENARIOS.json`; o relatório 7A anterior permanece histórico. Os exemplos são os mesmos parâmetros de teste, não cotações, taxas garantidas ou retornos esperados.

## Resultados executados

Em 21/10/2026: **215/215 testes Node aprovados**, sem falhas ou testes ignorados, nas oito suites de regras, dados, motor, risco, caixa, ciclos, perfis/saídas e aprovação de perfil. A suite específica de aprovação contém 12 testes; perfis/saídas contém 38.

As verificações anteriores da Beta também passaram: autenticação 19, sincronização isolada 26, release 38, responsividade estática 37 e planeador 266: **386/386 verificações**. As verificações de responsividade são automatizadas e não substituem ensaios num Samsung S25 físico. Os testes de dados usam uma base isolada, não a produção Supabase.

A política ativa tem SHA-256 `db545e8fc22a0aafa1c27669e67de810225f2ebd0a04a3c449d79261491aceb9`.

## Continuidade

O Bloco 7 fica fechado no motor de desenvolvimento com a proposta A. **Faltam 8 blocos principais (8–15)**. Próximo: **Bloco 8 — Operações corrigíveis**, com eventos auditáveis, anulação/reversão, reconstrução cronológica e bloqueio de correções incompatíveis com vendas posteriores.

A publicação permanece reservada aos checkpoints previstos. Não há ligação a contas Kraken, ordens automáticas ou transferências reais.
