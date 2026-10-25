# BTC Strategy Pro V20 — Bloco 15 · Etapa 4/4 — Fecho técnico da Beta e gates de publicação (25/10/2026)

**Estado inicial: pacote demonstrativo pronto para revisão, mas publicação financeira e abertura de contas BLOQUEADAS.** Não confundir CI verde com aprovação do utilizador. Este relatório não autoriza deploy, merges, ordens Kraken, migrações ou alterações de dados reais.

## Resultado final automatizado B15.4 — 25/10/2026

- **GitHub Actions 40240463726: 651/651 testes PASS, 0 FAIL**, incluindo **11/11 testes novos de bloqueio de publicação**: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40240463726
- A revisão com políticas fechadas **passou** (`node scripts/check-b15-release-readiness-20261025.cjs --mode=qa-review`); a tentativa de lançamento público sem aprovações **falhou por desenho** (retorno não nulo `--mode=public-release`). O CI confirmaria erro se o lançamento não fosse impedido.
- Atestação gerada para **8 ficheiros estáticos**, com hashes SHA-256 verificáveis, nome da branch e `releaseStatus: BLOCKED_PENDING_HUMAN_AND_PRODUCTION_GATES`. Atestação e ZIP são QA only, não assinatura criptográfica de aprovação humana.
- **Artefacto final de revisão (ZIP)**: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40240463726/artifacts/12616867553 (ficheiros da PWA, relatório e evidência de aprovação). Pacote PWA isolado no mesmo run: https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40240463726/artifacts/12617135444
- **Estado**: 33/34 etapas técnicas preparadas (**97,1%**), todas as etapas B15 entregues em QA, **1 gate R1.4 humano ainda não aprovado**, R2.4 sem escolha financeira final, S25 físico e auditorias de produção ainda por cumprir. **NÃO lançar, NÃO publicar financeiramente, NÃO marcar 34/34.**

## O que existe realmente

- **Demo integrada V20**, com visual Bloco 8, cinco menus, gráficos ilustrativos, tutorial, alertas e duas carteiras **fictícias**: `previews/v20-b15-integrated-bloco8-qa-20261025.html`.
- **PWA de teste instalável mediante origem HTTPS/localhost**: `previews/b153/`, produzida pelo `scripts/build-b15-mobile-pwa-20261025.cjs`. Inclui ícones 192/512, manifesto, aviso offline, SW de scope estrita e zero dados financeiros privados em cache.
- **Motor financeiro, ledger, cálculo de risco e API**: implementações e testes isolados no branch auditado, mas **sem serviços Kraken ao vivo, sem release das contas reais, nem paridade visual aceite no S25**.
- Evidência técnica B15.3: GitHub Actions https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40239210208 — **640/640 PASS**, apenas em CI, com Android emulado; **não** S25 físico.
- `PR #35` permanece draft, a base é `qa/v20-block12-recovery-20261022`; a `main` continua com a PWA V19.1 pública e intacta.
- O projeto Supabase/produção **não foi alterado**. `financialCloudApproved:false`, `publicRegistrationApproved:false`; todos os nove checks oficiais em `policies/cloud-release-20261021.json` ainda falsos.

## Proteção operacional entregue nesta etapa

1. `policies/v20-b15-release-evidence-20261025.json`: evidência e **18 campos de aprovação/verificação pendentes**, separando o que é revisão técnica do que necessita de aprovação humana ou ensaio real. Uma indicação positiva falsa, parcial ou ausente não deve abrir um gate.
2. `scripts/check-b15-release-readiness-20261025.cjs`: avaliador conservador, com `--mode=qa-review`, `--mode=demo-preview` e `--mode=public-release`.
3. `scripts/test-b15-release-readiness-20261025.cjs`: testes automatizados de tentativas de publicação com política fechada, commit não coincidente, branch errada, consentimento ausente, R1.4/R2.4 e S25 não verificados. O modo `public-release` devolve código de erro enquanto subsistir qualquer bloqueio.
4. `scripts/build-b15-release-candidate-20261025.cjs`: gera no pacote de QA uma atestação dos ficheiros estáticos com **hashes SHA-256** e carimbo **QA_ONLY_DO_NOT_DEPLOY**; não cria uma release pública ou token de conta.
5. O GitHub Actions executa estes controlos após os testes de regressão e gera um ZIP de **revisão, não de publicação**, chamado `btc-strategy-v20-b154-review-only`.

