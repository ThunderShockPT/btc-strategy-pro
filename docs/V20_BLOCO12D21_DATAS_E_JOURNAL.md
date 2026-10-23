# Bloco 12D21 — datas e cópias internas do histórico

Cada replay valida uma vez cada string exata de timestamp e reutiliza o resultado apenas nessa reconstrução. Todas as verificações por evento permanecem: cronologia, futuro, identidade, origem, revisão, vínculos e regras históricas. Strings diferentes continuam a ser validadas separadamente; não há cache global ou entre pedidos. Correções continuam a passar pela projeção integral.

Dentro da simulação, o histórico é destacado do input à entrada. Uma ação passa a copiar o array desse histórico interno, sem serializar novamente todos os factos anteriores. Os factos existentes não são modificados; apenas novos eventos são acrescentados ao array candidato. Continua a haver replay financeiro integral após cada evento e rollback da ação inteira em caso de falha. Metadados mutáveis continuam destacados. Checkpoints, regras e prazos não mudam de formato nem duração.

As suites de motor, risco, retoma, correções e ciclos passaram localmente (157 testes antes do teste adicional de datas). O teste adicional cobre formatos inválidos com o mesmo instante, datas impossíveis, factos futuros e alterações entre replays. Mantêm-se os hashes anteriores de planeamento, resultado completo, ações parcialmente inválidas, regras históricas e preservação dos inputs.

A matriz Auth/SQL real será repetida no commit desta entrega. Não se infere capacidade máxima nem capacidade Edge a partir dos testes locais. O bloco 12D permanece aberto até conclusão da carga máxima na validade original e validação no ambiente alojado.
