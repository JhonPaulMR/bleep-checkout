# Preferências de Execução — Antigravity

Estas preferências complementam `.agents/rules/utf-rules.md` (sem revogar os portões obrigatórios de aprovação da spec, TDD, revisão independente por dois revisores e triagem de apontamentos bloqueantes):

1. **Dispensar o tutor entre tarefas:** durante o ciclo `/utf-task`, pule os passos do subagente `tutor` (modos `antes` e `passo`). O usuário revisa os conceitos e o diff por conta própria depois; só acione o `tutor` quando pedido explicitamente.
2. **Avanço automático entre tarefas:** com `spec.md` (`status: aprovada`) e `plan.md` aprovados, execute as tarefas do plano sequencialmente (uma por vez, com TDD e revisão paralela por `revisor-conformidade` e `revisor-codigo`). Sempre que ambos os revisores retornarem `APROVADO`, marque a tarefa como `- [x]` no `plan.md`, faça o commit (`tarefa N: ...`) e avance automaticamente para a próxima tarefa até o fechamento da documentação e o `auditor-final`.
   - **Só interrompa o usuário** quando houver apontamento bloqueante de revisor para triagem, bloqueio técnico/ambiental relevante (ex.: Docker/Postgres parado, estouro das 2 rodadas) ou portão obrigatório de aprovação de `spec.md`/`plan.md`.
3. **Push automático no fechamento + esqueleto do PR:** quando o `auditor-final` retornar `PRONTO PARA PR`, faça o `git push -u origin <branch>` automaticamente (sem abrir o PR — o usuário cria o PR) e entregue o esqueleto completo em Markdown seguindo `.github/pull_request_template.md`, contendo:
   - `Closes #<n>` preenchido;
   - tópicos objetivos do diff indicando o que abordar na seção **"O que este PR faz e por quê"** (que o usuário escreve com as próprias palavras, ≥ 250 caracteres);
   - seção **"Apontamentos da revisão"** preenchida com os apontamentos aceitos e recusados (com justificativa) a partir de `specs/<NNN>-<slug>/reviews/tarefa-NN-decisoes-rN.md`.
