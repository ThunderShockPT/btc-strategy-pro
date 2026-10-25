# BTC Strategy Pro V20 — Bloco 15 · Etapa 2/4 — Segurança, rollback e renovação dos painéis da conta (25/10/2026)

**Estado: CONCLUÍDA TECNICAMENTE na branch de QA; SEM publicação, merge, mutações de produção, decisão de risco financeira ou aprovação de paridade estética final.**

## Melhorias concretas de interface

- `unified-five-menus-v20.js` renovado: os painéis V20 da conta agora usam o mesmo vocabulário visual da Demo aprovada (azul-escuro, ciano, cartões de caixa livre, margem isolada e BTC aberto, cabeçalho premium, botões acessíveis). Os gráficos não verificados foram substituídos por um painel de mercado com aviso **SEM FEED AO VIVO**, não por falsos candles da carteira real.
- A fonte única de saldos autenticados permanece `BTCUnifiedFiveMenusV20.project()`: mesmo projeto, proprietário, revisão e head hash verificados, e diário reconciliado. Informação numérica vem sempre desta projeção; a Demo histórica mantém-se isolada e é escondida no modo conta.
- A pré-visualização HTML standalone `previews/v20-b15-integrated-bloco8-qa-20261025.html` inclui o mesmo módulo atualizado, preservando gráficos/canvas e design da Demo em modo `demo`.
- **Paridade visual completa** ainda não aprovada: o layout premium renovado é fiel à paleta, tipografia e cartões, mas não substitui o teste visual humano em todos os elementos/fluxos; continua pendente aprovação final do proprietário.

## Defesa contra saldos obsoletos e recuperação

- `busy` e `recoveryLock` ocultam saldos/histórico autenticados ao iniciar sincronização, quando esta falha, e quando uma confirmação de diário falha, sem reexibir snapshots potencialmente desatualizados.
- Revalidação obrigatória da dupla fonte `bridge.refresh()` e `journal.load()` antes de desbloquear dados; recibo de commit não vale por conta atualizada. `refresh-required` é estado bloqueado e os 5 menus mostram `—`.
- Saldos fictícios ou reais não são usados para calcular ordens por estes painéis; não foram adicionadas APIs Kraken, execução automática ou credenciais.

## Backups e rollback — contexto e verificação

- Testes existentes de envelope criptográfico AES autenticado (`scripts/test-backup-envelope.cjs`) agora integrados no CI: arquivo fechado/aberto preserva bytes e contexto da origem; chave incorreta/versão, adulteração e conteúdo truncado falham sem restauro silencioso. Isto foi validado **só em dados fictícios**.
- 16 testes de `scripts/test-atomic-store.cjs` integrados: transações financeiras atómicas em PostgreSQL temporário, RLS/owner isolado, revisão concorrente, idempotência, rollback de execução parcial, receipts append-only e serialização correta.
- **Não foi feito backup nem restauro de produção.** Retenção, chaves de produção, treino de recuperação, compatibilidade das migrações e exercícios de perda de dados permanecem bloqueadores para lançamento público.
- **Checkpoint para reversão segura da branch QA**: `57975e031e31807cd108d8580a5d701703484930` (fim do Bloco 15.1, antes das alterações do B15.2). Não mover a branch com force-push nem aplicar revert em produção sem revisão.

### Runbook recomendado (não executado)

1. Confirmar que estamos na branch `audit/v20-strategy-recovery-20261025`; preservar `main` e `qa/v20-block12-recovery-20261022` sem merges. Abrir novo PR de reversão **somente se necessário**, preferir `git revert` dos commits B15.2 ou restaurar especificamente `unified-five-menus-v20.js` e a prévia a partir do checkpoint em nova branch.
2. Reexecutar GitHub Actions e verificar que a Demo e os dados R3/R5/B13/B14 têm o mesmo comportamento. Confirmar `financialCloudApproved:false` e `publicRegistrationApproved:false`.
3. Antes de qualquer operação de produção futura, preparar `pg_dump` ou exportação compatível na infraestrutura aprovada, cifrar, controlar o acesso às chaves, testar a recuperação numa base *isolada* sem risco de sobrescrever a fonte real, documentar checksums e RTO/RPO. Sem estas provas não liberar a Beta autenticada pública.

## Evidência GitHub Actions

- **628/628 PASS, 0 FAIL**, workflow https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40237204359
- 9 casos específicos novos B15.2: 3 de segurança/recuperação e 6 percursos completos Chromium a 320/390/393/430/768/1440 px.
- 20 casos de backup e base de dados atómica (4+16) adicionados à suite desta etapa e passaram.
- 8 casos B15.1, B13 (alertas/tutorial), B14 (financeiros), R3/R5 (contas/diário/simulações) continuam verdes.
- Em produção as chaves e endpoints reais **não foram tocados**.

## Estado de aprovação

- Conclusão **31/34 etapas técnicas (~91,2%); Bloco 15 2/4**.
- PR #35 permanece *draft* e não integrada na `main`.
- Gates R1.4/R2.4 de aprovação financeira continuam pendentes, assim como regras Kraken live/fees/funding reais, revisão de privacidade/SMTP e restauro de produção.
- Não afirmar que o design real é 100% igual ao da Demo sem demonstração visual no equipamento do proprietário.
- **Próximo: B15.3/4 — QA real em Galaxy S25/PWA, acessibilidade, instalar/offline, fluxo de login e formulário em ambiente seguro.** Dependendo de acesso do proprietário ao equipamento, os testes em CI são simulados; o S25 físico depende de testes humanos.
