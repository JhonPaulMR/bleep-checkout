# Parecer de Conformidade — Tarefa 5 (rodada 1)

**Veredito:** APROVADO (com ressalva de execução: o e2e não pôde ser rodado, ver abaixo)

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA6, lado da API: "nenhuma ação é feita com a sessão vencida" (sem token, token adulterado ou vencido dá 401) | atendido | `apps/api/src/common/guards/jwt-auth.guard.ts:29-47`, registrado como `APP_GUARD` em `apps/api/src/app.module.ts:20` |
| Plano: `GET /auth/me` com token válido dá 200 `{ data: { name, role } }` | atendido | `apps/api/src/modules/auth/auth.controller.ts:31-38`. O `ResponseInterceptor` envolve a resposta em `data`. |
| Teste do plano: sem token, adulterado, vencido e válido | atendido | `apps/api/test/auth.e2e-spec.ts`, bloco `GET /auth/me`. Os 4 casos do plano mais o de usuário inexistente. |
| CA6, 30 min sem uso e mensagem "Sua sessão expirou..." | fora desta tarefa | O plano atribui à Tarefa 10 (front) e fixa o token em 12 h. |
| CA2, CA3, CA8 (login, validação e falha de rede) | fora desta tarefa | Tarefas 2 a 4 e 8. |
| CA1, CA4, CA5, CA7 (áreas por papel e sessão de aba) | fora desta tarefa | Tarefas 6, 9 e 10. |

## Apontamentos
Nenhum.

## Notas de execução
- `npm test` na raiz: o front passou (2 testes). O workspace da API passou (3 arquivos, 10 testes), incluindo `jwt-auth.guard.spec.ts`.
- `npm run test:e2e`: **não executou nenhum teste.** Os 14 testes ficaram ignorados porque o `beforeAll` falhou no `prisma db seed` com `ECONNREFUSED`. O Postgres não estava acessível neste ambiente. Não validei o e2e da Tarefa 5, que é o teste que prova o 401 e o 200 de `/auth/me`. Peço rodar de novo com o banco de pé antes de dar a tarefa por provada.
- Pelo diff, as asserções são fortes. Elas conferem o formato de erro completo (`statusCode`, `error`, `path` e as demais chaves) e a ausência de `passwordHash` na resposta. Os casos de token vencido e adulterado exercitam o guard real.

## Observações fora de escopo
O caso "usuário não existe mais dá 401" e o `findById` não estão no texto da tarefa. Eles decorrem de `/auth/me` devolver `name` e `role`, e a asserção do 200 usa o papel real do banco. Considerei isso dentro do escopo, sem apontamento.
