<Parecer de Conformidade — Tarefa 6>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (lado do front — exibir operadores na lista e incluir novo operador após cadastro válido) | atendido | `apps/web/src/app/features/operators/pages/operators.page.ts:43-73`, `apps/web/src/app/features/operators/pages/operators.page.html:5-91`, `apps/web/src/app/features/operators/pages/operators.page.spec.ts:70-85`, `apps/web/src/app/features/operators/pages/operators.page.spec.ts:144-193` |
| CA3 (lado do front — bloquear envio e exibir mensagem por campo para nome vazio, e-mail vazio/inválido e senha < 8 caracteres) | atendido | `apps/web/src/app/features/operators/pages/operators.page.ts:25-41`, `apps/web/src/app/features/operators/pages/operators.page.ts:52-55`, `apps/web/src/app/features/operators/pages/operators.page.html:13-56`, `apps/web/src/app/features/operators/pages/operators.page.spec.ts:87-142` |
| CA7 (lado do front — informar quando não há operadores cadastrados mantendo o formulário disponível) | atendido | `apps/web/src/app/features/operators/pages/operators.page.html:5-81`, `apps/web/src/app/features/operators/pages/operators.page.spec.ts:56-68` |
| CA2 (409 e-mail duplicado), CA8 (401 sessão expirada), CA9 (falha de rede) | fora desta tarefa (previstos na Tarefa 7 do `plan.md`) | `specs/011-cadastrar-operador/plan.md:48-51` |
| CA4, CA5, CA6 | fora desta tarefa (cobertos nas Tarefas 2–5 do `plan.md`) | `specs/011-cadastrar-operador/plan.md:23-41` |

## Apontamentos

*(Sem apontamentos. Suíte `npm test -w apps/web` executada com sucesso: 10 arquivos, 46/46 testes passando, incluindo 7/7 em `operators.page.spec.ts`.)*
</Parecer de Conformidade — Tarefa 6>
