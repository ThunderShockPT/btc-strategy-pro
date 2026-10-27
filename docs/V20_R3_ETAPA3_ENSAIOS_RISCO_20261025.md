# BTC Strategy Pro — Bloco R3, Etapa 3/4: riscos adversos

**25-10-2026. Estado: em curso, ensaios preparados e parte executada.** Não concluir R3.3 enquanto os testes do motor `decimal.js` não forem executados em ambiente QA.

## Verificação factual nesta sessão
- 18/18 testes do módulo **Kraken Rules** executados sobre o snapshot V20 (incluem tick, lote, vigência, classificação, escalões e ausência de capacidades de trading).
- 18/18 regressões R3.1 executadas; 19/19 regressões R3.2 executadas.
- **55/55 testes efetivamente executados passaram**. Estes testes não incluem a execução desta sessão do motor V20 `cycle-planner` / `position-risk` / `temporal-simulator` completo.
- Novo ensaio `test-r3-risk-paths-20261025.cjs`, 14 casos, preparado e validado com `node --check`. **14/14 não estão reportados como PASS**, pois a execução ainda está pendente.
- A instalação de `decimal.js@10.6.0` falhou no ambiente devido a ausência de acesso ao registo npm (`EAI_AGAIN`). Não se substitui o motor de precisão por floats nem se falsificam testes. O snapshot oficial do projecto fixa `decimal.js` em `10.6.0`.

## Cenários que os 14 testes preparam

Sete percursos do motor de ciclos; ordens que não executam; gaps sem fills fictícios; execuções parciais e taxas ajustadas; política de falha de reforços de margem; cruzamento da manutenção antes de uma operação tardia; transferências de margem concluídas ou falhadas; gap sem preço de liquidação fabricado; caixa vs margem isolada; posição existente; insuficiência de margem inicial; funding e caixa; regras Kraken expiradas; e garantia de zero escrita/zero negociação.

O código de ensaios e os logs desta execução estão no pacote ZIP entregue ao proprietário na conversa. Para aplicar os testes ao repositório QA, copiar o ficheiro para `scripts/test-r3-risk-paths-20261025.cjs` e correr:

```bash
npm ci --ignore-scripts
node --test scripts/test-r3-risk-paths-20261025.cjs
node --test scripts/test-cycle-planner.cjs
node --test scripts/test-position-risk.cjs
node --test scripts/test-temporal-simulator.cjs
```

## Limites

- As fixtures usam 20/10/2026 para testar invariantes históricas de forma **sintética**. As regras de 20/10 estão expiradas para decisões atuais e não devem ser artificialmente rejuvenescidas.
- Valores de liquidação de testes são estimativas e nunca dados de uma conta Kraken ou indicação de proteção garantida.
- Sem integração com conta, ordens, depósito, alteração do ledger, Supabase, produção ou política Equilibrado.
- Persistem os gates de decisão R1.4 e R2.4 antes de modificar a política ativa.

**Progresso honesto: 12/34 etapas confirmadas; R3.3 ainda não está concluída.** Para fechar R3.3, executar e obter 14 PASS no motor verdadeiro, tratar falhas, regredir os testes existentes e apresentar resultados verificáveis antes de R3.4.

## Entrega posterior: script QA preservado no repositório

O script com 14 testes reais foi guardado em `scripts/test-r3-risk-paths-20261025.cjs`, commit `45306ee84cdea8708d360ac92adc6ccead9258f6`. Continua **não executado** com `decimal.js`; a sua existência no GitHub não significa que tenha passado. O ficheiro ZIP local preserva o código completo utilizado na preparação, logs dos 55 testes anteriores e instruções de execução.

## ACTUALIZAÇÃO FINAL — CI real do motor V20 (25/10/2026, 14:03 UTC)

**A Etapa R3.3 está agora tecnicamente concluída.** A limitação de acesso npm do ambiente local foi contornada ao executar testes no GitHub Actions com `npm ci --ignore-scripts`, Node 24 e **decimal.js 10.6.0 verificado por package.json**. Não se usaram cálculos substitutos.

**CI concluída com sucesso:** https://github.com/ThunderShockPT/btc-strategy-pro/actions/runs/40200460740 (PR de rascunho https://github.com/ThunderShockPT/btc-strategy-pro/pull/35). Commit do workflow verificado: `a397f6b91a1cd6eafd27d1b8b85cd067101f62df`.

| Conjunto | Testes realizados | Aprovados | Falhas |
|---|---:|---:|---:|
| R3.3, 14 novos percursos reais do motor V20 | 14 | 14 | 0 |
| `test-cycle-planner.cjs` | 35 | 35 | 0 |
| `test-position-risk.cjs` | 34 | 34 | 0 |
| `test-temporal-simulator.cjs` | 51 | 51 | 0 |
| `test-kraken-rules.cjs` | 18 | 18 | 0 |
| `test-r3-strategy-contract-20261025.cjs` | 18 | 18 | 0 |
| `test-r3-preview-bridge-20261025.cjs` | 19 | 19 | 0 |
| **TOTAL** | **189** | **189** | **0** |

A primeira execução havia devolvido 12/14 porque **duas afirmações nos testes** estavam incorretas: (i) o funding acumulado num intervalo de uma hora pode ficar parcialmente pendente, sem ter sido totalmente liquidado da carteira; (ii) a exceção real do motor para fotografia de regras vencida chama-se `RULES_OUT_OF_SCOPE_OR_STALE`. Os testes foram corrigidos de forma a **não contornar o bloqueio** e a verificar os montantes liquidados contra a carteira; **não foi alterado o motor financeiro**.

A corrida final confirma que os casos simulados de compras parciais, ausência de execução, gap, falha de margem, risco pré-acção, caixa distinta de margem e funding são coerentes com o motor V20 e com os testes históricos. **Não** demonstra rentabilidade futura, liquidação oficial da Kraken, validade das regras do mercado em 25/10, backtesting cronológico histórico, ou o funcionamento integral da UI PWA/Supabase. Os eventos são sintéticos e isolados; não usam conta ou credenciais.

A PR #35 é **draft** e NÃO deve ser fundida automaticamente; `main`, site, base de dados, carteiras e os parâmetros financeiros ativos permanecem inalterados. R1.4/R2.4 continuam por aprovação do proprietário antes de substituir a política. **Contagem: 13/34 etapas tecnicamente concluídas. Próximo: R3.4, fecho técnico e QA funcional do Bloco R3.**
