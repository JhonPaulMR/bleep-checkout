<Parecer de Conformidade — Tarefa 3>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (lado da API — hash `argon2`, papel fixo `OPERATOR`, `201` sem `passwordHash`, login imediato) | atendido | `apps/api/src/modules/users/users.controller.ts:20`, `apps/api/src/modules/users/users.service.ts:28`, `apps/api/src/modules/users/users.service.spec.ts:27`, `apps/api/test/users.e2e-spec.ts:47` |
| CA2 (lado da API — e-mail duplicado retorna `409` com "Já existe um usuário com este e-mail.") | atendido | `apps/api/src/modules/users/users.service.ts:32`, `apps/api/src/modules/users/users.service.spec.ts:83`, `apps/api/test/users.e2e-spec.ts:87` |
| CA3 (lado da API — nome vazio, e-mail inválido/vazio, senha < 8 chars ou campo extra `role` → `400`) | atendido | `apps/api/src/modules/users/dto/create-operator.dto.ts:5`, `apps/api/src/app.module.ts:27`, `apps/api/test/users.e2e-spec.ts:124` |
| CA4 (`POST /users` com token de `OPERATOR` → `403` via `RolesGuard`) | atendido | `apps/api/src/modules/users/users.controller.ts:21`, `apps/api/src/common/guards/roles.guard.ts:12`, `apps/api/test/users.e2e-spec.ts:181` |
| CA5 (`POST /users` sem token, com token adulterado ou expirado → `401` via `JwtAuthGuard`) | atendido | `apps/api/src/common/guards/jwt-auth.guard.ts:22`, `apps/api/test/users.e2e-spec.ts:201` |
| CA1/CA2/CA3/CA4/CA7/CA8/CA9 (lado do front), CA4 (`GET /users`), CA5 (`GET /users`, `GET /users/:id`), CA6 | fora desta tarefa | Tarefas 4, 5, 6 e 7 |

## Apontamentos

*(Nenhum apontamento. Testes unitários executados em `npm test -w apps/api`: 5 arquivos, 26 testes passando; testes e2e executados em `npm run test:e2e -w apps/api`: 3 arquivos, 28 testes passando, incluindo 13/13 em `apps/api/test/users.e2e-spec.ts`.)*
</Parecer de Conformidade — Tarefa 3>
