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
