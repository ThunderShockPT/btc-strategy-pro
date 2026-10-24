# Desvio entre a Demo original e a prévia privada V20

## Diagnóstico

A comparação da prévia privada com a Demo original ficou incompleta. O código mantém duas apresentações: `index.html` conserva o Trading Command Center da V19.1, com Dashboard, Trading Terminal, Radar de Estratégias, Tabela Chaves e identidade Candle Grid; `previews/onboarding-template.html`, `previews/app-views.js` e `account-view-v20.js` compõem a prévia V20 de cinco páginas e os formulários autenticados.

A conta foi ligada à segunda apresentação. A reutilização de Home/Risco/Mercado e de parte dos cartões não preservou a experiência completa da Demo original. A revisão do plano tem uma apresentação própria mais resumida, a configuração usa formulários técnicos e o Dashboard/Terminal/Tabela Chaves da referência original não foram integrados com os motores V20. A afirmação anterior de equivalência com a Demo foi demasiado abrangente.

A auditoria do Bloco 0, preservada no pacote de continuidade, indicava aproveitar a apresentação de mercado, o diário, a PWA, a responsividade e a navegação, substituindo progressivamente os cálculos. O código da Demo permanece no projeto. Os motores Decimal, diário auditável, cálculos de risco, API e persistência V20 também permanecem; a recuperação visual deve aproveitar esses trabalhos.

## Critérios de correção

- Recuperar a identidade e a organização visual da Demo original a partir do código existente, mantendo os cinco menus V20 aprovados: Início, Estratégias, Mercado, Risco e Conta.
- Apresentar Dashboard, gráficos/Radar e ações rápidas com os dados V20; integrar a Tabela Chaves com ciclos numerados e dinâmicos 20/30/50. Não reintroduzir conjuntos fixos A–E como regra financeira.
- Recuperar o percurso guiado de configuração/revisão, com explicações de unidades, caixa e margem. A persistência autenticada mantém revisão imutável, prazo e aceitação explícita.
- Apresentar fontes e tempos verdadeiros. Velas ou séries sintéticas só podem aparecer no modo Demo identificado; não preencher o terminal privado com um histórico fictício de mercado.
- Comparar Demo e conta com factos fictícios equivalentes para verificar apresentação e interação, além dos testes de gravação. Validar no S25 antes de aprovar a experiência.
- Preservar versões anteriores e os dados privados. Não sobrepor ficheiros históricos ao snapshot de trabalho, alterar pisos silenciosamente ou enfraquecer a admissão A estrita.

## Estado real

A versão privada 8 tem testes funcionais e correções de formulários aprovados. Esses testes não demonstram fidelidade visual/funcional integral à Demo original. A pendência existente R02 volta a explicitar esta lacuna; não se cria um bloco novo nem se considera o Bloco 12 concluído. Este diagnóstico não altera a aplicação publicada ou os dados das contas.
