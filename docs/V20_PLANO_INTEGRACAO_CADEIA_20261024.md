# Integração da cadeia V20 — inspeção de 24/10/2026

O GitHub confirma **34 PRs abertos, todos draft**. O PR1 parte da `main`; cada PR seguinte parte da branch do anterior. O PR34 mantém a base `perf/v20-bounded-risk-paths`, commit `1177be0f7528ff83350c6e6e170e8b1886374304`. Portanto, o seu diff atual não é o diff completo de lançamento.

A `main` remota continua em `d26545f36acda2f2c464626fb93ce688d41309af`. A inspeção Git verificou que essa main e os **34 heads atuais** são antepassados do head V20 `03ed430fb7e0908c454d3953503d0f09fde2823a`. A lista completa de números, branches, bases e SHAs está em `docs/qa/V20_PR_CHAIN_20261024.json`. Isto demonstra inclusão histórica neste ponto; não demonstra aprovação dos requisitos financeiros ou de lançamento.

## Sequência proposta quando os gates de lançamento passarem

1. Revalidar novamente main e todos os heads. Congelar o candidato pelo SHA aprovado e comparar **a main atual com esse candidato inteiro**, incluindo documentos, migrações já instaladas, configuração do alojamento e assets. Se alguma branch tiver avançado, integrar essas mudanças antes de retomar a validação.
2. Preservar a referência V19.1 e o seu artefacto servido para rollback. Manter os ficheiros/versões antigos exigidos pelo projeto. Preparar um único candidato de integração que contenha os 34 heads e as correções posteriores, sem reconstrução a partir da main antiga e sem squash que perca a cadeia.
3. Rever esse candidato contra a main num PR de integração explícito e ainda draft. Não retargetar silenciosamente o PR34 nem executar 34 merges/squashes sucessivos com bases desatualizadas. Executar todos os checks e a matriz de lançamento sobre o SHA exato, incluindo fontes, Auth, privacidade/restauro, custo/concorrência, PWA/S25 e a auditoria independente.
4. Só com os critérios aprovados, abrir a política de produção com evidência por check e efetuar a integração/publicação. O destino público exige configuração própria de base URL e PWA; o artefacto da prévia privada não deve ser copiado sem essa preparação.
5. Verificar o artefacto efetivamente servido, conta isolada, dados preservados e rollback. Depois encerrar os PRs ancestrais como incluídos no commit de integração, ligando a evidência. Não apagar antecipadamente as branches ou presumir que o GitHub fecha automaticamente toda a cadeia.

## Estado desta entrega

Nenhum PR foi fundido ou tornado ready. Nenhuma base ou audiência foi alargada. A publicação aqui prevista é apenas a atualização do **Site privado existente**, com distribuição identificada pelo SHA GitHub e endpoint de teste restrito ao proprietário. A produção continua fechada e o Pages V19.1 continua preservado. O plano acima não autoriza saltar os gates pendentes.
