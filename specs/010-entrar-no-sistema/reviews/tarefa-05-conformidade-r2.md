# Parecer de Conformidade — Tarefa 5 (rodada 2)

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA6, lado da API: "nenhuma ação é feita com a sessão vencida" (sem token, token adulterado ou vencido dá 401) | atendido | `apps/api/src/common/guards/jwt-auth.guard.ts:29-47`, registrado como `APP_GUARD` em `apps/api/src/app.module.ts:20`. Cobertos por e2e em `apps/api/test/auth.e2e-spec.ts`, bloco `GET /auth/me`. |
| Plano: `GET /auth/me` com token válido dá 200 `{ data: { name, role } }` | atendido | `auth.controller.ts` (`me`) chama `AuthService.me`. O e2e confere `{ data: { name, role: 'MANAGER' } }` e que não há `passwordHash`. |
| Teste do plano: sem token, adulterado, vencido e válido | atendido | Os 4 casos do plano estão no e2e, mais o de usuário inexistente. Cada 401 confere o formato de erro completo (`statusCode`, `error`, `message`, `path`, `timestamp`). |
| CA6, 30 min sem uso e mensagem "Sua sessão expirou..." | fora desta tarefa | Front, Tarefa 10. |
| CA1 a CA5, CA7, CA8 | fora desta tarefa | Tarefas 2 a 4 e 6 a 10. |

## Apontamentos
Nenhum.

## Notas de execução
- O Postgres já estava de pé (`docker compose up -d` não precisou subir nada).
- `npm test`: o front passou (2 testes) e a API passou (3 arquivos, 12 testes), incluindo os novos de `AuthService.me` e do `JwtAuthGuard`.
- `npm run test:e2e`: 2 arquivos, 14 de 14 testes passaram. A pendência da rodada 1, de o e2e não ter rodado, está resolvida.
- Aceito na rodada 1: a regra de `/auth/me` saiu do controller e foi para `AuthService.me`, que devolve 401 com 'Sessão inválida ou expirada.' quando o usuário não existe. O formato do perfil está num `perfil()` privado que o `login` reutiliza. Isso tem teste de unidade, e o comportamento externo não mudou.
- Escopo: o diff não traz nada que a spec não pediu. `findById` e o caso de usuário inexistente decorrem de `/auth/me` devolver `name` e `role`. `exports: [JwtModule]` em `AuthModule` serve só para o guard global resolver o `JwtService`.
