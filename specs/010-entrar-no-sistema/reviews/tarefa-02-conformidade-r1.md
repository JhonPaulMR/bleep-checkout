# Parecer de Conformidade — Tarefa 2

**Veredito:** APROVADO

Rodei `npm test` e `npm run test:e2e` na raiz. Passaram: unit da API 1/1, web 2/2, e2e da API 4/4 (dois arquivos, `auth.e2e-spec.ts` e o do seed).

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1, lado da API: com e-mail e senha corretos, a API devolve token com `sub` e `role` e o usuário com `name` e `role` | atendido | `apps/api/src/modules/auth/auth.service.ts:12-23`, `apps/api/src/modules/auth/auth.service.spec.ts:27-34` |
| `POST /auth/login` com o gerente do seed devolve 200 com `{ data: { accessToken, user: { name, role: "MANAGER" } } }` e sem `passwordHash` | atendido | `apps/api/test/auth.e2e-spec.ts:25-39`, `apps/api/src/common/interceptors/response.interceptor.ts`, `apps/api/src/modules/auth/auth.controller.ts:15-19` |
| Token com validade de 12h, o teto da spec e do plano | atendido | `apps/api/src/modules/auth/auth.module.ts:15` |
| CA1, lado do front (redirecionamento por papel e menu) | fora desta tarefa (Tarefa 6) | n/a |
| CA2 (401 genérico) | fora desta tarefa (Tarefa 3) | `apps/api/src/modules/auth/auth.service.ts:15` tem o `TODO #10 (Tarefa 3)` e usa `user!`, o que é aceitável nesta tarefa |
| CA3 (DTO e `ValidationPipe`) | fora desta tarefa (Tarefa 4) | `LoginBody` é uma interface simples no controller, o que é esperado agora |
| CA6, lado da API (guard e `GET /auth/me`) | fora desta tarefa (Tarefa 5) | n/a |

## Apontamentos
Nenhum.

Observações sem reprovação:
- `main.ts` está nos arquivos previstos, mas não mudou. Nada que a Tarefa 2 pede depende dele, porque o e2e sobe o `AppModule` direto.
- O `ResponseInterceptor` está registrado como `APP_INTERCEPTOR` em `apps/api/src/app.module.ts`.
- O plano prevê `@Public()` e o `JwtAuthGuard` só vem na Tarefa 5. Por isso o decorator ainda não tem efeito, e isso está dentro do plano.
- Remover `AppController`, `AppService` e seus testes está previsto no plano, em "CORS... O `GET /` Hello World da API e os testes dele saem".
