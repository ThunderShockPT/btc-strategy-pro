# Bloco 11A — navegação e carteira V20

## Objetivo e checkpoint

Continuação no repositório existente. Base de recuperação: `61dbee4d47cdaad300b8adad95bcfe2b3361e405` (correção da prévia de compras). Branch isolada `feat/v20-app-navigation`, sem merge em main nem alterações ao Supabase. A prévia privada existente é reutilizada; versão anterior conservada no histórico de alojamento.

O Bloco 11 foi dividido em 11A (este checkpoint) e 11B (formulários completos de negociação, correções, saídas e acabamentos). Não se considera o Bloco 11 integralmente concluído nem se avança sobre as suas pendências para o Bloco 12.

## Interface implementada

- Início: capital inicial/adicionado, capital contabilístico, saldo da carteira, caixa livre após reservas, margem atribuída, exposição, BTC aberto, preço médio, PnL, ciclos com posição aberta, piso e liquidação estimada. Níveis pendentes do plano guardado e propostas distinguem-se do histórico.
- Estratégias: proposta em revisão com lista de compras descendentes; regresso à revisão e confirmação existentes. Plano guardado mostra os níveis guardados e pede revisão de montantes/margem antes de executar.
- Mercado: cotação pública Coinbase spot com fonte e hora; indisponibilidade explícita; gráfico somente das cotações recolhidas nesta sessão. Não inventa histórico nem usa spot como mark Kraken.
- Risco: margem inicial/manutenção, folga, alavancagem efetiva e liquidação através dos motores partilhados. Calculadora inversa e cenários de queda contínua/gap para a posição registada, sem compras hipotéticas ocultas.
- Conta: reservas, configuração, tutorial e histórico append-only paginado até 50 eventos por página. Não há ações destrutivas.
- Movimentos: adicionar capital, retirar capital, adicionar margem ou retirar margem; escolha explícita entre planeado/realizado; comparação antes/depois, confirmação criptográfica e evento Demo append-only. Os saldos só mudam após confirmar registo realizado. O plano fica assinalado para revisão, sem gerar/aplicar novos ciclos automaticamente.
- Navegação lateral no desktop, cinco separadores inferiores no telemóvel; ícones SVG coerentes, estado ativo, foco, modais nativos e respeito pela redução de movimento. Cenário Demo selecionado e dados existentes preservados ao reabrir.

## Arquitetura e limites

`previews/app-views.js` apresenta resultados e gere interações. `previews/app-workflows.js` faz a ponte para Core/Risk/Cash no Worker. Nenhuma nova fórmula financeira é introduzida nas páginas. Coordenadas do gráfico usam Number apenas para desenho; montantes e comparação de preços mantêm strings/Decimal.

Snapshot é reconstruído no motor, incluindo correções existentes. Cache de leitura é invalidada pela alteração do input/plano; não é fonte financeira. Escopos do adaptador aceitam apenas `demo_long`, valorização sintética, factos de origem Demo e proprietário/projeto coerentes. Não dá acesso a contas reais, endpoints autenticados ou ordens Kraken.

Persistência é local e nos namespaces Demo anteriores. O depósito aumenta o saldo contabilístico; só uma ação distinta de margem muda a margem isolada. Datas dos movimentos são as do cenário fixo Demo, explicitadas no modal. Valorização, volatilidade e liquidez continuam sintéticas. Sem migração de dados reais ou sincronização cloud. O histórico e simulador temporal/funding já existentes no motor não se tornam um feed financeiro real por receberem uma cotação spot pública.

A comparação/confirmacão de movimentos requer Web Crypto. O navegador QA HTTP mantém estes botões bloqueados; o protocolo completo é executado nos testes do Worker com Web Crypto, sem bypass. Confirmar localmente não é autorização de servidor, que pertence ao Bloco 12. Sem credenciais/API keys no frontend.

## Critérios de aceitação

1. Navegar pelas cinco páginas sem perder histórico, configurações ou referência escolhida.
2. Nenhum saldo é recalculado por fórmula alternativa na interface.
3. Reprodução do depósito 2 000 + 500: capital 2 500, margem 500 e liquidação 55 000 inalteradas na fixture com posição aberta; carteira passa de 1 500 a 2 000.
4. Transferência Demo de margem +50: capital permanece 2 000, margem passa a 550 e liquidação estimada a 50 000 na mesma fixture.
5. Movimento planeado sem evento e confirmação impossível; hash alterado, estado obsoleto ou escopo incorreto bloqueados.
6. Cotação spot identificada e separada de mark do cenário; não desloca piso ou preço de referência guardado.
7. Interface utilizável em 280–768 px sem transbordo horizontal, e desktop; ensaio físico Android/PWA continua pendente.

## Verificação executada

- 362/362 testes V20 aprovados (348 anteriores + 8 testes do adaptador + 1 protocolo completo do Worker + 5 testes de preservação local).
- Worker com clonagem JSON no próprio realm, equivalente a mensagens reais do navegador: snapshot, depósito, revisão e confirmação sem alteração artificial da liquidação.
- QA CUA: Home da posição Demo, navegação, Conta/histórico, modal financeiro com bloqueio HTTPS, calculadora inversa (piso 40 000 exige 650 de margem total e +150), Mercado com cotação pública recebida.
- Home sem transbordo nos iframes 280/360/393/430/768; Risco e modal financeiro verificados a 280. O cenário selecionado foi recuperado após reload.
- Ensaio legado de Chromium local continua indisponível no ambiente, conforme checkpoint anterior. Não é contado como aprovado. Não se alegam testes físicos S25, teclado Android, PWA instalada ou contas cloud.

## Próximos checkpoints

11B: compras/vendas e execuções parciais, edições/anulações auditáveis com diferenças e inconsistências, objetivos/saídas e restantes simuladores no fluxo visual. Melhorias identificadas: valuation manual de posição existente com referência imutável; agrupamento visual de compras no mesmo preço; avisos de orçamento ultrapassado em ciclos históricos; execução física de QA S25.

Depois: 12 backend/cloud/RLS/concorrência e recuperação; 13 alertas/tutorial contextual; 14 auditoria financeira independente; 15 Beta/QA/privacidade e decisão de lançamento.

Verificação complementar: 386 verificações Beta aprovadas (19 auth, 26 cloud isolada, 38 release, 37 responsividade, 266 planeador legado). Após últimos ajustes de UI, os 13 testes adaptador/Worker foram novamente executados e aprovados. O navegador confirmou também gap de 100 000 para 40 000: fronteira estimada 55 000, aviso de manutenção atingida e PnL projetado -600. Conta/modal e Mercado verificados a 280 px; proposta preservada entre Estratégias e confirmação. Não houve bypass de Web Crypto no QA HTTP.

Proteção adicional executada: rascunhos JSON inválidos, demasiado grandes ou com proprietário/projeto/versão divergentes bloqueiam gravações sobre a chave original. Não são substituídos automaticamente por um estado vazio. Escritas acima do limite não alteram o valor anterior. O aviso é apresentado na aplicação; a sessão pode continuar sem prometer gravação. Cinco testes verificam a preservação byte a byte e a independência entre projetos.
