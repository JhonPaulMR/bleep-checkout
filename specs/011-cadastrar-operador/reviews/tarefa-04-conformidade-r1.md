<Parecer de Conformidade — Tarefa 4>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA4 — `GET /users` bloqueado para operador (`403` via `RolesGuard`) | atendido | `apps/api/src/modules/users/users.controller.ts:44-58`, `apps/api/test/users.e2e-spec.ts:312-325` |
| CA5 — `GET /users` e `GET /users/:id` sem token, com token adulterado ou expirado (`401` via `JwtAuthGuard`) | atendido | `apps/api/src/modules/users/users.controller.ts:44-80`, `apps/api/test/users.e2e-spec.ts:327-366`, `apps/api/test/users.e2e-spec.ts:503-542` |
| CA6 — `GET /users/:id` permite apenas próprio usuário (`req.user.sub === id`) ou gerente criador (`user.createdById === req.user.sub`) sem `passwordHash`; outro usuário autenticado recebe `403` | atendido | `apps/api/src/modules/users/users.controller.ts:60-80`, `apps/api/src/modules/users/users.service.ts:64-81`, `apps/api/src/modules/users/users.service.spec.ts:163-241`, `apps/api/test/users.e2e-spec.ts:369-501` |
| CA7 (lado da API) — `GET /users` lista apenas `OPERATOR` sem `passwordHash` e devolve lista vazia `[]` quando não há operadores | atendido | `apps/api/src/modules/users/users.service.ts:56-62`, `apps/api/src/modules/users/users.service.spec.ts:111-161`, `apps/api/test/users.e2e-spec.ts:253-310` |
| CA1 / CA2 / CA3 / CA8 / CA9 e parte de frontend de CA4 / CA7 | fora desta tarefa | — |

## Apontamentos

*(Nenhum apontamento. Testes executados e aprovados após leitura do diff: `npm test -w apps/api` — 5 arquivos, 32 testes passando; `npm run test:e2e -w apps/api` contra PostgreSQL local — 3 arquivos, 42 testes passando.)*
</Parecer de Conformidade — Tarefa 4>
