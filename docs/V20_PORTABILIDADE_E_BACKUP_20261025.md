# V20 · portabilidade dos dados e verificação de backup · 25/10/2026

A exportação anterior cobria apenas uma carteira financeira. Esta entrega acrescenta «Conta → Os meus dados → Exportar os meus dados», iniciado por clique explícito.

## Cobertura

A cópia reúne os dados de negócio do proprietário, em todos os seus projetos e cenários: perfil Auth selecionado, projetos, snapshots antigos, eventos financeiros originais, versões de planos, preferências, recibos do tutorial, cálculos guardados, importações antigas e recibos de comandos. Correções e anulações não eliminam os factos originais do ficheiro.

Não inclui palavras-passe, tokens, segredos do servidor, checkpoints temporários, propostas por confirmar, quotas/logs operacionais do fornecedor nem a Demo local do dispositivo. O ficheiro contém dados privados e deve ser guardado pelo proprietário em local privado. Isto não conclui a resposta jurídica a pedidos de privacidade nem elimina a conta.

## Integridade e isolamento

- A identidade vem da validação remota do JWT. Cada transação volta a verificar a sessão SQL e o controlo de acesso da prévia.
- As secções e consultas são fixas. Não se aceitam tabelas ou proprietário indicados pelo cliente.
- As páginas contêm até 500 registos e cerca de 1 MB de texto. Um registo maior é transportado por partes de até 64 000 caracteres, preservando Unicode.
- A serialização monetária do PostgreSQL é mantida como texto até à construção do ficheiro: não há passagem dos números SQL por `Number`/`JSON.parse` no navegador.
- Cada secção é contada e verificada por SHA-256. Um manifesto final diferente do inicial impede devolver uma cópia como completa. Dados alterados, partes corrompidas ou mudança de sessão interrompem o download.
- A memória total do download está limitada a 64 MB. Uma cópia que ultrapasse esse limite é recusada com mensagem explícita; não é marcada como completa. Os limites de ingresso existentes não são alargados. Um 429 admite uma espera de leitura e uma única nova tentativa.

O ficheiro é **portabilidade**, não uma fotografia transacional para ativar planos ou um backup operacional. `financialSnapshot:false` e `automaticRestoreAllowed:false` ficam registados. A verificação por hash não é autorização para restaurar.

## Backup por carteira

O botão existente continua a exportar o pacote financeiro da carteira selecionada. O comando local `node scripts/check-wallet-backup.cjs CAMINHO.json` verifica formato/projeto BTC, hash do pacote, factos através do contrato existente, revisão e hash do head. Não liga a serviços, não escreve dados e não aprova a identidade ou a ativação no servidor. Pacotes alterados são recusados.

## Estado dos gates

R05 avança na portabilidade dos dados de negócio, mas continua aberto para eliminação integral, retenção, documentos finais e processo de privacidade completo. R06 continua aberto para restauro operacional integral (Auth, Storage, chaves/configuração, retenção e rollback). O ensaio PostgreSQL isolado e esta verificação local não substituem esse restauro. SMTP continua dependente de domínio BTC. S25 físico, Bloco 13 e lançamento não são aprovados nesta entrega.

## Evidência do ensaio alojado

[V20_ACCOUNT_PORTABILITY_HOSTED_20261025.json](qa/V20_ACCOUNT_PORTABILITY_HOSTED_20261025.json) regista duas contas novas de QA com Auth real, SQL e o runtime alojado. Foram exportados 5000 eventos em 25 pedidos, 5 893 312 bytes e 68 006 ms, com contagens e hashes verificados. A outra conta recebeu zero eventos do primeiro proprietário; secção inválida e sessão revogada foram recusadas. A origem é fictícia e não corresponde aos registos do proprietário.

O endpoint temporário foi fechado após o ensaio (v39); as 24 contas QA existentes estão bloqueadas e há zero sessões QA. O teste de portabilidade não volta a aprovar cálculo ou confirmação de planos 5000/12, nem regras Kraken atuais.

O primeiro CI encontrou uma referência de build por atualizar e um download interrompido pelo redesenho interno do painel. O manifesto foi regenerado incluindo a nova dependência; o download mantém a verificação da sessão sem depender da duração de vida do elemento visual. Uma atualização de build exige recálculo/revisão das propostas anteriores; a validade nunca é prolongada.

Nenhuma exportação do proprietário é efetuada automaticamente pelo agente. A publicação e o CI final são registados separadamente depois de concluídos.