## Política de lançamento — distinção obrigatória

| Tipo | O que está autorizado neste momento? | Critérios a desbloquear |
|---|---|---|
| **QA local/offline** | Sim, apenas Demo fictícia com testes já executados | Manter isolamento e não introduzir dados reais |
| **Preview HTTPS privado da Demo V20** | **Ainda não publicado nem autorizado expressamente** | Confirmação do proprietário para URL QA isolado, sem autenticação financeira ou abertura de registos; testar instalação física após disponibilização |
| **Beta autenticada limitada com dados reais** | **Não** | Infraestrutura, validação SMTP e conta recuperada, RLS real, backup e restauro real, privacidade, abuso, revisão visual e política financeira aprovada |
| **Registo público, ligações Kraken e operações** | **Não** | Todas as aprovações financeiras R1.4/R2.4, regras Kraken EEE atuais, liquidação e margens verificadas, testes completos e autorização expressa de lançamento |

### Bloqueadores efetivos para o lançamento autenticado

- **R1.4**: escolher e aprovar explicitamente a configuração da estratégia real. O simples «avançar» não significa aprovação de uma grelha financeira.
- **R2.4**: validar critérios de seleção e resultados de cenários, sem supor lucros futuros ou proteção garantida contra liquidação.
- **Galaxy S25 físico**: abrir PWA por HTTPS, instalar, testar menus/touch/teclado, suspender/reabrir, desligar rede e reabrir, recolher screenshots e parecer visual.
- **Visual da conta real**: comparar no telefone os painéis premium com a Demo aprovada, sem trocar figuras demonstrativas por saldos não reconciliados.
- **Produção**: backup cifrado com chave gerida, restauro real ensaiado em ambiente isolado, retenção/rollback, SMTP/recuperação de password, teste RLS com duas contas reais controladas, privacidade e mitigação de abuso.
- **Kraken EEE**: fonte de regras atual validada, taxas/funding, execução manual/importação de trades e limites da margem isolada; o simulador e os testes unitários não substituem documentação e conta real.
- **Segurança de lançamento**: nenhum segredo no frontend, PWA sem cache de dados privados, permissões do GitHub/branch e decisão de publicação pelo proprietário.

## Como testar no Galaxy S25, sem assumir riscos

O pacote de revisão será descarregável por **GitHub Actions > Artifacts**, mas não é um APK. Para instalação PWA no S25, alojar exclusivamente o diretório `previews/b153/` sob URL HTTPS **após autorização para preview QA**. Não utilizar o domínio público principal.

Ver protocolo completo em `previews/b153/README.md`. No telefone: instalar via menu ⋮ do Chrome, abrir todos os menus e o tutorial, trocar entre carteiras fictícias, testar modo avião depois da primeira abertura online, retomar rede, testar logout e enviar capturas de ecrã. **Não usar chaves ou credenciais Kraken.**

## Procedimento de release após (e só após) aprovações

1. Guardar checkpoint imutável da branch, CI verde e hashes dos ficheiros; comparar o commit testado com o commit candidato.
2. Confirmar aprovações assinadas pelos responsáveis, `policies/cloud-release-20261021.json`, evidência física, regras financeiras e teste de restauro. A aprovação não pode ser inferida do texto «avançar».
3. Rever o PR e os segredos de deployment; proceder apenas com o alvo expressamente autorizado, preferindo preview QA primeiro.
4. Publicar, executar smoke tests em rede HTTPS, rever eventuais falhas de offline/sessão e acompanhar erros.
5. Se falhar, parar imediatamente o tráfego e reverter para o checkpoint verificado; restaurar dados **apenas** com plano validado, sem reset nem apagar o ledger append-only.

## Progresso e critérios finais

O fecho do **B15.4 técnico** permite declarar **33/34 etapas técnicas preparadas** (97,1%); **não** declarar 34/34 nem «aplicação finalizada» até passar o gate humano pendente R1.4 e restantes aprovações de release. Conclusão do Bloco 15 na vertente técnica não equivale a abertura ao público.

**Este ficheiro é o checkpoint de aprovação de lançamento — não uma autorização para publicar.**
