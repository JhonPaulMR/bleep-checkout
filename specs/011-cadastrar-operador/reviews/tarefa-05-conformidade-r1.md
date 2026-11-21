<Parecer de Conformidade — Tarefa 5>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA4 (lado do front — menu): operador vê apenas `Caixa` e não vê `Operadores`; gerente vê `Cadastros` e `Operadores` | atendido | `apps/web/src/app/core/layout/header.ts:10-44` (`apps/web/src/app/core/layout/header.spec.ts:18-41`) |
| CA4 (lado do front — guard de rota): `/operadores` exige `MANAGER` e redireciona `OPERATOR` para `/caixa` | atendido | `apps/web/src/app/app.routes.ts:15-20`, `apps/web/src/app/core/auth/role.guard.ts:5-17` (`apps/web/src/app/core/auth/role.guard.spec.ts:60-94`) |
| CA1 / CA7 (camada de serviço): `OperatorsService` consome `POST /users` e `GET /users` desembrulhando `{ data }`, sem `passwordHash` no contrato `Operator` | atendido | `apps/web/src/app/features/operators/data/operators.service.ts:7-38` (`apps/web/src/app/features/operators/data/operators.service.spec.ts:25-75`) |
| CA1 / CA2 / CA3 / CA7 (telas, validação e erros HTTP na UI) e CA8 / CA9 | fora desta tarefa | Previstos nas Tarefas 6 e 7 do `plan.md`; `apps/web/src/app/features/operators/pages/operators.page.ts:1-10` contém apenas o stub mínimo da rota |

## Apontamentos

</Parecer de Conformidade — Tarefa 5>
