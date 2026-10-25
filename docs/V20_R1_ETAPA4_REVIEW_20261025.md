# BTC Strategy Pro — Bloco R1, Etapa 4/4
**25 de outubro de 2026 | Revisão técnica da recuperação histórica**

## Decisão técnica
A recuperação matemática e os protótipos R1 estão tecnicamente prontos para avaliação. NÃO existe autorização implícita para substituir a política Beta V20, anunciar rentabilidade ou alterar contas/produção. A validação visual/funcional do proprietário no dispositivo e a escolha financeira final continuam pendentes, pelo que o **gate humano de R1 permanece aberto**, embora o estudo R2 possa avançar sem o bloquear.

## Testes novamente executados nesta sessão
- `BTC_Strategy_Pro_R1_Testes_Referencias.cjs` colocado no diretório `scripts/` do snapshot para resolver corretamente a política relativa: **6 testes PASS**.
- `BTC_Strategy_Pro_R1_Comparador_Tests_20261025.cjs`: **10 testes PASS**.
- `BTC_Strategy_Pro_R1_Etapa3_Tests_20261025.cjs`: **12 testes PASS**.
- **Total: 28 testes Node aprovados, 0 falhas**. No primeiro comando local, o teste de referência falhou por ter sido iniciado fora do diretório esperado e não localizar `../policies/...`; não era falha de cálculo, e foi reexecutado com estrutura correta.
- Os ensaios visuais anteriores de 6 viewports reportaram 0 overflow/erros JS. Não foram refeitos num Samsung S25 físico nesta sessão.

## A confirmar com o proprietário
1. Manter o **Modo Clássico A–E** (1.000 USD entre primeiras entradas; 8.000 USD entre reforços) como comparação permanente com o Modo C adaptativo.
2. Política aprovada hoje rejeita entradas **no piso** de stress; na grelha clássica transladada 80.000→60.000 USD, há uma entrada exatamente no piso. Não alterar automaticamente ou retirar esta proteção para fazer a grelha passar.
3. Se os perfis de risco definem um piso de stress, a distribuição das compras deve ter um intervalo próprio; o piso não cria automaticamente compras nesse nível.
4. Os 200/300/500 USD históricos são **nominais**, não margem aplicada; 10× não representa segurança contra queda de 20.000 USD.
5. Seleção de distribuição lucrativa exige dados de mercado, custos, funding, perdas, margem e validação fora da amostra no Bloco R2 antes de mudar o motor R3.

## O que o utilizador pode testar
Abrir os protótipos R1 (comparador e validador) já disponibilizados na conversa; selecionar BTC referência 80.000 USD e cinco ciclos. Comparar V20 concentrada (mínimo ~76.640 USD) com grelha histórica A–E (mínimo 60.000 USD) e observar o bloqueio do preço igual ao piso. Alterar caixa entre 1.000/1.500/2.000 USD e verificar que o resultado de capacidade muda; nenhuma operação real é executada.

**Estado:** R1 etapa 4/4 — revisão técnica feita, feedback humano/decisão de regra pendentes. Avançar R2 em paralelo, sem alterar política V20.