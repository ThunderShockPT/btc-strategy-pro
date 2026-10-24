# BTC Strategy Pro — Auditoria Geral / Bloco 14
Data: 20 de outubro de 2026

## Veredicto
**Beta Demo pública: operacional.** Versão 14.0.0-beta-audit publicada no GitHub Pages.
**Produto com registo, login e sincronização reais: ainda NÃO aprovado para lançamento.** A flag BTC_BETA_AUTH_ENABLED continua desativada.

Site oficial de testes: https://thundershockpt.github.io/btc-strategy-pro/

## Áreas analisadas
1. **Home/Dashboard:** abre, KPIs, tabela de estratégias A–E, preço hipotético e gráfico fictício. Inclui aviso de simulação.
2. **Estratégias:** vista de ciclos, reforços e alvos; navegação pública funcional.
3. **Registos:** histórico de operações manuais da Demo, exportação CSV; navegação funcional.
4. **Terminal:** gráfico sintético e indicadores apresentados, não ligados a cotação de corretora.
5. **Risco:** cenários de margem, alavancagem e funding são ilustrativos; não calcular liquidação real de uma conta Kraken/Binance com base nestes números.
6. **Projetos:** criar/duplicar/editar/arquivar, importar/exportar JSON e migração local opcional; backups exportados no teste público.
7. **PWA:** manifest, ícones, cache estática, funcionamento no Android confirmado pelo proprietário na instalação anterior; a auditoria remota não confirmou a vista física 390 px nem o fluxo offline completo atual.
8. **Supabase:** projeto exclusivo BTC Strategy Pro; as tabelas projects e project_snapshots têm RLS ativo e forçado e acesso anon bloqueado; o security advisor não encontrou avisos.
9. **Autenticação:** UI de registo, confirmação, reenvio e recuperação codificada, mas inacessível até SMTP, URLs de redirecionamento e testes reais.
10. **Publicação:** GitHub Actions e GitHub Pages; fluxo de CI com testes automatizados.

## Problemas reais detetados e corrigidos
- **Gravação parcial de projetos na cloud:** os dados do projeto e o histórico eram escritos em pedidos separados. Migrados para a RPC btcsp_save_project_v1, uma transação no PostgreSQL com controlo de versão e bloqueio da linha, evitando gravação parcial.
- **Conflitos entre dispositivos:** update por versão esperada; gravações obsoletas são recusadas em vez de sobrescreverem dados novos.
- **Eliminação a partir de um dispositivo desatualizado:** criada a RPC btcsp_delete_project_v1 e adaptado o frontend; eliminação é recusada se o histórico ou metadados entretanto mudaram.
- **Clareza da informação financeira:** avisos atualizados para explicar que não existem cotações reais, ordens, nem ligação a corretoras. Campo de preço do risco agora identifica valores hipotéticos.
- **Prevenção de alterações perigosas numa Beta:** flag de cloud auth mantém-se false; o CI impede publicação se a flag for ligada antes da autorização ou desaparecerem avisos de Demo.
- **Atualização da PWA:** recursos versionados e módulo cloud incluído na cache estática; não guarda credenciais na cache do service worker.

## Testes realizados
- Testes automáticos de concorrência, isolamento simulado de proprietários, perdas de ligação, repetição de gravações e eliminação obsoleta, em clientes SQL simulados (mocks). São úteis, mas não substituem testes de sessão Supabase real.
- Compilação/sintaxe JS e verificações estáticas de segurança e manifesto em cada publicação; último workflow deve ser validado antes de declarar publicação.
- Confirmação SQL de ambas RPCs: security invoker, sem execução por anon, com execução por authenticated.
- Teste no browser público sem credenciais: Home, Estratégias, Operações, Terminal, Risco, Projetos/Conta, backup, saída para Home — funcionais.
- **Alertas:** módulo ainda não implementado; botão é informativo.
- Vista de 390 px, reabertura offline da atualização e testes com dois telemóveis reais **não concluídos** na auditoria remota.

## Critérios obrigatórios ainda pendentes para lançar contas reais
- Configuração e validação SMTP/domínio remetente; email de confirmação, reenvio e recuperação no S25 e no computador.
- URLs HTTPS e Site URL permitidos no Supabase, testados em Chrome e na PWA instalada.
- Limites de envio/registo, bot protection/CAPTCHA, controlo de brute force, logs e recuperação.
- Duas contas reais independentes: tentar leitura, escrita e eliminação cruzadas; provar isolamento RLS com requests autenticados.
- Sincronização simultânea de um mesmo projeto em 2 dispositivos; conflito, desconexão, reconexão e importação de backup.
- Política de privacidade, termos, contacto de apoio, exportação/eliminação de conta e períodos de conservação de dados (para lançamento público com contas, verificar RGPD).
- QA de Android em ecrã ~390 px, navegadores adicionais, PWA offline, atualizações e restauração de backup.
- Revisão funcional das fórmulas e pressupostos de risco para deixar claro o que é estimativa; não ligar a trading real sem uma auditoria separada.

## Melhorias recomendadas após desbloquear o lançamento
- Alertas de preços **exclusivamente simulados** na Demo, sem sugerir notificações do mercado real.
- Histórico auditável de revisões e opção de cópia de segurança de cada projeto.
- Página Sobre/Privacidade/Termos com versão, estado dos serviços e contactos.
- Telemetria respeitadora da privacidade, deteção de falhas e ensaios regulares de restauro.
- Caso seja desejada cotação real no futuro: usar fornecedor autorizado e separar visual e tecnicamente os preços reais dos cenários hipotéticos, com limites e aviso de atraso.

## Estado final
Os 14 blocos de engenharia planeados estão na fase de auditoria final, com melhorias reais integradas. **A Demo já é pública. Não existe aprovação para produção com login real nem para execução de trades** até que as provas de SMTP, segurança e sincronização multiutilizador sejam registadas como PASS.
