# Bloco 12D14 — contexto público no fluxo integrado

## Entrega

O runtime passa o mesmo relógio de servidor às verificações Auth e aos checkpoints. Antes, o relógio configurado no runtime não chegava a essas duas dependências; cada uma usava o relógio predefinido. Sem relógio injetado, mantém-se a hora real do servidor. O runtime foi acrescentado ao manifesto do motor para que uma mudança da composição invalide checkpoints de outra build.

Foi acrescentado um ensaio isolado que junta os adaptadores de ticker, livro e histórico, o provider público, o runtime HTTP, a validação de identidade, sessões SQL, fila, checkpoints, revisão e confirmação. Usa uma carteira manual de QA com três movimentos declarados: capital inicial, margem inicial e compra de 0,01 BTC. O mark, o last e o melhor ask são distintos; a liquidez elegível usa apenas o melhor ask.

## Casos verificados

- Às 12:34:57.183 do relógio sintético, o histórico fechado até 12:34 deixa 2817 ms: HTTP 425, fronteira 12:35, Retry-After 3 e zero trabalhos gravados.
- Às 12:35:01, a mesma chave de criação pode ser admitida com histórico novo. O histórico é novamente recolhido depois da fronteira original.
- Seguro, Equilibrado e Arriscado concluem com resultados completos iguais ao cálculo direto, alternando pedidos entre duas instâncias de runtime. O segundo worker não possui o cache de fontes do primeiro.
- Os avanços e o resultado não recolhem novas fontes nem prolongam o prazo original de 12:36. O estado financeiro fica intacto durante a pesquisa.
- Uma revisão do perfil Equilibrado conserva a validade do cálculo e pode ser confirmada e repetida com idempotência. Eventos, quantidade BTC, caixa, margem e piso de proteção são preservados; apenas o plano revisto é aplicado.
- Uma identidade de outro proprietário não encontra o trabalho. Uma sessão revogada não avança a sequência.
- Ao atingir o prazo original, o trabalho é bloqueado. Uma revisão já preparada não pode ser confirmada após expirar e não cria recibo de confirmação nem altera o estado financeiro.

## Limites do ensaio

São três testes de integração em PGlite, sem chamadas externas. As respostas de fontes, regras e identidades são explicitamente sintéticas; as regras têm versão QA-SYNTHETIC-PUBLIC-RUNTIME. O relógio da aplicação e das consultas SQL é controlado pelo teste, incluindo os defaults temporais das tabelas operacionais de QA. Isso mantém as verificações e restrições temporais ativas sem depender da hora de execução da CI. Essas adaptações não são migrações de produção.

Duas instâncias verificam a retoma sequencial entre workers, não concorrência física de dois servidores. maxCycles=1 e três movimentos não demonstram capacidade para 5000 movimentos ou 12 ciclos. O tempo de execução desta suite não mede latência alojada, CPU de produção ou conclusão dentro de uma janela real de 45 segundos. Auth remoto é simulado; não comprova duas contas reais, SMTP ou recuperação de conta.

## Próximos critérios

12D permanece aberto: ligar os providers no entrypoint ainda fechado, medir o fluxo completo com sessão real e SQL no alojamento, testar cargas grandes e concorrência, verificar ingresso e memória de pico. Depois ficam 12E–12I, com sincronização/interface, privacidade, restauro/migração, autenticação/email e QA integrado. O teste Samsung S25 permanece antes do Bloco 13. Nenhum deploy, migração de produção ou ligação Kraken foi efetuado nesta etapa.
