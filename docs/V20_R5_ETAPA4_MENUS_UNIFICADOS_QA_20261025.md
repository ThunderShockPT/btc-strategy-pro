# BTC Strategy Pro — Bloco R5, Etapa 4/5 — Integração unificada dos cinco menus

**Data:** 25/10/2026 · **Estado:** implementação técnica e QA isolado concluídos. Aprovação do proprietário e publicação **pendentes**.

## Resultado implementado

- Novo `unified-five-menus-v20.js` agrega **um estado autenticado** a partir de `account-five-menu-bridge-v20.js` (R5.2) e `five-menu-journal-v20.js` (R5.3) sem criar outro diário.
- As seis vistas físicas (Início, Estratégias, Mercado, Risco, Conta e Registos) apresentam dados **apenas quando coincidem**: UUID da carteira, revisão decimal dos eventos e `headHash` SHA-256. Exige autenticação/verificação do proprietário na camada R5.1/R5.2 e proíbe a exposição de saldos quando a fonte está ausente ou incoerente.
- Caixa livre, margem isolada, posição BTC, PnL não realizado, equity da posição e revisão derivam da **mesma projeção V20**, não de cartões/saldos antigos da Demo.
- **Modo Demo** preserva a interface original do Bloco 8, velas/radar e componentes visuais demonstrativos. **Modo Conta** oculta todas as figuras, formulários e gráficos históricos para não sugerir que os valores da Demo são dados da conta.
- O adaptador **não** define nem altera perfis financeiros; não contém operações diretas de escrita, trading, ordens Kraken ou alterações a Supabase.
- O fluxo de confirmação delega ao diário R5.3; um recibo só permite exibir novos saldos depois de uma releitura sincronizada da carteira e do diário.

## Problema real identificado e corrigido durante a QA

O router da Demo Bloco 8 recria dinamicamente o `innerHTML` de algumas vistas ao abrir os menus. Isso removia o painel V20 autenticado, embora o motor continuasse correto. A correção garante que o painel é reposto mediante observação do DOM e sempre que se apresenta o estado de conta, mantendo as figuras antigas invisíveis.

A **primeira execução Chromium da branch falhou 6/6** por esta razão. Após a correção do código e do HTML da prévia, a suíte foi **reexecutada integralmente e aprovada em 6/6**. Não esconder este histórico de regressão: foi um defeito da integração visual detectado pelos testes.

## Evidência de testes

**GitHub Actions — execução FINAL aprovada:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40217248802

- Node 24 + `decimal.js@10.6.0`; total **427/427 testes PASS, 0 falhas**.
- **22/22 novos testes** `scripts/test-r5-unified-five-menus-20261025.cjs`: carteira/revisão/`headHash`, caixa vs margem, PnL assinado, mudanças de conta, logout, dados inválidos, confirmação explícita e ausência de funções de escrita.
- **6/6 testes de navegador na PR/branch reais** `scripts/test-r5-unified-browser-20261025.cjs` (Chromium 320, 390, 393, 430, 768 e 1440 px); modo Demo/Conta, sincronização entre vistas, A/B, mismatch, recuperação, logout, gráficos Demo preservados, **zero JS errors, zero overflow**.
- Regresso das suítes V20 e R5.1–R5.3, das correções append-only, da API autenticada PGlite e PostgreSQL nativo temporário, com cópia/restauração, também PASS.

**Prévia completa da branch:** `previews/v20-r5-unified-five-menus-qa-20261025.html` com o código real de `unified-five-menus-v20.js` inline e contas de QA fictícias A/B. **Prévia autónoma** da conversa: `BTC_Strategy_Pro_R5_Etapa4_Previa_Cinco_Menus_20261025.html`, laboratório equivalente para validação visual offline, e respectivo ZIP/capturas 393/1440 px; 6/6 local em Chromium.

## Limitações de segurança e produto

1. A prévia HTML usa **somente carteiras fictícias**. Não há login a uma conta real nem sincronização de saldos reais pela prévia. O modo autenticado está implementado na branch, mas **ainda não foi publicado/ligado a produção**.
2. A política `financialCloudApproved:false` permanece intacta. A PR #35 continua **draft**, sem merge, deploy, migrações ou escrita de dados reais.
3. As regras Kraken fotografadas são históricas; sem fonte recente verificada e aprovação financeira, **não é autorizado calcular poder de compra oficial, prometer liquidação ou efetuar trades**.
4. No modo Conta ficam ocultos os gráficos históricos até ser feita a integração correta dos gráficos com dados consistentes. Não se devem reintroduzir saldos inventados só para manter o layout.
5. Continuam pendentes os gates humanos R1.4/R2.4, a decisão financeira definitiva **NÃO APROVADA** pelo proprietário, e testes físicos Samsung S25.

## Roadmap e próximo passo

**22 de 34 etapas técnicas entregues. Bloco R5: 4/5.**

**R5.5** deve verificar integração real em ambiente autenticado de QA, aceitar a fidelidade visual de todos os menus e fluxos financeiros com dados consistentes, validar no Samsung S25, fechar QA de histórico/correções e preparar release apenas sob autorização expressa (não mudar automaticamente o perfil, publicar ou ativar cloud).

Nenhum facto pessoal ou dado de conta privada foi lido ou alterado por este pacote de QA.
